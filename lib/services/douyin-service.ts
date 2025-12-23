// 抖音数据抓取服务
import { spawn } from 'child_process';
import path from 'path';
import { getPythonCommand } from '../utils/python-detector';
import { DeepCrawlResult, DeepCrawlOptions } from './data-source-interface';

export interface DouyinVideo {
  title: string;
  author: string;
  video_url: string;
  publish_time?: string;
  likes: string;
  collected_at: string;
  comments?: DouyinComment[];
  comment_count?: number;
  description?: string;
}

export interface DouyinComment {
  text: string;
  username: string;
  likes: string;
  collected_at: string;
}

export interface DouyinSearchResult {
  videos: DouyinVideo[];
  raw_texts: string[];
  count: number;
}

export interface DouyinDeepSearchResult {
  videos: DouyinVideo[];
  raw_texts: string[];
  all_comments: Array<{
    video_title: string;
    comment_text: string;
    username: string;
    likes: string;
  }>;
  video_count: number;
  comment_count: number;
}

export class DouyinService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // 自动检测可用的 Python 命令（python3 或 python）
    this.pythonPath = getPythonCommand();
    this.scriptPath = path.join(process.cwd(), 'lib', 'douyin_tool.py');
  }

  private async executePythonScript(args: string[], timeout: number = 300000): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, ...args], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      // 设置超时
      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python脚本执行超时（${timeout/1000}秒）`));
      }, timeout);

      pythonProcess.stdout.setEncoding('utf8');
      pythonProcess.stderr.setEncoding('utf8');

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Python脚本执行失败 (退出代码: ${code})\nstderr: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async searchVideos(keywords: string, limit: number = 20, scrollCount: number = 5): Promise<{ videos: DouyinVideo[], rawTexts: string[] }> {
    try {
      const result = await this.executePythonScript([
        '--action', 'search-raw',
        '--keywords', keywords,
        '--scroll-count', scrollCount.toString(),
        '--limit', limit.toString()
      ]);

      // 解析JSON结果
      let parsedResult: DouyinSearchResult;
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        throw new Error(`JSON解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      const rawTexts: string[] = [];

      // 从视频标题中提取文本
      for (const video of parsedResult.videos) {
        if (video.title && video.title.length > 10) {
          rawTexts.push(video.title);
        }
      }

      // 过滤和清理文本
      const cleanedTexts = rawTexts
        .filter(text => text && text.trim().length > 5)
        .map(text => text.trim())
        .filter((text, index, arr) => arr.indexOf(text) === index);

      return { videos: parsedResult.videos, rawTexts: cleanedTexts };
    } catch (error) {
      throw new Error(`抖音数据抓取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 深度抓取 - 包含评论
   */
  async searchWithComments(keywords: string, options?: DeepCrawlOptions): Promise<DeepCrawlResult> {
    const maxVideos = options?.maxVideos || 10;
    const maxComments = options?.maxCommentsPerVideo || 30;

    try {
      const result = await this.executePythonScript([
        '--action', 'search-with-comments',
        '--keywords', keywords,
        '--max-videos', maxVideos.toString(),
        '--max-comments', maxComments.toString()
      ], 600000);

      // 解析JSON结果
      let parsedResult: DouyinDeepSearchResult;
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        throw new Error(`JSON解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // 提取所有文本
      const rawTexts: string[] = [];

      // 添加视频标题
      for (const video of parsedResult.videos) {
        if (video.title && video.title.length > 5) {
          rawTexts.push(video.title);
        }
        // 添加视频描述
        if (video.description && video.description.length > 10) {
          rawTexts.push(video.description);
        }
      }

      // 添加评论文本
      for (const comment of parsedResult.all_comments || []) {
        if (comment.comment_text && comment.comment_text.length > 5) {
          rawTexts.push(comment.comment_text);
        }
      }

      // 清理和去重
      const cleanedTexts = rawTexts
        .filter(text => text && text.trim().length > 5)
        .map(text => text.trim())
        .filter((text, index, arr) => arr.indexOf(text) === index);

      return {
        rawTexts: cleanedTexts,
        videos: parsedResult.videos,
        allComments: parsedResult.all_comments,
        videoCount: parsedResult.video_count,
        commentCount: parsedResult.comment_count
      };
    } catch (error) {
      throw new Error(`抖音深度抓取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}