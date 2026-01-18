'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface RawVideoData {
  title: string;
  author: string;
  video_url: string;
  publish_time?: string;
  likes: string;
  collected_at: string;
  comment_count?: number;
  description?: string;
}

interface RawCommentData {
  video_title: string;
  comment_text: string;
  username: string;
  likes: string;
}

interface RawData {
  videos: RawVideoData[];
  comments: RawCommentData[];
  rawTexts: string[];
}

interface ClusteredDataGroup {
  clusterId: number;
  size: number;
  videos: RawVideoData[];
  comments: RawCommentData[];
}

interface RawDataExportButtonProps {
  rawData?: RawData;
  clusteredData?: ClusteredDataGroup[];
  keywords: string[];
}

type ExportFormat = 'csv' | 'json';
type ExportType = 'videos' | 'comments' | 'all' | 'clusters';

export default function RawDataExportButton({ rawData, clusteredData, keywords }: RawDataExportButtonProps) {
  const t = useTranslations('rawDataExport');
  const [showDropdown, setShowDropdown] = useState(false);

  if (!rawData || (rawData.videos.length === 0 && rawData.comments.length === 0)) {
    return null;
  }

  const escapeCSVField = (field: string): string => {
    if (!field) return '';
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      const escaped = field.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return field;
  };

  const getTimestamp = () => {
    return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportVideosCSV = () => {
    const headers = [
      t('videoHeaders.title'),
      t('videoHeaders.author'),
      t('videoHeaders.videoUrl'),
      t('videoHeaders.publishTime'),
      t('videoHeaders.likes'),
      t('videoHeaders.commentCount'),
      t('videoHeaders.description'),
      t('videoHeaders.collectedAt')
    ];
    const rows = [headers.join(',')];

    for (const video of rawData.videos) {
      const row = [
        escapeCSVField(video.title),
        escapeCSVField(video.author),
        escapeCSVField(video.video_url),
        escapeCSVField(video.publish_time || ''),
        escapeCSVField(video.likes),
        escapeCSVField(video.comment_count?.toString() || ''),
        escapeCSVField(video.description || ''),
        escapeCSVField(video.collected_at)
      ];
      rows.push(row.join(','));
    }

    const keywordStr = keywords.join('_').slice(0, 20);
    downloadFile(rows.join('\n'), `${t('filenames.videos')}_${keywordStr}_${getTimestamp()}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportCommentsCSV = () => {
    const headers = [
      t('commentHeaders.videoTitle'),
      t('commentHeaders.commentText'),
      t('commentHeaders.username'),
      t('commentHeaders.likes')
    ];
    const rows = [headers.join(',')];

    for (const comment of rawData.comments) {
      const row = [
        escapeCSVField(comment.video_title),
        escapeCSVField(comment.comment_text),
        escapeCSVField(comment.username),
        escapeCSVField(comment.likes)
      ];
      rows.push(row.join(','));
    }

    const keywordStr = keywords.join('_').slice(0, 20);
    downloadFile(rows.join('\n'), `${t('filenames.comments')}_${keywordStr}_${getTimestamp()}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportJSON = (type: ExportType) => {
    const keywordStr = keywords.join('_').slice(0, 20);
    const timestamp = getTimestamp();

    let data: object;
    let filename: string;

    switch (type) {
      case 'videos':
        data = { keywords, videos: rawData.videos, exportedAt: new Date().toISOString() };
        filename = `${t('filenames.videos')}_${keywordStr}_${timestamp}.json`;
        break;
      case 'comments':
        data = { keywords, comments: rawData.comments, exportedAt: new Date().toISOString() };
        filename = `${t('filenames.comments')}_${keywordStr}_${timestamp}.json`;
        break;
      case 'clusters':
        if (!clusteredData) {
          alert(t('clusterDataUnavailable'));
          return;
        }
        data = {
          keywords,
          clusters: clusteredData,
          stats: {
            clusterCount: clusteredData.length,
            totalVideos: clusteredData.reduce((sum, c) => sum + c.videos.length, 0),
            totalComments: clusteredData.reduce((sum, c) => sum + c.comments.length, 0)
          },
          exportedAt: new Date().toISOString()
        };
        filename = `${t('filenames.clusters')}_${keywordStr}_${timestamp}.json`;
        break;
      case 'all':
      default:
        data = {
          keywords,
          videos: rawData.videos,
          comments: rawData.comments,
          rawTexts: rawData.rawTexts,
          stats: {
            videoCount: rawData.videos.length,
            commentCount: rawData.comments.length,
            rawTextCount: rawData.rawTexts.length
          },
          exportedAt: new Date().toISOString()
        };
        filename = `${t('filenames.allData')}_${keywordStr}_${timestamp}.json`;
    }

    downloadFile(JSON.stringify(data, null, 2), filename, 'application/json;charset=utf-8;');
  };

  const exportClustersCSV = () => {
    if (!clusteredData) {
      alert(t('clusterDataUnavailable'));
      return;
    }

    const rows: string[] = [];
    const headers = [
      t('clusterHeaders.clusterId'),
      t('clusterHeaders.clusterSize'),
      t('clusterHeaders.dataType'),
      t('clusterHeaders.content'),
      t('clusterHeaders.usernameOrAuthor'),
      t('clusterHeaders.likes'),
      t('clusterHeaders.relatedVideo')
    ];
    rows.push(headers.join(','));

    for (const cluster of clusteredData) {
      // 导出视频
      for (const video of cluster.videos) {
        const row = [
          cluster.clusterId.toString(),
          cluster.size.toString(),
          t('dataTypes.video'),
          escapeCSVField(video.title),
          escapeCSVField(video.author),
          escapeCSVField(video.likes),
          ''
        ];
        rows.push(row.join(','));
      }

      // 导出评论
      for (const comment of cluster.comments) {
        const row = [
          cluster.clusterId.toString(),
          cluster.size.toString(),
          t('dataTypes.comment'),
          escapeCSVField(comment.comment_text),
          escapeCSVField(comment.username),
          escapeCSVField(comment.likes),
          escapeCSVField(comment.video_title)
        ];
        rows.push(row.join(','));
      }
    }

    const keywordStr = keywords.join('_').slice(0, 20);
    downloadFile(rows.join('\n'), `${t('filenames.clusters')}_${keywordStr}_${getTimestamp()}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExport = (format: ExportFormat, type: ExportType) => {
    setShowDropdown(false);

    if (format === 'csv') {
      if (type === 'videos') {
        exportVideosCSV();
      } else if (type === 'comments') {
        exportCommentsCSV();
      } else if (type === 'clusters') {
        exportClustersCSV();
      } else {
        exportVideosCSV();
        if (rawData.comments.length > 0) {
          setTimeout(() => exportCommentsCSV(), 500);
        }
      }
    } else {
      exportJSON(type);
    }
  };

  return (
    <div className="relative">
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-[#18181B] rounded-2xl p-4 shadow-lg text-white relative overflow-hidden group cursor-pointer hover:bg-zinc-800 transition"
      >
        <div className="absolute right-3 top-3 opacity-20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div className="text-gray-400 text-xs font-semibold uppercase">Raw Data</div>
        <div className="text-lg font-bold mt-1">
          {rawData.videos.length} videos
          {rawData.comments.length > 0 && ` / ${rawData.comments.length} comments`}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 rounded-xl shadow-xl border border-zinc-700 z-50 overflow-hidden">
          <div className="p-2 border-b border-zinc-700">
            <div className="text-xs text-gray-400 px-2 py-1">CSV Format</div>
            <button
              onClick={() => handleExport('csv', 'videos')}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Export Videos CSV
            </button>
            {rawData.comments.length > 0 && (
              <button
                onClick={() => handleExport('csv', 'comments')}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Export Comments CSV
              </button>
            )}
          </div>

          <div className="p-2">
            <div className="text-xs text-gray-400 px-2 py-1">JSON Format</div>
            <button
              onClick={() => handleExport('json', 'videos')}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Export Videos JSON
            </button>
            {rawData.comments.length > 0 && (
              <button
                onClick={() => handleExport('json', 'comments')}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Export Comments JSON
              </button>
            )}
            <button
              onClick={() => handleExport('json', 'all')}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Export All Data JSON
            </button>
          </div>

          {clusteredData && clusteredData.length > 0 && (
            <div className="p-2 border-t border-zinc-700">
              <div className="text-xs text-gray-400 px-2 py-1">Clustering Analysis</div>
              <button
                onClick={() => handleExport('csv', 'clusters')}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Export Cluster Data CSV
              </button>
              <button
                onClick={() => handleExport('json', 'clusters')}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Export Cluster Data JSON
              </button>
            </div>
          )}
        </div>
      )}

      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
