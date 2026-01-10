// 任务管理服务
import { v4 as uuidv4 } from 'uuid';
import { DataSourceFactory } from './data-source-factory';
import { DataSourceType, DouyinNewCrawlOptions } from './data-source-interface';
import { ClusteringService, ClusterResult } from './clustering-service';
import { GLMService } from './glm-service';
import { PriorityScorer, PriorityScore } from './priority-scoring';

// 原始视频数据接口
export interface RawVideoData {
  title: string;
  author: string;
  video_url: string;
  publish_time?: string;
  likes: string;
  collected_at: string;
  comment_count?: number;
  description?: string;
}

// 原始评论数据接口
export interface RawCommentData {
  video_title: string;
  comment_text: string;
  username: string;
  likes: string;
}

// 聚类数据接口
export interface ClusteredDataGroup {
  clusterId: number;
  size: number;
  videos: RawVideoData[];
  comments: RawCommentData[];
}

export interface Job {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: string;
  keywords: string[];
  limit: number;
  dataSource: DataSourceType;
  deepCrawl: boolean;  // 是否深度抓取（含评论）
  maxVideos?: number;  // 深度抓取时的最大视频数
  douyinNewOptions?: DouyinNewCrawlOptions;  // 新版抖音完整配置
  startTime: number;
  results?: ClusterResult[];
  crawlStats?: {       // 抓取统计
    videoCount?: number;
    commentCount?: number;
    textCount?: number;
  };
  // 数据质量元信息
  dataQuality?: {
    level: 'reliable' | 'preliminary' | 'exploratory';  // 可靠样本 | 初步验证 | 小样本探索
    totalDataSize: number;
    clusterCount: number;
    averageClusterSize: number;
  };
  // 原始数据存储
  rawData?: {
    videos: RawVideoData[];
    comments: RawCommentData[];
    rawTexts: string[];
  };
  // 聚类后的数据分组
  clusteredData?: ClusteredDataGroup[];
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
  private priorityScorer: PriorityScorer;

  constructor() {
    this.clusteringService = new ClusteringService();
    this.glmService = new GLMService();
    this.priorityScorer = new PriorityScorer();
  }

