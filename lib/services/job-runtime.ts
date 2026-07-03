import fs from 'node:fs';
import path from 'node:path';
import { logger } from './logger';

type RuntimeJobStatus = 'processing' | 'completed' | 'failed';

export interface RuntimeJob {
  jobId: string;
  status: RuntimeJobStatus;
  progress: string;
  startTime: number;
  error?: string;
}

const DEFAULT_MAX_CONCURRENT_JOBS = 1;
const DEFAULT_JOB_TIMEOUT_MS = 15 * 60 * 1000;

function readPositiveInteger(name: string, defaultValue: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return defaultValue;
  }

  const value = Number.parseInt(rawValue, 10);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

function getJobDataRoot(): string {
  return process.env.DEEPPOINT_JOB_DATA_DIR || path.join(process.cwd(), '.deeppoint', 'jobs');
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function getJobTimeoutMs(): number {
  return readPositiveInteger('DEEPPOINT_JOB_TIMEOUT_MS', DEFAULT_JOB_TIMEOUT_MS);
}

export function logJobEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: Record<string, unknown>
): void {
  logger[level]({
    component: 'job-runtime',
    event,
    ...fields
  });
}

export class JsonJobStore<TJob extends RuntimeJob> {
  private readonly directory: string;

  constructor(namespace: string) {
    this.directory = path.join(getJobDataRoot(), sanitizePathPart(namespace));
  }

  loadAll(): Map<string, TJob> {
    const jobs = new Map<string, TJob>();

    if (!fs.existsSync(this.directory)) {
      return jobs;
    }

    for (const entry of fs.readdirSync(this.directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(this.directory, entry.name);
      try {
        const job = JSON.parse(fs.readFileSync(filePath, 'utf8')) as TJob;
        if (!job.jobId || !job.startTime || !job.status) {
          continue;
        }

        if (job.status === 'processing') {
          job.status = 'failed';
          job.progress = '服务重启，任务已停止';
          job.error = '服务重启后无法恢复正在执行的内存任务，请重新提交';
          this.save(job);
        }

        jobs.set(job.jobId, job);
      } catch (error) {
        logJobEvent('warn', 'job_store_load_failed', {
          filePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return jobs;
  }

  save(job: TJob): void {
    fs.mkdirSync(this.directory, { recursive: true });
    const filePath = this.getJobPath(job.jobId);
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(job, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  }

  delete(jobId: string): void {
    const filePath = this.getJobPath(jobId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  private getJobPath(jobId: string): string {
    return path.join(this.directory, `${sanitizePathPart(jobId)}.json`);
  }
}

class JobQueue {
  private readonly maxConcurrentJobs: number;
  private runningJobs = 0;
  private queue: Array<() => void> = [];

  constructor(maxConcurrentJobs: number) {
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  run<T>(
    jobId: string,
    jobType: string,
    task: () => Promise<T>,
    onStart: () => void
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const runTask = async () => {
        this.runningJobs += 1;
        onStart();
        logJobEvent('info', 'job_started', {
          jobId,
          jobType,
          runningJobs: this.runningJobs,
          queuedJobs: this.queue.length
        });

        try {
          resolve(await task());
        } catch (error) {
          reject(error);
        } finally {
          this.runningJobs -= 1;
          this.pump();
        }
      };

      this.queue.push(runTask);
      logJobEvent('info', 'job_queued', {
        jobId,
        jobType,
        runningJobs: this.runningJobs,
        queuedJobs: this.queue.length,
        maxConcurrentJobs: this.maxConcurrentJobs
      });
      this.pump();
    });
  }

  private pump(): void {
    while (this.runningJobs < this.maxConcurrentJobs) {
      const nextJob = this.queue.shift();
      if (!nextJob) {
        return;
      }

      void nextJob();
    }
  }
}

export const jobQueue = new JobQueue(
  readPositiveInteger('DEEPPOINT_MAX_CONCURRENT_JOBS', DEFAULT_MAX_CONCURRENT_JOBS)
);

export function withTimeout<T>(
  task: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([task, timeoutPromise]).finally(() => {
    clearTimeout(timeout);
  });
}
