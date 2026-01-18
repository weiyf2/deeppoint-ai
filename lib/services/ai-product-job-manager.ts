// AI产品分析任务管理器
import { v4 as uuidv4 } from 'uuid';
import { DataSourceFactory } from './data-source-factory';
import { DataSourceType } from './data-source-interface';
import { AIProductService, AIProductResult } from './ai-product-service';

export interface AIProductJob {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: string;
  keywords: string[];
  limit: number;
  dataSource: DataSourceType;
  locale: string;  // 输出语言
  startTime: number;
  results?: AIProductResult[];
  error?: string;
}

export class AIProductJobManager {
  private jobs: Map<string, AIProductJob> = new Map();
  private aiProductService: AIProductService;

  constructor() {
    this.aiProductService = new AIProductService();
  }

  // 创建新任务
  public createJob(keywords: string[], limit: number = 50, dataSource: DataSourceType = 'xiaohongshu', locale: string = 'zh'): string {
    const jobId = uuidv4();
    const job: AIProductJob = {
      jobId,
      status: 'processing',
      progress: '正在初始化...',
      keywords,
      limit,
      dataSource,
      locale,
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
  public getJob(jobId: string): AIProductJob | null {
    return this.jobs.get(jobId) || null;
  }

  // 更新任务状态
  private updateJobStatus(jobId: string, status: AIProductJob['status'], progress?: string, error?: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (progress) job.progress = progress;
      if (error) job.error = error;
    }
  }

  // 执行AI产品分析任务
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
      this.updateJobStatus(jobId, 'processing', `正在从${sourceName}抓取数据...`);
      const allRawTexts: string[] = [];

      for (let i = 0; i < job.keywords.length; i++) {
        const keyword = job.keywords[i];

        const { rawTexts } = await dataSourceService.searchAndFetch(
          keyword,
          Math.floor(job.limit / job.keywords.length)
        );

        allRawTexts.push(...rawTexts);

        // 更新进度
        const progress = `正在从${sourceName}抓取 "${keyword}" 相关数据...`;
        this.updateJobStatus(jobId, 'processing', progress);
      }

      if (allRawTexts.length === 0) {
        throw new Error('未能获取到任何相关数据');
      }

      // 步骤3: AI产品分析
      this.updateJobStatus(jobId, 'processing', '正在进行AI产品分析...');

      // 将所有文本合并分析，生成AI产品建议
      const analysis = await this.aiProductService.analyzeForAIProduct(allRawTexts, job.locale);

      const result: AIProductResult = {
        id: 'ai-product-1',
        size: allRawTexts.length,
        analysis,
        representative_texts: allRawTexts.slice(0, 10)
      };

      // 步骤4: 完成任务
      job.results = [result];
      job.status = 'completed';
      job.progress = '分析完成';

    } catch (error) {
      this.updateJobStatus(jobId, 'failed', '任务失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  // 清理过期任务
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
export const aiProductJobManager = new AIProductJobManager();


