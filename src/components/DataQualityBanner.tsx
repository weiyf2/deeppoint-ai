"use client";

import { useTranslations } from 'next-intl';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface DataQualityInfo {
  level: 'reliable' | 'preliminary' | 'exploratory';
  totalDataSize: number;
  clusterCount: number;
  averageClusterSize: number;
}

interface DataQualityBannerProps {
  dataQuality: DataQualityInfo;
}

export default function DataQualityBanner({ dataQuality }: DataQualityBannerProps) {
  const t = useTranslations('dataQuality');
  const { level, totalDataSize, clusterCount, averageClusterSize } = dataQuality;

  // 统一使用琥珀色系，通过明度区分等级
  const levelConfig = {
    reliable: {
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-800',
      badgeColor: 'bg-amber-100 text-amber-700',
      Icon: CheckCircle
    },
    preliminary: {
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-200',
      iconBg: 'bg-amber-100/70',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-700',
      badgeColor: 'bg-amber-100/70 text-amber-600',
      Icon: AlertTriangle
    },
    exploratory: {
      bgColor: 'bg-amber-50/50',
      borderColor: 'border-amber-300',
      iconBg: 'bg-amber-100/50',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-800',
      badgeColor: 'bg-amber-100 text-amber-700',
      Icon: Info
    }
  };

  const config = levelConfig[level];
  const Icon = config.Icon;

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-2xl p-5 transition-all duration-300 hover:shadow-md`}>
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div className={`flex-shrink-0 w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${config.textColor}`}>
              {t(`${level}.title`)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeColor}`}>
              {t('dataCount', { count: totalDataSize })}
            </span>
          </div>

          <p className={`text-xs ${config.textColor} opacity-80 mb-3`}>
            {t(`${level}.message`)}
          </p>

          {/* 数据统计 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/50 rounded-lg px-3 py-2">
              <div className="text-xs text-neutral-500 font-medium">{t('stats.totalData')}</div>
              <div className={`text-lg font-bold ${config.textColor}`}>
                {totalDataSize}
              </div>
            </div>
            <div className="bg-white/50 rounded-lg px-3 py-2">
              <div className="text-xs text-neutral-500 font-medium">{t('stats.clusterCount')}</div>
              <div className={`text-lg font-bold ${config.textColor}`}>
                {clusterCount}
              </div>
            </div>
            <div className="bg-white/50 rounded-lg px-3 py-2">
              <div className="text-xs text-neutral-500 font-medium">{t('stats.avgClusterSize')}</div>
              <div className={`text-lg font-bold ${config.textColor}`}>
                {averageClusterSize}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 建议提示 */}
      {level !== 'reliable' && (
        <div className="mt-4 pt-4 border-t border-amber-200/50">
          <div className="flex items-start gap-2">
            <Info className={`w-4 h-4 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <div className={`text-xs ${config.textColor}`}>
              <span className="font-semibold">{t('suggestion')}:</span>
              {level === 'exploratory' ? (
                <span> {t('exploratoryHint')}</span>
              ) : (
                <span> {t('preliminaryHint')}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