  // 创建新任务
  public createJob(
    keywords: string[],
    limit: number = 200,
    dataSource: DataSourceType = 'xiaohongshu',
    deepCrawl: boolean = false,
    maxVideos: number = 10,
    douyinNewOptions?: DouyinNewCrawlOptions
  ): string {
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
      douyinNewOptions,
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
      const allVideos: RawVideoData[] = [];
      const allComments: RawCommentData[] = [];
      // 建立文本索引到原始数据的映射
      const textToSourceMap: Map<string, { type: 'video' | 'comment', data: RawVideoData | RawCommentData }> = new Map();
      let totalVideoCount = 0;
      let totalCommentCount = 0;

      for (let i = 0; i < job.keywords.length; i++) {
        const keyword = job.keywords[i];

        // 根据是否深度抓取选择不同的方法
        if (job.deepCrawl && dataSourceService.searchWithComments) {
          // 深度抓取模式（含评论）
          this.updateJobStatus(jobId, 'processing', `正在深度抓取 "${keyword}" 相关数据（含评论）...`);

          // 为新版抖音使用完整配置
          const crawlOptions = job.dataSource === 'douyin_new' && job.douyinNewOptions
            ? {
                maxVideos: job.douyinNewOptions.maxVideos,
                maxCommentsPerVideo: job.douyinNewOptions.maxCommentsPerVideo
              }
            : {
                maxVideos: job.maxVideos || 10,
                maxCommentsPerVideo: 30
              };

          const result = await dataSourceService.searchWithComments(keyword, crawlOptions);

          allRawTexts.push(...result.rawTexts);
          totalVideoCount += result.videoCount || 0;
          totalCommentCount += result.commentCount || 0;

          // 保存原始视频数据
          if (result.videos) {
            for (const video of result.videos) {
              const videoData: RawVideoData = {
                title: video.title || '',
                author: video.author || '',
                video_url: video.video_url || '',
                publish_time: video.publish_time,
                likes: video.likes || '0',
                collected_at: video.collected_at || new Date().toISOString(),
                comment_count: video.comment_count,
                description: video.description
              };
              allVideos.push(videoData);

              // 建立视频标题到数据的映射
              if (videoData.title) {
                textToSourceMap.set(videoData.title, { type: 'video', data: videoData });
              }
            }
          }

          // 保存原始评论数据
          if (result.allComments) {
            for (const comment of result.allComments) {
              const commentData: RawCommentData = {
                video_title: comment.video_title || '',
                comment_text: comment.comment_text || '',
                username: comment.username || '',
                likes: comment.likes || '0'
              };
              allComments.push(commentData);

              // 建立评论文本到数据的映射
              if (commentData.comment_text) {
                textToSourceMap.set(commentData.comment_text, { type: 'comment', data: commentData });
              }
            }
          }
        } else {
          // 标准抓取模式
          this.updateJobStatus(jobId, 'processing', `正在从${sourceName}抓取 "${keyword}" 相关数据...`);

          const result = await dataSourceService.searchAndFetch(
            keyword,
            Math.floor(job.limit / job.keywords.length)
          );

          allRawTexts.push(...result.rawTexts);

          // 保存原始视频数据（标准模式）
          if (result.videos) {
            for (const video of result.videos) {
              const videoData: RawVideoData = {
                title: video.title || '',
                author: video.author || '',
                video_url: video.video_url || '',
                publish_time: video.publish_time,
                likes: video.likes || '0',
                collected_at: video.collected_at || new Date().toISOString(),
                comment_count: video.comment_count,
                description: video.description
              };
              allVideos.push(videoData);

              // 建立视频标题到数据的映射
              if (videoData.title) {
                textToSourceMap.set(videoData.title, { type: 'video', data: videoData });
              }
            }
          }
        }
      }

      // 保存抓取统计
      job.crawlStats = {
        videoCount: totalVideoCount || allVideos.length,
        commentCount: totalCommentCount || allComments.length,
        textCount: allRawTexts.length
      };

      // 保存原始数据
      job.rawData = {
        videos: allVideos,
        comments: allComments,
        rawTexts: allRawTexts
      };

      if (allRawTexts.length === 0) {
        throw new Error('未能获取到任何相关数据');
      }

      // 步骤3: 分离视频和评论进行聚类（避免不同语义层次混淆）
      this.updateJobStatus(jobId, 'processing', '正在进行语义聚类分析...');

      // 3.1 视频内容聚类
      const videoTexts = allVideos.map(v => v.title).filter(t => t && t.length > 0);
      let videoClusters: string[][] = [];
      if (videoTexts.length > 0) {
        this.updateJobStatus(jobId, 'processing', `正在对 ${videoTexts.length} 条视频内容进行聚类...`);
        // 不传递 minClusterSize，让 Python 自动计算 min_samples
        videoClusters = await this.clusteringService.clusterTexts(videoTexts);
        console.log(`视频聚类完成: ${videoClusters.length} 个聚类`);
      }

      // 3.2 评论内容聚类
      const commentTexts = allComments.map(c => c.comment_text).filter(t => t && t.length > 0);
      let commentClusters: string[][] = [];
      if (commentTexts.length > 0) {
        this.updateJobStatus(jobId, 'processing', `正在对 ${commentTexts.length} 条评论内容进行聚类...`);
        // 不传递 minClusterSize，让 Python 自动计算 min_samples
        commentClusters = await this.clusteringService.clusterTexts(commentTexts);
        console.log(`评论聚类完成: ${commentClusters.length} 个聚类`);
      }

      // 合并聚类结果（视频聚类在前，评论聚类在后）
      const clusters = [...videoClusters, ...commentClusters];

      if (clusters.length === 0) {
        const totalTexts = videoTexts.length + commentTexts.length;
        throw new Error(
          `无法从数据中识别出有意义的聚类（需要至少3条相似数据才能形成聚类）。\n` +
          `当前数据：${videoTexts.length}条视频，${commentTexts.length}条评论。\n` +
          `建议：增加数据量或使用更相关的搜索关键词。`
        );
      }

      console.log(`总聚类数: ${clusters.length} (视频: ${videoClusters.length}, 评论: ${commentClusters.length})`);
      if (clusters.length < 3) {
        console.warn(`⚠️ 聚类数量较少(${clusters.length}个)，可能需要更多数据或调整关键词以获得更丰富的分析结果`);
      }

      // 构建聚类数据分组（用于导出）
      const clusteredDataGroups: ClusteredDataGroup[] = [];
      const videoClusterCount = videoClusters.length;

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const clusterVideos: RawVideoData[] = [];
        const clusterComments: RawCommentData[] = [];

        // 判断当前聚类是视频聚类还是评论聚类
        const isVideoCluster = i < videoClusterCount;

        if (isVideoCluster) {
          // 视频聚类：从textToSourceMap中找对应的视频数据
          for (const text of cluster) {
            const source = textToSourceMap.get(text);
            if (source && source.type === 'video') {
              clusterVideos.push(source.data as RawVideoData);
            }
          }
        } else {
          // 评论聚类：从textToSourceMap中找对应的评论数据
          for (const text of cluster) {
            const source = textToSourceMap.get(text);
            if (source && source.type === 'comment') {
              clusterComments.push(source.data as RawCommentData);
            }
          }
        }

        clusteredDataGroups.push({
          clusterId: i,
          size: cluster.length,
          videos: clusterVideos,
          comments: clusterComments
        });
      }

