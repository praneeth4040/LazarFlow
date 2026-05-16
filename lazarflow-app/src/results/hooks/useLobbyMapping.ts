import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { submitProcessLobbyJob } from '../../lib/dataService';
import { useOcrJobs } from '../../context/OcrJobContext';
import { ProcessedSlot, LobbyData } from '../types';

export type LobbyProcessPhase = 'idle' | 'uploading' | 'queued' | 'done' | 'error';

export const useLobbyMapping = (lobby: LobbyData, teams: any[], fetchLobbyData: () => void) => {
  const ocrJobCtx = useOcrJobs();
  const [lobbyImages, setLobbyImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [lobbyPhase, setLobbyPhase] = useState<LobbyProcessPhase>('idle');
  const [lobbyJobStatus, setLobbyJobStatus] = useState<string | null>(null);
  const [processedSlots, setProcessedSlots] = useState<ProcessedSlot[]>([]);
  const [showSlotMapping, setShowSlotMapping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /** Convenience boolean kept for any remaining callers */
  const processingLobby = lobbyPhase === 'uploading' || lobbyPhase === 'queued';

  // Always keep a fresh reference to teams so the effect never captures a stale empty array
  const teamsRef = useRef(teams);
  teamsRef.current = teams;

  // Track which job we've already processed to avoid double-processing
  const processedJobIdRef = useRef<string | null>(null);

  // ── Watch context for process_lobby job completion ────────────────────────
  useEffect(() => {
    if (!lobby?.id) return;
    const job = ocrJobCtx.jobs.find(
      j => j.lobbyId === lobby.id && j.jobType === 'process_lobby',
    );

    // If job no longer exists but we have local state, reset it
    // This handles the case where user dismissed/submitted results
    if (!job && (processedSlots.length > 0 || showSlotMapping || lobbyPhase !== 'idle')) {
      console.log('[useLobbyMapping] Job cleared, resetting local state');
      setProcessedSlots([]);
      setShowSlotMapping(false);
      setLobbyPhase('idle');
      setLobbyJobStatus(null);
      processedJobIdRef.current = null;
      return;
    }

    if (!job) return;

    setLobbyJobStatus(job.status);

    if (job.status === 'running' || job.status === 'queued' || job.status === 'uploading') {
      setLobbyPhase('queued');
    }

    if (job.status === 'done' && job.jobId !== processedJobIdRef.current) {
      processedJobIdRef.current = job.jobId;

      const rawSlots: any[] = Array.isArray(job.result)
        ? job.result
        : (job.result?.teams ?? []);

      if (rawSlots.length === 0) {
        setLobbyPhase('error');
        Alert.alert('Error', 'No slots identified in the screenshots. Please try again.');
        return;
      }

      const formattedSlots: ProcessedSlot[] = rawSlots
        .map((item: any, index: number) => {
          const slotNum = item.team_number ?? item.slot ?? (index + 1);
          const players = (item.players ?? []).map((p: any) =>
            typeof p === 'object' ? p.name : p,
          );
          // Use teamsRef.current so we always read the latest teams, never a stale snapshot
          const currentTeams = teamsRef.current;
          const matchedTeam = currentTeams.find(
            t => Number(t.respective_slotlist_postion) === Number(slotNum) ||
                 String(t.respective_slotlist_postion) === String(slotNum)
          );
          return {
            slot: slotNum,
            players,
            mappedTeamId: matchedTeam ? matchedTeam.id : null,
          };
        })
        .sort((a, b) => (Number(a.slot) || 0) - (Number(b.slot) || 0));

      setProcessedSlots(formattedSlots);
      setLobbyPhase('done');
      setShowSlotMapping(true);
      Alert.alert(
        'Lobby Processed',
        `Successfully identified ${formattedSlots.length} slots. You can now map them to teams.`,
      );
    }

    if (job.status === 'failed' && job.jobId !== processedJobIdRef.current) {
      processedJobIdRef.current = job.jobId;
      setLobbyPhase('error');
      Alert.alert(
        'Error',
        job.error ?? 'Failed to process lobby screenshots. Please try again.',
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocrJobCtx.jobs, lobby?.id]);

  const handlePickLobbyImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setLobbyImages(prev => [...prev, ...result.assets]);
    }
  };

  const handleRemoveLobbyImage = (index: number) => {
    setLobbyImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessLobby = async () => {
    if (lobbyImages.length === 0) {
      Alert.alert('Error', 'Please select lobby screenshots first');
      return;
    }

    try {
      // 1. Submit job — returns instantly (HTTP 202)
      setLobbyPhase('uploading');
      const { job_id } = await submitProcessLobbyJob(lobby.id, lobbyImages);

      // 2. Hand off to global context — polling continues even if user navigates away
      ocrJobCtx.startJob({
        jobId: job_id,
        jobType: 'process_lobby',
        lobbyId: lobby.id,
        lobbyName: (lobby as any).name ?? 'Lobby',
      });

      setLobbyPhase('queued');
      // The useEffect above will react when the context job transitions to done/failed
    } catch (err: any) {
      console.error('Lobby Process Error:', err);
      setLobbyPhase('error');
      Alert.alert(
        'Error',
        err?.message ?? 'Failed to process lobby screenshots. Please try again or use manual mode.',
      );
    }
  };

  const handleUpdateSlotMapping = (slotIndex: number, teamId: string | null) => {
    const updatedSlots = [...processedSlots];
    updatedSlots[slotIndex].mappedTeamId = teamId;
    setProcessedSlots(updatedSlots);
  };

  const handleSaveSlotMappings = async () => {
    setSubmitting(true);
    try {
      const updates = [];
      for (const slot of processedSlots) {
        if (slot.mappedTeamId) {
          const structuredMembers = (slot.players || []).map((p: string) => ({
            name: String(p),
            kills: 0,
            wwcd: 0,
            matches_played: 0
          }));

          updates.push({
            id: slot.mappedTeamId,
            members: structuredMembers
          });
        }
      }

      if (updates.length > 0) {
        await lobbyRepository.batchUpdateTeamMembers(lobby.id, updates);
      }

      const currentStatus = (lobby as any).status?.toLowerCase() || '';
      if (currentStatus === 'setup' || !currentStatus) {
        try {
          await lobbyRepository.updateLobby(lobby.id, { status: 'active' });
        } catch (statusErr: any) {
          console.warn('⚠️ Failed to auto-transition lobby status:', statusErr?.response?.data || statusErr.message);
        }
      }

      Alert.alert('Success', 'Lobby process complete and status updated!');
      setShowSlotMapping(false);
      if (fetchLobbyData) fetchLobbyData();
    } catch (err) {
      console.error('Error saving slot mappings:', err);
      Alert.alert('Error', 'Failed to save team member mappings');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    lobbyImages,
    // Phase-aware fields
    lobbyPhase,
    lobbyJobStatus,
    // Convenience boolean for backward compatibility
    processingLobby,
    processedSlots,
    showSlotMapping,
    submitting,
    setShowSlotMapping,
    handlePickLobbyImages,
    handleRemoveLobbyImage,
    handleProcessLobby,
    handleUpdateSlotMapping,
    handleSaveSlotMappings,
  };
};
