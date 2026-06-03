import { useState, useCallback, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { submitExtractResultsJob } from '../../lib/dataService';
import { BASE_URL } from '../../lib/apiClient';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { useOcrJobs } from '../../context/OcrJobContext';
import { ExtractedAIResult, LobbyData } from '../types';

/** Fine-grained UI phases for the async extraction flow */
export type AIPhase =
  | 'idle'
  | 'uploading'   // images are being sent to the server
  | 'queued'      // job accepted — context is polling (pending → running)
  | 'done'
  | 'error';

// ─── Result transformer (shared between init and effect) ─────────────────────

export function transformExtractResult(raw: any): ExtractedAIResult[] {
  const rawTeams = raw?.teams ?? (Array.isArray(raw) ? raw : []);
  return rawTeams.map((team: any, index: number) => {
    const players = team.players ?? [];
    const teamKills =
      team.kills !== undefined
        ? team.kills
        : players.reduce((sum: number, p: any) => sum + (p.kills ?? 0), 0);

    let rank: number = index + 1;
    if (team.position) {
      const n = parseInt(String(team.position).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(n)) rank = n;
    } else if (team.rank) {
      rank = team.rank;
    }

    return {
      rank,
      kills: teamKills,
      team_name: team.team_name ?? team.name ?? `Team #${rank}`,
      players: players.map((p: any) => ({
        name: p.name,
        kills: parseInt(p.kills ?? 0, 10),
      })),
      verification_urls: (() => {
        const rawUrls = team.verification_urls || (team.verification_url ? [team.verification_url] : []);
        const urlArray = Array.isArray(rawUrls) ? rawUrls : [rawUrls];
        return urlArray
          .map((url: any) => String(url).replace(/`/g, '').trim())
          .filter((url: string) => !!url)
          .map((url: string) => {
            if (url.startsWith('/') && !url.startsWith('http')) {
              return `${BASE_URL}${url}`;
            }
            return url;
          });
      })(),
      cell_request_id: team.cell_request_id,
    };
  });
}

// ─── Auto-mapping helper ──────────────────────────────────────────────────────

function buildInitialMappings(
  transformed: ExtractedAIResult[],
  teams: any[],
): Record<string, string> {
  const initialMappings: Record<string, string> = {};
  const hasExistingMembers = teams.some(t => t.members && t.members.length > 0);

  if (!hasExistingMembers) return initialMappings;

  try {
    const { fuzzyMatchName } = require('../../lib/aiUtils');
    const candidateMatches: Record<string, { rank: string | number; score: number }> = {};

    transformed.forEach(res => {
      let bestTeamId: string | null = null;
      let bestScore = 0;

      teams.forEach(registeredTeam => {
        const teamMembers = registeredTeam.members ?? [];
        if (teamMembers.length === 0) return;

        let matchedCount = 0;
        let totalSim = 0;
        (res.players ?? []).forEach((aiPlayer: any) => {
          const pMatch = fuzzyMatchName(aiPlayer.name, teamMembers, 0.75);
          if (pMatch) {
            matchedCount++;
            totalSim += pMatch.score;
          }
        });

        if (matchedCount >= 2) {
          const score = matchedCount * 10 + totalSim / matchedCount;
          if (score > bestScore) {
            bestScore = score;
            bestTeamId = registeredTeam.id;
          }
        }
      });

      if (bestTeamId) {
        const existing = candidateMatches[bestTeamId as string];
        if (!existing || bestScore > existing.score) {
          candidateMatches[bestTeamId as string] = { rank: res.rank, score: bestScore };
        }
      }
    });

    Object.entries(candidateMatches).forEach(([teamId, data]) => {
      initialMappings[String(data.rank)] = teamId;
    });
  } catch (e) {
    // fuzzyMatchName may not be available in all builds
  }

  return initialMappings;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseAIExtractionAsyncReturn {
  phase: AIPhase;
  jobStatus: string | null;
  aiResults: ExtractedAIResult[];
  showMapping: boolean;
  mappings: Record<string, string>;
  resultImages: ImagePicker.ImagePickerAsset[];
  setShowMapping: (v: boolean) => void;
  setMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handlePickResultImages: () => Promise<void>;
  handleRemoveResultImage: (index: number) => void;
  handleAIUpload: (images: ImagePicker.ImagePickerAsset[]) => Promise<void>;
  reset: () => void;
}

export function useAIExtractionAsync(
  lobby: LobbyData,
  teams: any[],
  user: any,
  refreshUser: () => void,
  navigation: any,
): UseAIExtractionAsyncReturn {
  const ocrJobCtx = useOcrJobs();

  // ── Restore state from context on mount ────────────────────────────────────
  const contextJob = ocrJobCtx.activeJobForLobby(lobby?.id);

  const getInitialPhase = (): AIPhase => {
    if (!contextJob) return 'idle';
    if (contextJob.status === 'done') return 'done';
    if (contextJob.status === 'failed') return 'error';
    return 'queued'; // uploading / queued / running all show queued UI
  };

  const getInitialResults = (): ExtractedAIResult[] => {
    if (contextJob?.status === 'done' && contextJob.result) {
      return transformExtractResult(contextJob.result);
    }
    return [];
  };

  const [phase, setPhase] = useState<AIPhase>(getInitialPhase);
  const [jobStatus, setJobStatus] = useState<string | null>(
    contextJob?.status ?? null,
  );
  const [aiResults, setAiResults] = useState<ExtractedAIResult[]>(getInitialResults);
  const [showMapping, setShowMapping] = useState(contextJob?.status === 'done');
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    if (contextJob?.status === 'done' && contextJob.result) {
      const transformed = transformExtractResult(contextJob.result);
      return buildInitialMappings(transformed, teams);
    }
    return {};
  });
  const [resultImages, setResultImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // Track which job we last processed so we don't re-process on every render
  const processedJobIdRef = useRef<string | null>(
    contextJob?.status === 'done' ? contextJob.jobId : null,
  );

  // ── Rebuild mappings when teams become available (e.g., after async load) ──
  useEffect(() => {
    // Only rebuild if we have results but no mappings yet and teams are now available
    if (aiResults.length > 0 && Object.keys(mappings).length === 0 && teams.length > 0) {
      const rebuiltMappings = buildInitialMappings(aiResults, teams);
      if (Object.keys(rebuiltMappings).length > 0) {
        setMappings(rebuiltMappings);
        setShowMapping(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  // ── Watch context job for live updates (polling → done/failed) ────────────

  useEffect(() => {
    if (!lobby?.id) return;
    const job = ocrJobCtx.activeJobForLobby(lobby.id);

    // If job no longer exists but we have local state, reset it
    // This handles the case where user dismissed/submitted results
    if (!job && (aiResults.length > 0 || showMapping || phase !== 'idle')) {
      setAiResults([]);
      setShowMapping(false);
      setPhase('idle');
      setMappings({});
      setJobStatus(null);
      processedJobIdRef.current = null;
      return;
    }

    if (!job) return;

    // Update live status text
    setJobStatus(job.status);

    if (job.status === 'running' || job.status === 'queued' || job.status === 'uploading') {
      setPhase('queued');
    }

    if (job.status === 'done' && job.jobId !== processedJobIdRef.current) {
      processedJobIdRef.current = job.jobId;
      const transformed = transformExtractResult(job.result);
      const initialMappings = buildInitialMappings(transformed, teams);
      setAiResults(transformed);
      setMappings(initialMappings);
      setShowMapping(true);
      setPhase('done');
      refreshUser();
    }

    if (job.status === 'failed' && job.jobId !== processedJobIdRef.current) {
      processedJobIdRef.current = job.jobId;
      setPhase('error');
      Alert.alert(
        'Extraction Failed',
        job.error ?? 'Something went wrong. Please try again.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocrJobCtx.jobs, lobby?.id]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setPhase('idle');
    setJobStatus(null);
    setAiResults([]);
    setShowMapping(false);
    setMappings({});
    processedJobIdRef.current = null;
  }, []);

  const handlePickResultImages = useCallback(async () => {
    if ((user?.flux_balance ?? 0) < 1) {
      Alert.alert(
        'Insufficient Credits',
        'You need at least 1 AI Credit to perform result extraction.',
        [
          { text: 'Later', style: 'cancel' } as any,
          { text: 'Store', onPress: () => navigation.navigate('SubscriptionPlans') } as any,
        ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      setResultImages(prev => [...prev, ...result.assets]);
    }
  }, [user?.flux_balance, navigation]);

  const handleRemoveResultImage = useCallback((index: number) => {
    setResultImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Submits images to the v2 endpoint and hands off polling to OcrJobContext.
   * The context polling loop survives navigation — no more lost state.
   */
  const handleAIUpload = useCallback(
    async (images: ImagePicker.ImagePickerAsset[]) => {
      if (images.length === 0) {
        Alert.alert('No Images', 'Please select at least one scoreboard screenshot.');
        return;
      }
      if (!lobby?.id) {
        Alert.alert('Error', 'No lobby selected.');
        return;
      }

      try {
        // 1. Submit — returns job_id instantly
        setPhase('uploading');
        const { job_id } = await submitExtractResultsJob(lobby.id, images);

        // 2. Hand off to global context (polling continues even if user navigates away)
        ocrJobCtx.startJob({
          jobId: job_id,
          jobType: 'extract_results',
          lobbyId: lobby.id,
          lobbyName: lobby.name ?? 'Lobby',
        });

        setPhase('queued');
        // The useEffect above will react when the context job transitions to done/failed
      } catch (err: any) {
        setPhase('error');

        if (err.response?.status === 402) {
          Alert.alert(
            'Insufficient Credits',
            'You have run out of AI Credits.',
            [
              { text: 'Later', style: 'cancel' } as any,
              { text: 'View Store', onPress: () => navigation.navigate('SubscriptionPlans') } as any,
            ],
          );
        } else {
          Alert.alert(
            'Extraction Failed',
            err?.message ?? 'Something went wrong. Please try again.',
          );
        }
      }
    },
    [lobby?.id, lobby?.name, ocrJobCtx, navigation],
  );

  return {
    phase,
    jobStatus,
    aiResults,
    showMapping,
    mappings,
    resultImages,
    setShowMapping,
    setMappings,
    handlePickResultImages,
    handleRemoveResultImage,
    handleAIUpload,
    reset,
  };
}
