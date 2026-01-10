"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import AnalysisForm, { DouyinNewConfig } from "@/components/AnalysisForm";
import LoadingAnimation from "@/components/LoadingAnimation";
import ResultsTable from "@/components/ResultsTable";
import DetailModal from "@/components/DetailModal";
import ExportButton from "@/components/ExportButton";
import RawDataExportButton from "@/components/RawDataExportButton";
import DataQualityBanner from "@/components/DataQualityBanner";

// ClusterResult 类型定义
interface ClusterResult {
  id: string;
  size: number;
  analysis: {
    one_line_pain: string;
    paid_interest: "High" | "Medium" | "Low";
    rationale: string;
    potential_product: string;

    // 新增深度分析维度
    pain_depth?: {
      surface_pain: string;
      root_causes: string[];
      user_scenarios: string[];
      emotional_intensity: number;
    };

    market_landscape?: {
      existing_solutions: Array<{
        name: string;
        limitation: string;
      }>;
      unmet_needs: string[];
      opportunity: string;
    };

    mvp_plan?: {
      core_features: string[];
      validation_hypotheses: Array<{
        hypothesis: string;
        test_method: string;
      }>;
      first_users: string;
      timeline: string;
      estimated_cost: string;
    };

    keyword_relevance?: number;
  };
  representative_texts: string[];
  priority_score?: {
    demand_intensity: number;
    market_size: number;
    competition: number;
    overall: number;
    level: 'High' | 'Medium' | 'Low';
  };
}

// 原始数据类型
interface RawData {
  videos: Array<{
    title: string;
    author: string;
    video_url: string;
    publish_time?: string;
    likes: string;
    collected_at: string;
    comment_count?: number;
    description?: string;
  }>;
  comments: Array<{
    video_title: string;
    comment_text: string;
    username: string;
    likes: string;
  }>;
  rawTexts: string[];
}

// 聚类数据类型
interface ClusteredDataGroup {
  clusterId: number;
  size: number;
  videos: RawData['videos'];
  comments: RawData['comments'];
}

// API 响应类型
interface JobResponse {
  jobId: string;
  status: string;
  progress: string;
  keywords?: string[];
  results?: ClusterResult[];
  rawData?: RawData;
  clusteredData?: ClusteredDataGroup[];
  dataQuality?: {
    level: 'reliable' | 'preliminary' | 'exploratory';
    totalDataSize: number;
    clusterCount: number;
    averageClusterSize: number;
  };
  error?: string;
}

// SWR fetcher 函数
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<ClusterResult[]>([]);
  const [rawData, setRawData] = useState<RawData | undefined>(undefined);
  const [clusteredData, setClusteredData] = useState<ClusteredDataGroup[] | undefined>(undefined);
  const [keywords, setKeywords] = useState<string[]>([]);
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
          setRawData(data.rawData);
          setClusteredData(data.clusteredData);
          if (data.keywords) {
            setKeywords(data.keywords);
          }
          setIsLoading(false);
        } else if (data.status === "failed") {
          setIsLoading(false);
        }
      }
    }
  );

  const handleAnalysisSubmit = async (
    submittedKeywords: string[],
    dataSource: 'xiaohongshu' | 'douyin' | 'douyin_new',
    deepCrawl: boolean,
    maxVideos: number,
    douyinNewConfig?: DouyinNewConfig
  ) => {
    try {
      setIsLoading(true);
      setJobId(null);
      setResults([]);
      setRawData(undefined);
      setClusteredData(undefined);
      setKeywords(submittedKeywords);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: submittedKeywords,
          limit: 200,
          dataSource,
          deepCrawl,
          maxVideos,
          douyinNewConfig  // 新版抖音配置
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
        </div>

        {/* 右侧：结果展示区 */}
        <div className="lg:col-span-8 flex flex-col h-full">
          {/* Loading 状态 */}
          {isLoading && (
            <div className="h-full min-h-[500px] bg-white/70 backdrop-blur-sm border border-amber-100 rounded-3xl shadow-neuro overflow-hidden fade-in">
              <LoadingAnimation
                progressText={jobData?.progress || "正在初始化..."}
                status={jobData?.status || "processing"}
              />
            </div>
          )}

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
              <div className="grid grid-cols-4 gap-4 mb-2">
                <div className="bg-white rounded-2xl p-4 shadow-neuro">
                  <div className="text-gray-400 text-xs font-semibold uppercase">Total Signals</div>
                  <div className="text-2xl font-bold text-[#18181B] mt-1">{totalSignals}</div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-neuro">
                  <div className="text-gray-400 text-xs font-semibold uppercase">Pain Points</div>
                  <div className="text-2xl font-bold text-[#18181B] mt-1">{results.length}</div>
                </div>
                <ExportButton results={results} />
                <RawDataExportButton rawData={rawData} clusteredData={clusteredData} keywords={keywords} />
              </div>

              {/* 数据质量提示 */}
              {jobData?.dataQuality && (
                <DataQualityBanner dataQuality={jobData.dataQuality} />
              )}

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
