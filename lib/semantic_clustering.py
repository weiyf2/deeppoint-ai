#!/usr/bin/env python3
"""
语义聚类服务 - 基于智谱AI Embedding + DBSCAN
替代原有的 Jaccard 聚类算法，提供更好的语义相似度聚类
"""

import json
import sys
import os
import re
import time
import logging
from typing import List, Dict, Optional, Tuple
from pathlib import Path

import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances

# 加载环境变量
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent
load_dotenv(env_path / '.env.local')
load_dotenv(env_path / '.env')

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==================== 数据清洗模块 ====================

class DataCleaner:
    """高信噪比数据清洗器"""

    # 无效社交用语（会被直接过滤）
    NOISE_PATTERNS = [
        r'^哈+$',           # 纯哈哈哈
        r'^嘻+$',           # 纯嘻嘻嘻
        r'^呵+$',           # 纯呵呵呵
        r'^[好棒赞]+$',     # 纯好棒赞
        r'^支持+$',
        r'^加油+$',
        r'^蹲+$',
        r'^@\S+',           # @某人
        r'^转发微博',
        r'^已阅$',
        r'^mark$',
        r'^[Mm]ark$',
        r'^收藏$',
        r'^[👍❤️💕🎉😀😁😂🤣😃😄😅😆😊😋😎]+$',  # 纯表情
    ]

    # 无效短语列表
    NOISE_PHRASES = [
        '好听', '好看', '真好', '不错', '可以', '厉害', '牛', '绝了',
        '哈哈哈', '哈哈哈哈', '笑死', '笑了', '太好笑', '绝绝子',
        '蹲', '蹲一个', '等更新', '催更', '什么时候更新',
        '第一', '沙发', '前排', '来了', '打卡', '签到',
        '支持', '加油', '冲', '冲冲冲', '奥利给',
        'yyds', '永远的神', '太强了', '太棒了',
    ]

    # 白名单关键词（优先保留）- 痛点相关词汇
    WHITELIST_KEYWORDS = [
        '怎么', '难', '求', '坑', '贵', '麻烦', '导致', '希望',
        '代替', '不懂', '后悔', '避雷', '踩坑', '问题', '解决',
        '为什么', '如何', '哪里', '推荐', '建议', '教程',
        '不会', '学不会', '太难', '搞不懂', '看不懂',
        '便宜', '平替', '替代', '省钱', '划算',
        '吐槽', '差评', '退款', '售后', '客服', '质量',
        'bug', 'BUG', '卡', '闪退', '崩溃', '报错',
    ]

    def __init__(self, min_length: int = 4):
        self.min_length = min_length
        self.noise_regexes = [re.compile(p) for p in self.NOISE_PATTERNS]

    def is_noise(self, text: str) -> bool:
        """判断文本是否为噪音"""
        text = text.strip()

        # 长度过短
        if len(text) < self.min_length:
            return True

        # 匹配噪音正则
        for regex in self.noise_regexes:
            if regex.match(text):
                return True

        # 匹配噪音短语
        text_lower = text.lower()
        for phrase in self.NOISE_PHRASES:
            if text_lower == phrase.lower():
                return True

        return False

    def has_whitelist_keyword(self, text: str) -> bool:
        """检查是否包含白名单关键词"""
        for keyword in self.WHITELIST_KEYWORDS:
            if keyword in text:
                return True
        return False

    def calculate_score(self, text: str) -> float:
        """计算文本质量分数（用于排序）"""
        score = 1.0

        # 白名单加权
        if self.has_whitelist_keyword(text):
            score += 2.0

        # 长度加权（10-100字符最佳）
        length = len(text)
        if 10 <= length <= 100:
            score += 0.5
        elif length > 200:
            score -= 0.3

        # 包含问号加权（可能是问题/痛点）
        if '?' in text or '？' in text:
            score += 0.5

        return score

    def clean(self, texts: List[str]) -> Tuple[List[str], List[float]]:
        """
        清洗文本列表
        返回: (清洗后的文本列表, 对应的质量分数)
        """
        cleaned = []
        scores = []
        seen = set()  # 去重

        for text in texts:
            text = text.strip()

            # 跳过空文本
            if not text:
                continue

            # 去重
            if text in seen:
                continue
            seen.add(text)

            # 跳过噪音
            if self.is_noise(text):
                continue

            score = self.calculate_score(text)
            cleaned.append(text)
            scores.append(score)

        logger.info(f"数据清洗完成: {len(texts)} -> {len(cleaned)} 条 (过滤了 {len(texts) - len(cleaned)} 条噪音)")
        return cleaned, scores


