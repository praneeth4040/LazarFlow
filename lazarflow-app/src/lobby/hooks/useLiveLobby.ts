import { useState, useCallback, useRef, useContext } from 'react';
import { Buffer } from 'buffer';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { UserContext } from '../../context/UserContext';
import { Adjustments } from './useRenderPreview';

export const useLiveLobby = (id: string, canCustomSocial: boolean) => {
    const { user } = useContext(UserContext);
    const [teams, setTeams] = useState<any[]>([]);
    const [playerStats, setPlayerStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lobby, setLobby] = useState<any>(null);
    const [themes, setThemes] = useState<any[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const mvpCanvasRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState<string | null>(null);
    const [showResultSheet, setShowResultSheet] = useState(false);
    const [renderStatus, setRenderStatus] = useState('Processing…');
    const [showAdjustmentSheet, setShowAdjustmentSheet] = useState(false);
    const [renderedImageUri, setRenderedImageUri]       = useState<string | null>(null);

    const [designTab, setDesignTab] = useState<'community' | 'user'>('community');
    const [renderType, setRenderType] = useState<'standings' | 'mvps'>('standings');
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

    const [designData, setDesignData] = useState({
        brandLogo: null,
        lobbyLogo: null,
        lobbyName: '',
        scrimsText: '',
        organiserName: '',
        instagram: '',
        youtube: ''
    });

    const filteredThemes = themes.filter(theme => {
        if (designTab === 'user') return !!theme.user_id;
        return !theme.user_id;
    });

    // The URL of the currently selected theme thumbnail (for client-side preview)
    const selectedThemeUrl: string | null =
        themes.find((t: any) => t.id === selectedThemeId)?.url
        ?? themes.find((t: any) => t.id === selectedThemeId)?.thumbnail
        ?? null;

    const fetchLobbyData = async () => {
        try {
            setLoading(true);
            // Reusing legacy dataService imports for themes/renders if they are not in LobbyRepository
            const { getLobby, getLobbyTeams, getLobbyPlayerStats } = require('../../lib/dataService');
            
            const [lobbyResult, teamsResult, playerStatsResult] = await Promise.allSettled([
                getLobby(id),
                getLobbyTeams(id),
                getLobbyPlayerStats(id)
            ]);

            if (lobbyResult.status === 'rejected') throw new Error('Tournament not found or unauthorized');

            if (playerStatsResult.status === 'fulfilled') {
                setPlayerStats(playerStatsResult.value || []);
            }

            const lobbyData = lobbyResult.value;
            setLobby(lobbyData);
            setDesignData(prev => ({ ...prev, lobbyName: lobbyData.name || '' }));

            const teamsData = teamsResult.status === 'fulfilled' ? teamsResult.value : [];
            const sortedTeams = (teamsData || []).map((team: any) => {
                const points = (team.total_points && typeof team.total_points === 'object') ? team.total_points : { kill_points: 0, placement_points: 0 };
                return {
                    ...team,
                    total: (points.kill_points || 0) + (points.placement_points || 0),
                    kill_points: points.kill_points || 0,
                    placement_points: points.placement_points || 0,
                    wins: points.wins || 0
                };
            }).sort((a: any, b: any) => b.total - a.total);

            setTeams(sortedTeams);
        } catch (error: any) {
            console.error('Fetch Error:', error);
            Alert.alert('Error', error.message || 'Failed to load lobby data');
        } finally {
            setLoading(false);
        }
    };

    const loadThemes = async () => {
        try {
            const { getUserThemes, getCommunityDesigns } = require('../../lib/dataService');
            const [userThemes, communityDesigns] = await Promise.all([
                getUserThemes(user?.id),
                getCommunityDesigns()
            ]);
            
            const allAvailable = [...(userThemes || []), ...(communityDesigns || [])];
            const filteredThemes = allAvailable.filter(t => t.status === 'verified');
            const uniqueThemes = filteredThemes.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setThemes(uniqueThemes);
            if (uniqueThemes.length > 0 && !selectedThemeId) {
                setSelectedThemeId(uniqueThemes[0].id);
            }
        } catch (error) {
            console.error('Error loading themes:', error);
        }
    };

    /** Called by AdjustmentPreviewSheet after the user confirms their settings. */
    const handleGenerateTable = async (adjustments?: Adjustments) => {
        if (!selectedThemeId) {
            Alert.alert('Error', 'Please select a design first');
            return;
        }

        setShowAdjustmentSheet(false);

        try {
            setIsGenerating(true);
            setRenderStatus('Connecting…');

            const statusSteps = [
                { delay: 2500, message: 'Processing design…' },
                { delay: 6000, message: 'Building image…' },
                { delay: 11000, message: 'Almost there…' },
            ];
            const timers: ReturnType<typeof setTimeout>[] = statusSteps.map(({ delay, message }) =>
                setTimeout(() => setRenderStatus(message), delay)
            );

            const { renderResults } = require('../../lib/dataService');
            const result = await renderResults(id, selectedThemeId, 'standings', adjustments);

            timers.forEach(clearTimeout);

            if (result) {
                if (result instanceof ArrayBuffer || (result && result.constructor && result.constructor.name === 'ArrayBuffer')) {
                    const base64 = Buffer.from(result).toString('base64');
                    setGeneratedResult(`data:image/png;base64,${base64}`);
                } else if (typeof result === 'string') {
                    setGeneratedResult(result);
                } else if (result.url) {
                    setGeneratedResult(result.url);
                }
                setShowResultSheet(true);
            }
        } catch (error) {
            console.error('Error generating table:', error);
            Alert.alert('Error', 'Failed to generate results table. Please try again.');
        } finally {
            setIsGenerating(false);
            setRenderStatus('Processing…');
        }
    };

    /**
     * Called when user taps "Render Design".
     * Renders the image on the backend FIRST (no adjustments),
     * then opens the adjustment sheet with the result.
     * Color tweaks happen client-side inside the sheet.
     */
    const openAdjustmentSheet = async () => {
        if (!selectedThemeId) {
            Alert.alert('Error', 'Please select a design first');
            return;
        }

        try {
            setIsGenerating(true);
            setRenderStatus('Rendering design…');

            const statusSteps = [
                { delay: 2500,  message: 'Processing design…' },
                { delay: 6000,  message: 'Building image…'    },
                { delay: 11000, message: 'Almost there…'      },
            ];
            const timers = statusSteps.map(({ delay, message }) =>
                setTimeout(() => setRenderStatus(message), delay)
            );

            const { renderResults } = require('../../lib/dataService');
            // Render WITHOUT adjustments — color tuning happens client-side
            const result = await renderResults(id, selectedThemeId, 'standings');

            timers.forEach(clearTimeout);

            if (result) {
                let uri: string | null = null;
                if (result instanceof ArrayBuffer ||
                    (result?.constructor?.name === 'ArrayBuffer')) {
                    const base64 = Buffer.from(result).toString('base64');
                    uri = `data:image/jpeg;base64,${base64}`;
                } else if (typeof result === 'string') {
                    uri = result;
                } else if (result.url) {
                    uri = result.url;
                }
                setRenderedImageUri(uri);
                setShowAdjustmentSheet(true);
            }
        } catch (error) {
            console.error('Error rendering:', error);
            Alert.alert('Error', 'Failed to render. Please try again.');
        } finally {
            setIsGenerating(false);
            setRenderStatus('Processing…');
        }
    };

    const handleDownloadMvp = async (captureRefFunc: Function) => {
        try {
            setIsGenerating(true);
            if (mvpCanvasRef.current) {
                const uri = await captureRefFunc(mvpCanvasRef, {
                    format: 'png',
                    quality: 1,
                    result: 'tmpfile'
                });
                setGeneratedResult(uri);
                setShowResultSheet(true);
            }
        } catch (error) {
            console.error('Error generating MVP image:', error);
            Alert.alert('Error', 'Failed to generate MVP image');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePickLogo = async (type: string, imagePicker: any) => {
        try {
            const { status } = await imagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required to upload logos');
                return;
            }

            const result = await imagePicker.launchImageLibraryAsync({
                mediaTypes: imagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                setSaving(true);
                const asset = result.assets[0];
                const { uploadLogo } = require('../../lib/dataService');
                const uploadedUrl = await uploadLogo(asset.uri);
                if (uploadedUrl) {
                    setDesignData(prev => ({ ...prev, [type]: uploadedUrl }));
                }
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            Alert.alert('Error', 'Failed to upload logo');
        } finally {
            setSaving(false);
        }
    };

    return {
        teams, playerStats, loading, lobby, themes, showEditModal, setShowEditModal, saving,
        mvpCanvasRef, isGenerating, generatedResult, showResultSheet, setShowResultSheet,
        designTab, setDesignTab, renderType, setRenderType, selectedThemeId, setSelectedThemeId,
        selectedThemeUrl,
        designData, setDesignData, filteredThemes, renderStatus,
        showAdjustmentSheet, setShowAdjustmentSheet,
        renderedImageUri,
        fetchLobbyData, loadThemes, openAdjustmentSheet, handleDownloadMvp, handlePickLogo
    };
};
