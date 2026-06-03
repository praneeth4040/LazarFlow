import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOcrJobStatus, listOcrJobs } from '../lib/dataService';
import { socketService, JobUpdatePayload } from '../lib/socketService';

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
  activeJobsCount: number;
  activeJobForLobby: (lobbyId: string) => OcrJob | null;
  startJob: (params: StartJobParams) => void;
  markAllRead: () => void;
  dismissJob: (jobId: string) => void;
  clearCompletedJobs: () => void;
  clearJob: (lobbyId: string, jobType: OcrJobType) => void;
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
  // Track which jobs we received via socket (to avoid duplicate updates from polling)
  const socketUpdatedJobsRef = useRef<Set<string>>(new Set());

  // ── Socket event handlers ─────────────────────────────────────────────────

  const handleSocketJobUpdate = useCallback((payload: JobUpdatePayload) => {
    const { job_id, status, result, error } = payload;
    socketUpdatedJobsRef.current.add(job_id);

    setJobs(prev => {
      const existing = prev.find(j => j.jobId === job_id);
      if (!existing) {
        return prev;
      }

      // Stop polling since we got real-time update
      if (pollersRef.current[job_id]) {
        clearInterval(pollersRef.current[job_id]);
        delete pollersRef.current[job_id];
      }

      const next = prev.map(j =>
        j.jobId === job_id
          ? {
              ...j,
              status: status as OcrJobStatus,
              result: result ?? null,
              error: error ?? null,
              isRead: false,
            }
          : j
      );
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // ── Initialize socket connection ─────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 10;

    const initSocket = async () => {
      console.log('[OcrJobContext] Attempting to connect socket... (attempt ' + (retryCount + 1) + ')');

      const connected = await socketService.connect({
        onJobUpdate: handleSocketJobUpdate,
        onConnect: () => {
          console.log('[OcrJobContext] ✅ Socket connected successfully');
        },
        onDisconnect: (reason) => {
          console.log('[OcrJobContext] 🔌 Socket disconnected:', reason);
        },
        onError: (error) => {
          console.warn('[OcrJobContext] ⚠️ Socket error:', error.message);
        },
      });

      // If not connected and no token, retry after delay
      if (!connected && retryCount < MAX_RETRIES && isMounted) {
        console.log(`[OcrJobContext] 🔄 No auth token yet, retrying in 2s... (${retryCount + 1}/${MAX_RETRIES})`);
        retryCount++;
        setTimeout(initSocket, 2000);
      }
    };

    initSocket();

    return () => {
      isMounted = false;
      console.log('[OcrJobContext] Cleaning up socket connection');
      socketService.disconnect();
    };
  }, [handleSocketJobUpdate]);

  // ── Helpers ────────────────────────────────────────────────────────────────

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
      console.log(`[OcrJobContext] ⏹️ Stopped polling for job: ${jobId}`);
    }
    delete startTimesRef.current[jobId];
  }, []);

  /** Start polling a job by ID */
  const startPolling = useCallback(
    (jobId: string) => {
      // Guard against duplicate pollers
      if (pollersRef.current[jobId]) {
        console.log(`[OcrJobContext] Polling already active for job: ${jobId}`);
        return;
      }

      console.log(`[OcrJobContext] 🔄 Starting polling for job: ${jobId}`);

      // Record start time if not already set (resuming persisted jobs starts fresh)
      if (!startTimesRef.current[jobId]) {
        startTimesRef.current[jobId] = Date.now();
      }

      const tick = async () => {
        // Skip if already updated via socket
        if (socketUpdatedJobsRef.current.has(jobId)) {
          console.log(`[OcrJobContext] ⏹️ Stopping poll - job ${jobId} already updated via socket`);
          stopPolling(jobId);
          return;
        }

        // Timeout guard
        if (Date.now() - (startTimesRef.current[jobId] ?? Date.now()) > POLL_TIMEOUT_MS) {
          console.log(`[OcrJobContext] ⏱️ Poll timeout for job: ${jobId}`);
          stopPolling(jobId);
          patchJob(jobId, {
            status: 'failed',
            error: 'Extraction timed out. Please try again.',
            isRead: false,
          });
          return;
        }

        try {
          console.log(`[OcrJobContext] 🔍 Polling job status: ${jobId}`);
          const data = await getOcrJobStatus(jobId);
          const s = data.status as string;

          if (s === 'done') {
            console.log(`[OcrJobContext] ✅ Poll received 'done' for job: ${jobId}`);
            stopPolling(jobId);
            socketUpdatedJobsRef.current.add(jobId); // Mark to avoid double-processing
            patchJob(jobId, { status: 'done', result: data.result, isRead: false });
          } else if (s === 'failed') {
            console.log(`[OcrJobContext] ❌ Poll received 'failed' for job: ${jobId}`);
            stopPolling(jobId);
            socketUpdatedJobsRef.current.add(jobId);
            patchJob(jobId, {
              status: 'failed',
              error: data.error ?? 'Extraction failed.',
              isRead: false,
            });
          } else if (s === 'running') {
            console.log(`[OcrJobContext] 🔄 Poll: job ${jobId} still running`);
            patchJob(jobId, { status: 'running' });
          }
          // 'pending' → stays as 'queued' in our model
        } catch (err: any) {
          // Swallow transient network errors — retry on next tick
          console.warn(`[OcrJobContext] ⚠️ Poll error for job ${jobId}:`, err?.message);
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
      if (!raw) {
        console.log('[OcrJobContext] No persisted jobs found');
        return;
      }
      try {
        const saved: OcrJob[] = JSON.parse(raw);
        console.log(`[OcrJobContext] 📦 Loaded ${saved.length} persisted jobs`);
        setJobs(saved);
        // Resume polling for any jobs still in-flight
        saved.forEach(job => {
          if (
            job.status === 'queued' ||
            job.status === 'running' ||
            job.status === 'uploading'
          ) {
            console.log(`[OcrJobContext] 🔄 Resuming polling for persisted job: ${job.jobId}`);
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

  // ── Refresh jobs when app comes to foreground (handles background completion) ──
  const refreshJobsFromServer = useCallback(async () => {
    console.log('[OcrJobContext] 🔄 Refreshing jobs from server...');
    try {
      const serverData = await listOcrJobs(50);
      const allServerJobs = serverData.jobs || [];

      if (allServerJobs.length === 0) {
        console.log('[OcrJobContext] No jobs found on server');
        return;
      }

      // Only sync jobs that are NOT completed (done/failed) - user has already seen those
      // This avoids re-fetching all completed jobs on every refresh
      const serverJobs = allServerJobs.filter(
        (sj: any) => sj.status !== 'done' && sj.status !== 'failed'
      );

      console.log(`[OcrJobContext] 📥 Got ${allServerJobs.length} total jobs, ${serverJobs.length} in-progress`);

      setJobs(prev => {
        const serverJobMap = new Map(serverJobs.map((j: any) => [j.id, j]));
        const merged: OcrJob[] = [];

        // Keep local jobs that aren't on server anymore (handled locally)
        prev.forEach(localJob => {
          const serverJob = serverJobMap.get(localJob.jobId);
          if (!serverJob) {
            // Job was cleared locally, keep it
            merged.push(localJob);
          }
        });

        // Add/update server jobs
        serverJobs.forEach((sj: any) => {
          const localJob = prev.find(j => j.jobId === sj.id);

          // Only update if server status is more advanced or job is new to us
          if (!localJob || sj.status !== localJob.status) {
            merged.push({
              jobId: sj.id,
              jobType: sj.job_type === 'extract_results' ? 'extract_results' : 'process_lobby',
              lobbyId: sj.lobby_id,
              lobbyName: sj.lobby_name || 'Lobby',
              status: sj.status as OcrJobStatus,
              result: sj.result,
              error: sj.error,
              submittedAt: sj.created_at,
              isRead: localJob?.isRead ?? (sj.status === 'done' || sj.status === 'failed' ? false : true),
            });
            console.log(`[OcrJobContext] ✅ Updated job ${sj.id}: ${sj.status}`);

            // Start polling for in-flight jobs
            if (sj.status === 'queued' || sj.status === 'running' || sj.status === 'uploading') {
              startPolling(sj.id);
            }
          } else {
            merged.push(localJob);
          }
        });

        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
        return merged;
      });
    } catch (error: any) {
      console.warn('[OcrJobContext] ❌ Failed to refresh jobs from server:', error?.message);
    }
  }, [startPolling]);

  // Listen for app coming to foreground
  useEffect(() => {
    let subscription: any;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[OcrJobContext] 📱 App came to foreground, refreshing jobs...');
        refreshJobsFromServer();
      }
    };

    subscription = AppState.addEventListener('change', handleAppStateChange);

    // Also refresh immediately on mount
    refreshJobsFromServer();

    return () => {
      subscription?.remove();
    };
  }, [refreshJobsFromServer]);

  // ── Public API ────────────────────────────────────────────────────────────

  const startJob = useCallback(
    ({ jobId, jobType, lobbyId, lobbyName }: StartJobParams) => {
      console.log(`[OcrJobContext] 📤 Starting job: ${jobId} (type: ${jobType}) for lobby: ${lobbyId}`);

      // Stop any existing poll for the same lobby+type
      setJobs(prev => {
        const existing = prev.find(j => j.lobbyId === lobbyId && j.jobType === jobType);
        if (existing) {
          console.log(`[OcrJobContext] 🔄 Stopping existing poll for previous job: ${existing.jobId}`);
          stopPolling(existing.jobId);
        }
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
        console.log(`[OcrJobContext] 💾 Job added to context. Total jobs: ${next.length}`);
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

  const clearJob = useCallback(
    (lobbyId: string, jobType: OcrJobType) => {
      setJobs(prev => {
        const next = prev.filter(j => !(j.lobbyId === lobbyId && j.jobType === jobType));
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

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

  const activeJobsCount = jobs.filter(
    j => j.status === 'running' || j.status === 'queued' || j.status === 'uploading',
  ).length;

  return (
    <OcrJobContext.Provider
      value={{
        jobs,
        unreadCount,
        activeJobsCount,
        activeJobForLobby,
        startJob,
        markAllRead,
        dismissJob,
        clearCompletedJobs,
        clearJob,
      }}
    >
      {children}
    </OcrJobContext.Provider>
  );
};
