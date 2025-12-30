"use client";

import { useEffect, useState } from "react";
import {
  X,
  Lightbulb,
  Store,
  Rocket,
  FileText,
  TrendingUp,
  Target,
  Shield,
  CheckCircle,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  Flame
} from 'lucide-react';
import { priorityColors, getScoreColor, getCompetitionLabel } from '@/lib/design-tokens';

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

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ClusterResult | null;
}

// Tab 定义
const tabs = [
  { id: 'pain', label: '痛点分析', icon: Lightbulb },
  { id: 'market', label: '市场格局', icon: Store },
  { id: 'mvp', label: 'MVP方案', icon: Rocket },
  { id: 'source', label: '原文依据', icon: FileText },
] as const;

type TabId = typeof tabs[number]['id'];

// 环形进度组件
function RingGauge({
  value,
  max = 5,
  label,
  size = 72,
  strokeWidth = 6,
  topBadge
}: {
  value: number;
  max?: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  topBadge?: { text: string; color: string };
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / max) * circumference;
  const offset = circumference - progress;

  return (
    <div className="flex flex-col items-center">
      {/* 顶部标签（蓝海/红海） */}
      {topBadge && (
        <span className={`text-xs font-medium px-2 py-0.5 rounded mb-1 ${topBadge.color}`}>
          {topBadge.text}
        </span>
      )}
      {!topBadge && <div className="h-5 mb-1"></div>}

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
          <span className={`text-lg font-bold ${getScoreColor(value)}`}>
            {value.toFixed(1)}
          </span>
        </div>
      </div>
      <span className="text-xs text-neutral-500 mt-2 font-medium">{label}</span>
    </div>
  );
}

