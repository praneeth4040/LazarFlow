import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { extractResultsFromScreenshot } from '../../lib/aiResultExtraction';
import { fuzzyMatchName } from '../../lib/aiUtils';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { ExtractedAIResult, LobbyData } from '../types';

export const useAIExtraction = (lobby: LobbyData, teams: any[], user: any, refreshUser: () => void, navigation: any) => {
  const [extracting, setExtracting] = useState(false);
  const [aiResults, setAiResults] = useState<ExtractedAIResult[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({}); // { [rank]: registeredTeamId }
  const [resultImages, setResultImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const handlePickResultImages = async () => {
    if ((user?.flux_balance || 0) < 1) {
      Alert.alert(
        'Insufficient Credits',
        'You need at least 1 AI Credit to perform result extraction. Please top up your account.',
        [
          { text: 'Later', style: 'cancel' } as any,
          { text: 'Store', onPress: () => navigation.navigate('SubscriptionPlans') } as any
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setResultImages(prev => [...prev, ...result.assets]);
    }
  };

  const handleRemoveResultImage = (index: number) => {
    setResultImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePickImage = async () => {
    if ((user?.flux_balance || 0) < 1) {
      Alert.alert(
        'Insufficient Credits',
        'You need at least 1 AI Credit to perform result extraction. Please top up your account.',
        [
          { text: 'Later', style: 'cancel' } as any,
          { text: 'Store', onPress: () => navigation.navigate('SubscriptionPlans') } as any
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      handleAIUpload(result.assets);
    }
  };

  const handleAIUpload = async (imageAssets: ImagePicker.ImagePickerAsset[]) => {
    setExtracting(true);
    try {
      const extracted = await extractResultsFromScreenshot(imageAssets, {}, lobby.id);
      const initialMappings: Record<string, string> = {};

      const hasExistingMembers = teams.some(t => t.members && t.members.length > 0);
      if (hasExistingMembers) {
        const candidateMatches: Record<string, { rank: string | number, score: number }> = {};
        extracted.forEach((res: ExtractedAIResult) => {
          let bestTeamId: string | null = null;
          let bestScore = 0;

          teams.forEach(registeredTeam => {
            const teamMembers = registeredTeam.members || [];
            if (teamMembers.length === 0) return;

            let matchedPlayersCount = 0;
            let totalSim = 0;

            if (res.players) {
              res.players.forEach(aiPlayer => {
                const pMatch = fuzzyMatchName(aiPlayer.name, teamMembers, 0.75);
                if (pMatch) {
                  matchedPlayersCount++;
                  totalSim += pMatch.score;
                }
              });
            }

            if (matchedPlayersCount >= 2) {
              const avgSim = totalSim / matchedPlayersCount;
              const score = (matchedPlayersCount * 10) + avgSim;

              if (score > bestScore) {
                bestScore = score;
                bestTeamId = registeredTeam.id;
              }
            }
          });

          if (bestTeamId) {
            const existingClaim = candidateMatches[bestTeamId];
            if (!existingClaim || bestScore > existingClaim.score) {
              candidateMatches[bestTeamId] = {
                rank: res.rank,
                score: bestScore
              };
            }
          }
        });

        Object.entries(candidateMatches).forEach(([teamId, data]) => {
          initialMappings[String(data.rank)] = teamId;
        });
      }

      setAiResults(extracted);
      setMappings(initialMappings);
      setShowMapping(true);
      
      if (refreshUser) refreshUser();
      
    } catch (err: any) {
      console.error('AI Error:', err);
      if (err.response?.status === 402) {
        Alert.alert(
          'Insufficient Credits',
          'You have run out of AI Credits. Please top up to continue using LexiView AI.',
          [
            { text: 'Later', style: 'cancel' } as any,
            { text: 'View Store', onPress: () => navigation.navigate('SubscriptionPlans') } as any
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to extract results from image');
      }
    } finally {
      setExtracting(false);
    }
  };

  const updateMapping = (rank: string, teamId: string) => {
    setMappings(prev => ({ ...prev, [rank]: teamId }));
  };

  return {
    extracting,
    aiResults,
    showMapping,
    mappings,
    resultImages,
    setShowMapping,
    setMappings,
    handlePickResultImages,
    handleRemoveResultImage,
    handlePickImage,
    handleAIUpload,
    updateMapping
  };
};
