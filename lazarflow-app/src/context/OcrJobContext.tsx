import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOcrJobStatus } from '../lib/dataService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OcrJobStatus = 'uploading' | 'queued' | 'running' | 'done' | 'failed';
export type OcrJobType = 'extract_results' | 'process_lobby';

export interface OcrJob {
  jobId: string;
  jobType: OcrJobType;
  lobbyId: string;
  lobbyName: string;
  status: OcrJobStatus;
  result: any | null;
  error: string | null;
  submittedAt: string;
  isRead: boolean;
}

interface StartJobParams {
  jobId: string;
  jobType: OcrJobType;
  lobbyId: string;
  lobbyName: string;
}

interface OcrJobContextValue {
  jobs: OcrJob[];
  unreadCount: number;
  activeJobForLobby: (lobbyId: string) => OcrJob | null;
  startJob: (params: StartJobParams) => void;
  markAllRead: () => void;
  dismissJob: (jobId: string) => void;
  clearCompletedJobs: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = '@ocr_jobs_v1';
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 120_000;

// ─── Context ──────────────────────────────────────────────────────────────────

const OcrJobContext = createContext<OcrJobContextValue | null>(null);

export const useOcrJobs = (): OcrJobContextValue => {
  const ctx = useContext(OcrJobContext);
  if (!ctx) throw new Error('useOcrJobs must be used within OcrJobProvider');
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const OcrJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<OcrJob[]>([]);

  // Interval handles keyed by jobId
  const pollersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  // Polling start times for timeout tracking
  const startTimesRef = useRef<Record<string, number>>({});

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Persist jobs list to AsyncStorage (fire-and-forget) */
  const persistJobs = useCallback((updatedJobs: OcrJob[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedJobs)).catch(() => {});
  }, []);

  /** Update a single job by ID using functional setState so we never capture stale state */
  const patchJob = useCallback((jobId: string, patch: Partial<OcrJob>) => {
    setJobs(prev => {
      const next = prev.map(j => (j.jobId === jobId ? { ...j, ...patch } : j));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /** Stop the interval for a given job */
  const stopPolling = useCallback((jobId: string) => {
    if (pollersRef.current[jobId]) {
      clearInterval(pollersRef.current[jobId]);
      delete pollersRef.current[jobId];
    }
    delete startTimesRef.current[jobId];
  }, []);

  /** Start polling a job by ID */
  const startPolling = useCallback(
    (jobId: string) => {
      // Guard against duplicate pollers
      if (pollersRef.current[jobId]) return;

      // Record start time if not already set (resuming persisted jobs starts fresh)
      if (!startTimesRef.current[jobId]) {
        startTimesRef.current[jobId] = Date.now();
      }

      const tick = async () => {
        // Timeout guard
        if (Date.now() - (startTimesRef.current[jobId] ?? Date.now()) > POLL_TIMEOUT_MS) {
          stopPolling(jobId);
          patchJob(jobId, {
            status: 'failed',
            error: 'Extraction timed out. Please try again.',
            isRead: false,
          });
          return;
        }

        try {
          const data = await getOcrJobStatus(jobId);
          const s = data.status as string;

          if (s === 'done') {
            stopPolling(jobId);
            patchJob(jobId, { status: 'done', result: data.result, isRead: false });
          } else if (s === 'failed') {
            stopPolling(jobId);
            patchJob(jobId, {
              status: 'failed',
              error: data.error ?? 'Extraction failed.',
              isRead: false,
            });
          } else if (s === 'running') {
            patchJob(jobId, { status: 'running' });
          }
          // 'pending' → stays as 'queued' in our model
        } catch (err: any) {
          // Swallow transient network errors — retry on next tick
          console.warn('[OcrJobContext] poll error, will retry:', err?.message);
        }
      };

      // Fire once immediately, then on interval
      tick();
      pollersRef.current[jobId] = setInterval(tick, POLL_INTERVAL_MS);
    },
    [stopPolling, patchJob],
  );

  // ── Load persisted jobs on mount & resume polling ─────────────────────────

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved: OcrJob[] = JSON.parse(raw);
        setJobs(saved);
        // Resume polling for any jobs still in-flight
        saved.forEach(job => {
          if (
            job.status === 'queued' ||
            job.status === 'running' ||
            job.status === 'uploading'
          ) {
            startPolling(job.jobId);
          }
        });
      } catch (e) {
        console.warn('[OcrJobContext] failed to parse persisted jobs:', e);
      }
    });
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup pollers on unmount ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      Object.values(pollersRef.current).forEach(clearInterval);
    };
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const startJob = useCallback(
    ({ jobId, jobType, lobbyId, lobbyName }: StartJobParams) => {
      // Stop any existing poll for the same lobby+type
      setJobs(prev => {
        const existing = prev.find(j => j.lobbyId === lobbyId && j.jobType === jobType);
        if (existing) stopPolling(existing.jobId);
        return prev;
      });

      const newJob: OcrJob = {
        jobId,
        jobType,
        lobbyId,
        lobbyName,
        status: 'queued',
        result: null,
        error: null,
        submittedAt: new Date().toISOString(),
        isRead: true, // Don't badge until job completes
      };

      setJobs(prev => {
        const filtered = prev.filter(
          j => !(j.lobbyId === lobbyId && j.jobType === jobType),
        );
        const next = [newJob, ...filtered];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });

      startPolling(jobId);
    },
    [stopPolling, startPolling],
  );

  const markAllRead = useCallback(() => {
    setJobs(prev => {
      const next = prev.map(j => ({ ...j, isRead: true }));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const dismissJob = useCallback(
    (jobId: string) => {
      stopPolling(jobId);
      setJobs(prev => {
        const next = prev.filter(j => j.jobId !== jobId);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [stopPolling],
  );

  const clearCompletedJobs = useCallback(() => {
    setJobs(prev => {
      const next = prev.filter(j => j.status !== 'done' && j.status !== 'failed');
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const activeJobForLobby = useCallback(
    (lobbyId: string): OcrJob | null => {
      return (
        jobs.find(j => j.lobbyId === lobbyId && j.jobType === 'extract_results') ?? null
      );
    },
    [jobs],
  );

  const unreadCount = jobs.filter(
    j => !j.isRead && (j.status === 'done' || j.status === 'failed'),
  ).length;

  return (
    <OcrJobContext.Provider
      value={{
        jobs,
        unreadCount,
        activeJobForLobby,
        startJob,
        markAllRead,
        dismissJob,
        clearCompletedJobs,
      }}
    >
      {children}
    </OcrJobContext.Provider>
  );
};
