import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Platform, StatusBar, Modal, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Camera, X, Upload, Search, ArrowLeft, Plus, Check, ChevronDown, ChevronUp, Info, Target, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getLobby, getLobbyTeams, batchUpdateTeams, batchUpdateTeamMembers, updateLobby } from '../lib/dataService';
import { Theme } from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { extractResultsFromScreenshot, processLobbyScreenshots } from '../lib/aiResultExtraction';
import { fuzzyMatchName } from '../lib/aiUtils';
import { useSubscription } from '../hooks/useSubscription';
import { CustomAlert as Alert } from '../lib/AlertService';


const ProcessingOverlay = ({ visible }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const innerRotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    })
                ),
                Animated.loop(
                    Animated.timing(innerRotateAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    })
                )
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const innerRotation = innerRotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg']
    });

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlayContainer}>
                <Animated.View style={[styles.overlayBackdrop, { opacity: fadeAnim }]} />
                <Animated.View style={[styles.overlayContentNew, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
                    <View style={styles.loaderHeader}>
                        <X size={20} color="#cbd5e1" style={{ opacity: 0 }} />
                        <Text style={styles.loaderBrand}>LexiView AI</Text>
                        <X size={20} color="#cbd5e1" />
                    </View>

                    <View style={styles.aiAnimationContainer}>
                        {/* Outer Ring */}
                        <Animated.View style={[styles.outerRing, { transform: [{ rotate: rotation }] }]}>
                            <View style={styles.ringDot} />
                        </Animated.View>
                        
                        {/* Middle Ring */}
                        <Animated.View style={[styles.middleRing, { transform: [{ rotate: innerRotation }] }]} />
                        
                        {/* Inner Blue Circle */}
                        <View style={styles.innerCircleBlue}>
                            <Sparkles size={32} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.aiAtWorkTitle}>AI at work...</Text>
                    <Text style={styles.aiAtWorkSubtitle}>
                        Processing your request and analyzing data. This typically takes less than a minute.
                    </Text>

                    <View style={styles.didYouKnowBox}>
                        <Text style={styles.didYouKnowLabel}>DID YOU KNOW?</Text>
                        <Text style={styles.didYouKnowText}>
                            "LazarFlow automatically syncs your tournament results to the cloud, so you can access them from any device at any time."
                        </Text>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const CalculateResultsScreen = ({ route, navigation }) => {
    const { canUseAI, tier } = useSubscription();
    const [lobby, setLobby] = useState(route.params?.lobby || {});
    const [mode, setMode] = useState('manual');
    const [teams, setTeams] = useState([]);
    const [results, setResults] = useState([]);
    const [teamSearch, setTeamSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [aiResults, setAiResults] = useState([]);
    const [showMapping, setShowMapping] = useState(false);
    const [mappings, setMappings] = useState({}); // { [rank]: registeredTeamId }
    const [selectedAiTeam, setSelectedAiTeam] = useState(null);
    const [mappingModalVisible, setMappingModalVisible] = useState(false);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
    const [expandedResults, setExpandedResults] = useState({}); // { [team_id]: boolean }

    const toggleResultExpansion = (teamId) => {
        setExpandedResults(prev => ({
            ...prev,
            [teamId]: !prev[teamId]
        }));
    };

    const handleUpdateSlotMapping = (slotIndex, teamId) => {
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
                    // Convert simple player names to structured objects
                    const structuredMembers = (slot.players || []).map(p => ({
                        name: typeof p === 'object' ? p.name : String(p),
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
                await batchUpdateTeamMembers(lobby.id, updates);
                
                Alert.alert('Success', 'Team members updated successfully!');
                setShowSlotMapping(false);
                fetchLobbyData();
            }
        } catch (err) {
            console.error('Error saving slot mappings:', err);
            Alert.alert('Error', 'Failed to save team member mappings');
        } finally {
            setSubmitting(false);
        }
    };

    // AI Workflow Steps
    const [lobbyImages, setLobbyImages] = useState([]);
    const [resultImages, setResultImages] = useState([]);
    const [processingLobby, setProcessingLobby] = useState(false);
    const [processedSlots, setProcessedSlots] = useState([]); // [{ slot: 1, players: [], mappedTeamId: null }]
    const [showSlotMapping, setShowSlotMapping] = useState(false);

    useEffect(() => {
        if (lobby?.id) {
            fetchLobbyData();
        }
    }, [lobby?.id]);

    const fetchLobbyData = async () => {
        try {
            const tData = await getLobby(lobby?.id);
            setLobby(tData);

            const data = await getLobbyTeams(lobby.id);
            setTeams(data || []);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch teams');
        }
    };

    const handleAddResult = (team) => {
        if (results.some(r => r.team_id === team.id)) {
            Alert.alert('Info', 'Team already added to results');
            return;
        }

        const nextPosition = results.length + 1;
        const pointsEntry = lobby.points_system?.find(p => p.placement === nextPosition);
        const placementPoints = pointsEntry ? pointsEntry.points : 0;

        const newResult = {
            team_id: team.id,
            team_name: team.team_name,
            position: String(nextPosition),
            kills: 0,
            placement_points: placementPoints,
            kill_points: 0,
            total_points: placementPoints,
            members: (team.members || []).map(m => ({
                name: typeof m === 'object' ? m.name : m,
                kills: 0
            }))
        };

        // Keep the dropdown open by default for the new result
        setExpandedResults(prev => ({
            ...prev,
            [team.id]: true
        }));

        setResults([...results, newResult]);
        setTeamSearch('');
    };

    const handleUpdateResult = (index, field, value) => {
        const updatedResults = [...results];
        const val = (field === 'kills' || field === 'position') ? parseInt(value) || 0 : value;
        updatedResults[index][field] = val;

        if (field === 'position' && lobby.points_system) {
            const pointsEntry = lobby.points_system.find(p => p.placement === val);
            updatedResults[index].placement_points = pointsEntry ? pointsEntry.points : 0;
        }

        updatedResults[index].kill_points = updatedResults[index].kills * (lobby.kill_points || 0);
        updatedResults[index].total_points = (updatedResults[index].placement_points || 0) + (updatedResults[index].kill_points || 0);
        setResults(updatedResults);
    };

    const handleUpdateMemberKills = (resultIndex, memberIndex, kills) => {
        const updatedResults = [...results];
        const member = updatedResults[resultIndex].members[memberIndex];
        member.kills = parseInt(kills) || 0;

        // Auto-update team total kills based on individual player kills
        const totalMemberKills = updatedResults[resultIndex].members.reduce((sum, m) => sum + (m.kills || 0), 0);
        updatedResults[resultIndex].kills = totalMemberKills;

        // Re-calculate points for the team
        updatedResults[resultIndex].kill_points = totalMemberKills * (lobby.kill_points || 0);
        updatedResults[resultIndex].total_points = (updatedResults[resultIndex].placement_points || 0) + (updatedResults[resultIndex].kill_points || 0);

        setResults(updatedResults);
    };

    const handleRemoveResult = (index) => {
        const filtered = results.filter((_, i) => i !== index);
        // Recalculate positions for all remaining results
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

    const handleRemoveLobbyImage = (index) => {
        setLobbyImages(prev => prev.filter((_, i) => i !== index));
    };

    const handlePickResultImages = async () => {
        if (!canUseAI && tier === 'free') {
            Alert.alert(
                'AI Limit Reached',
                'You have reached your free AI extraction limit for this month. Upgrade to continue using AI features!',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'View Plans', onPress: () => navigation.navigate('SubscriptionPlans') }
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

    const handleRemoveResultImage = (index) => {
        setResultImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcessLobby = async () => {
        if (lobbyImages.length === 0) {
            Alert.alert('Error', 'Please select lobby screenshots first');
            return;
        }
        
        setProcessingLobby(true);
        try {
            const data = await processLobbyScreenshots(lobbyImages, lobby.id);
            
            // The API returns an array of teams/slots directly
            const rawSlots = Array.isArray(data) ? data : (data.teams || []);
            const isSuccess = rawSlots.length > 0 || data.success;
            const teamsCount = rawSlots.length;
            const displayMessage = data.message || `Successfully identified ${teamsCount} slots. You can now map them to teams.`;

            if (isSuccess) {
                // Map the slots and try to auto-match with registered teams based on slot position
                const formattedSlots = rawSlots.map((item, index) => {
                    const slotNum = item.team_number || item.slot || (index + 1);
                    const players = (item.players || []).map(p => typeof p === 'object' ? p.name : p);
                    
                    // Auto-match with registered teams based on respective_slotlist_postion
                    const matchedTeam = teams.find(t => t.respective_slotlist_postion === slotNum);

                    return {
                        slot: slotNum,
                        players: players,
                        mappedTeamId: matchedTeam ? matchedTeam.id : null
                    };
                }).sort((a, b) => {
                    const slotA = parseInt(a.slot) || 0;
                    const slotB = parseInt(b.slot) || 0;
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

    const handlePickImage = async () => {
        if (!canUseAI && tier === 'free') {
            Alert.alert(
                'AI Limit Reached',
                'You have reached your free AI extraction limit for this month. Upgrade to continue using AI features!',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'View Plans', onPress: () => navigation.navigate('SubscriptionPlans') }
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

    const handleAIUpload = async (imageAssets) => {
        setExtracting(true);
        try {
            // Pass lobby.id as the third argument
            const extracted = await extractResultsFromScreenshot(imageAssets, {}, lobby.id);

            const initialMappings = {};

            // Only perform auto-mapping if lobby has been processed (Step 1 completed) or teams already have members
            const hasExistingMembers = teams.some(t => t.members && t.members.length > 0);
            if (processedSlots.length > 0 || hasExistingMembers) {
                const candidateMatches = {};
                console.log(`🤖 Starting auto-mapping for ${extracted.length} ranks against ${teams.length} teams...`);

                extracted.forEach(res => {
                    let bestTeamId = null;
                    let bestScore = 0;

                    teams.forEach(registeredTeam => {
                        const teamMembers = registeredTeam.members || [];
                        if (teamMembers.length === 0) return;

                        let matchedPlayersCount = 0;
                        let totalSim = 0;

                        res.players.forEach(aiPlayer => {
                            const pMatch = fuzzyMatchName(aiPlayer.name, teamMembers, 0.75);
                            if (pMatch) {
                                matchedPlayersCount++;
                                totalSim += pMatch.score;
                            }
                        });

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
                    initialMappings[data.rank] = teamId;
                });
            }

            setAiResults(extracted);
            setMappings(initialMappings);
            setShowMapping(true);
        } catch (err) {
            console.error('AI Error:', err);
            Alert.alert('Error', 'Failed to extract results from image');
        } finally {
            setExtracting(false);
        }
    };

    const handleApplyMapping = () => {
        const newExpandedState = { ...expandedResults };
        const newResults = aiResults.map(res => {
            const teamId = mappings[res.rank];
            const team = teams.find(t => t.id === teamId);

            if (!team) return null;

            // Set this team to be expanded by default
            newExpandedState[team.id] = true;

            const pos = parseInt(res.rank);
            const pointsEntry = lobby.points_system.find(p => p.placement === pos);
            const placementPoints = pointsEntry ? pointsEntry.points : 0;
            const killPoints = (res.kills || 0) * (lobby.kill_points || 0);

            return {
                team_id: team.id,
                team_name: team.team_name,
                position: String(res.rank),
                kills: res.kills || 0,
                placement_points: placementPoints,
                kill_points: killPoints,
                total_points: placementPoints + killPoints,
                members: (res.players || []).map(p => {
                    const match = fuzzyMatchName(p.name, team.members || [], 0.75);
                    return {
                        name: match ? (typeof match.member === 'object' ? match.member.name : match.member) : p.name,
                        kills: p.kills || 0
                    };
                })
            };
        }).filter(r => r !== null);

        setExpandedResults(newExpandedState);
        setResults([...newResults, ...results.filter(r => !newResults.some(nr => nr.team_id === r.team_id))]);
        setShowMapping(false);
        setMode('manual');
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

                // 1. Calculate Team Stats
                const currentStats = team.total_points || { matches_played: 0, wins: 0, kill_points: 0, placement_points: 0 };
                const isWinner = parseInt(result.position) === 1;
                
                const newStats = {
                    matches_played: (currentStats.matches_played || 0) + 1,
                    wins: (currentStats.wins || 0) + (isWinner ? 1 : 0),
                    kill_points: (currentStats.kill_points || 0) + (result.kill_points || 0),
                    placement_points: (currentStats.placement_points || 0) + (result.placement_points || 0),
                };

                // 2. Calculate Individual Player Stats
                // Update the cumulative stats for each member in the team's permanent list
                const updatedMembers = (team.members || []).map(m => {
                    const memberName = typeof m === 'object' ? m.name : m;
                    
                    // Find this player's performance in the current match result
                    const matchPerformance = result.members?.find(rm => rm.name === memberName);
                    const matchKills = matchPerformance ? parseInt(matchPerformance.kills || 0) : 0;

                    // If it's currently a string, convert to object
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

                // Add to batch updates
                updates.push({
                    id: team.id,
                    total_points: newStats,
                    members: updatedMembers
                });
            }

            if (updates.length > 0) {
                await batchUpdateTeams(lobby.id, updates);
            }

            // AUTO-TRANSITION STATUS: Setup -> Active
            const currentStatus = (lobby.status || '').toLowerCase();
            if (currentStatus === 'setup' || !currentStatus) {
                try {
                    console.log('🔄 Attempting to update lobby status to active...');
                    await updateLobby(lobby.id, { status: 'active' });
                    console.log('✅ Lobby status auto-transitioned to active');
                } catch (statusErr) {
                    console.warn('⚠️ Failed to auto-transition lobby status:', statusErr?.response?.data || statusErr.message);
                }
            }

            Alert.alert('Success', 'Results submitted successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
        } catch (err) {
            console.error('Error submitting results:', err);
            Alert.alert('Error', 'Failed to submit results');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSearchTeams = teamSearch.trim()
        ? teams.filter(t => t.team_name.toLowerCase().includes(teamSearch.toLowerCase()) && !results.some(r => r.team_id === t.id))
        : [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>LexiView AI</Text>
                <TouchableOpacity style={styles.infoButton}>
                    <Info size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.toggleContainer}>
                <View style={styles.toggleBackground}>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, mode === 'manual' && styles.toggleBtnActive]} 
                        onPress={() => setMode('manual')}
                    >
                        <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>Manual</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, mode === 'ai' && styles.toggleBtnActive]} 
                        onPress={() => setMode('ai')}
                    >
                        <Text style={[styles.toggleText, mode === 'ai' && styles.toggleTextActive]}>LexiView AI</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.content, styles.contentContainer]} showsVerticalScrollIndicator={false}>
                {mode === 'manual' ? (
                    <View style={styles.searchSection}>
                        <View style={styles.searchInputContainer}>
                            <Search size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search & Add Team..."
                                value={teamSearch}
                                onChangeText={setTeamSearch}
                                placeholderTextColor={Theme.colors.textSecondary}
                            />
                        </View>
                        {filteredSearchTeams.length > 0 && (
                            <View style={styles.searchResults}>
                                {filteredSearchTeams.map(team => (
                                    <TouchableOpacity key={team.id} style={styles.searchItem} onPress={() => handleAddResult(team)}>
                                        <Text style={styles.searchItemName}>{team.team_name}</Text>
                                        <Plus size={18} color={Theme.colors.accent} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                ) : showSlotMapping ? (
                    <View style={styles.mappingSection}>
                        <View style={styles.mappingHeader}>
                            <Text style={styles.mappingTitle}>Lobby Slot Mapping</Text>
                            <Text style={styles.mappingSubtitle}>Map extracted slots to registered teams</Text>
                        </View>

                        {processedSlots.map((item, index) => (
                            <View key={index} style={styles.slotCard}>
                                <View style={styles.slotHeader}>
                                    <Text style={styles.slotLabel}>SLOT {item.slot}</Text>
                                </View>
                                
                                <View style={styles.slotBody}>
                                    <Text style={styles.slotFieldLabel}>TEAM:</Text>
                                    <TouchableOpacity 
                                        style={styles.slotPicker}
                                        onPress={() => {
                                            setSelectedSlotIndex(index);
                                            setMappingModalVisible(true);
                                        }}
                                    >
                                        <Text style={[
                                            styles.slotPickerText,
                                            !item.mappedTeamId && { color: Theme.colors.textSecondary }
                                        ]}>
                                            {teams.find(t => t.id === item.mappedTeamId)?.team_name || 'Select Team'}
                                        </Text>
                                        <ChevronDown size={18} color={Theme.colors.textSecondary} />
                                    </TouchableOpacity>

                                    <Text style={styles.slotFieldLabel}>PLAYERS:</Text>
                                    <View style={styles.slotPlayerList}>
                                        {item.players && item.players.length > 0 ? (
                                            item.players.map((p, pIdx) => (
                                                <View key={pIdx} style={styles.playerBadge}>
                                                    <Text style={styles.playerBadgeText}>{p}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={styles.noPlayersText}>No players identified</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity 
                            style={[styles.applyBtn, submitting && styles.disabledBtn]} 
                            onPress={handleSaveSlotMappings}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Save size={20} color="#fff" />
                                    <Text style={styles.applyBtnText}>Save Mappings</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSlotMapping(false)}>
                            <Text style={styles.cancelBtnText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                ) : showMapping ? (
                    <View style={styles.mappingSection}>
                        <View style={styles.mappingHeader}>
                            <Text style={styles.mappingTitle}>Verify AI Extraction</Text>
                            <Text style={styles.mappingSubtitle}>Map extracted teams to your registered teams</Text>
                        </View>
                        {aiResults.map((res, index) => {
                            // Calculate points for display
                            const placementPoints = lobby.points_system?.find(p => p.placement === parseInt(res.rank))?.points || 0;
                            const killPoints = (res.kills || 0) * (lobby.kill_points || 0);
                            const totalPoints = placementPoints + killPoints;

                            return (
                                <View key={index} style={styles.resultCard}>
                                    <View style={styles.rankHeader}>
                                        <Text style={styles.rankPrefix}>#</Text>
                                        <Text style={styles.rankInput}>{res.rank}</Text>
                                    </View>

                                    <TouchableOpacity 
                                        style={styles.teamSelectorBox}
                                        onPress={() => {
                                            setSelectedAiTeam(res);
                                            setMappingModalVisible(true);
                                        }}
                                    >
                                        <Text style={[
                                            styles.teamNameText,
                                            !mappings[res.rank] && { color: Theme.colors.textSecondary }
                                        ]} numberOfLines={1}>
                                            {teams.find(t => t.id === mappings[res.rank])?.team_name || 'Select Team...'}
                                        </Text>
                                        <ChevronDown size={20} color={Theme.colors.textPrimary} />
                                    </TouchableOpacity>

                                    <View style={styles.killsInputContainer}>
                                        <Text style={styles.killsLabel}>Total Extracted Kills</Text>
                                        <View style={styles.killsInputBox}>
                                            <Text style={styles.killsInput}>{res.kills || 0}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.statsFooter}>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statLabel}>POSITION{'\n'}POINTS</Text>
                                            <Text style={styles.statValue}>{placementPoints}</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statLabel}>KILL{'\n'}POINTS</Text>
                                            <Text style={styles.statValue}>{killPoints}</Text>
                                        </View>
                                        <View style={[styles.statBox, styles.totalStatBox]}>
                                            <Text style={[styles.statLabel, styles.totalStatLabel]}>TOTAL{'\n'}POINTS</Text>
                                            <Text style={[styles.statValue, styles.totalStatValue]}>{totalPoints}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}

                        <TouchableOpacity style={styles.applyBtn} onPress={handleApplyMapping}>
                            <Check size={20} color="#fff" />
                            <Text style={styles.applyBtnText}>Apply Results</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMapping(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.aiWorkflowContainer}>
                        {/* Process Lobby - Step 1 */}
                        <View style={styles.workflowSection}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.workflowSectionTitle}>Process Lobby</Text>
                                {teams.some(t => t.members && t.members.length > 0) ? (
                                    <View style={styles.completedBadgeNew}>
                                        <Text style={styles.completedBadgeTextNew}>COMPLETED</Text>
                                    </View>
                                ) : (
                                    <View style={styles.stepBadgeNew}>
                                        <Text style={styles.stepBadgeTextNew}>STEP 1</Text>
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.workflowCard}>
                                <Text style={styles.workflowInstruction}>
                                    Upload a lobby screenshot to automatically detect teams and players.
                                </Text>
                                
                                {teams.some(t => t.members && t.members.length > 0) ? (
                                    <View style={styles.uploadBoxProcessed}>
                                        <View style={styles.successIconCircle}>
                                            <Check size={32} color="#10b981" />
                                        </View>
                                        <Text style={styles.processedText}>Lobby Screenshot Processed</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={styles.uploadBox} 
                                        onPress={handlePickLobbyImages}
                                    >
                                        {lobbyImages.length > 0 ? (
                                            <View style={styles.uploadedImagesGrid}>
                                                {lobbyImages.map((img, idx) => (
                                                    <View key={idx} style={styles.miniPreviewContainer}>
                                                        <Image source={{ uri: img.uri }} style={styles.miniImage} />
                                                        <TouchableOpacity 
                                                            style={styles.removeMiniImageBtn}
                                                            onPress={() => handleRemoveLobbyImage(idx)}
                                                        >
                                                            <X size={12} color="#fff" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                                <TouchableOpacity 
                                                    style={styles.addMoreMiniBtn}
                                                    onPress={handlePickLobbyImages}
                                                >
                                                    <Plus size={20} color={Theme.colors.accent} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <>
                                                <View style={styles.uploadIconCircle}>
                                                    <Camera size={32} color={Theme.colors.accent} />
                                                </View>
                                                <Text style={styles.uploadBoxText}>Add Lobby Screenshot</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}

                                {teams.some(t => t.members && t.members.length > 0) ? (
                                    <View style={styles.completedActionBtn}>
                                        <Check size={20} color="#cbd5e1" style={{ marginRight: 8 }} />
                                        <Text style={styles.completedActionBtnText}>Completed</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={[styles.primaryActionBtn, (lobbyImages.length === 0 || processingLobby) && styles.disabledBtn]}
                                        onPress={handleProcessLobby}
                                        disabled={processingLobby || lobbyImages.length === 0}
                                    >
                                        {processingLobby ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.primaryActionBtnText}>Process Lobby</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Extract Results - Step 2 */}
                        <View style={styles.workflowSection}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.titleWithIcon}>
                                    <Text style={styles.workflowSectionTitle}>Extract Results</Text>
                                    <Info size={16} color={Theme.colors.textSecondary} style={{ marginLeft: 6 }} />
                                </View>
                                <View style={styles.stepBadgeNew}>
                                    <Text style={styles.stepBadgeTextNew}>STEP 2 / MANUAL</Text>
                                </View>
                            </View>

                            <View style={styles.workflowCard}>
                                <Text style={styles.workflowInstruction}>
                                    Upload match result screens. <Text style={{ color: Theme.colors.accent, fontWeight: 'bold' }}>Standalone extraction</Text> is supported.
                                </Text>

                                <TouchableOpacity 
                                    style={styles.uploadBox} 
                                    onPress={handlePickResultImages}
                                >
                                    {resultImages.length > 0 ? (
                                        <View style={styles.uploadedImagesGrid}>
                                            {resultImages.map((img, idx) => (
                                                <View key={idx} style={styles.miniPreviewContainer}>
                                                    <Image source={{ uri: img.uri }} style={styles.miniImage} />
                                                    <TouchableOpacity 
                                                        style={styles.removeMiniImageBtn}
                                                        onPress={() => handleRemoveResultImage(idx)}
                                                    >
                                                        <X size={12} color="#fff" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                            <TouchableOpacity 
                                                style={styles.addMoreMiniBtn}
                                                onPress={handlePickResultImages}
                                            >
                                                <Plus size={20} color={Theme.colors.accent} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <>
                                            <View style={styles.uploadIconCircle}>
                                                <Upload size={32} color={Theme.colors.accent} />
                                            </View>
                                            <Text style={styles.uploadBoxText}>Upload Result Screenshots</Text>
                                            <Text style={styles.uploadBoxSubtext}>Select multiple images for all ranks</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.secondaryActionBtn, (resultImages.length === 0 || extracting) && styles.disabledBtn]}
                                    onPress={() => handleAIUpload(resultImages)}
                                    disabled={extracting || resultImages.length === 0}
                                >
                                    {extracting ? (
                                        <ActivityIndicator color={Theme.colors.accent} />
                                    ) : (
                                        <Text style={styles.secondaryActionBtnText}>Extract From Screenshots</Text>
                                    )}
                                </TouchableOpacity>
                                
                                <Text style={styles.independentModeHint}>
                                    Independent mode: Requires manual team mapping
                                </Text>
                            </View>
                        </View>

                        {/* Tips Section */}
                        <View style={styles.tipsContainer}>
                            <View style={styles.tipsHeaderRow}>
                                <View style={styles.tipIconBox}>
                                    <Sparkles size={20} color={Theme.colors.accent} />
                                </View>
                                <Text style={styles.tipsTitle}>TIPS FOR BETTER RESULTS</Text>
                            </View>

                            <View style={styles.tipRow}>
                                <View style={styles.tipCheck}>
                                    <Check size={14} color="#fff" />
                                </View>
                                <Text style={styles.tipText}>Ensure all screenshots are clear and high resolution</Text>
                            </View>
                            
                            <View style={styles.tipRow}>
                                <View style={styles.tipCheck}>
                                    <Check size={14} color="#fff" />
                                </View>
                                <Text style={styles.tipText}>Include all ranks by scrolling and taking multiple shots</Text>
                            </View>

                            <View style={styles.tipRow}>
                                <View style={styles.tipCheck}>
                                    <Check size={14} color="#fff" />
                                </View>
                                <Text style={styles.tipText}>Avoid overlapping UI elements or text on scores</Text>
                            </View>
                        </View>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Match Entries ({results.length})</Text>
                {results.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Target size={48} color={Theme.colors.border} />
                        <Text style={styles.emptyText}>Add teams to start calculating</Text>
                    </View>
                ) : (
                    <View style={styles.resultsList}>
                        {results.map((item, index) => (
                            <View key={item.team_id} style={styles.resultCard}>
                                <View style={styles.rankHeader}>
                                    <Text style={styles.rankPrefix}>#</Text>
                                    <TextInput
                                        style={styles.rankInput}
                                        keyboardType="numeric"
                                        value={String(item.position)}
                                        onChangeText={(v) => handleUpdateResult(index, 'position', v)}
                                        placeholder="1"
                                        placeholderTextColor={Theme.colors.accent + '80'}
                                    />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveResult(index)}>
                                        <X size={16} color={Theme.colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.teamSelectorBox}>
                                    <Text style={styles.teamNameText} numberOfLines={1}>{item.team_name}</Text>
                                    <TouchableOpacity 
                                        style={styles.dropdownToggle}
                                        onPress={() => toggleResultExpansion(item.team_id)}
                                    >
                                        {expandedResults[item.team_id] ? (
                                            <ChevronUp size={20} color={Theme.colors.textPrimary} />
                                        ) : (
                                            <ChevronDown size={20} color={Theme.colors.textPrimary} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {expandedResults[item.team_id] && (
                                    <View style={styles.expandedMembersContainer}>
                                        <Text style={styles.membersHeaderLabel}>INDIVIDUAL KILLS</Text>
                                        {item.members && item.members.length > 0 ? (
                                            <View style={styles.membersList}>
                                                {item.members.map((member, mIdx) => (
                                                    <View key={mIdx} style={styles.memberKillRow}>
                                                        <View style={styles.memberNameContainer}>
                                                            <Text style={styles.memberNameText} numberOfLines={1}>{member.name}</Text>
                                                        </View>
                                                        <View style={styles.memberKillInputWrapper}>
                                                            <TextInput
                                                                style={styles.memberKillInput}
                                                                keyboardType="numeric"
                                                                value={String(member.kills || 0)}
                                                                onChangeText={(v) => handleUpdateMemberKills(index, mIdx, v)}
                                                                placeholder="0"
                                                                placeholderTextColor={Theme.colors.textSecondary}
                                                            />
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <View style={styles.noMembersBox}>
                                                <Text style={styles.noMembersText}>No team members found</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                <View style={styles.killsInputContainer}>
                                    <Text style={styles.killsLabel}>Total Team Kills</Text>
                                    <View style={styles.killsInputBox}>
                                        <TextInput
                                            style={styles.killsInput}
                                            keyboardType="numeric"
                                            value={String(item.kills || 0)}
                                            onChangeText={(v) => handleUpdateResult(index, 'kills', v)}
                                            placeholder="0"
                                            placeholderTextColor={Theme.colors.textSecondary}
                                        />
                                    </View>
                                </View>

                                <View style={styles.statsFooter}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>POSITION{'\n'}POINTS</Text>
                                        <Text style={styles.statValue}>{item.placement_points || 0}</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>KILL{'\n'}POINTS</Text>
                                        <Text style={styles.statValue}>{item.kill_points || 0}</Text>
                                    </View>
                                    <View style={[styles.statBox, styles.totalStatBox]}>
                                        <Text style={[styles.statLabel, styles.totalStatLabel]}>TOTAL{'\n'}POINTS</Text>
                                        <Text style={[styles.statValue, styles.totalStatValue]}>{item.total_points || 0}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity 
                            style={[styles.submitFinalBtn, submitting && styles.disabledBtn]} 
                            onPress={handleSubmit}
                            disabled={submitting || results.length === 0}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitFinalBtnText}>Submit Results</Text>
                            )}
                        </TouchableOpacity>
                        <View style={{ height: 40 }} />
                    </View>
                )}
            </ScrollView>

            <ProcessingOverlay visible={processingLobby || extracting} />

            <Modal
                transparent={true}
                visible={mappingModalVisible}
                animationType="slide"
                onRequestClose={() => setMappingModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Map AI Result</Text>
                            <TouchableOpacity onPress={() => setMappingModalVisible(false)}>
                                <X size={24} color={Theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.aiSummary}>
                            <Text style={styles.aiSummaryLabel}>AI extracted data for:</Text>
                            {selectedSlotIndex !== null ? (
                                <>
                                    <Text style={styles.aiSummaryName}>SLOT {processedSlots[selectedSlotIndex]?.slot}</Text>
                                    <Text style={styles.aiSummaryDetail}>{processedSlots[selectedSlotIndex]?.players?.length || 0} players identified</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.aiSummaryName}>{selectedAiTeam?.team_name}</Text>
                                    <Text style={styles.aiSummaryDetail}>#{selectedAiTeam?.rank} • {selectedAiTeam?.kills} kills</Text>
                                </>
                            )}
                        </View>

                        <Text style={styles.sectionLabel}>Select Registered Team</Text>
                        <ScrollView style={styles.teamOptionsList}>
                            {teams.map(team => {
                                let isSelected = false;
                                let isMappedToOther = false;

                                if (selectedSlotIndex !== null) {
                                    isSelected = processedSlots[selectedSlotIndex].mappedTeamId === team.id;
                                    isMappedToOther = processedSlots.some(
                                        (slot, idx) => slot.mappedTeamId === team.id && idx !== selectedSlotIndex
                                    );
                                } else {
                                    isSelected = mappings[selectedAiTeam?.rank] === team.id;
                                    isMappedToOther = Object.entries(mappings).some(
                                        ([rank, registeredId]) => registeredId === team.id && parseInt(rank) !== selectedAiTeam?.rank
                                    );
                                }

                                return (
                                    <TouchableOpacity
                                        key={team.id}
                                        style={[
                                            styles.teamOption,
                                            isSelected && styles.teamOptionSelected,
                                            isMappedToOther && styles.teamOptionDisabled
                                        ]}
                                        disabled={isMappedToOther}
                                        onPress={() => {
                                            if (selectedSlotIndex !== null) {
                                                handleUpdateSlotMapping(selectedSlotIndex, team.id);
                                            } else if (selectedAiTeam && selectedAiTeam.rank) {
                                                setMappings(prev => ({
                                                    ...prev,
                                                    [selectedAiTeam.rank]: team.id
                                                }));
                                            }
                                            setMappingModalVisible(false);
                                        }}
                                    >
                                        <View style={styles.teamOptionLeft}>
                                            <Text style={[
                                                styles.teamOptionText,
                                                isSelected && styles.teamOptionTextSelected,
                                                isMappedToOther && styles.teamOptionTextDisabled
                                            ]}>
                                                {team.team_name}
                                            </Text>
                                            {isMappedToOther && (
                                                <Text style={styles.alreadyMappedText}>Already assigned</Text>
                                            )}
                                        </View>
                                        {isSelected && (
                                            <Check size={20} color={Theme.colors.accent} />
                                        )}
                                        {isMappedToOther && (
                                            <X size={16} color={Theme.colors.textSecondary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.clearMappingBtn}
                            onPress={() => {
                                if (selectedSlotIndex !== null) {
                                    handleUpdateSlotMapping(selectedSlotIndex, null);
                                } else {
                                    const newMappings = { ...mappings };
                                    delete newMappings[selectedAiTeam?.rank];
                                    setMappings(newMappings);
                                }
                                setMappingModalVisible(false);
                            }}
                        >
                            <Text style={styles.clearMappingText}>Clear Mapping</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
    },
    contentContainer: {
        backgroundColor: Theme.colors.secondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: Theme.colors.primary,
    },
    backButton: {
        padding: 4,
    },
    infoButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
    },
    toggleContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#fff',
    },
    toggleBackground: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 25,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 21,
    },
    toggleBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#94a3b8',
    },
    toggleTextActive: {
        color: Theme.colors.accent,
    },
    content: {
        padding: 20,
        backgroundColor: '#fff',
    },
    aiWorkflowContainer: {
        gap: 24,
    },
    workflowSection: {
        gap: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workflowSectionTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
    },
    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepBadgeNew: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    stepBadgeTextNew: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    completedBadgeNew: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    completedBadgeTextNew: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#10b981',
    },
    workflowCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    workflowInstruction: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#64748b',
        lineHeight: 20,
        marginBottom: 20,
    },
    uploadBox: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    uploadBoxProcessed: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#10b981',
        borderStyle: 'dashed',
        backgroundColor: '#f0fdf4',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    successIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    processedText: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#059669',
    },
    uploadIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    uploadBoxText: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#1a1a1a',
    },
    uploadBoxSubtext: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#94a3b8',
        marginTop: 4,
    },
    primaryActionBtn: {
        backgroundColor: Theme.colors.accent,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryActionBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    completedActionBtn: {
        backgroundColor: '#f8fafc',
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    completedActionBtnText: {
        color: '#cbd5e1',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    secondaryActionBtn: {
        backgroundColor: '#fff',
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionBtnText: {
        color: Theme.colors.accent,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    independentModeHint: {
        fontSize: 11,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
    tipsContainer: {
        backgroundColor: '#eff6ff',
        borderRadius: 24,
        padding: 24,
        marginTop: 10,
    },
    tipsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    tipIconBox: {
        marginRight: 12,
    },
    tipsTitle: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
        letterSpacing: 0.5,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    tipCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    tipText: {
        flex: 1,
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#475569',
        lineHeight: 20,
    },
    miniPreviewContainer: {
        width: 60,
        height: 60,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    removeMiniImageBtn: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 8,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addMoreMiniBtn: {
        width: 60,
        height: 60,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Theme.colors.accent,
        borderStyle: 'dashed',
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadedImagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        padding: 10,
        justifyContent: 'center',
    },
    miniImage: {
        width: '100%',
        height: '100%',
    },
    searchSection: {
        marginBottom: 20,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#1a1a1a',
    },
    searchResults: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    searchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    searchItemName: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#1a1a1a',
    },
    extractingLoader: {
        alignItems: 'center',
        padding: 40,
    },
    extractingText: {
        marginTop: 16,
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#64748b',
    },
    mappingSection: {
        gap: 20,
    },
    mappingHeader: {
        marginBottom: 10,
    },
    mappingTitle: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
    },
    mappingSubtitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#64748b',
        marginTop: 4,
    },
    slotCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        overflow: 'hidden',
    },
    slotHeader: {
        padding: 12,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    slotLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#64748b',
        letterSpacing: 1,
    },
    slotBody: {
        padding: 16,
    },
    slotFieldLabel: {
        fontSize: 11,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    slotPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    slotPickerText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#1a1a1a',
    },
    slotPlayerList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    playerBadge: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    playerBadgeText: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#475569',
    },
    noPlayersText: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#94a3b8',
        fontStyle: 'italic',
    },
    applyBtn: {
        backgroundColor: Theme.colors.accent,
        height: 52,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    applyBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    cancelBtnText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#64748b',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
        marginTop: 20,
        marginBottom: 16,
    },
    resultCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    rankHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    rankPrefix: {
        fontSize: 24,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    rankInput: {
        fontSize: 24,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
        minWidth: 40,
        textAlign: 'center',
    },
    removeBtn: {
        position: 'absolute',
        right: 0,
    },
    teamSelectorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    teamNameText: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
    },
    dropdownToggle: {
        padding: 8,
    },
    killsInputContainer: {
        marginBottom: 16,
    },
    killsLabel: {
        fontSize: 11,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    killsInputBox: {
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
    },
    killsInput: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
        textAlign: 'center',
    },
    statsFooter: {
        flexDirection: 'row',
        gap: 10,
    },
    statBox: {
        flex: 1,
        height: 70,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        padding: 10,
        justifyContent: 'space-between',
    },
    statLabel: {
        fontSize: 9,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
    },
    statValue: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
    },
    totalStatBox: {
        backgroundColor: Theme.colors.accent,
        borderColor: Theme.colors.accent,
    },
    totalStatLabel: {
        color: 'rgba(255,255,255,0.7)',
    },
    totalStatValue: {
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
    },
    aiSummary: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    aiSummaryLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#64748b',
    },
    aiSummaryName: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1a1a1a',
        marginTop: 4,
    },
    aiSummaryDetail: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.accent,
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    teamOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 8,
    },
    teamOptionSelected: {
        borderColor: Theme.colors.accent,
        backgroundColor: '#eff6ff',
    },
    teamOptionsList: {
        marginBottom: 20,
    },
    teamOptionLeft: {
        flex: 1,
    },
    teamOptionText: {
         fontSize: 16,
         fontFamily: Theme.fonts.outfit.medium,
         color: '#1a1a1a',
     },
     teamOptionTextSelected: {
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.bold,
    },
    teamOptionDisabled: {
        backgroundColor: '#f8fafc',
        borderColor: '#f1f5f9',
        opacity: 0.5,
    },
    teamOptionTextDisabled: {
        color: '#94a3b8',
    },
    alreadyMappedText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#94a3b8',
        fontStyle: 'italic',
        marginTop: 2,
    },
    clearMappingBtn: {
        padding: 16,
        alignItems: 'center',
    },
    clearMappingText: {
        color: '#ef4444',
        fontFamily: Theme.fonts.outfit.bold,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#94a3b8',
        marginTop: 12,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    expandedMembersContainer: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    membersHeaderLabel: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    membersList: {
        gap: 8,
    },
    memberKillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    memberNameContainer: {
        flex: 1,
        height: 44,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    memberNameText: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#475569',
        textTransform: 'uppercase',
    },
    memberKillInputWrapper: {
        width: 60,
        height: 44,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberKillInput: {
        width: '100%',
        height: '100%',
        textAlign: 'center',
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    submitFinalBtn: {
        backgroundColor: Theme.colors.accent,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitFinalBtnText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
    },
    overlayContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    overlayBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    overlayContentNew: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    loaderHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
    },
    loaderBrand: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1e293b',
    },
    aiAnimationContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    outerRing: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Theme.colors.accent,
        position: 'absolute',
        top: -3,
    },
    middleRing: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: Theme.colors.accent,
        borderLeftColor: 'transparent',
        borderBottomColor: 'transparent',
        position: 'absolute',
    },
    innerCircleBlue: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    aiAtWorkTitle: {
        fontSize: 24,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1e293b',
        marginBottom: 12,
    },
    aiAtWorkSubtitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#64748b',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
        marginBottom: 40,
    },
    didYouKnowBox: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    didYouKnowLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 1,
    },
    didYouKnowText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 20,
        fontStyle: 'italic',
    },
});

export default CalculateResultsScreen;