// 星星评分组件（用于情绪强度）
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < value ? 'fill-amber-500' : 'fill-neutral-200'}`}
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
}

// 情绪强度卡片组件（视觉加强版）
function EmotionIntensityCard({ value }: { value: number }) {
  // 根据分数确定状态文案
  const getStatusText = (score: number) => {
    if (score >= 4) return 'STRONG INTENT';
    if (score >= 3) return 'MODERATE';
    return 'WEAK';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm relative overflow-hidden h-full flex flex-col">
      {/* 背景装饰圆 */}
      <div
        className="absolute w-32 h-32 rounded-full -bottom-8 -left-8 z-0 opacity-80"
        style={{
          background: 'radial-gradient(circle, #FFFBEB 0%, rgba(255,255,255,0) 70%)'
        }}
      />

      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <svg className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z" />
        </svg>
        <span className="text-sm font-bold text-neutral-900">情绪强度</span>
      </div>

      {/* 内容主体：左右布局，flex-1 填充剩余空间，items-end 贴底 */}
      <div className="flex items-end justify-between px-2 relative z-10 flex-1">
        {/* 左侧：大火焰图标 */}
        <div className="relative flex items-center justify-center">
          <span
            className="text-6xl leading-none animate-pulse"
            style={{
              filter: 'drop-shadow(0 6px 12px rgba(245, 158, 11, 0.35))'
            }}
          >
            🔥
          </span>
        </div>

        {/* 右侧：分值与状态 */}
        <div className="flex flex-col items-end">
          {/* 分数 */}
          <div className="text-4xl font-extrabold text-neutral-900 leading-tight tracking-tight">
            {value.toFixed(1)}
            <span className="text-base text-neutral-400 font-medium">/5</span>
          </div>

          {/* 星星 */}
          <div className="mt-1">
            <StarRating value={value} />
          </div>

          {/* 状态标签 */}
          <div className="mt-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider">
            {getStatusText(value)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DetailModal({ isOpen, onClose, result }: DetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('pain');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      setActiveTab('pain'); // 重置到第一个tab
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const getBadgeClass = (interest: "High" | "Medium" | "Low") => {
    switch (interest) {
      case "High":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Medium":
        return "bg-neutral-100 text-neutral-600 border border-neutral-200";
      case "Low":
        return "bg-neutral-50 text-neutral-500 border border-neutral-100";
    }
  };

  if (!isOpen || !result) {
    return null;
  }

  const priorityLevel = result.priority_score?.level || 'Medium';
  const priorityStyle = priorityColors[priorityLevel as keyof typeof priorityColors];
  const competitionInfo = result.priority_score
    ? getCompetitionLabel(result.priority_score.competition)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Content */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl z-10 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 mb-2">
                {result.priority_score && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${priorityStyle.badge}`}>
                    <Flame className="w-3 h-3" />
                    {result.priority_score.level}
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getBadgeClass(result.analysis.paid_interest)}`}>
                  $ {result.analysis.paid_interest} Intent
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  #Cluster-{result.id.slice(0, 6)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-neutral-900 leading-snug">
                {result.analysis.one_line_pain}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-900 p-2 transition-colors rounded-lg hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 优先级仪表盘 */}
        {result.priority_score && (
          <div className="px-5 py-5 border-b border-neutral-100 bg-gradient-to-r from-amber-50/50 to-transparent">
            {/* 三个环形图 - 放大版 */}
            <div className="flex items-start justify-center gap-10 mb-5">
              <RingGauge value={result.priority_score.demand_intensity} label="需求强度" size={90} strokeWidth={7} />
              <RingGauge value={result.priority_score.market_size} label="市场规模" size={90} strokeWidth={7} />
              <RingGauge
                value={result.priority_score.competition}
                label="竞争程度"
                size={90}
                strokeWidth={7}
                topBadge={competitionInfo ? {
                  text: competitionInfo.text,
                  color: competitionInfo.text === '蓝海' ? 'bg-blue-100 text-blue-600' : competitionInfo.text === '红海' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'
                } : undefined}
              />
            </div>

            {/* 综合推荐指数 - 横向进度条 */}
            <div className="bg-neutral-100 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-600">综合推荐指数</span>
                <span className={`text-lg font-bold ${getScoreColor(result.priority_score.overall)}`}>
                  {result.priority_score.overall.toFixed(1)} <span className="text-sm text-neutral-400 font-normal">/ 5</span>
                </span>
              </div>
              <div className="mt-2 h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(result.priority_score.overall / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 导航 */}
        <div className="flex border-b border-neutral-200 px-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-amber-600 border-amber-500'
                    : 'text-neutral-500 border-transparent hover:text-neutral-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 内容区 */}
        <div className="p-5 overflow-y-auto hide-scroll flex-1 bg-neutral-50/30">
          {/* Tab 1: 痛点分析 */}
          {activeTab === 'pain' && (
            <div className="space-y-4">
              {result.analysis.pain_depth ? (
                <>
                  {/* 表面痛点 */}
                  <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-neutral-700">表面痛点</h3>
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {result.analysis.pain_depth.surface_pain}
                    </p>
                  </div>

                  {/* 根因分析 */}
                  <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-neutral-700">根因分析（3个"为什么"）</h3>
                    </div>
                    <div className="space-y-3">
                      {result.analysis.pain_depth.root_causes.map((cause, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <p className="text-sm text-neutral-600 flex-1">{cause}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 用户场景 & 情绪强度 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-amber-600" />
                        <h3 className="text-sm font-semibold text-neutral-700">用户场景</h3>
                      </div>
                      <ul className="space-y-2">
                        {result.analysis.pain_depth.user_scenarios.map((scenario, index) => (
                          <li key={index} className="text-sm text-neutral-600 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{scenario}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 情绪强度 - 视觉加强版 */}
                    <EmotionIntensityCard value={result.analysis.pain_depth.emotional_intensity} />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无痛点深度分析数据</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: 市场格局 */}
          {activeTab === 'market' && (
            <div className="space-y-4">
              {result.analysis.market_landscape ? (
                <>
                  {/* 现有解决方案 */}
                  <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-neutral-700">现有解决方案</h3>
                    </div>
                    <div className="space-y-3">
                      {result.analysis.market_landscape.existing_solutions.map((solution, index) => (
                        <div key={index} className="border-l-2 border-amber-300 pl-4">
                          <div className="text-sm font-semibold text-neutral-700">{solution.name}</div>
                          <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            局限: {solution.limitation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 未满足的需求 */}
                  <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-neutral-700">未满足的需求</h3>
                    </div>
                    <ul className="space-y-2">
                      {result.analysis.market_landscape.unmet_needs.map((need, index) => (
                        <li key={index} className="text-sm text-neutral-600 flex items-start gap-2">
                          <span className="text-amber-500 font-bold mt-0.5">▸</span>
                          <span>{need}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 市场机会 */}
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-amber-800">市场机会</h3>
                    </div>
                    <p className="text-sm text-amber-700 font-medium leading-relaxed">
                      {result.analysis.market_landscape.opportunity}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无市场格局分析数据</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: MVP方案 */}
          {activeTab === 'mvp' && (
            <div className="space-y-4">
              {/* AI产品构想 - 放在MVP方案顶部 */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-800">AI 产品构想</h3>
                </div>
                <p className="text-base text-amber-900 font-medium">
                  {result.analysis.potential_product}
                </p>
              </div>

              {result.analysis.mvp_plan ? (
                <>
                  {/* 核心功能 */}
                  <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-neutral-700">核心功能</h3>
                    </div>
                    <ul className="space-y-2">
                      {result.analysis.mvp_plan.core_features.map((feature, index) => (
                        <li key={index} className="text-sm text-neutral-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 验证假设 */}
                  <div className="bg-white rounded-xl p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-neutral-700">验证假设</h3>
                    </div>
                    <div className="space-y-3">
                      {result.analysis.mvp_plan.validation_hypotheses.map((item, index) => (
                        <div key={index} className="border-l-2 border-amber-300 pl-4">
                          <div className="text-xs text-neutral-500 font-medium">假设 {index + 1}</div>
                          <div className="text-sm text-neutral-700 mt-1">{item.hypothesis}</div>
                          <div className="text-xs text-amber-600 mt-1">→ 测试方法: {item.test_method}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 执行细节 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-4 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs font-semibold text-neutral-500">首批用户</h3>
                      </div>
                      <p className="text-sm text-neutral-700">{result.analysis.mvp_plan.first_users}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs font-semibold text-neutral-500">时间预估</h3>
                      </div>
                      <p className="text-sm text-neutral-700">{result.analysis.mvp_plan.timeline}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs font-semibold text-neutral-500">成本预估</h3>
                      </div>
                      <p className="text-sm text-neutral-700">{result.analysis.mvp_plan.estimated_cost}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <Rocket className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无MVP方案数据</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: 原文依据 */}
          {activeTab === 'source' && (
            <div className="space-y-4">
              {/* 分析依据 */}
              <div className="bg-white rounded-xl p-4 border border-neutral-200">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-neutral-700">分析依据</h3>
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {result.analysis.rationale}
                </p>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
                  <div className="text-xs text-neutral-500 mb-1">样本数量</div>
                  <div className="text-2xl font-bold text-neutral-900">{result.size}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
                  <div className="text-xs text-neutral-500 mb-1">原文数量</div>
                  <div className="text-2xl font-bold text-neutral-900">{result.representative_texts.length}</div>
                </div>
                {result.analysis.keyword_relevance !== undefined && (
                  <div className="bg-white rounded-xl p-4 border border-neutral-200 text-center">
                    <div className="text-xs text-neutral-500 mb-1">相关度</div>
                    <div className="text-2xl font-bold text-amber-600">{result.analysis.keyword_relevance}%</div>
                  </div>
                )}
              </div>

              {/* 代表性原文 */}
              <div className="bg-white rounded-xl p-4 border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 mb-4">代表性原文</h3>
                <div className="space-y-3">
                  {result.representative_texts.map((text, index) => (
                    <div
                      key={index}
                      className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full mt-0.5">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 rounded-lg transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