      // 保存聚类数据
      job.clusteredData = clusteredDataGroups;

      // 步骤4: LLM分析每个聚类
      this.updateJobStatus(jobId, 'processing', '正在调用LLM分析...');
      const results: ClusterResult[] = [];

      for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const representativeTexts = this.clusteringService.getRepresentativeTexts(cluster, 8);

        try {
          // 调用GLM分析聚类（传递关键词和数据规模）
          const analysis = await this.glmService.analyzeCluster(
            representativeTexts,
            job.keywords,
            allRawTexts.length
          );

          // 计算优先级分数
          const priorityScore = this.priorityScorer.scoreCluster({
            clusterSize: cluster.length,
            totalDataSize: allRawTexts.length,
            emotionalIntensity: analysis.pain_depth?.emotional_intensity || 2,
            glmMarketScore: analysis.market_size_score || 2.5,
            existingSolutions: analysis.market_landscape?.existing_solutions || []
          });

          const result: ClusterResult = {
            id: this.clusteringService.generateClusterId(i),
            size: cluster.length,
            analysis: {
              one_line_pain: analysis.one_line_pain || '用户痛点待分析',
              paid_interest: analysis.paid_interest || 'Medium',
              rationale: analysis.rationale || '基于用户评论分析',
              potential_product: analysis.potential_product || '产品概念待构思',

              // 新增深度分析维度
              pain_depth: analysis.pain_depth,
              market_landscape: analysis.market_landscape,
              mvp_plan: analysis.mvp_plan,
              keyword_relevance: analysis.keyword_relevance
            },
            representative_texts: representativeTexts.slice(0, 5),
            priority_score: priorityScore
          };

          results.push(result);

          // 更新进度
          const progress = `正在分析聚类 ${i + 1}/${clusters.length}...`;
          this.updateJobStatus(jobId, 'processing', progress);

          // 避免API调用过快
          if (i < clusters.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`聚类 ${i} 分析失败:`, error);
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

      // 按优先级排序（从高到低）
      results.sort((a, b) => {
        const scoreA = a.priority_score?.overall || 0;
        const scoreB = b.priority_score?.overall || 0;
        return scoreB - scoreA;
      });

      // 步骤5: 添加数据质量元信息
      const totalDataSize = allRawTexts.length;
      const clusterCount = results.length;
      const averageClusterSize = clusterCount > 0
        ? Math.round(results.reduce((sum, r) => sum + r.size, 0) / clusterCount)
        : 0;

      let qualityLevel: 'reliable' | 'preliminary' | 'exploratory';
      if (totalDataSize < 50) {
        qualityLevel = 'exploratory';
      } else if (totalDataSize < 200) {
        qualityLevel = 'preliminary';
      } else {
        qualityLevel = 'reliable';
      }

      job.dataQuality = {
        level: qualityLevel,
        totalDataSize,
        clusterCount,
        averageClusterSize
      };

      // 步骤6: 完成任务
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