# ==================== Embedding 模块 ====================

class ZhipuEmbedding:
    """智谱AI Embedding 服务"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('GLM_API_KEY')
        if not self.api_key:
            raise ValueError("未找到 GLM_API_KEY，请在 .env.local 或环境变量中配置")

        self.base_url = "https://open.bigmodel.cn/api/paas/v4/embeddings"
        self.model = os.getenv('GLM_EMBEDDING_MODEL', 'embedding-3')
        self.batch_size = 25  # 每批最大数量
        self.rate_limit_delay = 0.5  # 请求间隔（秒）

    def _get_embedding_batch(self, texts: List[str]) -> List[List[float]]:
        """获取一批文本的 embedding"""
        import urllib.request
        import urllib.error

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

        # 智谱 API 需要逐个请求
        embeddings = []
        for text in texts:
            data = json.dumps({
                'model': self.model,
                'input': text
            }).encode('utf-8')

            req = urllib.request.Request(self.base_url, data=data, headers=headers)

            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    embedding = result['data'][0]['embedding']
                    embeddings.append(embedding)
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                logger.error(f"API 错误: {e.code} - {error_body}")
                raise
            except Exception as e:
                logger.error(f"请求失败: {e}")
                raise

            # 添加延迟避免限流
            time.sleep(self.rate_limit_delay)

        return embeddings

    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        获取文本列表的 embedding 向量
        自动处理批量请求和限流
        """
        if not texts:
            return np.array([])

        all_embeddings = []
        total_batches = (len(texts) + self.batch_size - 1) // self.batch_size

        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            batch_num = i // self.batch_size + 1
            logger.info(f"正在获取 Embedding: 批次 {batch_num}/{total_batches} ({len(batch)} 条)")

            embeddings = self._get_embedding_batch(batch)
            all_embeddings.extend(embeddings)

        return np.array(all_embeddings)


# ==================== 聚类模块 ====================

class SemanticClusterer:
    """基于 DBSCAN 的语义聚类器"""

    def __init__(self, eps: float = 0.4, min_samples: int = 2):
        """
        参数:
            eps: DBSCAN 的邻域半径（基于余弦距离，0.3-0.5 较好）
            min_samples: 形成聚类的最小样本数
        """
        self.eps = eps
        self.min_samples = min_samples

    def cluster(self, embeddings: np.ndarray, texts: List[str], scores: Optional[List[float]] = None) -> List[Dict]:
        """
        执行 DBSCAN 聚类

        返回格式:
        [
            {
                "representative_text": "距离聚类中心最近的文本",
                "size": 聚类大小,
                "texts": ["文本1", "文本2", ...]
            },
            ...
        ]
        """
        if len(embeddings) == 0:
            return []

        if scores is None:
            scores = [1.0] * len(texts)

        # 计算余弦距离矩阵
        logger.info("正在计算余弦距离矩阵...")
        distance_matrix = cosine_distances(embeddings)

        # DBSCAN 聚类
        logger.info(f"正在执行 DBSCAN 聚类 (eps={self.eps}, min_samples={self.min_samples})...")
        dbscan = DBSCAN(eps=self.eps, min_samples=self.min_samples, metric='precomputed')
        labels = dbscan.fit_predict(distance_matrix)

        # 统计聚类结果
        unique_labels = set(labels)
        n_clusters = len([l for l in unique_labels if l != -1])
        n_noise = list(labels).count(-1)
        logger.info(f"聚类完成: {n_clusters} 个聚类, {n_noise} 个噪音点")

        # 构建聚类结果
        clusters = {}
        for idx, label in enumerate(labels):
            if label == -1:  # 噪音点单独处理
                continue
            if label not in clusters:
                clusters[label] = {
                    'indices': [],
                    'texts': [],
                    'scores': []
                }
            clusters[label]['indices'].append(idx)
            clusters[label]['texts'].append(texts[idx])
            clusters[label]['scores'].append(scores[idx])

        # 为每个聚类找出代表性文本
        results = []
        for label, cluster_data in clusters.items():
            indices = cluster_data['indices']
            cluster_texts = cluster_data['texts']
            cluster_scores = cluster_data['scores']

            # 计算聚类中心
            cluster_embeddings = embeddings[indices]
            centroid = np.mean(cluster_embeddings, axis=0)

            # 找到距离中心最近的文本
            distances_to_center = cosine_distances([centroid], cluster_embeddings)[0]

            # 综合距离和质量分数选择代表文本
            combined_scores = []
            for i, (dist, score) in enumerate(zip(distances_to_center, cluster_scores)):
                # 距离越小越好（取反），分数越高越好
                combined = -dist + score * 0.3
                combined_scores.append(combined)

            best_idx = np.argmax(combined_scores)
            representative_text = cluster_texts[best_idx]

            # 去重后的文本列表
            unique_texts = list(dict.fromkeys(cluster_texts))

            results.append({
                'representative_text': representative_text,
                'size': len(unique_texts),
                'texts': unique_texts
            })

        # 按聚类大小排序
        results.sort(key=lambda x: x['size'], reverse=True)

        # 处理噪音点：将高质量的噪音点作为单独聚类
        noise_indices = [i for i, label in enumerate(labels) if label == -1]
        for idx in noise_indices:
            if scores[idx] >= 2.0:  # 只保留高质量的噪音点
                results.append({
                    'representative_text': texts[idx],
                    'size': 1,
                    'texts': [texts[idx]]
                })

        return results


