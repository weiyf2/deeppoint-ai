// AI产品分析任务管理器
import { randomUUID } from 'node:crypto';
import { DataSourceFactory } from './data-source-factory';
import { DEFAULT_DATA_SOURCE, DataSourceType } from './data-source-interface';
import { AIProductService, AIProductResult } from './ai-product-service';
import { JOB_RETENTION, pruneExpiredJobs, trimOldestJobs } from './job-retention';
import { getJobTimeoutMs, JsonJobStore, jobQueue, logJobEvent, withTimeout } from './job-runtime';

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
  private jobs: Map<string, AIProductJob>;
  private jobStore: JsonJobStore<AIProductJob>;
  private aiProductService: AIProductService;
  private timedOutJobs: Set<string> = new Set();

  constructor() {
    this.jobStore = new JsonJobStore<AIProductJob>('ai-product');
    this.jobs = this.jobStore.loadAll();
    this.aiProductService = new AIProductService();
  }

  // 创建新任务
  public createJob(keywords: string[], limit: number = 50, dataSource: DataSourceType = DEFAULT_DATA_SOURCE, locale: string = 'zh'): string {
    this.cleanupExpiredJobs();

    const jobId = randomUUID();
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
    this.persistJob(job);
    this.trimJobs();
    logJobEvent('info', 'ai_product_job_created', {
      jobId,
      keywords,
      dataSource
    });

    // 异步执行任务
    jobQueue.run(
      jobId,
      'ai-product',
      () => withTimeout(
        this.executeJob(jobId),
        getJobTimeoutMs(),
        `任务执行超时（${Math.round(getJobTimeoutMs() / 1000)}秒）`
      ),
      () => this.updateJobStatus(jobId, 'processing', '正在初始化...')
    ).catch((error) => {
      if (error instanceof Error && error.message.includes('超时')) {
        this.timedOutJobs.add(jobId);
      }
      this.updateJobStatus(
        jobId,
        'failed',
        '任务执行失败',
        error instanceof Error ? error.message : '未知错误'
      );
    });

    return jobId;
  }

  // 获取任务状态
  public getJob(jobId: string): AIProductJob | null {
    this.cleanupExpiredJobs();
    return this.jobs.get(jobId) || null;
  }

  // 更新任务状态
  private updateJobStatus(jobId: string, status: AIProductJob['status'], progress?: string, error?: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      if (this.timedOutJobs.has(jobId) && status !== 'failed') {
        return;
      }

      job.status = status;
      if (progress) job.progress = progress;
      if (error) job.error = error;
      this.persistJob(job);
      logJobEvent(status === 'failed' ? 'error' : 'info', 'ai_product_job_status_changed', {
        jobId,
        status,
        progress: job.progress,
        error
      });
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
          Math.max(1, Math.floor(job.limit / job.keywords.length))
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
      this.updateJobStatus(jobId, 'completed', '分析完成');

    } catch (error) {
      this.updateJobStatus(jobId, 'failed', '任务失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  // 清理过期任务
  public cleanupExpiredJobs(maxAge: number = JOB_RETENTION.maxAgeMs): void {
    const existingJobIds = new Set(this.jobs.keys());
    pruneExpiredJobs(this.jobs, maxAge);
    for (const jobId of existingJobIds) {
      if (!this.jobs.has(jobId)) {
        this.jobStore.delete(jobId);
      }
    }
  }

  private trimJobs(): void {
    const existingJobIds = new Set(this.jobs.keys());
    trimOldestJobs(this.jobs);
    for (const jobId of existingJobIds) {
      if (!this.jobs.has(jobId)) {
        this.jobStore.delete(jobId);
      }
    }
  }

  private persistJob(job: AIProductJob): void {
    try {
      this.jobStore.save(job);
    } catch (error) {
      logJobEvent('error', 'ai_product_job_persist_failed', {
        jobId: job.jobId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

// 全局单例实例
export const aiProductJobManager = new AIProductJobManager();

