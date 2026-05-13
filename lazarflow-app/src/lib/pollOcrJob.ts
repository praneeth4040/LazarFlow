import { getOcrJobStatus } from './dataService';

export type JobStatus = 'pending' | 'running' | 'done' | 'failed';

export interface OcrJob {
  id: string;
  status: JobStatus;
  job_type: 'extract_results' | 'process_lobby';
  result: any | null;
  error: string | null;
  lobby_id: string;
  created_at: string;
  updated_at: string;
}

interface PollOptions {
  /** How often to poll in ms (default: 3000ms) */
  intervalMs?: number;
  /** Give up after this long in ms (default: 120000ms = 2 min) */
  timeoutMs?: number;
  /** Fired every time the job's status string changes */
  onStatusChange?: (status: JobStatus) => void;
}

/**
 * Polls GET /api/ai/jobs/{jobId} until the job reaches 'done' or 'failed'.
 *
 * Resolves with the raw `result` payload on success.
 * Rejects with an Error on failure or timeout.
 *
 * Network errors during polling are swallowed and retried automatically —
 * only a terminal backend status or a timeout triggers rejection.
 */
export async function pollOcrJob(
  jobId: string,
  options: PollOptions = {},
): Promise<any> {
  const { intervalMs = 3000, timeoutMs = 120_000, onStatusChange } = options;

  const startTime = Date.now();
  let lastStatus: JobStatus | null = null;

  return new Promise<any>((resolve, reject) => {
    const tick = async () => {
      // Timeout guard
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(handle);
        reject(new Error('Extraction timed out. Please try again.'));
        return;
      }

      try {
        const job: OcrJob = await getOcrJobStatus(jobId);

        // Fire callback only on status changes
        if (job.status !== lastStatus) {
          lastStatus = job.status;
          onStatusChange?.(job.status);
        }

        if (job.status === 'done') {
          clearInterval(handle);
          resolve(job.result);
        } else if (job.status === 'failed') {
          clearInterval(handle);
          reject(new Error(job.error ?? 'Extraction failed. Please try again.'));
        }
        // 'pending' or 'running' → keep polling
      } catch (err: any) {
        // Swallow transient network errors — do not cancel the poll
        console.warn('[pollOcrJob] transient fetch error, will retry:', err?.message);
      }
    };

    const handle = setInterval(tick, intervalMs);
    // Fire once immediately so the user doesn't wait one full interval before the first check
    tick();
  });
}
