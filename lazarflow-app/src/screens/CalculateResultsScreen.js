import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Target, Sparkles, Camera, X, Upload, Save, Search, Trash2, ArrowLeft, ChevronRight, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { extractResultsFromScreenshot, processLobbyScreenshots } from '../lib/aiResultExtraction';
import { fuzzyMatch, fuzzyMatchName } from '../lib/aiUtils';
import { useSubscription } from '../hooks/useSubscription';

const CalculateResultsScreen = ({ route, navigation }) => {
    const { canUseAI, tier } = useSubscription();
    const [lobby, setLobby] = useState(route.params?.lobby || {});
    const [mode, setMode] = useState('manual');
    const [teams, setTeams] = useState([]);
    const [results, setResults] = useState([]);
    const [teamSearch, setTeamSearch] = useState('');
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [aiResults, setAiResults] = useState([]);
    const [showMapping, setShowMapping] = useState(false);
    const [mappings, setMappings] = useState({}); // { [rank]: registeredTeamId }
    const [selectedAiTeam, setSelectedAiTeam] = useState(null);
    const [mappingModalVisible, setMappingModalVisible] = useState(false);
    
    // AI Workflow Steps
    const [aiStep, setAiStep] = useState(1);
    const [lobbyImages, setLobbyImages] = useState([]);
    const [processingLobby, setProcessingLobby] = useState(false);
    const [lobbyStepExpanded, setLobbyStepExpanded] = useState(true);
    const [resultsStepExpanded, setResultsStepExpanded] = useState(false);

    useEffect(() => {
        if (lobby?.id) {
            fetchLobbyData();
        }
    }, [lobby?.id]);

    const fetchLobbyData = async () => {
        setLoading(true);
        try {
            const { data: tData, error: tError } = await supabase
                .from('lobbies')
                .select('id, name, game, points_system, kill_points')
                .eq('id', lobby?.id)
                .single();

            if (tError) throw tError;
            setLobby(tData);

            const { data, error } = await supabase
                .from('lobby_teams')
                .select('id, team_name, members, total_points')
                .eq('lobby_id', lobby.id);
            if (error) throw error;
            setTeams(data || []);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch teams');
        } finally {
            setLoading(false);
        }
    };

    const handleAddResult = (team) => {
        if (results.some(r => r.team_id === team.id)) {
            Alert.alert('Info', 'Team already added to results');
            return;
        }

        const newResult = {
            team_id: team.id,
            team_name: team.team_name,
            position: '',
            kills: 0,
            placement_points: 0,
            kill_points: 0,
            total_points: 0,
            members: (team.members || []).map(m => ({
                name: typeof m === 'object' ? m.name : m,
                kills: 0
            }))
        };

        setResults([newResult, ...results]);
        setTeamSearch('');
        setFilteredTeams([]);
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

        // Auto-update team kills
        const totalMemberKills = updatedResults[resultIndex].members.reduce((sum, m) => sum + (m.kills || 0), 0);
        updatedResults[resultIndex].kills = totalMemberKills;

        // Re-calculate points
        updatedResults[resultIndex].kill_points = totalMemberKills * (lobby.kill_points || 0);
        updatedResults[resultIndex].total_points = (updatedResults[resultIndex].placement_points || 0) + (updatedResults[resultIndex].kill_points || 0);

        setResults(updatedResults);
    };

    const handleRemoveResult = (index) => {
        setResults(results.filter((_, i) => i !== index));
    };

    const handlePickLobbyImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setLobbyImages([...lobbyImages, ...result.assets]);
        }
    };

    const handleRemoveLobbyImage = (index) => {
        setLobbyImages(lobbyImages.filter((_, i) => i !== index));
    };

    const handleProcessLobby = async () => {
        if (lobbyImages.length === 0) {
            Alert.alert('Error', 'Please select lobby screenshots first');
            return;
        }
        
        setProcessingLobby(true);
        try {
            const data = await processLobbyScreenshots(lobbyImages);
            
            if (data.success) {
                Alert.alert(
                    'Lobby Processed', 
                    `Successfully identified ${data.teams_count || 0} teams. Now proceed to Step 2 to extract match results.`,
                    [{ text: 'Next Step', onPress: () => {
                        setAiStep(2);
                        setLobbyStepExpanded(false);
                        setResultsStepExpanded(true);
                    }}]
                );
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
            const extracted = await extractResultsFromScreenshot(imageAssets);

            const initialMappings = {};
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
        const newResults = aiResults.map(res => {
            const teamId = mappings[res.rank];
            const team = teams.find(t => t.id === teamId);

            if (!team) return null;

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
            for (const result of results) {
                const team = teams.find(t => t.id === result.team_id);
                if (!team) continue;

                const currentStats = team.total_points || { matches_played: 0, wins: 0, kill_points: 0, placement_points: 0 };
                const newStats = {
                    matches_played: (currentStats.matches_played || 0) + 1,
                    wins: (currentStats.wins || 0) + (parseInt(result.position) === 1 ? 1 : 0),
                    kill_points: (currentStats.kill_points || 0) + (result.kill_points || 0),
                    placement_points: (currentStats.placement_points || 0) + (result.placement_points || 0),
                };

                // Initialize current members as objects
                let currentMembers = (team.members || []).map(m => {
                    return typeof m === 'object' ? {
                        name: m.name || '',
                        kills: parseInt(m.kills) || 0,
                        matches_played: parseInt(m.matches_played) || 0,
                        wwcd: parseInt(m.wwcd) || 0
                    } : { name: m, kills: 0, matches_played: 0, wwcd: 0 };
                });

                const resultMembers = result.members || [];
                const seenInCurrentMatch = new Set();

                for (const rm of resultMembers) {
                    const pMatch = fuzzyMatchName(rm.name, currentMembers, 0.75);

                    if (pMatch) {
                        const mIdx = currentMembers.findIndex(m => m.name === pMatch.member.name);
                        if (mIdx !== -1 && !seenInCurrentMatch.has(mIdx)) {
                            currentMembers[mIdx] = {
                                ...currentMembers[mIdx],
                                kills: (currentMembers[mIdx].kills || 0) + (parseInt(rm.kills) || 0),
                                matches_played: (currentMembers[mIdx].matches_played || 0) + 1,
                                wwcd: (currentMembers[mIdx].wwcd || 0) + (parseInt(result.position) === 1 ? 1 : 0)
                            };
                            seenInCurrentMatch.add(mIdx);
                        }
                    } else {
                        // Roster learning
                        currentMembers.push({
                            name: rm.name,
                            kills: parseInt(rm.kills) || 0,
                            matches_played: 1,
                            wwcd: (parseInt(result.position) === 1 ? 1 : 0)
                        });
                    }
                }

                const { error } = await supabase
                    .from('lobby_teams')
                    .update({
                        total_points: newStats,
                        members: currentMembers
                    })
                    .eq('id', result.team_id);

                if (error) throw error;
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
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Calculate Results</Text>
                    <View style={styles.headerSubtitleRow}>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>{lobby?.name}</Text>
                        <View style={styles.lobbyIdBadge}>
                            <Text style={styles.lobbyIdText}>{lobby?.id?.slice(0, 8)}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting || results.length === 0}>
                    {submitting ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : <Text style={[styles.submitBtnText, results.length === 0 && { opacity: 0.5 }]}>Submit</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.modeTabs}>
                <TouchableOpacity style={[styles.modeTab, mode === 'manual' && styles.modeTabActive]} onPress={() => setMode('manual')}>
                    <Target size={18} color={mode === 'manual' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.modeTabText, mode === 'manual' && styles.modeTabTextActive]}>Manual</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeTab, mode === 'ai' && styles.modeTabActive]} onPress={() => setMode('ai')}>
                    <Sparkles size={18} color={mode === 'ai' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.modeTabText, mode === 'ai' && styles.modeTabTextActive]}>LexiView AI</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
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
                ) : (
                    <View style={styles.aiUploadSection}>
                        {extracting ? (
                            <View style={styles.extractingLoader}>
                                <ActivityIndicator size="large" color={Theme.colors.accent} />
                                <Text style={styles.extractingText}>AI is analyzing screenshots...</Text>
                            </View>
                        ) : showMapping ? (
                            <View style={styles.mappingSection}>
                                <View style={styles.mappingHeader}>
                                    <Text style={styles.mappingTitle}>Verify AI Extraction</Text>
                                    <Text style={styles.mappingSubtitle}>Map extracted teams to your registered teams</Text>
                                </View>
                                {aiResults.map((res, index) => (
                                    <View key={index} style={styles.mappingRow}>
                                        <View style={styles.aiTeamInfo}>
                                            <View style={styles.aiTeamHeader}>
                                                <Text style={styles.aiTeamLabel}>AI Found:</Text>
                                                <Text style={[styles.aiTeamStats, { fontFamily: Theme.fonts.monospace }]}>Rank #{res.rank} • {res.kills} kills</Text>
                                            </View>
                                            <Text style={styles.aiTeamName}>{res.team_name}</Text>

                                            {res.players && res.players.length > 0 && (
                                                <View style={styles.aiPlayerList}>
                                                    {res.players.map((p, pIdx) => (
                                                        <View key={pIdx} style={styles.aiPlayerItem}>
                                                            <Text style={styles.aiPlayerName}>{p.name}</Text>
                                                            <Text style={[styles.aiPlayerKills, { fontFamily: Theme.fonts.monospace }]}>{p.kills}k</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.mappingArrow}>
                                            <ChevronRight size={16} color={Theme.colors.textSecondary} />
                                        </View>

                                        <View style={styles.teamPickerContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.teamPicker,
                                                    mappings[res.rank] ? styles.teamPickerFilled : styles.teamPickerEmpty
                                                ]}
                                                onPress={() => {
                                                    setSelectedAiTeam(res);
                                                    setMappingModalVisible(true);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.selectedTeamName,
                                                    !mappings[res.rank] && styles.unselectedText
                                                ]}>
                                                    {teams.find(t => t.id === mappings[res.rank])?.team_name || 'Select Team'}
                                                </Text>
                                                <ChevronDown size={16} color={Theme.colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}

                                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyMapping}>
                                    <Check size={20} color="#fff" />
                                    <Text style={styles.applyBtnText}>Apply Results</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMapping(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.workflowContainer}>
                                <View style={styles.workflowHeader}>
                                    <Sparkles size={24} color={Theme.colors.accent} />
                                    <Text style={styles.workflowTitle}>LexiView AI Workflow</Text>
                                </View>

                                {/* Step 1: Process Lobby */}
                                <View style={[styles.stepCard, aiStep === 1 && styles.activeStepCard]}>
                                    <TouchableOpacity 
                                        style={styles.stepHeader}
                                        onPress={() => setLobbyStepExpanded(!lobbyStepExpanded)}
                                    >
                                        <View style={styles.stepHeaderLeft}>
                                            <View style={[styles.stepBadge, aiStep >= 1 && styles.activeStepBadge]}>
                                                <Text style={styles.stepBadgeText}>1</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.stepTitle}>Process Lobby</Text>
                                                <Text style={styles.stepDescription}>Extract teams & members from lobby</Text>
                                            </View>
                                        </View>
                                        {lobbyStepExpanded ? <ChevronUp size={20} color={Theme.colors.textSecondary} /> : <ChevronDown size={20} color={Theme.colors.textSecondary} />}
                                    </TouchableOpacity>

                                    {lobbyStepExpanded && (
                                        <View style={styles.stepContent}>
                                            <View style={styles.imageGrid}>
                                                {lobbyImages.map((img, idx) => (
                                                    <View key={idx} style={styles.imagePreviewContainer}>
                                                        <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                                                        <TouchableOpacity 
                                                            style={styles.removeImageBtn}
                                                            onPress={() => handleRemoveLobbyImage(idx)}
                                                        >
                                                            <X size={12} color="#fff" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                                <TouchableOpacity style={styles.addImageBtn} onPress={handlePickLobbyImages}>
                                                    <Camera size={24} color={Theme.colors.textSecondary} />
                                                    <Text style={styles.addImageText}>Add Lobby Screenshot</Text>
                                                </TouchableOpacity>
                                            </View>
                                            
                                            <TouchableOpacity 
                                                style={[styles.processBtn, lobbyImages.length === 0 && styles.disabledBtn]}
                                                onPress={handleProcessLobby}
                                                disabled={processingLobby || lobbyImages.length === 0}
                                            >
                                                {processingLobby ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <>
                                                        <Upload size={18} color="#fff" style={{ marginRight: 8 }} />
                                                        <Text style={styles.processBtnText}>Process Lobby</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Step 2: Extract Results */}
                                <View style={[styles.stepCard, aiStep === 2 && styles.activeStepCard, aiStep < 2 && styles.disabledStepCard]}>
                                    <TouchableOpacity 
                                        style={styles.stepHeader}
                                        onPress={() => aiStep >= 2 && setResultsStepExpanded(!resultsStepExpanded)}
                                        disabled={aiStep < 2}
                                    >
                                        <View style={styles.stepHeaderLeft}>
                                            <View style={[styles.stepBadge, aiStep >= 2 && styles.activeStepBadge]}>
                                                <Text style={styles.stepBadgeText}>2</Text>
                                            </View>
                                            <View>
                                                <Text style={styles.stepTitle}>Extract Results</Text>
                                                <Text style={styles.stepDescription}>Calculate points from result screens</Text>
                                            </View>
                                        </View>
                                        {resultsStepExpanded ? <ChevronUp size={20} color={Theme.colors.textSecondary} /> : <ChevronDown size={20} color={Theme.colors.textSecondary} />}
                                    </TouchableOpacity>

                                    {resultsStepExpanded && (
                                        <View style={styles.stepContent}>
                                            <TouchableOpacity style={styles.uploadMainBtn} onPress={handlePickImage}>
                                                <Upload size={32} color={Theme.colors.accent} />
                                                <Text style={styles.uploadMainTitle}>Upload Result Screenshots</Text>
                                                <Text style={styles.uploadMainSubtitle}>Select multiple images for all ranks</Text>
                                            </TouchableOpacity>
                                            
                                            <View style={styles.aiInstructions}>
                                                <Text style={styles.instructionTitle}>Tips for better results:</Text>
                                                <Text style={styles.instructionText}>• Ensure screenshots are clear and readable</Text>
                                                <Text style={styles.instructionText}>• Include all ranks (1 to bottom)</Text>
                                                <Text style={styles.instructionText}>• Avoid overlapping text or UI elements</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
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
                                <View style={styles.resultHeader}>
                                    <Text style={styles.resultTeamName}>{item.team_name}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveResult(index)}>
                                        <X size={18} color={Theme.colors.danger} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.resultInputs}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Position</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            keyboardType="numeric"
                                            value={String(item.position)}
                                            onChangeText={(v) => handleUpdateResult(index, 'position', v)}
                                            placeholder="Rank"
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Team Kills</Text>
                                        <TextInput
                                            style={styles.fieldInput}
                                            keyboardType="numeric"
                                            value={String(item.kills)}
                                            onChangeText={(v) => handleUpdateResult(index, 'kills', v)}
                                            placeholder="0"
                                        />
                                    </View>
                                    <View style={styles.pointsDisplay}>
                                        <Text style={styles.pointsLabel}>Total</Text>
                                        <Text style={styles.pointsValue}>{item.total_points}</Text>
                                    </View>
                                </View>

                                {item.members && item.members.length > 0 && (
                                    <View style={styles.memberKillsSection}>
                                        <Text style={styles.memberKillsTitle}>Individual Player Kills</Text>
                                        {item.members.map((member, mIdx) => (
                                            <View key={mIdx} style={styles.memberKillRow}>
                                                <Text style={styles.memberKillName}>{member.name}</Text>
                                                <TextInput
                                                    style={styles.memberKillInput}
                                                    keyboardType="numeric"
                                                    value={String(member.kills || 0)}
                                                    onChangeText={(v) => handleUpdateMemberKills(index, mIdx, v)}
                                                    placeholder="0"
                                                />
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

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
                            <Text style={styles.aiSummaryName}>{selectedAiTeam?.team_name}</Text>
                            <Text style={styles.aiSummaryDetail}>#{selectedAiTeam?.rank} • {selectedAiTeam?.kills} kills</Text>
                        </View>

                        <Text style={styles.sectionLabel}>Select Registered Team</Text>
                        <ScrollView style={styles.teamOptionsList}>
                            {teams.map(team => {
                                const isMappedToOther = Object.entries(mappings).some(
                                    ([rank, registeredId]) => registeredId === team.id && parseInt(rank) !== selectedAiTeam?.rank
                                );
                                const isSelected = mappings[selectedAiTeam?.rank] === team.id;

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
                                            setMappings({
                                                ...mappings,
                                                [selectedAiTeam.rank]: team.id
                                            });
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
                                const newMappings = { ...mappings };
                                delete newMappings[selectedAiTeam?.rank];
                                setMappings(newMappings);
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
        backgroundColor: Theme.colors.secondary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerInfo: {
        flex: 1,
        marginLeft: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        flexShrink: 1,
    },
    headerSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    lobbyIdBadge: {
        backgroundColor: 'rgba(26, 115, 232, 0.08)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    lobbyIdText: {
        fontSize: 10,
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.monospace,
    },
    submitBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    submitBtnText: {
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.bold,
        fontSize: 16,
    },
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    modeTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: Theme.colors.accent,
    },
    modeTabText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textSecondary,
    },
    modeTabTextActive: {
        color: Theme.colors.accent,
    },
    content: {
        padding: 20,
    },
    searchSection: {
        marginBottom: 20,
        zIndex: 10,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        color: Theme.colors.textPrimary,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
    },
    searchResults: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        backgroundColor: Theme.colors.primary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 100,
    },
    searchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    searchItemName: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textPrimary,
    },
    aiUploadSection: {
        marginBottom: 20,
    },
    workflowContainer: {
        gap: 12,
    },
    workflowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        padding: 12,
        borderRadius: 8,
    },
    workflowTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.accent,
    },
    stepCard: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        overflow: 'hidden',
    },
    activeStepCard: {
        borderColor: Theme.colors.accent,
        borderWidth: 1.5,
    },
    disabledStepCard: {
        opacity: 0.6,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    stepHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },

    uploadTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,

    activeStepBadge: {
        backgroundColor: Theme.colors.accent,
    },
    stepBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: 'bold',

        color: Theme.colors.textPrimary,
    },
    stepDescription: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
    },
    stepContent: {
        padding: 16,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        marginTop: 0,
        paddingBottom: 20,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 12,
    },
    imagePreviewContainer: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: 4,
    },
    addImageBtn: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    addImageText: {
        fontSize: 10,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    processBtn: {
        backgroundColor: Theme.colors.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    disabledBtn: {
        backgroundColor: Theme.colors.border,
    },
    processBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,

        fontFamily: Theme.fonts.outfit.regular,

    },
    uploadMainBtn: {
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
        borderWidth: 1,
        borderColor: Theme.colors.accent,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
    },
    uploadMainTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginTop: 8,
    },
    uploadMainSubtitle: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginTop: 4,
    },
    aiInstructions: {
        backgroundColor: Theme.colors.secondary,
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    instructionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 4,
    },
    instructionText: {
        fontSize: 12,

        color: Theme.colors.textSecondary,
        marginBottom: 2,
    },
    applyBtn: {
        backgroundColor: Theme.colors.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    applyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelBtn: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    cancelBtnText: {
        color: Theme.colors.textSecondary,
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 12,
    },
    resultsList: {
        gap: 12,
    },
    resultCard: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    resultTeamName: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    resultInputs: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        marginBottom: 4,
    },
    fieldInput: {
        backgroundColor: Theme.colors.secondary,
        borderRadius: 6,
        padding: 8,
        color: Theme.colors.textPrimary,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.semibold,
        textAlign: 'center',
    },
    pointsDisplay: {
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: 'center',
        minWidth: 60,
    },
    pointsLabel: {
        fontSize: 10,
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.bold,
    },
    pointsValue: {
        fontSize: 16,
        fontFamily: Theme.fonts.monospace,
        color: Theme.colors.accent,
    },
    extractingLoader: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    extractingText: {
        color: Theme.colors.textPrimary,
        fontFamily: Theme.fonts.outfit.semibold,
    },
    mappingSection: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        padding: 16,
    },
    mappingHeader: {
        marginBottom: 20,
    },
    mappingTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    mappingSubtitle: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    mappingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        gap: 10,
    },
    aiTeamInfo: {
        flex: 1,
    },
    aiTeamLabel: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    aiTeamName: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    aiTeamStats: {
        fontSize: 11,
        fontFamily: Theme.fonts.monospace,
        color: Theme.colors.accent,
    },
    teamPickerContainer: {
        flex: 1,
    },
    teamPicker: {
        backgroundColor: Theme.colors.secondary,
        padding: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    selectedTeamName: {
        fontSize: 13,
        color: Theme.colors.textPrimary,
        fontFamily: Theme.fonts.outfit.bold,
    },
    unselectedText: {
        color: Theme.colors.textSecondary,
        fontFamily: Theme.fonts.outfit.regular,
    },
    teamPickerEmpty: {
        borderColor: Theme.colors.danger,
        backgroundColor: 'rgba(239, 68, 68, 0.02)',
    },
    teamPickerFilled: {
        borderColor: Theme.colors.accent,
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
    },
    aiTeamHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    aiPlayerList: {
        marginTop: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    aiPlayerItem: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.secondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignItems: 'center',
        gap: 4,
        borderWidth: 0.5,
        borderColor: Theme.colors.border,
    },
    aiPlayerName: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textPrimary,
        maxWidth: 60,
    },
    aiPlayerKills: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    mappingArrow: {
        paddingHorizontal: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.primary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
        color: Theme.colors.textPrimary,
    },
    aiSummary: {
        backgroundColor: Theme.colors.secondary,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    aiSummaryLabel: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        marginBottom: 4,
    },
    aiSummaryName: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    aiSummaryDetail: {
        fontSize: 14,
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.semibold,
    },
    sectionLabel: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    teamOptionsList: {
        marginBottom: 20,
    },
    teamOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: 8,
    },
    teamOptionSelected: {
        borderColor: Theme.colors.accent,
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
    },
    teamOptionText: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textPrimary,
    },
    teamOptionTextSelected: {
        color: Theme.colors.accent,
        fontWeight: 'bold',
    },
    teamOptionDisabled: {
        backgroundColor: Theme.colors.secondary,
        borderColor: Theme.colors.border,
        opacity: 0.6,
    },
    teamOptionTextDisabled: {
        color: Theme.colors.textSecondary,
    },
    alreadyMappedText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    teamOptionLeft: {
        flex: 1,
    },
    clearMappingBtn: {
        alignItems: 'center',
        padding: 12,
    },
    clearMappingText: {
        color: Theme.colors.danger,
        fontFamily: Theme.fonts.outfit.semibold,
    },
    mappingActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelMappingBtn: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: Theme.colors.secondary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    cancelMappingText: {
        color: Theme.colors.textPrimary,
        fontWeight: 'bold',
    },
    applyMappingBtn: {
        flex: 2,
        padding: 14,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: Theme.colors.accent,
    },
    applyMappingText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    memberKillsSection: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    memberKillsTitle: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    memberKillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    memberKillName: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textPrimary,
    },
    memberKillInput: {
        backgroundColor: Theme.colors.secondary,
        borderRadius: 4,
        padding: 4,
        width: 40,
        textAlign: 'center',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    emptyText: {
        color: Theme.colors.textSecondary,
    },
});

export default CalculateResultsScreen;
