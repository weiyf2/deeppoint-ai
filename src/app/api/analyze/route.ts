import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '../../../../lib/services/job-manager';
import { DEFAULT_DATA_SOURCE, isDataSourceType } from '../../../../lib/services/data-source-interface';
import {
  normalizeBoolean,
  normalizeDouyinNewOptions,
  normalizeInteger,
  normalizeKeywords,
  normalizeLocale,
  parseJsonObject,
  REQUEST_LIMITS
} from '../../../../lib/services/request-validation';

export async function POST(request: NextRequest) {
  try {
    const bodyResult = await parseJsonObject(request);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: 400 }
      );
    }

    const body = bodyResult.value;
    const {
      keywords,
      dataSource = DEFAULT_DATA_SOURCE,
      douyinNewConfig
    } = body;

    // 验证输入
    const keywordResult = normalizeKeywords(keywords);
    if (!keywordResult.ok) {
      return NextResponse.json(
        { error: keywordResult.error },
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

    const requestedDeepCrawl = normalizeBoolean(body.deepCrawl, false);
    const limit = normalizeInteger(body.limit, REQUEST_LIMITS.analysisLimit);
    const maxVideos = normalizeInteger(body.maxVideos, REQUEST_LIMITS.legacyDeepCrawlVideos);
    const locale = normalizeLocale(body.locale);

    // 深度抓取支持抖音和新版抖音
    const enableDeepCrawl = requestedDeepCrawl && (dataSource === 'douyin' || dataSource === 'douyin_new');

    // 新版抖音的完整配置
    const douyinNewOptions = dataSource === 'douyin_new'
      ? normalizeDouyinNewOptions(douyinNewConfig)
      : undefined;
    const effectiveLimit = douyinNewOptions?.maxVideos ?? limit;

    // 创建分析任务
    const jobId = jobManager.createJob(
      keywordResult.value,
      effectiveLimit,
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
