import { NextRequest, NextResponse } from 'next/server';
import { aiProductJobManager } from '../../../../../lib/services/ai-product-job-manager';
import { NO_STORE_HEADERS } from '../../../../../lib/services/http-headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "缺少任务ID" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const job = aiProductJobManager.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "任务不存在" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(job, { headers: NO_STORE_HEADERS });

  } catch {
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}


