import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '../../../../lib/services/job-manager';
import { DEFAULT_DATA_SOURCE, DouyinNewCrawlOptions, isDataSourceType } from '../../../../lib/services/data-source-interface';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      keywords,
      limit = 200,
      dataSource = DEFAULT_DATA_SOURCE,
      deepCrawl = false,
      maxVideos = 10,
      douyinNewConfig,  // 新版抖音配置
      locale = 'zh'  // 输出语言
    } = body;

    // 验证输入
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "关键词是必需的，且必须是非空数组" },
        { status: 400 }
      );
    }

    // 验证关键词格式
    const validKeywords = keywords
      .filter(k => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim());
    if (validKeywords.length === 0) {
      return NextResponse.json(
        { error: "请提供有效的关键词" },
        { status: 400 }
      );
    }

    // 验证数据源
    if (!isDataSourceType(dataSource)) {
      return NextResponse.json(
        { error: "不支持的数据源类型" },
        { status: 400 }
      );
    }

    // 深度抓取支持抖音和新版抖音
    const enableDeepCrawl = deepCrawl && (dataSource === 'douyin' || dataSource === 'douyin_new');

    // 新版抖音的完整配置
    let douyinNewOptions: DouyinNewCrawlOptions | undefined;
    if (dataSource === 'douyin_new' && douyinNewConfig) {
      douyinNewOptions = {
        enableComments: douyinNewConfig.enableComments ?? true,
        maxVideos: douyinNewConfig.maxVideos ?? 15,
        maxCommentsPerVideo: douyinNewConfig.maxCommentsPerVideo ?? 20,
        enableSubComments: douyinNewConfig.enableSubComments ?? false
      };
    }

    // 创建分析任务
    const jobId = jobManager.createJob(
      validKeywords,
      limit,
      dataSource,
      enableDeepCrawl,
      maxVideos,
      douyinNewOptions,
      locale
    );

    // 立即返回任务ID，不等待任务完成
    return NextResponse.json(
      { jobId },
      { status: 202 }
    );

  } catch {
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
