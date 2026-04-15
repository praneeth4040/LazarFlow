import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { processLobbyScreenshots } from '../../lib/aiResultExtraction';
import { ProcessedSlot, LobbyData } from '../types';

export const useLobbyMapping = (lobby: LobbyData, teams: any[], fetchLobbyData: () => void) => {
  const [lobbyImages, setLobbyImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [processingLobby, setProcessingLobby] = useState(false);
  const [processedSlots, setProcessedSlots] = useState<ProcessedSlot[]>([]); // [{ slot: 1, players: [], mappedTeamId: null }]
  const [showSlotMapping, setShowSlotMapping] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

    setProcessingLobby(true);
    try {
      const data = await processLobbyScreenshots(lobbyImages, lobby.id);
      const rawSlots = Array.isArray(data) ? data : (data.teams || []);
      const isSuccess = rawSlots.length > 0 || data.success;
      const teamsCount = rawSlots.length;
      const displayMessage = data.message || `Successfully identified ${teamsCount} slots. You can now map them to teams.`;

      if (isSuccess) {
        const formattedSlots = rawSlots.map((item: any, index: number) => {
          const slotNum = item.team_number || item.slot || (index + 1);
          const players = (item.players || []).map((p: any) => typeof p === 'object' ? p.name : p);
          const matchedTeam = teams.find(t => t.respective_slotlist_postion === slotNum);

          return {
            slot: slotNum,
            players: players,
            mappedTeamId: matchedTeam ? matchedTeam.id : null
          };
        }).sort((a: ProcessedSlot, b: ProcessedSlot) => {
          const slotA = Number(a.slot) || 0;
          const slotB = Number(b.slot) || 0;
          return slotA - slotB;
        });

        setProcessedSlots(formattedSlots);
        setShowSlotMapping(true);
        Alert.alert('Lobby Processed', displayMessage);
      } else {
        throw new Error(data.message || 'Failed to process lobby');
      }
    } catch (err) {
      console.error('Lobby Process Error:', err);
      Alert.alert('Error', 'Failed to process lobby screenshots. Please try again or use manual mode.');
    } finally {
      setProcessingLobby(false);
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
    processingLobby,
    processedSlots,
    showSlotMapping,
    submitting,
    setShowSlotMapping,
    handlePickLobbyImages,
    handleRemoveLobbyImage,
    handleProcessLobby,
    handleUpdateSlotMapping,
    handleSaveSlotMappings
  };
};
