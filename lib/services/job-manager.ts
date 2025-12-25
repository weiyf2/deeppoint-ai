// 任务管理服务
import { v4 as uuidv4 } from 'uuid';
import { DataSourceFactory } from './data-source-factory';
import { DataSourceType } from './data-source-interface';
import { ClusteringService, ClusterResult } from './clustering-service';
import { GLMService } from './glm-service';

export interface Job {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: string;
  keywords: string[];
  limit: number;
  dataSource: DataSourceType;
  deepCrawl: boolean;  // 是否深度抓取（含评论）
  maxVideos?: number;  // 深度抓取时的最大视频数
  startTime: number;
  results?: ClusterResult[];
  crawlStats?: {       // 抓取统计
    videoCount?: number;
    commentCount?: number;
    textCount?: number;
  };
  error?: string;
}

export interface CreateJobOptions {
  keywords: string[];
  limit?: number;
  dataSource?: DataSourceType;
  deepCrawl?: boolean;
  maxVideos?: number;
}

export class JobManager {
  private jobs: Map<string, Job> = new Map();
  private clusteringService: ClusteringService;
  private glmService: GLMService;

  constructor() {
    this.clusteringService = new ClusteringService();
    this.glmService = new GLMService();
  }

  // 创建新任务
  public createJob(keywords: string[], limit: number = 200, dataSource: DataSourceType = 'xiaohongshu', deepCrawl: boolean = false, maxVideos: number = 10): string {
    const jobId = uuidv4();
    const job: Job = {
      jobId,
      status: 'processing',
      progress: '正在初始化...',
      keywords,
      limit,
      dataSource,
      deepCrawl,
      maxVideos,
      startTime: Date.now()
    };

    this.jobs.set(jobId, job);

    // 异步执行任务
    this.executeJob(jobId).catch(() => {
      this.updateJobStatus(jobId, 'failed', '任务执行失败');
    });

    return jobId;
  }

  // 获取任务状态
  public getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  // 更新任务状态
  private updateJobStatus(jobId: string, status: Job['status'], progress?: string, error?: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (progress) job.progress = progress;
      if (error) job.error = error;
    }
  }

  // 执行完整的分析任务
  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // 创建数据源服务
      const dataSourceService = DataSourceFactory.createDataSource(job.dataSource);
      const sourceName = DataSourceFactory.getSourceDisplayName(job.dataSource);

      // 步骤1: 检查数据源可用性（如果支持）
      if (dataSourceService.checkAvailability) {
        this.updateJobStatus(jobId, 'processing', `正在验证${sourceName}数据源...`);
        const isAvailable = await dataSourceService.checkAvailability();
        if (!isAvailable) {
          throw new Error(`${sourceName}数据源不可用，请检查配置`);
        }
      }

      // 步骤2: 抓取数据
      const allRawTexts: string[] = [];
      let totalVideoCount = 0;
      let totalCommentCount = 0;

      for (let i = 0; i < job.keywords.length; i++) {
        const keyword = job.keywords[i];

        // 根据是否深度抓取选择不同的方法
        if (job.deepCrawl && dataSourceService.searchWithComments) {
          // 深度抓取模式（含评论）
          this.updateJobStatus(jobId, 'processing', `正在深度抓取 "${keyword}" 相关数据（含评论）...`);

          const result = await dataSourceService.searchWithComments(keyword, {
            maxVideos: job.maxVideos || 10,
            maxCommentsPerVideo: 30
          });

          allRawTexts.push(...result.rawTexts);
          totalVideoCount += result.videoCount || 0;
          totalCommentCount += result.commentCount || 0;
        } else {
          // 标准抓取模式
          this.updateJobStatus(jobId, 'processing', `正在从${sourceName}抓取 "${keyword}" 相关数据...`);

          const { rawTexts } = await dataSourceService.searchAndFetch(
            keyword,
            Math.floor(job.limit / job.keywords.length)
          );

          allRawTexts.push(...rawTexts);
        }
      }

      // 保存抓取统计
      job.crawlStats = {
        videoCount: totalVideoCount,
        commentCount: totalCommentCount,
        textCount: allRawTexts.length
      };

      if (allRawTexts.length === 0) {
        throw new Error('未能获取到任何相关数据');
      }

      // 步骤3: 文本聚类（使用语义向量化 + DBSCAN）
      this.updateJobStatus(jobId, 'processing', '正在进行语义聚类分析...');
      const clusters = await this.clusteringService.clusterTexts(allRawTexts, 2);

      if (clusters.length === 0) {
        throw new Error('无法从数据中识别出明显的痛点聚类');
      }

      // 步骤4: LLM分析每个聚类
      this.updateJobStatus(jobId, 'processing', '正在调用LLM分析...');
      const results: ClusterResult[] = [];

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const representativeTexts = this.clusteringService.getRepresentativeTexts(cluster, 8);

        try {
          // 调用GLM分析聚类
          const analysis = await this.glmService.analyzeCluster(representativeTexts);

          const result: ClusterResult = {
            id: this.clusteringService.generateClusterId(i),
            size: cluster.length,
            analysis: {
              one_line_pain: analysis.one_line_pain || '用户痛点待分析',
              paid_interest: analysis.paid_interest || 'Medium',
              rationale: analysis.rationale || '基于用户评论分析',
              potential_product: analysis.potential_product || '产品概念待构思'
            },
            representative_texts: representativeTexts.slice(0, 5)
          };

          results.push(result);

          // 更新进度
          const progress = `正在分析聚类 ${i + 1}/${clusters.length}...`;
          this.updateJobStatus(jobId, 'processing', progress);

          // 避免API调用过快
          if (i < clusters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch {
          // 创建一个默认结果
          const result: ClusterResult = {
            id: this.clusteringService.generateClusterId(i),
            size: cluster.length,
            analysis: {
              one_line_pain: `基于 ${job.keywords.join(', ')} 的用户需求痛点`,
              paid_interest: 'Medium',
              rationale: '由于LLM分析失败，基于聚类大小和代表性文本推断',
              potential_product: `针对 ${job.keywords.join(', ')} 用户的解决方案`
            },
            representative_texts: representativeTexts.slice(0, 5)
          };
          results.push(result);
        }
      }

      // 步骤5: 完成任务
      job.results = results;
      job.status = 'completed';
      job.progress = '分析完成';

    } catch (error) {
      this.updateJobStatus(jobId, 'failed', '任务失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  // 清理过期任务（可选）
  public cleanupExpiredJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      if (now - job.startTime > maxAge) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// 全局单例实例
export const jobManager = new JobManager();