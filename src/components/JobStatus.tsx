"use client";

import { useTranslations } from 'next-intl';

interface JobStatusProps {
  status: string;
  progressText: string;
  error?: string;
}

export default function JobStatus({ status, progressText, error }: JobStatusProps) {
  const t = useTranslations('jobStatus');

  const getProgressBarWidth = () => {
    const progressSteps = [
      "正在抓取数据...",
      "正在处理内容...",
      "正在进行聚类分析...",
      "正在调用LLM分析...",
      "正在生成报告..."
    ];

    if (status === "completed") return "100%";
    if (status === "failed") return "0%";

    const currentStepIndex = progressSteps.indexOf(progressText);
    if (currentStepIndex === -1) return "10%";

    return `${((currentStepIndex + 1) / progressSteps.length) * 100}%`;
  };

  if (status === "failed" && error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-red-800">{t('failed')}</span>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-amber-800">{t('completed')}</span>
            <p className="text-xs text-amber-600 mt-0.5">{t('checkResults')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-[#E5E4DE]">
      <div className="flex items-center gap-3">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </div>
        <span className="text-sm font-medium text-[#18181B] animate-pulse">{progressText}</span>
      </div>
      <div className="h-1 w-full bg-gray-200 rounded-full mt-4 overflow-hidden">
        <div
          className="h-full loading-bar rounded-full transition-all duration-500"
          style={{ width: getProgressBarWidth() }}
        ></div>
      </div>
    </div>
  );
}
