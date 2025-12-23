// 小红书数据抓取服务
import { spawn } from 'child_process';
import path from 'path';
import { getPythonCommand } from '../utils/python-detector';

export interface SearchResult {
  title: string;
  likes_count: number;
  url: string;
}

export interface XHSNote {
  id: string;
  title: string;
  author: string;
  content: string;
  publish_time: string;
  likes_count: number;
  comments_count: number;
  collects_count: number;
  cover_url?: string;
  note_url: string;
}

export interface XHSComment {
  user_nickname: string;
  content: string;
  comment_time: string;
}

export class XHSService {
  private pythonPath: string;
  private scriptPath: string;
  private cookie: string;

  constructor() {
    // 自动检测可用的 Python 命令（python3 或 python）
    this.pythonPath = getPythonCommand();
    this.scriptPath = path.join(process.cwd(), 'lib', 'xiaohongshu_tool.py');
    this.cookie = process.env.XHS_COOKIE || '';
  }

  private async executePythonScript(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, ...args], {
        env: { ...process.env, XHS_COOKIE: this.cookie },
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.setEncoding('utf8');
      pythonProcess.stderr.setEncoding('utf8');

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Python script failed: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkCookie(): Promise<boolean> {
    try {
      const result = await this.executePythonScript(['--action', 'check']);
      return result.includes('COOKIE_VALID');
    } catch {
      return false;
    }
  }

  async searchNotes(keywords: string, limit: number = 20): Promise<{ notes: SearchResult[], rawTexts: string[] }> {
    try {
      const result = await this.executePythonScript([
        '--action', 'search',
        '--keywords', keywords
      ]);

      const notes = this.parseSearchResults(result);
      const rawTexts: string[] = [];

      // 获取每个笔记的详细内容和评论，但限制数量避免过长等待
      const notesToProcess = notes.slice(0, Math.min(limit, 8));

      for (let i = 0; i < notesToProcess.length; i++) {
        const note = notesToProcess[i];
        try {
          // 获取笔记内容
          const contentResult = await this.executePythonScript([
            '--action', 'content',
            '--url', note.url
          ]);

          const noteContent = this.parseNoteContent(contentResult);
          if (noteContent.content && noteContent.content.length > 10) {
            rawTexts.push(noteContent.content);
          }

          // 获取评论
          const commentsResult = await this.executePythonScript([
            '--action', 'comments',
            '--url', note.url
          ]);

          const comments = this.parseComments(commentsResult);
          let commentCount = 0;
          comments.forEach(comment => {
            if (comment.content && comment.content.length > 5 && commentCount < 5) {
              rawTexts.push(comment.content);
              commentCount++;
            }
          });

          // 添加短暂延时避免请求过快
          if (i < notesToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch {
          // 跳过失败的笔记
        }
      }

      // 过滤和清理文本
      const cleanedTexts = rawTexts
        .filter(text => text && text.trim().length > 5)
        .map(text => text.trim())
        .filter((text, index, arr) => arr.indexOf(text) === index);

      return { notes, rawTexts: cleanedTexts };
    } catch {
      throw new Error('小红书数据抓取失败');
    }
  }

  private parseSearchResults(result: string): SearchResult[] {
    const notes: SearchResult[] = [];
    const lines = result.split('\n');

    let currentNote: Partial<SearchResult> | null = null;
    for (const line of lines) {
      const titleMatch = line.match(/^\d+\.\s+(.+)/);
      if (titleMatch) {
        if (currentNote && currentNote.title && currentNote.url) {
          notes.push(currentNote as SearchResult);
        }
        currentNote = { title: titleMatch[1] };
      } else if (line.includes('点赞数:') && currentNote) {
        const likesMatch = line.match(/点赞数:\s*(\d+)/);
        if (likesMatch) currentNote.likes_count = parseInt(likesMatch[1]);
      } else if (line.includes('链接:') && currentNote) {
        const urlMatch = line.match(/链接:\s*(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          currentNote.url = urlMatch[1];
        }
      }
    }
    if (currentNote && currentNote.title && currentNote.url) {
      notes.push(currentNote as SearchResult);
    }

    return notes;
  }

  private parseNoteContent(result: string): Partial<XHSNote> {
    const lines = result.split('\n');
    const note: Partial<XHSNote> = {};

    for (const line of lines) {
      if (line.startsWith('标题:')) {
        note.title = line.substring(3).trim();
      } else if (line.startsWith('作者:')) {
        note.author = line.substring(3).trim();
      } else if (line.startsWith('内容:')) {
        // 内容可能是多行的，需要收集后续行
        const contentIndex = lines.indexOf(line);
        const contentLines = lines.slice(contentIndex + 1);
        note.content = contentLines.join('\n').trim();
        break;
      }
    }

    return note;
  }

  private parseComments(result: string): XHSComment[] {
    const comments = [];
    const lines = result.split('\n');

    for (const line of lines) {
      const commentMatch = line.match(/^\d+\.\s*(.+?)（(.+?)）:\s*(.+)/);
      if (commentMatch) {
        comments.push({
          user_nickname: commentMatch[1],
          comment_time: commentMatch[2],
          content: commentMatch[3]
        });
      }
    }

    return comments;
  }
}