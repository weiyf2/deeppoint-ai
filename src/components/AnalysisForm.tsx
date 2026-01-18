"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';

export type DataSourceType = 'xiaohongshu' | 'douyin' | 'douyin_new';

// 新版抖音配置接口
export interface DouyinNewConfig {
  enableComments: boolean;
  maxVideos: number;
  maxCommentsPerVideo: number;
  enableSubComments: boolean;
}

interface AnalysisFormProps {
  onSubmit: (
    keywords: string[],
    dataSource: DataSourceType,
    deepCrawl: boolean,
    maxVideos: number,
    douyinNewConfig?: DouyinNewConfig
  ) => void;
  isLoading: boolean;
}

export default function AnalysisForm({ onSubmit, isLoading }: AnalysisFormProps) {
  const t = useTranslations('form');
  const [keywords, setKeywords] = useState("");
  const [dataSource, setDataSource] = useState<DataSourceType>('douyin_new');
  const [deepCrawl, setDeepCrawl] = useState(false);
  const [maxVideos, setMaxVideos] = useState(5);

  // 新版抖音专用配置
  const [douyinNewConfig, setDouyinNewConfig] = useState<DouyinNewConfig>({
    enableComments: true,
    maxVideos: 15,
    maxCommentsPerVideo: 20,
    enableSubComments: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!keywords.trim()) {
      return;
    }

    // 将输入的关键词按逗号分割，去除空白，过滤空值
    const keywordArray = keywords
      .split(",")
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);

    if (keywordArray.length > 0) {
      if (dataSource === 'douyin_new') {
        onSubmit(keywordArray, dataSource, douyinNewConfig.enableComments, douyinNewConfig.maxVideos, douyinNewConfig);
      } else {
        onSubmit(keywordArray, dataSource, deepCrawl, maxVideos);
      }
    }
  };

  const getSourceDisplayName = () => {
    switch (dataSource) {
      case 'xiaohongshu': return t('dataSource.xiaohongshu');
      case 'douyin': return t('dataSource.douyinOld');
      case 'douyin_new': return t('dataSource.douyinNew');
      default: return dataSource;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 数据源选择 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('dataSource.label')}
        </label>
        <div className="relative">
          <select
            id="dataSource"
            value={dataSource}
            onChange={(e) => {
              const newSource = e.target.value as DataSourceType;
              if (newSource === 'xiaohongshu') return; // 小红书开发中，不允许选择
              setDataSource(newSource);
            }}
            disabled={isLoading}
            className="w-full bg-[#FBFBF9] text-[#18181B] font-medium py-3 px-4 rounded-xl appearance-none border border-transparent focus:border-[#18181B] focus:bg-white focus:ring-0 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="douyin_new">{t('dataSource.douyinNew')}</option>
            <option value="douyin">{t('dataSource.douyinOld')}</option>
            <option value="xiaohongshu" disabled className="text-gray-400">{t('dataSource.xiaohongshu')}</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 关键词输入 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t('keywords.label')}
        </label>
        <input
          type="text"
          id="keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          disabled={isLoading}
          placeholder={t('keywords.placeholder')}
          className="w-full bg-[#FBFBF9] text-[#18181B] font-medium py-3 px-4 rounded-xl border border-transparent outline-none focus:bg-amber-50 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 placeholder-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* 旧版抖音配置 */}
      {dataSource === 'douyin' && (
        <div className="p-4 bg-[#FBFBF9] rounded-xl space-y-4">
          {/* 开关 */}
          <label
            className="flex items-center justify-between group cursor-pointer"
          >
            <div className="pointer-events-none">
              <span className="block text-sm font-bold text-[#18181B]">{t('deepCrawl.title')}</span>
              <span className="text-xs text-gray-400">{t('deepCrawl.description')}</span>
            </div>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={deepCrawl}
                onChange={(e) => setDeepCrawl(e.target.checked)}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#18181B]"></div>
            </div>
          </label>

          {/* 滑块控制 */}
          {deepCrawl && (
            <div className="pt-2 border-t border-[#E5E4DE]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-gray-500 uppercase">{t('analysisDepth')}</label>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded shadow-sm">
                  {maxVideos} {t('units.clips')}
                </span>
              </div>
              <input
                type="range"
                id="maxVideos"
                min="3"
                max="15"
                value={maxVideos}
                onChange={(e) => setMaxVideos(parseInt(e.target.value))}
                disabled={isLoading}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-medium">
                <span>{t('speedFast')}</span>
                <span>{t('accuracySlow')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 新版抖音配置面板 */}
      {dataSource === 'douyin_new' && (
        <div className="p-4 bg-[#FBFBF9] rounded-xl space-y-4">
          <div className="text-sm font-bold text-[#18181B] mb-2">{t('douyinNewConfig.title')}</div>

          {/* 爬取评论开关 */}
          <label className="flex items-center justify-between group cursor-pointer">
            <div className="pointer-events-none">
              <span className="block text-sm font-medium text-[#18181B]">{t('douyinNewConfig.enableComments')}</span>
              <span className="text-xs text-gray-400">{t('douyinNewConfig.enableCommentsDesc')}</span>
            </div>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={douyinNewConfig.enableComments}
                onChange={(e) => setDouyinNewConfig(prev => ({
                  ...prev,
                  enableComments: e.target.checked
                }))}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#18181B]"></div>
            </div>
          </label>

          <div className="border-t border-[#E5E4DE] pt-4 space-y-4">
            {/* 视频数量滑块 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t('douyinNewConfig.videoCount')}</label>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded shadow-sm">
                  {douyinNewConfig.maxVideos} {t('units.videos')}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={douyinNewConfig.maxVideos}
                onChange={(e) => setDouyinNewConfig(prev => ({
                  ...prev,
                  maxVideos: parseInt(e.target.value)
                }))}
                disabled={isLoading}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>5</span>
                <span>30</span>
              </div>
            </div>

            {/* 每视频评论数滑块 */}
            {douyinNewConfig.enableComments && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">{t('douyinNewConfig.commentsPerVideo')}</label>
                  <span className="text-xs font-mono bg-white px-2 py-0.5 rounded shadow-sm">
                    {douyinNewConfig.maxCommentsPerVideo} {t('units.comments')}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={douyinNewConfig.maxCommentsPerVideo}
                  onChange={(e) => setDouyinNewConfig(prev => ({
                    ...prev,
                    maxCommentsPerVideo: parseInt(e.target.value)
                  }))}
                  disabled={isLoading}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>10</span>
                  <span>50</span>
                </div>
              </div>
            )}

            {/* 二级评论开关 */}
            {douyinNewConfig.enableComments && (
              <label className="flex items-center justify-between group cursor-pointer pt-2 border-t border-[#E5E4DE]">
                <div className="pointer-events-none">
                  <span className="block text-sm font-medium text-[#18181B]">{t('douyinNewConfig.subComments')}</span>
                  <span className="text-xs text-gray-400">{t('douyinNewConfig.subCommentsDesc')}</span>
                </div>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={douyinNewConfig.enableSubComments}
                    onChange={(e) => setDouyinNewConfig(prev => ({
                      ...prev,
                      enableSubComments: e.target.checked
                    }))}
                    disabled={isLoading}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#18181B]"></div>
                </div>
              </label>
            )}
          </div>
        </div>
      )}

      {/* 提交按钮 */}
      <button
        type="submit"
        disabled={isLoading || !keywords.trim()}
        className="w-full bg-[#18181B] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#18181B]/20 hover:scale-[1.02] hover:shadow-[#18181B]/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>{t('submit.analyzing')}</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('submit.start')}
          </>
        )}
      </button>

      {/* 提示信息 */}
      {keywords.trim() && (
        <div className="text-xs text-gray-500 text-center">
          {t('hint.from')} <strong className="text-[#18181B]">{getSourceDisplayName()}</strong>
          {dataSource === 'douyin' && deepCrawl && (
            <span className="text-amber-600"> {t('hint.deepCrawl', { count: maxVideos })}</span>
          )}
          {dataSource === 'douyin_new' && (
            <span className="text-amber-600">
              {' '}{t('hint.videos', { count: douyinNewConfig.maxVideos })}
              {douyinNewConfig.enableComments && t('hint.comments', { count: douyinNewConfig.maxCommentsPerVideo })}
            </span>
          )}
          {' '}{t('hint.analyze')}
        </div>
      )}
    </form>
  );
}
