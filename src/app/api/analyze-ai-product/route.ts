import { NextRequest, NextResponse } from 'next/server';
import { aiProductJobManager } from '../../../../lib/services/ai-product-job-manager';
import { DEFAULT_DATA_SOURCE, isDataSourceType } from '../../../../lib/services/data-source-interface';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, limit = 50, dataSource = DEFAULT_DATA_SOURCE, locale = 'zh' } = body;

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

    // 创建AI产品分析任务
    const jobId = aiProductJobManager.createJob(validKeywords, limit, dataSource, locale);

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


