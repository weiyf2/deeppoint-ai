"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import AnalysisForm from "@/components/AnalysisForm";
import JobStatus from "@/components/JobStatus";
import ResultsTable from "@/components/ResultsTable";
import DetailModal from "@/components/DetailModal";
import ExportButton from "@/components/ExportButton";

// ClusterResult 类型定义
interface ClusterResult {
  id: string;
  size: number;
  analysis: {
    one_line_pain: string;
    paid_interest: "High" | "Medium" | "Low";
    rationale: string;
    potential_product: string;
  };
  representative_texts: string[];
}

// API 响应类型
interface JobResponse {
  jobId: string;
  status: string;
  progress: string;
  results?: ClusterResult[];
  error?: string;
}

// SWR fetcher 函数
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<ClusterResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 模态框状态管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ClusterResult | null>(null);

  // 使用 useSWR 轮询任务状态
  const { data: jobData, error: jobError } = useSWR<JobResponse>(
    jobId ? `/api/jobs/${jobId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // 只有当任务存在且状态为 processing 时才轮询
        if (!jobId) return 0;
        if (!data) return 2000; // 数据还未加载，继续轮询
        return data.status === "processing" ? 2000 : 0;
      },
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data.status === "completed" && data.results) {
          setResults(data.results);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setIsLoading(false);
        }
      }
    }
  );

  const handleAnalysisSubmit = async (keywords: string[], dataSource: 'xiaohongshu' | 'douyin', deepCrawl: boolean, maxVideos: number) => {
    try {
      setIsLoading(true);
      setJobId(null);
      setResults([]);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          limit: 200,
          dataSource,
          deepCrawl,
          maxVideos
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.jobId) {
        setJobId(data.jobId);
      } else {
        throw new Error('未收到有效的任务ID');
      }
    } catch {
      setIsLoading(false);
    }
  };

  // 处理表格行点击
  const handleRowClick = (result: ClusterResult) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResult(null);
  };

  // 计算总信号数
  const totalSignals = results.reduce((sum, r) => sum + r.size, 0);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 flex flex-col items-center">
      {/* 顶部导航 */}
      <nav className="w-full max-w-5xl flex justify-between items-center mb-12 fade-in">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#18181B] rounded-lg flex items-center justify-center text-white font-bold text-xl">
            A
          </div>
          <span className="font-bold text-xl tracking-tight text-[#18181B]">
            DeepPoint<span className="text-gray-400 font-normal"> - ai </span>
          </span>
        </div>
        <div className="hidden sm:flex gap-6 text-sm font-medium text-gray-500">
          <Link href="/" className="text-[#18181B] hover:text-amber-600 transition">
            Dashboard
          </Link>
          <Link href="/ai-product" className="hover:text-[#18181B] transition">
            AI Product
          </Link>
        </div>
        <button className="w-8 h-8 rounded-full bg-[#E5E4DE] flex items-center justify-center hover:bg-[#F3F2EE] transition">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </nav>

      {/* 主容器 */}
      <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：输入控制区 */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-neuro border border-[#F3F2EE] relative overflow-hidden">
            {/* 装饰性光晕 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400 opacity-10 blur-3xl rounded-full"></div>

            <h1 className="text-2xl font-bold text-[#18181B] mb-1">开始探索</h1>
            <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">Define your target</p>

            <AnalysisForm
              onSubmit={handleAnalysisSubmit}
              isLoading={isLoading}
            />
          </div>

          {/* 状态卡片 */}
          {jobId && (
            <div className="fade-in">
              <JobStatus
                status={jobData?.status || "processing"}
                progressText={jobData?.progress || "正在初始化..."}
                error={jobData?.error || (jobError ? "网络错误，请重试" : undefined)}
              />
            </div>
          )}
        </div>

        {/* 右侧：结果展示区 */}
        <div className="lg:col-span-8 flex flex-col h-full">
          {/* 空状态 Placeholder */}
          {results.length === 0 && !isLoading && (
            <div className="h-full min-h-[400px] bg-white/50 border border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-[#F3F2EE] rounded-full flex items-center justify-center mb-4 text-gray-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-400">等待输入</h3>
              <p className="text-gray-400 text-sm mt-1">在左侧设置参数以生成用户痛点报告</p>
            </div>
          )}

          {/* 结果列表 */}
          {results.length > 0 && (
            <div className="fade-in space-y-5">
              {/* Header Stats */}
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="bg-white rounded-2xl p-4 shadow-neuro">
                  <div className="text-gray-400 text-xs font-semibold uppercase">Total Signals</div>
                  <div className="text-2xl font-bold text-[#18181B] mt-1">{totalSignals}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-neuro">
                  <div className="text-gray-400 text-xs font-semibold uppercase">Pain Points</div>
                  <div className="text-2xl font-bold text-[#18181B] mt-1">{results.length}</div>
                </div>
                <ExportButton results={results} />
              </div>

              {/* Card Grid */}
              <ResultsTable
                results={results}
                onRowClick={handleRowClick}
              />
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <DetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        result={selectedResult}
      />
    </div>
  );
}
