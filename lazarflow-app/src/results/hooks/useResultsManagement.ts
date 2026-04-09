import { useState } from 'react';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { MatchResult, LobbyData } from '../types';

export const useResultsManagement = (lobby: LobbyData, teams: any[], navigation: any) => {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});

  const toggleResultExpansion = (teamId: string) => {
    setExpandedResults(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const handleAddResult = (team: any) => {
    if (results.some(r => r.team_id === team.id)) {
      Alert.alert('Info', 'Team already added to results');
      return;
    }

    const nextPosition = results.length + 1;
    const pointsEntry = lobby.points_system?.find(p => p.placement === nextPosition);
    const placementPoints = pointsEntry ? pointsEntry.points : 0;

    const newResult: MatchResult = {
      team_id: team.id,
      team_name: team.team_name,
      position: String(nextPosition),
      kills: 0,
      placement_points: placementPoints,
      kill_points: 0,
      total_points: placementPoints,
      members: (team.members || []).map((m: any) => ({
        name: typeof m === 'object' ? m.name : m,
        kills: 0
      }))
    };

    setExpandedResults(prev => ({
      ...prev,
      [team.id]: true
    }));

    setResults([...results, newResult]);
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

  const handleSubmit = async () => {
    if (results.length === 0) {
      Alert.alert('Error', 'Please add at least one team result');
      return;
    }

    setSubmitting(true);
    try {
      const updates = [];
      for (const result of results) {
        const team = teams.find(t => t.id === result.team_id);
        if (!team) continue;

        const currentStats = team.total_points || { matches_played: 0, wins: 0, kill_points: 0, placement_points: 0 };
        const isWinner = parseInt(String(result.position)) === 1;
        
        const newStats = {
          matches_played: (currentStats.matches_played || 0) + 1,
          wins: (currentStats.wins || 0) + (isWinner ? 1 : 0),
          kill_points: (currentStats.kill_points || 0) + (result.kill_points || 0),
          placement_points: (currentStats.placement_points || 0) + (result.placement_points || 0),
        };

        const updatedMembers = (team.members || []).map((m: any) => {
          const memberName = typeof m === 'object' ? m.name : m;
          const matchPerformance = result.members?.find(rm => rm.name === memberName);
          const matchKills = matchPerformance ? parseInt(String(matchPerformance.kills) || '0') : 0;

          const currentMemberStats = typeof m === 'object' ? m : { 
            name: memberName, 
            kills: 0, 
            wwcd: 0, 
            matches_played: 0 
          };

          return {
            ...currentMemberStats,
            kills: (currentMemberStats.kills || 0) + matchKills,
            wwcd: (currentMemberStats.wwcd || 0) + (isWinner ? 1 : 0),
            matches_played: (currentMemberStats.matches_played || 0) + 1
          };
        });

        updates.push({
          id: team.id,
          total_points: newStats,
          members: updatedMembers
        });
      }

      if (updates.length > 0) {
        await lobbyRepository.batchUpdateTeams(lobby.id, updates);
      }

      const currentStatus = (lobby as any).status?.toLowerCase() || '';
      if (currentStatus === 'setup' || !currentStatus) {
        try {
          await lobbyRepository.updateLobby(lobby.id, { status: 'active' });
        } catch (statusErr: any) {
          console.warn('⚠️ Failed to auto-transition lobby status:', statusErr?.response?.data || statusErr.message);
        }
      }

      Alert.alert('Success', 'Results submitted successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') } as any
      ]);
    } catch (err) {
      console.error('Error submitting results:', err);
      Alert.alert('Error', 'Failed to submit results');
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
    handleRemoveResult,
    handleSubmit
  };
};
