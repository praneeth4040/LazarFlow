import { useState } from 'react';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { extractApiErrorMessage } from '../../lib/apiClient';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { MatchResult, LobbyData } from '../types';

export const useResultsManagement = (lobby: LobbyData, teams: any[], navigation: any, onResultsSaved?: () => void) => {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  const toggleResultExpansion = (teamId: string) => {
    setExpandedResults(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const handleAddResult = (result: MatchResult) => {
    if (results.some(r => r.team_id === result.team_id)) {
      Alert.alert('Info', 'Team already added to results');
      return;
    }

    setExpandedResults(prev => ({
      ...prev,
      [result.team_id]: true
    }));

    setResults([...results, result]);
  };

  const handleUpdateResult = (index: number, field: keyof MatchResult, value: string) => {
    const updatedResults = [...results];
    const val = (field === 'kills' || field === 'position') ? parseInt(value) || 0 : value;
    
    // Type casting logic
    if (field === 'position' || field === 'team_id' || field === 'team_name') {
       updatedResults[index][field] = String(val) as any;
    } else {
       updatedResults[index][field] = val as never;
    }

    if (field === 'position' && lobby.points_system) {
      const pointsEntry = lobby.points_system.find(p => p.placement === Number(val));
      updatedResults[index].placement_points = pointsEntry ? pointsEntry.points : 0;
    }

    updatedResults[index].kill_points = updatedResults[index].kills * (lobby.kill_points || 0);
    updatedResults[index].total_points = (updatedResults[index].placement_points || 0) + (updatedResults[index].kill_points || 0);
    setResults(updatedResults);
  };

  const handleUpdateMemberKills = (resultIndex: number, memberIndex: number, kills: string) => {
    const updatedResults = [...results];
    if (updatedResults[resultIndex].members) {
      const member = updatedResults[resultIndex].members![memberIndex];
      member.kills = parseInt(kills) || 0;

      const totalMemberKills = updatedResults[resultIndex].members!.reduce((sum, m) => sum + (m.kills || 0), 0);
      updatedResults[resultIndex].kills = totalMemberKills;

      updatedResults[resultIndex].kill_points = totalMemberKills * (lobby.kill_points || 0);
      updatedResults[resultIndex].total_points = (updatedResults[resultIndex].placement_points || 0) + (updatedResults[resultIndex].kill_points || 0);

      setResults(updatedResults);
    }
  };

  const handleReplaceResult = (index: number, newResult: MatchResult) => {
    const updated = [...results];
    updated[index] = newResult;
    setResults(updated);
  };

  const handleRemoveResult = (index: number) => {
    const filtered = results.filter((_, i) => i !== index);
    const updated = filtered.map((res, i) => {
      const pos = i + 1;
      const pointsEntry = lobby.points_system?.find(p => p.placement === pos);
      const placementPoints = pointsEntry ? pointsEntry.points : 0;
      return {
        ...res,
        position: String(pos),
        placement_points: placementPoints,
        total_points: (placementPoints || 0) + (res.kill_points || 0)
      };
    });
    setResults(updated);
  };

  // Match results go to the match endpoint as-submitted — the server stores
  // the per-match row (proofs included) and applies the aggregate deltas to
  // lobby_teams itself. The app never computes cumulative totals anymore.
  const buildMatchPayload = (resultsData: MatchResult[], source: 'manual' | 'ai') => {
    const cellRequestId = resultsData.find(r => r.cell_request_id)?.cell_request_id;
    return {
      results: resultsData.map(r => ({
        ...r,
        position: parseInt(String(r.position), 10),
      })),
      source,
      ...(cellRequestId ? { cellRequestId } : {}),
    };
  };

  const handleSubmit = async () => {
    if (results.length === 0) {
      Alert.alert('Error', 'Please add at least one team result');
      return;
    }

    setSubmitting(true);
    try {
      await lobbyRepository.submitMatch(lobby.id, buildMatchPayload(results, 'manual'));

      const currentStatus = (lobby as any).status?.toLowerCase() || '';
      if (currentStatus === 'setup' || !currentStatus) {
        try {
          await lobbyRepository.updateLobby(lobby.id, { status: 'active' });
        } catch (statusErr: any) {
          // Silent fail for status transition
        }
      }

      // Fire the interstitial ad BEFORE showing the success alert (non-blocking)
      onResultsSaved?.();

      Alert.alert('Success', 'Results submitted successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') } as any
      ]);
    } catch (err) {
      Alert.alert('Error', extractApiErrorMessage(err, 'Failed to submit results'));
    } finally {
      setSubmitting(false);
    }
  };

  // Accepts a pre-built results array — used by the combined AI review+submit flow
  // to avoid an intermediate setResults() state round-trip.
  const handleSubmitWithResults = async (resultsData: MatchResult[]) => {
    if (resultsData.length === 0) {
      Alert.alert('Error', 'No results to submit');
      return;
    }
    setSubmitting(true);
    try {
      await lobbyRepository.submitMatch(lobby.id, buildMatchPayload(resultsData, 'ai'));

      const currentStatus = (lobby as any).status?.toLowerCase() || '';
      if (currentStatus === 'setup' || !currentStatus) {
        try {
          await lobbyRepository.updateLobby(lobby.id, { status: 'active' });
        } catch (statusErr: any) {
          console.warn('⚠️ Failed to auto-transition lobby status:', statusErr?.response?.data || statusErr.message);
        }
      }

      // Fire the interstitial ad BEFORE showing the success alert (non-blocking)
      onResultsSaved?.();

      Alert.alert('Success', 'Results submitted successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') } as any,
      ]);
    } catch (err) {
      Alert.alert('Error', extractApiErrorMessage(err, 'Failed to submit results'));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    results,
    submitting,
    expandedResults,
    setResults,
    setExpandedResults,
    toggleResultExpansion,
    handleAddResult,
    handleUpdateResult,
    handleUpdateMemberKills,
    handleReplaceResult,
    handleRemoveResult,
    handleSubmit,
    handleSubmitWithResults,
  };
};
