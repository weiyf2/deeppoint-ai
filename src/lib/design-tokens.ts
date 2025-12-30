// 设计Token - 统一配色体系
// 基于琥珀色系（Amber）+ 明度变化

export const colors = {
  // 主色调 - 琥珀色系
  primary: {
    50: '#FFFBEB',   // 最浅
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // 主色
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',  // 最深
  },

  // 中性色
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // 语义色（仅用于特定场景）
  semantic: {
    success: '#10B981',  // 绿色 - 成功/蓝海
    warning: '#F59E0B',  // 琥珀 - 警告
    error: '#EF4444',    // 红色 - 错误/红海
    info: '#3B82F6',     // 蓝色 - 信息
  }
};

// 优先级配色
export const priorityColors = {
  High: {
    badge: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/25',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    progress: 'bg-amber-500',
  },
  Medium: {
    badge: 'bg-gradient-to-r from-amber-400 to-amber-300 text-amber-900 shadow-md shadow-amber-300/25',
    text: 'text-amber-600',
    bg: 'bg-amber-50/50',
    border: 'border-amber-100',
    progress: 'bg-amber-400',
  },
  Low: {
    badge: 'bg-gradient-to-r from-neutral-400 to-neutral-300 text-white shadow-md shadow-neutral-400/25',
    text: 'text-neutral-600',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    progress: 'bg-neutral-400',
  },
  Unknown: {
    badge: 'bg-neutral-200 text-neutral-600',
    text: 'text-neutral-500',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    progress: 'bg-neutral-300',
  }
};

// 付费意愿配色（使用明度区分）
export const paidInterestColors = {
  High: 'bg-amber-100 text-amber-800 border border-amber-200',
  Medium: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
  Low: 'bg-neutral-50 text-neutral-500 border border-neutral-100',
};

// 数据质量配色
export const dataQualityColors = {
  reliable: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
  },
  preliminary: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-150',
    text: 'text-amber-700',
    badge: 'bg-amber-100/70 text-amber-600',
    icon: 'text-amber-500',
  },
  exploratory: {
    bg: 'bg-amber-50/50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
  }
};

// 卡片样式
export const cardStyles = {
  base: 'bg-white rounded-2xl shadow-sm border border-neutral-200',
  hover: 'hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-md',
  active: 'border-amber-300 bg-amber-50/50',
};

// Tab样式
export const tabStyles = {
  container: 'flex border-b border-neutral-200',
  tab: {
    base: 'px-4 py-3 text-sm font-medium transition-colors',
    active: 'text-amber-600 border-b-2 border-amber-500',
    inactive: 'text-neutral-500 hover:text-neutral-700',
  }
};

// 进度条样式
export const progressStyles = {
  track: 'h-2 bg-neutral-200 rounded-full overflow-hidden',
  fill: 'h-full bg-amber-500 rounded-full transition-all duration-300',
  fillHigh: 'h-full bg-amber-600 rounded-full transition-all duration-300',
  fillMedium: 'h-full bg-amber-400 rounded-full transition-all duration-300',
  fillLow: 'h-full bg-neutral-400 rounded-full transition-all duration-300',
};

// 评分颜色（根据分数返回颜色类名）
export const getScoreColor = (score: number): string => {
  if (score >= 4.0) return 'text-amber-700';
  if (score >= 3.5) return 'text-amber-600';
  if (score >= 3.0) return 'text-amber-500';
  return 'text-neutral-500';
};

// 竞争度标签
export const getCompetitionLabel = (score: number): { text: string; color: string } => {
  if (score >= 4.5) return { text: '蓝海', color: 'text-emerald-600' };
  if (score >= 3.0) return { text: '中等', color: 'text-amber-600' };
  return { text: '红海', color: 'text-red-500' };
};
