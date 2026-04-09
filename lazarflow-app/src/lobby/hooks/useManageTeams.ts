import { useState, useEffect } from 'react';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { extractTeamsFromText } from '../../lib/aiExtraction';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { DraftTeam, ManageTeamsMode } from '../types';

export const useManageTeams = (lobbyId: string, navigation: any) => {
    const [mode, setMode] = useState<ManageTeamsMode>('manual');
    const [teams, setTeams] = useState<DraftTeam[]>([]);
    const [currentTeam, setCurrentTeam] = useState('');
    const [aiText, setAiText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedTeamIndex, setExpandedTeamIndex] = useState<number | null>(null);
    const [newMemberName, setNewMemberName] = useState('');

    useEffect(() => {
        if (lobbyId) {
            fetchExistingTeams();
        }
    }, [lobbyId]);

    const fetchExistingTeams = async () => {
        try {
            const data = await lobbyRepository.getLobbyTeams(lobbyId);
            setTeams(data.map((t: any) => ({ 
                id: t.id, 
                team_name: t.team_name, 
                members: t.members || [], 
                respective_slotlist_postion: t.respective_slotlist_postion || 0,
                total_points: t.total_points 
            })));
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const handleAddTeam = () => {
        if (currentTeam.trim()) {
            setTeams([...teams, { 
                team_name: currentTeam.trim(), 
                members: [], 
                respective_slotlist_postion: teams.length + 1 
            }]);
            setCurrentTeam('');
        }
    };

    const handleRemoveTeam = (index: number) => {
        setTeams(teams.filter((_, i) => i !== index));
    };

    const handleAIExtract = async () => {
        if (!aiText.trim()) {
            Alert.alert('Error', 'Please paste some text');
            return;
        }

        setLoading(true);
        try {
            const extractedData: any = await extractTeamsFromText(aiText);
            
            const hasTeams = Array.isArray(extractedData) && extractedData.length > 0;
            const displayMessage = (typeof extractedData === 'object' && extractedData.message) 
                ? extractedData.message 
                : (hasTeams ? `Extracted ${extractedData.length} teams!` : 'Extraction complete');

            if (extractedData.length === 0) {
                Alert.alert('Info', 'No team names could be identified. Try a clearer format.');
                return;
            }

            const extractedTeams = extractedData.map((item: any, index: number) => ({
                team_name: item.name || item.team_name,
                members: (item.members || []).map((m: any) => 
                    typeof m === 'object' ? {
                        name: m.name || '',
                        kills: m.kills || 0,
                        wwcd: m.wwcd || 0,
                        matches_played: m.matches_played || 0
                    } : {
                        name: String(m),
                        kills: 0,
                        wwcd: 0,
                        matches_played: 0
                    }
                ),
                respective_slotlist_postion: teams.length + index + 1
            }));

            setTeams([...teams, ...extractedTeams]);
            setAiText('');
            setMode('manual');
            Alert.alert('Success', displayMessage);
        } catch (error) {
            Alert.alert('Error', 'AI extraction failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpandTeam = (index: number) => {
        if (expandedTeamIndex === index) {
            setExpandedTeamIndex(null);
        } else {
            setExpandedTeamIndex(index);
            setNewMemberName('');
        }
    };

    const handleAddMember = (index: number) => {
        if (!newMemberName.trim()) return;
        const updatedTeams = [...teams];
        const memberName = newMemberName.trim();

        const newMember = { name: memberName, kills: 0, wwcd: 0, matches_played: 0 };

        updatedTeams[index].members = [...(updatedTeams[index].members || []), newMember];
        setTeams(updatedTeams);
        setNewMemberName('');
    };

    const handleRemoveMember = (teamIndex: number, memberIndex: number) => {
        const updatedTeams = [...teams];
        updatedTeams[teamIndex].members = updatedTeams[teamIndex].members.filter((_, i) => i !== memberIndex);
        setTeams(updatedTeams);
    };

    const handleSave = async () => {
        if (teams.length < 1) {
            Alert.alert('Error', 'Please add at least 1 team');
            return;
        }

        setSubmitting(true);
        try {
            const teamsToSync = teams.map((t, index) => ({
                id: t.id,
                team_name: t.team_name,
                members: (t.members || []).map((m: any) => 
                    typeof m === 'object' ? {
                        name: m.name || '',
                        kills: m.kills || 0,
                        wwcd: m.wwcd || 0,
                        matches_played: m.matches_played || 0
                    } : {
                        name: String(m),
                        kills: 0,
                        wwcd: 0,
                        matches_played: 0
                    }
                ),
                respective_slotlist_postion: t.respective_slotlist_postion || (index + 1)
            }));

            // Sync teams
            // We need a specific endpoint to bulk replace, but we built batch update endpoints.
            // Let's assume syncLobbyTeams exists in lib/dataService but we want it in repository.
            // We'll import syncLobbyTeams directly from dataService for now or update LobbyRepository.
            // Let's just use dataService syncLobbyTeams. Wait, `dataService.js` had `syncLobbyTeams`.
            const { syncLobbyTeams } = require('../../lib/dataService');
            await syncLobbyTeams(lobbyId, teamsToSync);

            await lobbyRepository.updateLobby(lobbyId, { 
                metadata: { setup_completed: true } as any
            });

            Alert.alert('Success', 'Teams and members saved successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') } as any
            ]);
        } catch (error) {
            console.error('Error saving teams:', error);
            Alert.alert('Error', 'Failed to save teams');
        } finally {
            setSubmitting(false);
        }
    };

    return {
        mode, setMode,
        teams, currentTeam, setCurrentTeam,
        aiText, setAiText,
        loading, submitting,
        expandedTeamIndex, newMemberName, setNewMemberName,
        handleAddTeam, handleRemoveTeam, handleAIExtract,
        toggleExpandTeam, handleAddMember, handleRemoveMember, handleSave
    };
};
