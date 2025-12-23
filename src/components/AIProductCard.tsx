"use client";

import { AIProductResult } from "../../lib/services/ai-product-service";

interface AIProductCardProps {
  result: AIProductResult;
  onViewDetails: () => void;
}

export default function AIProductCard({ result, onViewDetails }: AIProductCardProps) {
  const { analysis } = result;

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Low':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'High':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPotentialBadge = (potential: string) => {
    switch (potential) {
      case 'High':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Low':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-neuro border border-white hover:border-gray-200 transition-all card-hover">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[#18181B] text-white">
              {analysis.product_category}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#18181B] mb-1">
            {analysis.product_name}
          </h2>
          <p className="text-gray-500 text-sm italic">
            &ldquo;{analysis.value_proposition}&rdquo;
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#FBFBF9] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">实现难度</p>
          <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${getDifficultyBadge(analysis.implementation_difficulty)}`}>
            {analysis.implementation_difficulty}
          </span>
        </div>
        <div className="bg-[#FBFBF9] rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">市场潜力</p>
          <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${getPotentialBadge(analysis.market_potential)}`}>
            {analysis.market_potential}
          </span>
        </div>
      </div>

      {/* Target Users */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          目标用户
        </h3>
        <p className="text-gray-700 text-sm">
          {analysis.target_users}
        </p>
      </div>

      {/* Core Features */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          核心功能
        </h3>
        <ul className="space-y-1">
          {analysis.core_features.slice(0, 3).map((feature, index) => (
            <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              {feature}
            </li>
          ))}
          {analysis.core_features.length > 3 && (
            <li className="text-gray-400 text-xs">还有 {analysis.core_features.length - 3} 项...</li>
          )}
        </ul>
      </div>

      {/* AI Capabilities */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          AI 能力
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {analysis.ai_capabilities.slice(0, 4).map((capability, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-100"
            >
              {capability}
            </span>
          ))}
          {analysis.ai_capabilities.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-gray-400">
              +{analysis.ai_capabilities.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          技术栈
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {analysis.technical_stack.slice(0, 5).map((tech, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs font-medium rounded bg-green-50 text-green-700 border border-green-100"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          基于 {result.size} 条用户反馈
        </span>
        <button
          onClick={onViewDetails}
          className="flex items-center text-xs font-bold text-amber-600 hover:text-amber-700 transition"
        >
          查看详情
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
