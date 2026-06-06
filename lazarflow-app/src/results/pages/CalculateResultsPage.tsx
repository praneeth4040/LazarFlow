import { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Animated, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';
import { useOcrJobs } from '../../context/OcrJobContext';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';

import { useLobbyMapping } from '../hooks/useLobbyMapping';
import { useAIExtractionAsync } from '../hooks/useAIExtractionAsync';
import { useResultsManagement } from '../hooks/useResultsManagement';
import { styles } from '../styles/calculateResults.styles';

// Import child components
import { ManualSection } from '../components/ManualSection';
import { ManualResultCard } from '../components/ManualResultCard';
import { AIWorkflowSection } from '../components/AIWorkflowSection';
import { SlotMappingSection } from '../components/SlotMappingSection';
import { AIMappingReview } from '../components/AIMappingReview';
import { ResultCard } from '../components/ResultCard';
import { ImageZoomModal } from '../components/ImageZoomModal';
import { TeamMappingModal } from '../components/TeamMappingModal';
import { TeamEntrySheet } from '../components/TeamEntrySheet';

const safeGet = (obj: any, key: string | number) => {
    if (!obj) return undefined;
    const k = String(key);
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') return undefined;
    return obj[k];
};

const safeSet = (obj: any, key: string | number, value: any) => {
    if (!obj) return;
    const k = String(key);
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
    obj[k] = value;
};

export const CalculateResultsPage = ({ route, navigation }: any) => {
    const { t } = useTranslation();
    const { user, refreshUser } = useContext(UserContext);
    const { clearJob, activeJobForLobby } = useOcrJobs();
    const [lobby, setLobby] = useState(route.params?.lobby || {});
    const [mode, setMode] = useState<'manual' | 'ai'>(route.params?.initialMode ?? 'manual');
    const [teams, setTeams] = useState<any[]>([]);
    const [teamSearch, setTeamSearch] = useState('');
    const [mappingModalVisible, setMappingModalVisible] = useState(false);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
    const [selectedAiTeam, setSelectedAiTeam] = useState<any>(null);
    const [referenceImage, setReferenceImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
    const [zoomModalVisible, setZoomModalVisible] = useState(false);
    const [editingResult, setEditingResult] = useState<any | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editSheetVisible, setEditSheetVisible] = useState(false);

    // Modal zoom+pan — RN Animated
    const mPinchRef = useRef<any>(null);
    const mPanRef = useRef<any>(null);
    const mScale = useRef(new Animated.Value(1)).current;
    const mTransX = useRef(new Animated.Value(0)).current;
    const mTransY = useRef(new Animated.Value(0)).current;
    const mSavedScale = useRef(1);
    const mCurrScale = useRef(1);
    const mSavedTransX = useRef(0);
    const mCurrTransX = useRef(0);
    const mSavedTransY = useRef(0);
    const mCurrTransY = useRef(0);

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
        lobbyPhase,
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
        phase: aiPhase,
        jobStatus: aiJobStatus,
        aiResults,
        showMapping,
        mappings,
        resultImages,
        setShowMapping,
        setMappings,
        handlePickResultImages,
        handleRemoveResultImage,
        handleAIUpload,
    } = useAIExtractionAsync(lobby, teams, user, refreshUser, navigation);

    // Wrapper to clear job after successful manual submission
    const handleManualSubmit = async () => {
        const existingAiJob = activeJobForLobby(lobby?.id);
        await handleSubmit();
        if (lobby?.id && existingAiJob) {
            clearJob(lobby.id, 'extract_results');
        }
    };

    // Convenience boolean — true while the async job is in flight
    const extracting = aiPhase === 'uploading' || aiPhase === 'queued';

    const [editableAiData, setEditableAiData] = useState<Record<number, {
        players: { name: string; kills: number }[];
        totalKills: number;
    }>>({});

    const {
        results,
        submitting,
        expandedResults,
        toggleResultExpansion,
        handleAddResult,
        handleUpdateResult,
        handleUpdateMemberKills,
        handleReplaceResult,
        handleRemoveResult,
        handleSubmit,
        handleSubmitWithResults,
    } = useResultsManagement(lobby, teams, navigation);

    useEffect(() => {
        if (lobby?.id) {
            fetchLobbyData();
        }
    }, [lobby?.id]);

    // Auto-switch to AI tab when slot mapping (process lobby) or AI mapping results become ready
    useEffect(() => {
        if (showSlotMapping || showMapping) {
            setMode('ai');
        }
    }, [showSlotMapping, showMapping]);

    // Initialise editable kill data each time AI extraction returns new results
    useEffect(() => {
        if (aiResults.length > 0) {
            const initial: Record<number, { players: { name: string; kills: number }[]; totalKills: number }> = {};
            aiResults.forEach((res: any, idx: number) => {
                safeSet(initial, idx, {
                    players: (res.players || []).map((p: any) => ({ name: p.name, kills: p.kills || 0 })),
                    totalKills: res.kills || 0,
                });
            });
            setEditableAiData(initial);
        }
    }, [aiResults]);

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

    const handleRemoveReferenceImage = () => {
        setReferenceImage(null);
    };

    // Modal gesture handlers
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
        mSavedScale.current = 1;
        mCurrScale.current = 1;
        mScale.setValue(1);
        mSavedTransX.current = 0;
        mCurrTransX.current = 0;
        mTransX.setValue(0);
        mSavedTransY.current = 0;
        mCurrTransY.current = 0;
        mTransY.setValue(0);
        setZoomModalVisible(true);
    };

    const handleViewVerification = (url: string) => {
        setVerificationUrl(url);
        // Reset zoom state for the new image
        mSavedScale.current = 1;
        mCurrScale.current = 1;
        mScale.setValue(1);
        mSavedTransX.current = 0;
        mCurrTransX.current = 0;
        mTransX.setValue(0);
        mSavedTransY.current = 0;
        mCurrTransY.current = 0;
        mTransY.setValue(0);
        setZoomModalVisible(true);
    };

    // Import GestureState for pinch handler
    const { State: GestureState } = require('react-native-gesture-handler');

    const filteredSearchTeams = teamSearch.trim()
        ? teams.filter(t => t.team_name.toLowerCase().includes(teamSearch.trim().toLowerCase()) && !results.some(r => r.team_id === t.id))
        : [];

    // Handler for team selection in mapping modal
    const handleMappingTeamSelect = (teamId: string) => {
        if (selectedSlotIndex !== null) {
            handleUpdateSlotMapping(selectedSlotIndex, teamId);
        } else if (selectedAiTeam && selectedAiTeam.rank) {
            setMappings((prev: Record<string, string>) => {
                const next = { ...prev };
                safeSet(next, selectedAiTeam.rank, teamId);
                return next;
            });
        }
        setMappingModalVisible(false);
    };

    // Handler for clearing mapping
    const handleClearMapping = () => {
        if (selectedSlotIndex !== null) {
            handleUpdateSlotMapping(selectedSlotIndex, null);
        } else if (selectedAiTeam) {
            const rankKey = String(selectedAiTeam.rank);
            if (rankKey !== '__proto__' && rankKey !== 'constructor' && rankKey !== 'prototype') {
                const newMappings = { ...mappings };
                delete newMappings[rankKey];
                setMappings(newMappings);
            }
        }
        setMappingModalVisible(false);
    };

    // Handlers for AI mapping review
    const handleSelectTeamForAI = (result: any) => {
        setSelectedAiTeam(result);
        setMappingModalVisible(true);
    };

    const handleUpdateEditableData = (index: number, data: { players: { name: string; kills: number }[]; totalKills: number }) => {
        setEditableAiData((prev) => {
            const next = { ...prev };
            safeSet(next, index, data);
            return next;
        });
    };

    // Handler for combined submit (AI mapping review)
    const handleCombinedSubmit = async () => {
        const unmapped = aiResults.filter((res: any) => !safeGet(mappings, res.rank));
        if (unmapped.length > 0) {
            Alert.alert(
                'Incomplete Mapping',
                `${unmapped.length} result(s) still need a team assigned. Please map every rank before submitting.`
            );
            return;
        }

        const builtResults = aiResults.map((res: any, idx: number) => {
            const teamId = safeGet(mappings, res.rank);
            const team = teams.find((t: any) => t.id === teamId);
            if (!team) return null;

            const editable = safeGet(editableAiData, idx);
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
                verification_urls: res.verification_urls,
                cell_request_id: res.cell_request_id,
            };
        }).filter(Boolean) as any[];

        await handleSubmitWithResults(builtResults);

        if (lobby?.id) {
            clearJob(lobby.id, 'extract_results');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('results.lexiViewAi')}</Text>
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
                        <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>{t('results.manual')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, mode === 'ai' && styles.toggleBtnActive]}
                        onPress={() => setMode('ai')}
                    >
                        <Text style={[styles.toggleText, mode === 'ai' && styles.toggleTextActive]}>{t('results.lexiViewAi')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.content, styles.contentContainer]} showsVerticalScrollIndicator={false}>
                {mode === 'manual' ? (
                    <ManualSection
                        lobby={lobby}
                        results={results}
                        referenceImage={referenceImage}
                        teamSearch={teamSearch}
                        filteredSearchTeams={filteredSearchTeams}
                        onPickReferenceImage={handlePickReferenceImage}
                        onRemoveReferenceImage={handleRemoveReferenceImage}
                        onTeamSearchChange={setTeamSearch}
                        onAddTeam={handleAddResult}
                    />
                ) : showSlotMapping ? (
                    <SlotMappingSection
                        processedSlots={processedSlots}
                        teams={teams}
                        submittingMappings={submittingMappings}
                        onSelectSlot={(index) => {
                            setSelectedSlotIndex(index);
                            setMappingModalVisible(true);
                        }}
                        onSaveMappings={() => {
                            handleSaveSlotMappings();
                            if (lobby?.id) {
                                clearJob(lobby.id, 'process_lobby');
                            }
                        }}
                        onCancel={() => setShowSlotMapping(false)}
                        onDismiss={() => {
                            setShowSlotMapping(false);
                            if (lobby?.id) {
                                clearJob(lobby.id, 'process_lobby');
                            }
                        }}
                    />
                ) : showMapping ? (
                        <AIMappingReview
                            aiResults={aiResults}
                            mappings={mappings}
                            editableAiData={editableAiData}
                            teams={teams}
                            lobby={lobby}
                            submitting={submitting}
                            onSelectTeam={handleSelectTeamForAI}
                            onUpdateEditableData={handleUpdateEditableData}
                            onViewVerification={handleViewVerification}
                            onSubmit={handleCombinedSubmit}
                            onDismiss={() => {
                                setShowMapping(false);
                                if (lobby?.id) {
                                    clearJob(lobby.id, 'extract_results');
                                }
                            }}
                        />
                ) : (
                    <AIWorkflowSection
                        teams={teams}
                        lobbyImages={lobbyImages}
                        resultImages={resultImages}
                        processingLobby={processingLobby}
                        extracting={extracting}
                        aiPhase={aiPhase}
                        aiJobStatus={aiJobStatus}
                        lobbyPhase={lobbyPhase}
                        onPickLobbyImages={handlePickLobbyImages}
                        onRemoveLobbyImage={handleRemoveLobbyImage}
                        onProcessLobby={handleProcessLobby}
                        onPickResultImages={handlePickResultImages}
                        onRemoveResultImage={handleRemoveResultImage}
                        onAIUpload={handleAIUpload}
                    />
                )}

                {(mode === 'manual' || (!showMapping && !showSlotMapping)) && (
                    <View style={{ marginBottom: 16 }}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>{t('results.matchEntriesCount', { count: results.length })}</Text>
                        </View>
                        {mode === 'manual' && results.length > 0 && (
                            <View style={s.tableHeader}>
                                <Text style={[s.headerCol, s.colRank]}>{t('results.rank')}</Text>
                                <Text style={[s.headerCol, s.colName]}>{t('results.team')}</Text>
                                <Text style={[s.headerCol, s.colPts]}>{t('results.pos')}</Text>
                                <Text style={[s.headerCol, s.colKills]}>{t('results.kills')}</Text>
                                <Text style={[s.headerCol, s.colTotal]}>{t('results.total')}</Text>
                                <View style={s.colActions} />
                            </View>
                        )}
                    </View>
                )}
                {results.length === 0 && (mode === 'manual' || (!showMapping && !showSlotMapping)) ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>{t('results.addTeamsToStart')}</Text>
                    </View>
                ) : (results.length > 0 && (mode === 'manual' || (!showMapping && !showSlotMapping))) ? (
                    <View style={[styles.resultsList, mode === 'manual' && { gap: 0, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' }]}>
                        {results.map((item, index) => (
                            mode === 'manual' ? (
                                <ManualResultCard
                                    key={item.team_id}
                                    item={item}
                                    index={index}
                                    onEdit={() => {
                                        setEditingResult(item);
                                        setEditingIndex(index);
                                        setEditSheetVisible(true);
                                    }}
                                    onRemove={() => handleRemoveResult(index)}
                                />
                            ) : (
                                <ResultCard
                                    key={item.team_id}
                                    item={item}
                                    index={index}
                                    isExpanded={safeGet(expandedResults, item.team_id) || false}
                                    onToggleExpand={() => toggleResultExpansion(item.team_id)}
                                    onUpdateResult={(field, value) => handleUpdateResult(index, field, value)}
                                    onUpdateMemberKills={(memberIndex, value) => handleUpdateMemberKills(index, memberIndex, value)}
                                    onViewVerification={handleViewVerification}
                                    onRemove={() => handleRemoveResult(index)}
                                />
                            )
                        ))}
                        <View style={{ height: 80 }} />
                    </View>
                ) : null}
            </ScrollView>

            {/* ── Sticky Submit footer (manual mode, has results) ── */}
            {mode === 'manual' && results.length > 0 && (
                <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, backgroundColor: Theme.colors.background, borderTopWidth: 1, borderTopColor: Theme.colors.accent + '22' }}>
                    <TouchableOpacity
                        style={[styles.submitFinalBtn, submitting && styles.disabledBtn, { marginBottom: 0 }]}
                        onPress={handleManualSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitFinalBtnText}>{t('results.submitResults')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Full-screen reference zoom modal ── */}
            <Modal
                visible={zoomModalVisible}
                transparent={false}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setZoomModalVisible(false)}
            >
                <ImageZoomModal
                    visible={zoomModalVisible}
                    imageUri={verificationUrl || (referenceImage ? referenceImage.uri : (resultImages.length > 0 ? resultImages[0].uri : null))}
                    imageWidth={verificationUrl ? 800 : (referenceImage ? referenceImage.width : 1080)}
                    imageHeight={verificationUrl ? 200 : (referenceImage ? referenceImage.height : 1920)}
                    onClose={() => {
                        setZoomModalVisible(false);
                        setVerificationUrl(null);
                    }}
                    mPinchRef={mPinchRef}
                    mPanRef={mPanRef}
                    mScale={mScale}
                    mTransX={mTransX}
                    mTransY={mTransY}
                    onPinchGestureEvent={onModalPinch}
                    onPinchHandlerStateChange={onModalPinchEnd}
                    onPanGestureEvent={onModalPan}
                    onPanHandlerStateChange={onModalPanEnd}
                />
            </Modal>

            {/* ── Team mapping modal ── */}
            <Modal
                transparent={true}
                visible={mappingModalVisible}
                animationType="slide"
                onRequestClose={() => setMappingModalVisible(false)}
            >
                <TeamMappingModal
                    visible={mappingModalVisible}
                    teams={teams}
                    selectedSlotIndex={selectedSlotIndex}
                    selectedAiTeam={selectedAiTeam}
                    processedSlots={processedSlots}
                    mappings={mappings}
                    onSelectTeam={handleMappingTeamSelect}
                    onClearMapping={handleClearMapping}
                    onClose={() => setMappingModalVisible(false)}
                    handleUpdateSlotMapping={handleUpdateSlotMapping}
                    setMappings={setMappings}
                />
            </Modal>

            {/* ── Team entry sheet for editing manual results ── */}
            {mode === 'manual' && (
                <TeamEntrySheet
                    visible={editSheetVisible}
                    team={editingResult ? teams.find(t => t.id === editingResult.team_id) : null}
                    lobby={lobby}
                    nextPosition={results.length + 1}
                    initialData={editingResult}
                    onClose={() => {
                        setEditSheetVisible(false);
                        setEditingResult(null);
                        setEditingIndex(null);
                    }}
                    onSubmit={(result) => {
                        if (editingIndex !== null) {
                            handleReplaceResult(editingIndex, result);
                        }
                    }}
                />
            )}
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerCol: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#64748B',
        textTransform: 'uppercase',
    },
    colRank: { width: 35, textAlign: 'center' },
    colName: { flex: 1, paddingLeft: 8 },
    colPts: { width: 45, textAlign: 'center' },
    colKills: { width: 45, textAlign: 'center' },
    colTotal: { width: 50, textAlign: 'center' },
    // Spacer matching the remove-button column in ManualResultCard (marginLeft:4 + width:24)
    colActions: { marginLeft: 4, width: 24 },
});