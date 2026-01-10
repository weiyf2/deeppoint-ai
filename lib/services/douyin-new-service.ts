// 新版抖音数据抓取服务
// 调用本地爬虫模块并读取 CSV 结果

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { getPythonCommand } from '../utils/python-detector';
import { DeepCrawlResult, DouyinNewCrawlOptions } from './data-source-interface';

// 新版抖音视频数据接口
export interface DouyinNewVideo {
  aweme_id: string;
  title: string;
  desc: string;
  create_time: string;
  nickname: string;
  avatar: string;
  liked_count: string;
  collected_count: string;
  comment_count: string;
  share_count: string;
  ip_location: string;
  aweme_url: string;
  cover_url: string;
  source_keyword: string;
}

// 新版抖音评论数据接口
export interface DouyinNewComment {
  comment_id: string;
  create_time: string;
  ip_location: string;
  aweme_id: string;
  content: string;
  nickname: string;
  avatar: string;
  sub_comment_count: string;
  like_count: string;
  parent_comment_id: string;
}

export class DouyinNewService {
  private pythonPath: string;
  private crawlerPath: string;
  private csvOutputPath: string;

  constructor() {
    this.pythonPath = getPythonCommand();
    this.crawlerPath = path.join(process.cwd(), 'lib', 'crawlers', 'douyin_new');
    this.csvOutputPath = path.join(this.crawlerPath, 'data', 'douyin', 'csv');
  }

  /**
   * 执行爬虫命令
   */
  private async executeCrawler(
    keywords: string,
    options: DouyinNewCrawlOptions,
    timeout: number = 600000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const mainScript = path.join(this.crawlerPath, 'main.py');

      const args = [
        mainScript,
        '--type', 'search',
        '--keywords', keywords,
        '--save_data_option', 'csv',
        '--get_comment', options.enableComments ? 'true' : 'false',
        '--get_sub_comment', options.enableSubComments ? 'true' : 'false',
        // 注意：首次运行需要扫码登录，因此禁用 headless 模式
        // 登录状态会保存到 browser_data 目录，后续运行可以考虑启用 headless
        '--headless', 'false'
      ];

      console.log('[DouyinNewCrawler] 启动爬虫:', this.pythonPath, args.join(' '));
      console.log('[DouyinNewCrawler] 工作目录:', this.crawlerPath);
      console.log('[DouyinNewCrawler] 注意：首次运行时浏览器窗口会打开，请扫描二维码登录抖音');
      console.log('[DouyinNewCrawler] 登录成功后，状态会保存到 browser_data 目录');

      const crawlerProcess = spawn(this.pythonPath, args, {
        cwd: this.crawlerPath,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          // 关键：添加爬虫目录到 Python 模块搜索路径
          PYTHONPATH: this.crawlerPath + (process.env.PYTHONPATH ? (process.platform === 'win32' ? ';' : ':') + process.env.PYTHONPATH : '')
        },
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stderr = '';

      // 设置超时
      const timeoutId = setTimeout(() => {
        crawlerProcess.kill();
        reject(new Error(`爬虫执行超时（${timeout / 1000}秒）`));
      }, timeout);

      crawlerProcess.stderr?.setEncoding('utf8');
      crawlerProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.log('[DouyinNewCrawler]', data.toString().trim());
      });

      crawlerProcess.stdout?.setEncoding('utf8');
      crawlerProcess.stdout?.on('data', (data) => {
        console.log('[DouyinNewCrawler]', data.toString().trim());
      });

      crawlerProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`爬虫执行失败 (退出代码: ${code})\n${stderr}`));
        }
      });

      crawlerProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * 获取今日 CSV 文件路径
   */
  private getTodayCSVPaths(): { contents: string; comments: string } {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return {
      contents: path.join(this.csvOutputPath, `search_contents_${today}.csv`),
      comments: path.join(this.csvOutputPath, `search_comments_${today}.csv`)
    };
  }

  /**
   * 简单的 CSV 解析器
   */
  private parseCSV(content: string): Record<string, string>[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // 解析表头（处理带引号的字段名）
    const headerLine = lines[0];
    const headers = this.parseCSVLine(headerLine);

    const records: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        records.push(record);
      }
    }

    return records;
  }

  /**
   * 解析 CSV 行（处理引号和逗号）
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 转义的引号
          current += '"';
          i++;
        } else {
          // 切换引号状态
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  /**
   * 读取并解析 Contents CSV
   */
  private async parseContentsCSV(filePath: string): Promise<DouyinNewVideo[]> {
    try {
      // 检查文件是否存在
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      // 移除 BOM
      const cleanContent = content.replace(/^\uFEFF/, '');
      const records = this.parseCSV(cleanContent);

      return records.map((row) => ({
        aweme_id: row.aweme_id || '',
        title: row.title || '',
        desc: row.desc || '',
        create_time: row.create_time || '',
        nickname: row.nickname || '',
        avatar: row.avatar || '',
        liked_count: row.liked_count || '0',
        collected_count: row.collected_count || '0',
        comment_count: row.comment_count || '0',
        share_count: row.share_count || '0',
        ip_location: row.ip_location || '',
        aweme_url: row.aweme_url || '',
        cover_url: row.cover_url || '',
        source_keyword: row.source_keyword || ''
      }));
    } catch (error) {
      console.error('[DouyinNewService] 解析 Contents CSV 失败:', error);
      return [];
    }
  }

  /**
   * 读取并解析 Comments CSV
   */
  private async parseCommentsCSV(filePath: string): Promise<DouyinNewComment[]> {
    try {
      // 检查文件是否存在
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      // 移除 BOM
      const cleanContent = content.replace(/^\uFEFF/, '');
      const records = this.parseCSV(cleanContent);

      return records.map((row) => ({
        comment_id: row.comment_id || '',
        create_time: row.create_time || '',
        ip_location: row.ip_location || '',
        aweme_id: row.aweme_id || '',
        content: row.content || '',
        nickname: row.nickname || '',
        avatar: row.avatar || '',
        sub_comment_count: row.sub_comment_count || '0',
        like_count: row.like_count || '0',
        parent_comment_id: row.parent_comment_id || ''
      }));
    } catch (error) {
      console.error('[DouyinNewService] 解析 Comments CSV 失败:', error);
      return [];
    }
  }

  /**
   * 映射视频数据为通用格式
   */
  private mapToRawVideoData(video: DouyinNewVideo): Record<string, unknown> {
    // 转换 Unix 时间戳为 ISO 格式
    const createTime = video.create_time
      ? new Date(parseInt(video.create_time) * 1000).toISOString()
      : new Date().toISOString();

    return {
      title: video.title || video.desc,
      author: video.nickname,
      video_url: video.aweme_url,
      publish_time: createTime,
      likes: video.liked_count,
      collected_at: new Date().toISOString(),
      comment_count: parseInt(video.comment_count) || 0,
      description: video.desc,
      // 扩展字段
      aweme_id: video.aweme_id,
      collected_count: video.collected_count,
      share_count: video.share_count
    };
  }

  /**
   * 映射评论数据为通用格式
   */
  private mapToRawCommentData(comment: DouyinNewComment, videoTitle: string): Record<string, unknown> {
    return {
      video_title: videoTitle,
      comment_text: comment.content,
      username: comment.nickname,
      likes: comment.like_count,
      // 扩展字段
      comment_id: comment.comment_id,
      ip_location: comment.ip_location
    };
  }

  /**
   * 搜索视频（不含评论）
   */
  async searchVideos(
    keywords: string,
    options: DouyinNewCrawlOptions
  ): Promise<{ videos: Record<string, unknown>[]; rawTexts: string[] }> {
    try {
      // 执行爬虫
      await this.executeCrawler(keywords, { ...options, enableComments: false });

      // 读取 CSV
      const csvPaths = this.getTodayCSVPaths();
      const videos = await this.parseContentsCSV(csvPaths.contents);

      // 按关键词过滤并限制数量
      const filteredVideos = videos
        .filter(v =>
          v.source_keyword === keywords ||
          v.title.includes(keywords) ||
          v.desc.includes(keywords)
        )
        .slice(0, options.maxVideos);

      // 提取文本
      const rawTexts: string[] = [];
      const mappedVideos = filteredVideos.map(v => {
        const mapped = this.mapToRawVideoData(v);
        if (v.title && v.title.length > 5) {
          rawTexts.push(v.title);
        }
        if (v.desc && v.desc.length > 10 && v.desc !== v.title) {
          rawTexts.push(v.desc);
        }
        return mapped;
      });

      // 去重
      const uniqueTexts = [...new Set(rawTexts)].filter(t => t.trim().length > 5);

      return { videos: mappedVideos, rawTexts: uniqueTexts };
    } catch (error) {
      throw new Error(`新版抖音数据抓取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 深度抓取（含评论）
   */
  async searchWithComments(
    keywords: string,
    options: DouyinNewCrawlOptions
  ): Promise<DeepCrawlResult> {
    try {
      // 执行爬虫（抓取评论）
      await this.executeCrawler(keywords, options);

      // 读取 CSV
      const csvPaths = this.getTodayCSVPaths();
      const videos = await this.parseContentsCSV(csvPaths.contents);
      const comments = options.enableComments
        ? await this.parseCommentsCSV(csvPaths.comments)
        : [];

      // 按关键词过滤
      const filteredVideos = videos.filter(
        v =>
          v.source_keyword === keywords ||
          v.title.includes(keywords) ||
          v.desc.includes(keywords)
      );

      // 限制视频数量
      const limitedVideos = filteredVideos.slice(0, options.maxVideos);
      const videoIds = new Set(limitedVideos.map(v => v.aweme_id));

      // 过滤评论
      const videoCommentCounts: Map<string, number> = new Map();
      const filteredComments = comments.filter(c => {
        if (!videoIds.has(c.aweme_id)) return false;
        const count = videoCommentCounts.get(c.aweme_id) || 0;
        if (count >= options.maxCommentsPerVideo) return false;
        videoCommentCounts.set(c.aweme_id, count + 1);
        return true;
      });

      // 构建 video ID -> title 映射
      const videoTitleMap = new Map(limitedVideos.map(v => [v.aweme_id, v.title]));

      // 提取文本
      const rawTexts: string[] = [];
      const mappedVideos = limitedVideos.map(v => {
        const mapped = this.mapToRawVideoData(v);
        if (v.title && v.title.length > 5) rawTexts.push(v.title);
        if (v.desc && v.desc.length > 10 && v.desc !== v.title) rawTexts.push(v.desc);
        return mapped;
      });

      const mappedComments = filteredComments.map(c => {
        const videoTitle = videoTitleMap.get(c.aweme_id) || '';
        const mapped = this.mapToRawCommentData(c, videoTitle);
        if (c.content && c.content.length > 5) rawTexts.push(c.content);
        return mapped;
      });

      // 去重
      const uniqueTexts = [...new Set(rawTexts)].filter(t => t.trim().length > 5);

      return {
        rawTexts: uniqueTexts,
        videos: mappedVideos,
        allComments: mappedComments,
        videoCount: limitedVideos.length,
        commentCount: filteredComments.length
      };
    } catch (error) {
      throw new Error(`新版抖音深度抓取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 检查爬虫可用性
   */
  async checkAvailability(): Promise<boolean> {
    try {
      await fs.access(this.crawlerPath);
      await fs.access(path.join(this.crawlerPath, 'main.py'));
      return true;
    } catch {
      return false;
    }
  }
}
