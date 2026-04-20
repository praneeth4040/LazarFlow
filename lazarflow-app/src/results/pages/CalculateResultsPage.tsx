import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal, Dimensions, Animated } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State as GestureState, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, X, Upload, Search, ArrowLeft, Plus, Check, ChevronDown, ChevronUp, Info, Save, AlertCircle, Skull } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';

import { useLobbyMapping } from '../hooks/useLobbyMapping';
import { useAIExtraction } from '../hooks/useAIExtraction';
import { useResultsManagement } from '../hooks/useResultsManagement';
import { ProcessingOverlay } from '../../components/ProcessingOverlay';
import { styles } from '../styles/calculateResults.styles';

const SCREEN_W = Dimensions.get('window').width;

export const CalculateResultsPage = ({ route, navigation }: any) => {
    const { user, refreshUser } = useContext(UserContext);
    const [lobby, setLobby] = useState(route.params?.lobby || {});
    const [mode, setMode] = useState<'manual' | 'ai'>('manual');
    const [teams, setTeams] = useState<any[]>([]);
    const [teamSearch, setTeamSearch] = useState('');
    const [mappingModalVisible, setMappingModalVisible] = useState(false);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
    const [selectedAiTeam, setSelectedAiTeam] = useState<any>(null);
    const [referenceImage, setReferenceImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [zoomModalVisible, setZoomModalVisible] = useState(false);

    // Modal zoom+pan — RN Animated (no extra deps needed)
    const mPinchRef = useRef<any>(null);
    const mPanRef   = useRef<any>(null);
    const mScale    = useRef(new Animated.Value(1)).current;
    const mTransX   = useRef(new Animated.Value(0)).current;
    const mTransY   = useRef(new Animated.Value(0)).current;
    const mSavedScale  = useRef(1);  const mCurrScale  = useRef(1);
    const mSavedTransX = useRef(0);  const mCurrTransX = useRef(0);
    const mSavedTransY = useRef(0);  const mCurrTransY = useRef(0);

    const fetchLobbyData = async () => {
        try {
            const tData = await lobbyRepository.getLobby(lobby?.id);
            setLobby(tData);

            const data = await lobbyRepository.getLobbyTeams(lobby.id);
            setTeams(data || []);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch teams');
        }
    };

    const {
        lobbyImages,
        processingLobby,
        processedSlots,
        showSlotMapping,
        submitting: submittingMappings,
        setShowSlotMapping,
        handlePickLobbyImages,
        handleRemoveLobbyImage,
        handleProcessLobby,
        handleUpdateSlotMapping,
        handleSaveSlotMappings
    } = useLobbyMapping(lobby, teams, fetchLobbyData);

    const {
        extracting,
        aiResults,
        showMapping,
        mappings,
        resultImages,
        setShowMapping,
        setMappings,
        handlePickResultImages,
        handleRemoveResultImage,
        handleAIUpload,
    } = useAIExtraction(lobby, teams, user, refreshUser, navigation);

    const [editableAiData, setEditableAiData] = useState<Record<number, {
        players: { name: string; kills: number }[];
        totalKills: number;
    }>>({});

    const {
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
        handleSubmit,
        handleSubmitWithResults,
    } = useResultsManagement(lobby, teams, navigation);

    useEffect(() => {
        if (lobby?.id) {
            fetchLobbyData();
        }
    }, [lobby?.id]);

    // Initialise editable kill data each time AI extraction returns new results
    useEffect(() => {
        if (aiResults.length > 0) {
            const initial: Record<number, { players: { name: string; kills: number }[]; totalKills: number }> = {};
            aiResults.forEach((res: any, idx: number) => {
                initial[idx] = {
                    players: (res.players || []).map((p: any) => ({ name: p.name, kills: p.kills || 0 })),
                    totalKills: res.kills || 0,
                };
            });
            setEditableAiData(initial);
        }
    }, [aiResults]);

    const handleApplyMapping = () => {
        const newExpandedState = { ...expandedResults };
        const newResults = aiResults.map(res => {
            const teamId = mappings[res.rank] || (res.rank && mappings[String(res.rank)]);
            const team = teams.find(t => t.id === teamId);

            if (!team) return null;

            newExpandedState[team.id] = true;

            const pos = parseInt(String(res.rank));
            const pointsEntry = lobby.points_system.find((p: any) => p.placement === pos);
            const placementPoints = pointsEntry ? pointsEntry.points : 0;
            const killPoints = (res.kills || 0) * (lobby.kill_points || 0);

            const registeredMembers = team.members || [];
            
            let finalMembers: any[] = [];
            if (registeredMembers.length === 0) {
                finalMembers = (res.players || []).map(p => ({
                    name: p.name,
                    kills: p.kills || 0,
                    isExtracted: true
                }));
            } else {
                const { fuzzyMatchName } = require('../../lib/aiUtils');
                finalMembers = (res.players || []).map(p => {
                    const match = fuzzyMatchName(p.name, registeredMembers, 0.75);
                    return {
                        name: match ? (typeof match.member === 'object' ? match.member.name : match.member) : p.name,
                        kills: p.kills || 0,
                        isExtracted: !match
                    };
                });
            }

            return {
                team_id: team.id,
                team_name: team.team_name,
                position: String(res.rank),
                kills: res.kills || 0,
                placement_points: placementPoints,
                kill_points: killPoints,
                total_points: placementPoints + killPoints,
                members: finalMembers,
                isExtracted: true
            };
        }).filter(r => r !== null);

        setExpandedResults(newExpandedState);
        setResults(newResults as any);
        setShowMapping(false);
    };

    // Builds results from AI data + user edits and submits without an intermediate state round-trip
    const handleCombinedSubmit = async () => {
        const unmapped = aiResults.filter((res: any) => !mappings[String(res.rank)]);
        if (unmapped.length > 0) {
            Alert.alert(
                'Incomplete Mapping',
                `${unmapped.length} result(s) still need a team assigned. Please map every rank before submitting.`
            );
            return;
        }

        const builtResults = aiResults.map((res: any, idx: number) => {
            const teamId = mappings[String(res.rank)];
            const team = teams.find((t: any) => t.id === teamId);
            if (!team) return null;

            const editable = editableAiData[idx];
            const players: { name: string; kills: number }[] = editable?.players
                ?? (res.players || []).map((p: any) => ({ name: p.name, kills: p.kills || 0 }));
            const totalKills: number = editable?.totalKills ?? (res.kills || 0);

            const pos = parseInt(String(res.rank));
            const pointsEntry = lobby.points_system?.find((p: any) => p.placement === pos);
            const placementPoints = pointsEntry ? pointsEntry.points : 0;
            const killPoints = totalKills * (lobby.kill_points || 0);

            const registeredMembers = team.members || [];
            let finalMembers: any[] = [];
            if (registeredMembers.length === 0) {
                finalMembers = players.map((p) => ({ name: p.name, kills: p.kills || 0, isExtracted: true }));
            } else {
                const { fuzzyMatchName } = require('../../lib/aiUtils');
                finalMembers = players.map((p) => {
                    const match = fuzzyMatchName(p.name, registeredMembers, 0.75);
                    return {
                        name: match ? (typeof match.member === 'object' ? match.member.name : match.member) : p.name,
                        kills: p.kills || 0,
                        isExtracted: !match,
                    };
                });
            }

            return {
                team_id: team.id,
                team_name: team.team_name,
                position: String(res.rank),
                kills: totalKills,
                placement_points: placementPoints,
                kill_points: killPoints,
                total_points: placementPoints + killPoints,
                members: finalMembers,
            };
        }).filter(Boolean) as any[];

        await handleSubmitWithResults(builtResults);
    };

    const handlePickReferenceImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 0.9,
        });
        if (!result.canceled && result.assets.length > 0) {
            setReferenceImage(result.assets[0]);
        }
    };

    const onModalPinch = ({ nativeEvent }: any) => {
        const next = Math.max(1, Math.min(6, mSavedScale.current * nativeEvent.scale));
        mCurrScale.current = next;
        mScale.setValue(next);
    };
    const onModalPinchEnd = ({ nativeEvent }: any) => {
        if (nativeEvent.oldState === GestureState.ACTIVE) mSavedScale.current = mCurrScale.current;
    };

    const onModalPan = ({ nativeEvent }: any) => {
        mCurrTransX.current = mSavedTransX.current + nativeEvent.translationX;
        mCurrTransY.current = mSavedTransY.current + nativeEvent.translationY;
        mTransX.setValue(mCurrTransX.current);
        mTransY.setValue(mCurrTransY.current);
    };
    const onModalPanEnd = ({ nativeEvent }: any) => {
        if (nativeEvent.oldState === GestureState.ACTIVE) {
            mSavedTransX.current = mCurrTransX.current;
            mSavedTransY.current = mCurrTransY.current;
        }
    };

    const openZoomModal = () => {
        mSavedScale.current = 1;  mCurrScale.current = 1;  mScale.setValue(1);
        mSavedTransX.current = 0; mCurrTransX.current = 0; mTransX.setValue(0);
        mSavedTransY.current = 0; mCurrTransY.current = 0; mTransY.setValue(0);
        setZoomModalVisible(true);
    };

    // Pre-compute ref image display height from its real aspect ratio
    const refImgH = referenceImage && referenceImage.width && referenceImage.height
        ? Math.min(420, Math.round(SCREEN_W / (referenceImage.width / referenceImage.height)))
        : 260;

    const filteredSearchTeams = teamSearch.trim()
        ? teams.filter(t => t.team_name.toLowerCase().includes(teamSearch.trim().toLowerCase()) && !results.some(r => r.team_id === t.id))
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
                    <View>
                        {/* ── Reference Screenshot — full-bleed, no card ────── */}
                        <View style={{ marginHorizontal: -20, marginBottom: 16 }}>
                            {referenceImage ? (
                                /* Tap to open full-screen zoom modal */
                                <TouchableOpacity onPress={openZoomModal} activeOpacity={0.9}>
                                    <Image
                                        source={{ uri: referenceImage.uri }}
                                        style={{ width: SCREEN_W, height: refImgH }}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={handlePickReferenceImage}
                                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, backgroundColor: Theme.colors.accent + '0a', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Theme.colors.accent + '25' }}
                                    activeOpacity={0.75}
                                >
                                    <Camera size={17} color={Theme.colors.accent} />
                                    <Text style={{ color: Theme.colors.accent, fontWeight: '600', fontSize: 14 }}>Add Reference Screenshot</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* ── Team Search ──────────────────────────────────── */}
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
                                        <TouchableOpacity key={team.id} style={styles.searchItem} onPress={() => { handleAddResult(team); setTeamSearch(''); }}>
                                            <Text style={styles.searchItemName}>{team.team_name}</Text>
                                            <Plus size={18} color={Theme.colors.accent} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
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
                            style={[styles.applyBtn, submittingMappings && styles.disabledBtn]} 
                            onPress={handleSaveSlotMappings}
                            disabled={submittingMappings}
                        >
                            {submittingMappings ? (
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
                            <Text style={styles.mappingTitle}>Review & Submit</Text>
                            <Text style={styles.mappingSubtitle}>Map teams, adjust kills if needed, then submit in one step</Text>
                        </View>

                        {aiResults.map((res, index) => {
                            const rankStr = String(res.rank);
                            const isMapped = !!mappings[rankStr];
                            const editable = editableAiData[index] || {
                                players: (res.players || []).map((p: any) => ({ name: p.name, kills: p.kills || 0 })),
                                totalKills: res.kills || 0,
                            };
                            const placementPoints = lobby.points_system?.find((p: any) => p.placement === parseInt(rankStr))?.points || 0;
                            const killPoints = editable.totalKills * (lobby.kill_points || 0);
                            const totalPoints = placementPoints + killPoints;

                            return (
                                <View key={index} style={[
                                    styles.resultCard,
                                    isMapped ? styles.resultCardMapped : styles.resultCardUnmapped
                                ]}>
                                    {/* Rank + status badge */}
                                    <View style={styles.rankHeader}>
                                        <Text style={styles.rankPrefix}>#</Text>
                                        <Text style={styles.rankInput}>{res.rank}</Text>
                                        {isMapped ? (
                                            <View style={styles.matchedBadge}>
                                                <Check size={10} color="#fff" />
                                                <Text style={styles.matchedBadgeText}>MAPPED</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.unmatchedBadge}>
                                                <AlertCircle size={10} color="#fff" />
                                                <Text style={styles.matchedBadgeText}>UNMAPPED</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Team picker */}
                                    <TouchableOpacity
                                        style={[styles.teamSelectorBox, isMapped && styles.teamSelectorBoxMapped]}
                                        onPress={() => { setSelectedAiTeam(res); setMappingModalVisible(true); }}
                                    >
                                        <Text style={[
                                            styles.teamNameText,
                                            !isMapped && { color: Theme.colors.textSecondary }
                                        ]} numberOfLines={1}>
                                            {teams.find(t => t.id === mappings[rankStr])?.team_name || 'Select Team...'}
                                        </Text>
                                        <ChevronDown size={20} color={isMapped ? Theme.colors.accent : Theme.colors.textPrimary} />
                                    </TouchableOpacity>

                                    {/* Editable player kills */}
                                    <View style={[styles.expandedMembersContainer, isMapped && { backgroundColor: '#fff', borderColor: '#d1fae5' }]}>
                                        <View style={styles.membersHeaderRow}>
                                            <Text style={styles.membersHeaderLabel}>PLAYER KILLS</Text>
                                        </View>
                                        {editable.players.length > 0 ? (
                                            <View style={styles.membersList}>
                                                {editable.players.map((player: any, pIdx: number) => (
                                                    <View key={pIdx} style={[styles.playerListItem, isMapped && { borderColor: '#d1fae5' }]}>
                                                        <View style={styles.playerListItemLeft}>
                                                            <View style={styles.playerAvatarPlaceholderSmall}>
                                                                <Text style={styles.avatarLetterSmall}>{pIdx + 1}</Text>
                                                            </View>
                                                            <Text style={styles.memberNameText} numberOfLines={1}>{player.name}</Text>
                                                        </View>
                                                        <View style={[styles.playerListItemRight, isMapped && { borderColor: '#10b981' }]}>
                                                            <Skull size={12} color={isMapped ? '#10b981' : Theme.colors.accent} style={{ marginRight: 6 }} />
                                                            <TextInput
                                                                style={[styles.memberKillInput, isMapped && { color: '#059669' }]}
                                                                keyboardType="numeric"
                                                                value={String(player.kills)}
                                                                onChangeText={(val) => {
                                                                    const newKills = parseInt(val) || 0;
                                                                    const newPlayers = editable.players.map((p: any, i: number) =>
                                                                        i === pIdx ? { ...p, kills: newKills } : p
                                                                    );
                                                                    const newTotal = newPlayers.reduce((sum: number, p: any) => sum + (p.kills || 0), 0);
                                                                    setEditableAiData(prev => ({
                                                                        ...prev,
                                                                        [index]: { players: newPlayers, totalKills: newTotal },
                                                                    }));
                                                                }}
                                                                placeholder="0"
                                                                placeholderTextColor={Theme.colors.textSecondary}
                                                            />
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        ) : (
                                            <Text style={styles.noPlayersText}>No players identified</Text>
                                        )}
                                    </View>

                                    {/* Live points summary */}
                                    <View style={styles.statsFooter}>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statLabel}>POSITION{'\n'}POINTS</Text>
                                            <Text style={styles.statValue}>{placementPoints}</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statLabel}>KILL{'\n'}POINTS</Text>
                                            <Text style={styles.statValue}>{killPoints}</Text>
                                        </View>
                                        <View style={[styles.statBox, isMapped ? { backgroundColor: '#10b981', borderColor: '#10b981' } : styles.totalStatBox]}>
                                            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>TOTAL{'\n'}POINTS</Text>
                                            <Text style={[styles.statValue, { color: '#fff' }]}>{totalPoints}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}

                        {/* Single submit — replaces the old Apply Results + Submit Results two-step */}
                        <TouchableOpacity
                            style={[styles.applyBtn, submitting && styles.disabledBtn]}
                            onPress={handleCombinedSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Check size={20} color="#fff" />
                                    <Text style={styles.applyBtnText}>Submit Results</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMapping(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.aiWorkflowContainer}>
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
                    </View>
                )}

                {!showMapping && <Text style={styles.sectionTitle}>Match Entries ({results.length})</Text>}
                {results.length === 0 && !showMapping ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Add teams to start calculating</Text>
                    </View>
                ) : results.length > 0 ? (
                    <View style={styles.resultsList}>
                        {results.map((item, index) => {
                            const isAiSync = !!item.isExtracted || (item.members && item.members.some(m => !!m.isExtracted));
                            const cardStyle = [styles.resultCard, isAiSync && styles.resultCardMapped];

                            return (
                                <View key={item.team_id} style={cardStyle}>
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

                                    <View style={[styles.teamSelectorBox, isAiSync && styles.teamSelectorBoxMapped]}>
                                        <Text style={styles.teamNameText} numberOfLines={1}>{item.team_name}</Text>
                                        <TouchableOpacity 
                                            style={styles.dropdownToggle}
                                            onPress={() => toggleResultExpansion(item.team_id)}
                                        >
                                            {expandedResults[item.team_id] ? (
                                                <ChevronUp size={20} color={isAiSync ? '#10b981' : Theme.colors.textPrimary} />
                                            ) : (
                                                <ChevronDown size={20} color={isAiSync ? '#10b981' : Theme.colors.textPrimary} />
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {expandedResults[item.team_id] && (
                                        <View style={[styles.expandedMembersContainer, isAiSync && { backgroundColor: '#fff', borderColor: '#d1fae5' }]}>
                                            <View style={styles.membersHeaderRow}>
                                                <Text style={styles.membersHeaderLabel}>INDIVIDUAL KILLS</Text>
                                            </View>
                                            {item.members && item.members.length > 0 ? (
                                                <View style={styles.membersList}>
                                                    {item.members.map((member, mIdx) => (
                                                        <View key={mIdx} style={[styles.playerListItem, member.isExtracted && styles.aiNameContainer, isAiSync && { borderColor: '#d1fae5' }]}>
                                                            <View style={styles.playerListItemLeft}>
                                                                <View style={styles.playerAvatarPlaceholderSmall}>
                                                                    <Text style={styles.avatarLetterSmall}>{mIdx + 1}</Text>
                                                                </View>
                                                                <Text style={styles.memberNameText} numberOfLines={1}>{member.name}</Text>
                                                            </View>
                                                            <View style={[styles.playerListItemRight, isAiSync && { borderColor: '#10b981' }]}>
                                                                <Skull size={12} color={isAiSync ? '#10b981' : Theme.colors.accent} style={{ marginRight: 6 }} />
                                                                <TextInput
                                                                    style={[styles.memberKillInput, isAiSync && { color: '#059669' }]}
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
                                                <View>
                                                    <Text style={styles.noPlayersText}>No team members found</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <View style={styles.killsInputContainer}>
                                        <Text style={styles.killsLabel}>Total Team Kills</Text>
                                        <View style={[styles.killsInputBox, isAiSync && styles.killsInputBoxMapped]}>
                                            <TextInput
                                                style={[styles.killsInput, isAiSync && { color: '#059669' }]}
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
                                        <View style={[styles.statBox, isAiSync ? { backgroundColor: '#10b981', borderColor: '#10b981' } : styles.totalStatBox]}>
                                            <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>TOTAL{'\n'}POINTS</Text>
                                            <Text style={[styles.statValue, { color: '#fff' }]}>{item.total_points || 0}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}

                        <View style={{ height: 80 }} />
                    </View>
                ) : null}
            </ScrollView>

            {/* ── Sticky Submit footer (manual mode, has results) ── */}
            {mode === 'manual' && results.length > 0 && (
                <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: Theme.colors.background, borderTopWidth: 1, borderTopColor: Theme.colors.accent + '22' }}>
                    <TouchableOpacity
                        style={[styles.submitFinalBtn, submitting && styles.disabledBtn, { marginBottom: 0 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitFinalBtnText}>Submit Results</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}


            <ProcessingOverlay visible={processingLobby || extracting} />

            {/* ── Full-screen reference zoom modal ── */}
            <Modal
                visible={zoomModalVisible}
                transparent={false}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setZoomModalVisible(false)}
            >
                {/* GestureHandlerRootView required inside Modal for Android gesture context */}
                <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
                    <TouchableOpacity
                        onPress={() => setZoomModalVisible(false)}
                        style={{ position: 'absolute', top: 52, right: 16, zIndex: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffffff25', borderWidth: 1, borderColor: '#ffffff30', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={18} color="#fff" />
                    </TouchableOpacity>

                    <PinchGestureHandler
                        ref={mPinchRef}
                        simultaneousHandlers={mPanRef}
                        onGestureEvent={onModalPinch}
                        onHandlerStateChange={onModalPinchEnd}
                    >
                        <Animated.View style={{ flex: 1 }}>
                            <PanGestureHandler
                                ref={mPanRef}
                                simultaneousHandlers={mPinchRef}
                                onGestureEvent={onModalPan}
                                onHandlerStateChange={onModalPanEnd}
                                minPointers={1}
                                maxPointers={2}
                            >
                                <Animated.View
                                    style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transform: [
                                            { translateX: mTransX },
                                            { translateY: mTransY },
                                            { scale: mScale },
                                        ],
                                    }}
                                >
                                    {referenceImage && (
                                        <Image
                                            source={{ uri: referenceImage.uri }}
                                            style={{
                                                width: SCREEN_W,
                                                aspectRatio: (referenceImage.width && referenceImage.height)
                                                    ? referenceImage.width / referenceImage.height
                                                    : 16 / 9,
                                            }}
                                            resizeMode="contain"
                                        />
                                    )}
                                </Animated.View>
                            </PanGestureHandler>
                        </Animated.View>
                    </PinchGestureHandler>
                </GestureHandlerRootView>
            </Modal>

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
                                    <Text style={styles.aiSummaryName}>#{selectedAiTeam?.rank}</Text>
                                    <Text style={styles.aiSummaryDetail}>{selectedAiTeam?.kills} kills</Text>
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
                                        ([rank, registeredId]) => registeredId === team.id && parseInt(rank, 10) !== parseInt(selectedAiTeam?.rank, 10)
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
