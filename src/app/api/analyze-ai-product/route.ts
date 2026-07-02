import { NextRequest, NextResponse } from 'next/server';
import { aiProductJobManager } from '../../../../lib/services/ai-product-job-manager';
import { DEFAULT_DATA_SOURCE, isDataSourceType } from '../../../../lib/services/data-source-interface';
import {
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
    const { keywords, dataSource = DEFAULT_DATA_SOURCE } = body;

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

    const limit = normalizeInteger(body.limit, REQUEST_LIMITS.aiProductLimit);
    const effectiveLimit = dataSource === 'douyin_new'
      ? normalizeDouyinNewOptions(body.douyinNewConfig).maxVideos
      : limit;
    const locale = normalizeLocale(body.locale);

    // 创建AI产品分析任务
    const jobId = aiProductJobManager.createJob(keywordResult.value, effectiveLimit, dataSource, locale);

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


