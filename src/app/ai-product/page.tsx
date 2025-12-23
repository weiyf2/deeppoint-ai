"use client";

import { useState } from "react";
import useSWR from "swr";
import AnalysisForm from "@/components/AnalysisForm";
import JobStatus from "@/components/JobStatus";
import AIProductCard from "@/components/AIProductCard";
import AIProductDetailModal from "@/components/AIProductDetailModal";
import Link from "next/link";

// AI产品分析结果类型
interface AIProductAnalysis {
  product_name: string;
  product_category: string;
  target_users: string;
  core_features: string[];
  ai_capabilities: string[];
  value_proposition: string;
  implementation_difficulty: "High" | "Medium" | "Low";
  market_potential: "High" | "Medium" | "Low";
  technical_stack: string[];
  development_roadmap: string[];
}

interface AIProductResult {
  id: string;
  size: number;
  analysis: AIProductAnalysis;
  representative_texts: string[];
}

// API 响应类型
interface JobResponse {
  jobId: string;
  status: string;
  progress: string;
  results?: AIProductResult[];
  error?: string;
}

// SWR fetcher 函数
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AIProductPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<AIProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 模态框状态管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AIProductResult | null>(null);

  // 使用 useSWR 轮询任务状态
  const { data: jobData, error: jobError } = useSWR<JobResponse>(
    jobId ? `/api/ai-product-jobs/${jobId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        if (!jobId) return 0;
        if (!data) return 2000;
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

  const handleAnalysisSubmit = async (keywords: string[], dataSource: 'xiaohongshu' | 'douyin') => {
    try {
      setIsLoading(true);
      setJobId(null);
      setResults([]);

      const response = await fetch('/api/analyze-ai-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          limit: 50,
          dataSource
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

  const handleViewDetails = (result: AIProductResult) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResult(null);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 flex flex-col items-center">
      {/* 顶部导航 */}
      <nav className="w-full max-w-5xl flex justify-between items-center mb-12 fade-in">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#18181B] rounded-lg flex items-center justify-center text-white font-bold text-xl">
            A
          </div>
          <span className="font-bold text-xl tracking-tight text-[#18181B]">
            DeepPoint<span className="text-gray-400 font-normal">.ai</span>
          </span>
        </div>
        <div className="hidden sm:flex gap-6 text-sm font-medium text-gray-500">
          <Link href="/" className="hover:text-[#18181B] transition">
            Dashboard
          </Link>
          <Link href="/ai-product" className="text-[#18181B] hover:text-amber-600 transition">
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
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400 opacity-10 blur-3xl rounded-full"></div>

            <h1 className="text-2xl font-bold text-[#18181B] mb-1">AI 产品生成</h1>
            <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider">Generate AI Products</p>

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-400">等待输入</h3>
              <p className="text-gray-400 text-sm mt-1">输入关键词，AI将为你生成产品建议</p>
            </div>
          )}

          {/* 结果列表 */}
          {results.length > 0 && (
            <div className="fade-in space-y-5">
              {/* Header Stats */}
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div className="bg-white rounded-2xl p-4 shadow-neuro">
                  <div className="text-gray-400 text-xs font-semibold uppercase">AI Products</div>
                  <div className="text-2xl font-bold text-[#18181B] mt-1">{results.length}</div>
                </div>
                <div className="bg-[#18181B] rounded-2xl p-4 shadow-lg text-white">
                  <div className="text-gray-400 text-xs font-semibold uppercase">Powered by</div>
                  <div className="text-lg font-bold mt-1">AI Analysis</div>
                </div>
              </div>

              {/* Product Cards */}
              <div className="space-y-4">
                {results.map((result) => (
                  <AIProductCard
                    key={result.id}
                    result={result}
                    onViewDetails={() => handleViewDetails(result)}
                  />
                ))}
              </div>

              {/* Tips */}
              <div className="bg-[#FBFBF9] rounded-2xl p-5 border border-[#E5E4DE]">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Tips</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 以上方案由AI分析用户反馈自动生成</li>
                  <li>• 建议结合实际情况进行调整和优化</li>
                  <li>• 可以尝试不同的关键词获取更多灵感</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <AIProductDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        result={selectedResult}
      />
    </div>
  );
}
