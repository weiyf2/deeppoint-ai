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

    // 新增深度分析维度
    pain_depth?: {
      surface_pain: string;
      root_causes: string[];
      user_scenarios: string[];
      emotional_intensity: number;
    };

    market_landscape?: {
      existing_solutions: Array<{
        name: string;
        limitation: string;
      }>;
      unmet_needs: string[];
      opportunity: string;
    };

    mvp_plan?: {
      core_features: string[];
      validation_hypotheses: Array<{
        hypothesis: string;
        test_method: string;
      }>;
      first_users: string;
      timeline: string;
      estimated_cost: string;
    };

    keyword_relevance?: number;
  };
  representative_texts: string[];
  priority_score?: {
    demand_intensity: number;
    market_size: number;
    competition: number;
    overall: number;
    level: 'High' | 'Medium' | 'Low';
  };
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
    // eps 和 minSamples 都不设置默认值，让 Python 根据数据量自动计算
    const { eps, minSamples, minLength = 4 } = options;

    return new Promise((resolve) => {
      const args = [
        this.scriptPath,
        '--stdin',
        '--min-length', minLength.toString()
      ];

      // 只有明确指定了参数才传递，否则让Python自动计算
      if (eps !== undefined) {
        args.push('--eps', eps.toString());
      }
      if (minSamples !== undefined) {
        args.push('--min-samples', minSamples.toString());
      }

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
        } catch {
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
  public async clusterTexts(texts: string[], minClusterSize?: number): Promise<string[][]> {
    const result = await this.clusterTextsWithEmbeddings(texts, {
      // 只有明确传递了 minClusterSize 才使用，否则让 Python 自动计算
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
  private fallbackCluster(texts: string[], minClusterSize?: number): string[][] {
    if (texts.length === 0) return [];

    // 最小聚类大小至少为3，保证统计意义
    const effectiveMinSize = Math.max(minClusterSize || 3, 3);

    // 如果数据量太小无法形成有意义的聚类，返回空数组
    if (texts.length < effectiveMinSize) {
      console.warn(`数据量(${texts.length})不足以形成有意义的聚类(需要至少${effectiveMinSize}条)`);
      return [];
    }

    // 简单的关键词聚类
    const clusters: Map<string, string[]> = new Map();
    const keywords = ['价格', '质量', '服务', '功能', '使用', '推荐', '问题', '效果',
                      '怎么', '求', '哪里', '如何', '为什么', '不会', '难'];

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

    const result = Array.from(clusters.values()).filter(c => c.length >= effectiveMinSize);

    // 如果过滤后没有结果，检查是否可以放宽要求
    if (result.length === 0 && texts.length >= 3) {
      console.warn('Fallback聚类未找到匹配，尝试将所有文本作为单个聚类');
      return [texts];
    }

    return result;
  }

  // 为每个聚类选择代表性文本
  public getRepresentativeTexts(cluster: string[], maxCount: number = 5): string[] {
    if (cluster.length <= maxCount) {
      return cluster;
    }

    // 选择长度适中的文本
    const scored = cluster.map(text => ({
      text,
      score: this.calculateRepresentativeness(text)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxCount).map(item => item.text);
  }

  private calculateRepresentativeness(text: string): number {
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
