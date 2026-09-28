export type JobName =
  | "send-social-notification"
  | "prepare-data-export"
  | "finalize-account-deletion"
  | "cleanup-orphan-media"
  | "send-web-push"
  | "send-plan-reminder";

export interface QueuedJob<T = unknown> {
  id: string;
  name: JobName;
  payload: T;
  enqueuedAt: string;
  attempts: number;
}

/** Transport boundary. The durable Redis implementation arrives with SOC/OPS jobs. */
export interface QueueTransport {
  enqueue<T>(job: QueuedJob<T>): Promise<void>;
  claim(): Promise<QueuedJob | null>;
  acknowledge(id: string): Promise<void>;
  retry(id: string, delayMs: number): Promise<void>;
}

export type JobHandler = (job: QueuedJob) => Promise<void>;

export async function processOneJob(
  queue: QueueTransport,
  handlers: Partial<Record<JobName, JobHandler>>,
): Promise<boolean> {
  const job = await queue.claim();
  if (!job) return false;
  const handler = handlers[job.name];
  if (!handler) {
    await queue.retry(job.id, 60_000);
    return true;
  }
  try {
    await handler(job);
    await queue.acknowledge(job.id);
  } catch {
    const delayMs = Math.min(60_000, 1000 * 2 ** Math.min(job.attempts, 6));
    await queue.retry(job.id, delayMs);
  }
  return true;
}