# ==================== 主流程 ====================

def process_texts(
    texts: List[str],
    eps: float = 0.4,
    min_samples: int = 2,
    min_length: int = 4
) -> List[Dict]:
    """
    完整的文本处理流程：清洗 -> Embedding -> 聚类
    """
    if not texts:
        return []

    # 1. 数据清洗
    logger.info("开始数据清洗...")
    cleaner = DataCleaner(min_length=min_length)
    cleaned_texts, scores = cleaner.clean(texts)

    if not cleaned_texts:
        logger.warning("清洗后没有有效文本")
        return []

    # 2. 获取 Embedding
    logger.info("开始获取 Embedding...")
    embedder = ZhipuEmbedding()
    embeddings = embedder.get_embeddings(cleaned_texts)

    # 3. DBSCAN 聚类
    logger.info("开始语义聚类...")
    clusterer = SemanticClusterer(eps=eps, min_samples=min_samples)
    clusters = clusterer.cluster(embeddings, cleaned_texts, scores)

    logger.info(f"处理完成，共 {len(clusters)} 个聚类")
    return clusters


def main():
    """命令行入口"""
    import argparse

    parser = argparse.ArgumentParser(description='语义聚类服务')
    parser.add_argument('--input', '-i', type=str, help='输入 JSON 文件路径')
    parser.add_argument('--output', '-o', type=str, help='输出 JSON 文件路径')
    parser.add_argument('--eps', type=float, default=0.4, help='DBSCAN eps 参数')
    parser.add_argument('--min-samples', type=int, default=2, help='DBSCAN min_samples 参数')
    parser.add_argument('--min-length', type=int, default=4, help='最小文本长度')
    parser.add_argument('--stdin', action='store_true', help='从标准输入读取 JSON')

    args = parser.parse_args()

    # 读取输入
    if args.stdin:
        input_data = json.loads(sys.stdin.read())
    elif args.input:
        with open(args.input, 'r', encoding='utf-8') as f:
            input_data = json.load(f)
    else:
        parser.error("请指定 --input 或 --stdin")
        return

    # 支持两种输入格式：直接数组或 {"texts": [...]}
    if isinstance(input_data, list):
        texts = input_data
    else:
        texts = input_data.get('texts', [])

    # 处理
    try:
        results = process_texts(
            texts,
            eps=args.eps,
            min_samples=args.min_samples,
            min_length=args.min_length
        )

        output = {
            'success': True,
            'clusters': results,
            'total_clusters': len(results),
            'total_texts': sum(c['size'] for c in results)
        }
    except Exception as e:
        logger.error(f"处理失败: {e}")
        output = {
            'success': False,
            'error': str(e),
            'clusters': []
        }

    # 输出结果
    result_json = json.dumps(output, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result_json)
        logger.info(f"结果已保存到 {args.output}")
    else:
        print(result_json)


if __name__ == '__main__':
    main()
