// 聚类分析服务 - 基于语义向量化 + DBSCAN
import { spawn } from 'child_process';
import * as path from 'path';

export interface SemanticCluster {
  representative_text: string;
  size: number;
  texts: string[];
}

export interface ClusteringResult {
  success: boolean;
  clusters: SemanticCluster[];
  total_clusters: number;
  total_texts: number;
  error?: string;
}

export interface ClusterResult {
  id: string;
  size: number;
  analysis: {
    one_line_pain: string;
    paid_interest: "High" | "Medium" | "Low";
    rationale: string;
    potential_product: string;
  };
  representative_texts: string[];
}

export class ClusteringService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // 使用系统 Python 或虚拟环境
    this.pythonPath = process.env.PYTHON_PATH || 'python';
    this.scriptPath = path.join(process.cwd(), 'lib', 'semantic_clustering.py');
  }

  /**
   * 调用 Python 语义聚类服务
   * 使用智谱 Embedding + DBSCAN 算法
   */
  public async clusterTextsWithEmbeddings(
    texts: string[],
    options: {
      eps?: number;
      minSamples?: number;
      minLength?: number;
    } = {}
  ): Promise<ClusteringResult> {
    const { eps = 0.4, minSamples = 2, minLength = 4 } = options;

    return new Promise((resolve, reject) => {
      const args = [
        this.scriptPath,
        '--stdin',
        '--eps', eps.toString(),
        '--min-samples', minSamples.toString(),
        '--min-length', minLength.toString()
      ];

      const pythonProcess = spawn(this.pythonPath, args, {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        // 将 Python 日志输出到控制台
        console.log('[Python]', data.toString().trim());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python 聚类脚本执行失败:', stderr);
          resolve({
            success: false,
            clusters: [],
            total_clusters: 0,
            total_texts: 0,
            error: stderr || `进程退出码: ${code}`
          });
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          console.error('解析 Python 输出失败:', stdout);
          resolve({
            success: false,
            clusters: [],
            total_clusters: 0,
            total_texts: 0,
            error: '解析聚类结果失败'
          });
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('启动 Python 进程失败:', err);
        resolve({
          success: false,
          clusters: [],
          total_clusters: 0,
          total_texts: 0,
          error: `启动 Python 失败: ${err.message}`
        });
      });

      // 发送输入数据
      const inputJson = JSON.stringify({ texts });
      pythonProcess.stdin.write(inputJson);
      pythonProcess.stdin.end();
    });
  }

  /**
   * 兼容旧接口的聚类方法
   * 内部使用新的语义聚类
   */
  public async clusterTexts(texts: string[], minClusterSize: number = 2): Promise<string[][]> {
    const result = await this.clusterTextsWithEmbeddings(texts, {
      minSamples: minClusterSize
    });

    if (!result.success || result.clusters.length === 0) {
      // 降级到基础聚类
      console.warn('语义聚类失败，使用基础聚类');
      return this.fallbackCluster(texts, minClusterSize);
    }

    // 转换为旧格式
    return result.clusters.map(c => c.texts);
  }

  /**
   * 获取语义聚类结果（新格式）
   */
  public async getSemanticClusters(texts: string[]): Promise<SemanticCluster[]> {
    const result = await this.clusterTextsWithEmbeddings(texts);

    if (!result.success) {
      console.warn('语义聚类失败:', result.error);
      return [];
    }

    return result.clusters;
  }

  /**
   * 降级聚类算法（当 Python 服务不可用时）
   * 使用简单的关键词匹配
   */
  private fallbackCluster(texts: string[], minClusterSize: number): string[][] {
    if (texts.length === 0) return [];
    if (texts.length < minClusterSize) return [texts];

    // 简单的关键词聚类
    const clusters: Map<string, string[]> = new Map();
    const keywords = ['价格', '质量', '服务', '功能', '使用', '推荐', '问题', '效果'];

    for (const text of texts) {
      let assigned = false;
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          const existing = clusters.get(keyword) || [];
          existing.push(text);
          clusters.set(keyword, existing);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        const others = clusters.get('其他') || [];
        others.push(text);
        clusters.set('其他', others);
      }
    }

    return Array.from(clusters.values()).filter(c => c.length >= minClusterSize);
  }

  // 为每个聚类选择代表性文本
  public getRepresentativeTexts(cluster: string[], maxCount: number = 5): string[] {
    if (cluster.length <= maxCount) {
      return cluster;
    }

    // 选择长度适中的文本
    const scored = cluster.map(text => ({
      text,
      score: this.calculateRepresentativeness(text, cluster)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxCount).map(item => item.text);
  }

  private calculateRepresentativeness(text: string, cluster: string[]): number {
    const textLength = text.length;

    // 惩罚过短或过长的文本
    let lengthScore = 1.0;
    if (textLength < 10) lengthScore = 0.5;
    if (textLength > 200) lengthScore = 0.7;
    if (textLength >= 20 && textLength <= 100) lengthScore = 1.2;

    // 包含问题关键词加分
    const painKeywords = ['怎么', '难', '坑', '贵', '问题', '希望', '不懂'];
    let keywordScore = 0;
    for (const keyword of painKeywords) {
      if (text.includes(keyword)) {
        keywordScore += 0.3;
      }
    }

    return lengthScore + keywordScore;
  }

  // 生成聚类ID
  public generateClusterId(index: number): string {
    return `cluster-${index + 1}`;
  }
}
