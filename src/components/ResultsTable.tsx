"use client";

import { useTranslations } from 'next-intl';
import { Flame, Users, Zap, ChevronRight } from 'lucide-react';
import { priorityColors, paidInterestColors, getScoreColor } from '@/lib/design-tokens';

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

interface ResultsTableProps {
  results: ClusterResult[];
  onRowClick: (result: ClusterResult) => void;
}

// 综合评分环形图组件
function ScoreRing({
  value,
  max = 5,
  size = 80,
  strokeWidth = 6,
  label
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / max) * circumference;
  const offset = circumference - progress;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* 背景圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E5E5"
            strokeWidth={strokeWidth}
          />
          {/* 进度圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        {/* 中心数值 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${getScoreColor(value)}`}>
            {value.toFixed(1)}
          </span>
        </div>
      </div>
      <span className="text-xs text-neutral-400 mt-1.5 font-medium">{label}</span>
    </div>
  );
}

export default function ResultsTable({ results, onRowClick }: ResultsTableProps) {
  const t = useTranslations('results');

  if (results.length === 0) {
    return null;
  }

  // 按优先级排序（后端已排序，这里做兜底）
  const sortedResults = [...results].sort((a, b) => {
    const scoreA = a.priority_score?.overall || 0;
    const scoreB = b.priority_score?.overall || 0;
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-4">
      {sortedResults.map((result) => {
        const priorityLevel = result.priority_score?.level || 'Unknown';
        const priorityStyle = priorityColors[priorityLevel as keyof typeof priorityColors];
        const paidStyle = paidInterestColors[result.analysis.paid_interest];

        return (
          <div
            key={result.id}
            onClick={() => onRowClick(result)}
            className="group bg-white rounded-2xl p-5 shadow-sm border border-neutral-200 hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
          >
            {/* 左右分栏布局 */}
            <div className="flex gap-5">
              {/* 左侧：文字信息 */}
              <div className="flex-1 min-w-0">
                {/* 标签行 */}
                <div className="flex items-center gap-2 mb-3">
                  {/* 优先级标签 */}
                  {result.priority_score && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${priorityStyle.badge}`}>
                      <Flame className="w-3 h-3" />
                      {result.priority_score.level}
                    </span>
                  )}

                  {/* 付费意愿 */}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${paidStyle}`}>
                    $ {result.analysis.paid_interest}
                  </span>
                </div>

                {/* 标题 */}
                <h4 className="font-bold text-lg text-neutral-900 mb-1.5 group-hover:text-amber-700 transition-colors line-clamp-2">
                  {result.analysis.one_line_pain}
                </h4>

                {/* 描述（产品构想） */}
                <p className="text-sm text-neutral-500 line-clamp-1 mb-3">
                  {result.analysis.potential_product}
                </p>

                {/* 市场机会摘要 */}
                {result.analysis.market_landscape?.opportunity && (
                  <div className="flex items-start gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 line-clamp-2">
                      {result.analysis.market_landscape.opportunity}
                    </p>
                  </div>
                )}

                {/* 底部元信息 */}
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded">
                    <Users className="w-3.5 h-3.5" />
                    {result.size} signals
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-amber-600 font-medium">
                    {t('viewDetails')}
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>

              {/* 右侧：综合评分圆环 */}
              {result.priority_score && (
                <div className="flex-shrink-0 flex items-center justify-center pl-3 border-l border-neutral-100">
                  <ScoreRing value={result.priority_score.overall} size={88} strokeWidth={7} label={t('overallIndex')} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
