import { NextRequest, NextResponse } from 'next/server';
import { jobManager, RawVideoData, RawCommentData } from '../../../../../lib/services/job-manager';
import { ClusterResult } from '../../../../../lib/services/clustering-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: "任务ID是必需的" },
        { status: 400 }
      );
    }

    // 从任务管理器获取任务状态
    const job = jobManager.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "任务不存在" },
        { status: 404 }
      );
    }

    // 构造响应
    const response: {
      jobId: string;
      status: string;
      progress: string;
      keywords?: string[];
      results?: ClusterResult[];
      rawData?: {
        videos: RawVideoData[];
        comments: RawCommentData[];
        rawTexts: string[];
      };
      error?: string;
    } = {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      keywords: job.keywords
    };

    // 如果任务完成，包含结果
    if (job.status === "completed" && job.results) {
      response.results = job.results;
      // 包含原始数据
      if (job.rawData) {
        response.rawData = job.rawData;
      }
    }

    // 如果任务失败，包含错误信息
    if (job.status === "failed") {
      response.error = job.error || "任务执行失败";
    }

    return NextResponse.json(response);

  } catch {
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}