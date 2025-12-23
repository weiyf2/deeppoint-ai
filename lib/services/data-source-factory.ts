// 数据源工厂
import { XHSService } from './xhs-service';
import { DouyinService } from './douyin-service';
import { IDataSourceService, DataSourceType, DataSourceResult, DeepCrawlResult, DeepCrawlOptions } from './data-source-interface';

// XHS服务适配器
class XHSServiceAdapter implements IDataSourceService {
  private service: XHSService;

  constructor() {
    this.service = new XHSService();
  }

  async searchAndFetch(keywords: string, limit: number): Promise<DataSourceResult> {
    const { rawTexts } = await this.service.searchNotes(keywords, limit);
    return {
      rawTexts,
      metadata: { source: 'xiaohongshu' }
    };
  }

  async checkAvailability(): Promise<boolean> {
    return await this.service.checkCookie();
  }
}

// 抖音服务适配器
class DouyinServiceAdapter implements IDataSourceService {
  private service: DouyinService;

  constructor() {
    this.service = new DouyinService();
  }

  async searchAndFetch(keywords: string, limit: number): Promise<DataSourceResult> {
    const { rawTexts } = await this.service.searchVideos(keywords, limit);
    return {
      rawTexts,
      metadata: { source: 'douyin' }
    };
  }

  async searchWithComments(keywords: string, options?: DeepCrawlOptions): Promise<DeepCrawlResult> {
    return await this.service.searchWithComments(keywords, options);
  }
}

// 数据源工厂类
export class DataSourceFactory {
  static createDataSource(type: DataSourceType): IDataSourceService {
    switch (type) {
      case 'xiaohongshu':
        return new XHSServiceAdapter();
      case 'douyin':
        return new DouyinServiceAdapter();
      default:
        throw new Error(`不支持的数据源类型: ${type}`);
    }
  }

  static getSupportedSources(): DataSourceType[] {
    return ['xiaohongshu', 'douyin'];
  }

  static getSourceDisplayName(type: DataSourceType): string {
    const names: Record<DataSourceType, string> = {
      'xiaohongshu': '小红书',
      'douyin': '抖音'
    };
    return names[type] || type;
  }

  static supportsDeepCrawl(type: DataSourceType): boolean {
    // 目前只有抖音支持深度抓取
    return type === 'douyin';
  }
}

