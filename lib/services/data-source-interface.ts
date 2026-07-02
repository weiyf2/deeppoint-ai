// 通用数据源接口定义

export type DataSourceType = 'xiaohongshu' | 'douyin' | 'douyin_new';

export const DEFAULT_DATA_SOURCE: DataSourceType = 'douyin_new';

export function isDataSourceType(value: unknown): value is DataSourceType {
  return value === 'xiaohongshu' || value === 'douyin' || value === 'douyin_new';
}

export interface DataSourceVideo {
  title?: string;
  author?: string;
  video_url?: string;
  publish_time?: string;
  likes?: string;
  collected_at?: string;
  comment_count?: number;
  description?: string;
}

export interface DataSourceComment {
  video_title?: string;
  comment_text?: string;
  username?: string;
  likes?: string;
}

export interface DataSourceResult {
  rawTexts: string[];
  videos?: DataSourceVideo[];
  metadata?: Record<string, unknown>;
}

export interface DeepCrawlResult {
  rawTexts: string[];
  videos?: DataSourceVideo[];
  allComments?: DataSourceComment[];
  videoCount?: number;
  commentCount?: number;
}

export interface DeepCrawlOptions {
  maxVideos?: number;
  maxCommentsPerVideo?: number;
}

// 新版抖音爬虫配置选项
export interface DouyinNewCrawlOptions {
  enableComments: boolean;        // 是否爬取评论
  maxVideos: number;              // 视频数量 (5-30)
  maxCommentsPerVideo: number;    // 每视频评论数 (10-50)
  enableSubComments: boolean;     // 是否爬取二级评论
}

export interface IDataSourceService {
  /**
   * 搜索并获取数据
   * @param keywords 关键词
   * @param limit 限制数量
   * @returns 包含原始文本的结果
   */
  searchAndFetch(keywords: string, limit: number): Promise<DataSourceResult>;

  /**
   * 深度抓取（含评论）
   * @param keywords 关键词
   * @param options 深度抓取选项
   * @returns 包含视频和评论的完整结果
   */
  searchWithComments?(keywords: string, options?: DeepCrawlOptions): Promise<DeepCrawlResult>;

  /**
   * 检查数据源是否可用（可选）
   */
  checkAvailability?(): Promise<boolean>;
}

