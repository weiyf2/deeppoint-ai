export const JOB_RETENTION = {
  maxAgeMs: 24 * 60 * 60 * 1000,
  maxJobs: 100
} as const;

export interface RetainedJob {
  status: string;
  startTime: number;
}

export function pruneExpiredJobs<TJob extends RetainedJob>(
  jobs: Map<string, TJob>,
  maxAgeMs: number = JOB_RETENTION.maxAgeMs
): void {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.startTime > maxAgeMs) {
      jobs.delete(jobId);
    }
  }
}

export function trimOldestJobs<TJob extends RetainedJob>(
  jobs: Map<string, TJob>,
  maxJobs: number = JOB_RETENTION.maxJobs
): void {
  if (jobs.size <= maxJobs) {
    return;
  }

  const sortedJobs = [...jobs.entries()].sort(([, a], [, b]) => a.startTime - b.startTime);
  const completedFirst = [
    ...sortedJobs.filter(([, job]) => job.status !== 'processing'),
    ...sortedJobs.filter(([, job]) => job.status === 'processing')
  ];

  for (const [jobId] of completedFirst) {
    if (jobs.size <= maxJobs) {
      break;
    }
    jobs.delete(jobId);
  }
}

