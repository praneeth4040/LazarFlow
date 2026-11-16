import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Layout, Palette, ArrowLeft, Info, Play, AlertCircle, CheckCircle2, Pencil, ChevronDown } from 'lucide-react-native';

import { Theme } from '../../styles/theme';
import { useSubscription } from '../../hooks/useSubscription';
import { DesignThemeCard } from '../../dashboard/components/ThemeCards';
import { ResultsBottomSheet } from '../components/ResultsBottomSheet';
import { AdjustmentPreviewSheet } from '../components/AdjustmentPreviewSheet';
import { ScheduleFormSheet } from '../components/ScheduleFormSheet';
import { useLiveLobby } from '../hooks/useLiveLobby';
import { RENDER_TYPES, getRenderType, RenderTypeId } from '../../shared/domain/renderTypes';

export const LiveLobbyPage = ({ route, navigation }: any) => {
    const { canCustomSocial } = useSubscription();
    const { id } = route?.params || {};

    const {
        teams, playerStats, loading, lobby,
        showEditModal, setShowEditModal,
        isGenerating, generatedResult, showResultSheet, setShowResultSheet,
        designTab, setDesignTab, renderType, setRenderType, selectedThemeId, setSelectedThemeId,
        filteredThemes, renderStatus,
        showAdjustmentSheet, setShowAdjustmentSheet,
        renderedImageUri,
        matches, selectedMatchNumber, selectMatch, loadMatches,
        fetchLobbyData, loadThemes, openAdjustmentSheet,
    } = useLiveLobby(id, canCustomSocial);

    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [scheduleValues, setScheduleValues] = useState<Record<string, string> | null>(null);
    const [showMatchPicker, setShowMatchPicker] = useState(false);

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({ headerShown: false });
            if (id) {
                fetchLobbyData();
                loadThemes();
                loadMatches();
            }
        }, [id])
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
                <Text style={{ color: '#fff', marginTop: 10 }}>Loading...</Text>
            </View>
        );
    }

    const currentType = getRenderType(renderType);

    /** Per-type data readiness shown before the theme grid. */
    const getReadiness = (rtId: RenderTypeId): { ok: boolean; text: string } => {
        switch (rtId) {
            case 'points_table':
                return teams.length > 0
                    ? { ok: true, text: `${teams.length} teams · points calculated` }
                    : { ok: false, text: 'No teams in this lobby yet' };
            case 'mvp':
                return playerStats.length > 0
                    ? { ok: true, text: `${playerStats.length} players ranked by kills` }
                    : { ok: false, text: 'No player stats yet — run AI extraction first' };
            case 'slotlist':
                return teams.length > 0
                    ? { ok: true, text: `${teams.length} slots filled` }
                    : { ok: false, text: 'No teams in this lobby yet' };
            case 'schedule':
                return { ok: true, text: 'Enter title, ID pass time & start time, then render' };
        }
    };

    const readiness = getReadiness(renderType);
    // A selected match replaces the lobby-aggregate data source, so the
    // aggregate-based readiness checks don't apply (the backend validates
    // the match itself — 404 with a clear message if it can't render).
    const matchScoped = selectedMatchNumber !== null && (renderType === 'points_table' || renderType === 'mvp');
    // Why rendering is blocked right now — surfaced on tap instead of a
    // silent disabled button (a grayed button that does nothing reads as broken).
    const getRenderBlocker = (): string | null => {
        if (!selectedThemeId) return 'Select a design from the grid above first.';
        if (renderType === 'mvp' && !matchScoped && playerStats.length === 0)
            return 'No player stats yet — submit or extract match data first.';
        if ((renderType === 'points_table' || renderType === 'slotlist') && !matchScoped && teams.length === 0)
            return 'No teams in this lobby yet — add teams first.';
        return null;
    };
    const renderBlocker = getRenderBlocker();
    const renderDisabled = renderBlocker !== null;

    const handleRenderPress = () => {
        if (renderType === 'schedule') {
            setShowScheduleForm(true);
        } else if (renderBlocker) {
            Alert.alert('Nothing to render yet', renderBlocker);
        } else {
            openAdjustmentSheet();
        }
    };
    // Split-button scope section: only where per-match rendering applies
    const showScope = (renderType === 'points_table' || renderType === 'mvp') && matches.length > 0;

    const handleScheduleSave = (values: Record<string, string>) => {
        setShowScheduleForm(false);
        setScheduleValues(values);
        openAdjustmentSheet(values);
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Design Render</Text>
                <TouchableOpacity style={styles.infoButton} onPress={() => setShowEditModal(true)}>
                    <Info size={24} color="#0f172a" />
                </TouchableOpacity>
            </View>

            {/* Render-type segments — registry-driven */}
            <View style={styles.segmentedControlContainer}>
                <View style={styles.segmentedControl}>
                    {RENDER_TYPES.map(rt => {
                        const Icon = rt.icon;
                        const active = renderType === rt.id;
                        return (
                            <TouchableOpacity
                                key={rt.id}
                                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                                onPress={() => { setRenderType(rt.id); selectMatch(null); }}
                            >
                                <Icon size={14} color={active ? Theme.colors.accent : '#94a3b8'} />
                                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{rt.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Readiness banner */}
            <View style={[styles.readinessBanner, { backgroundColor: readiness.ok ? '#f0fdf4' : '#fffbeb' }]}>
                {readiness.ok
                    ? <CheckCircle2 size={15} color="#16a34a" />
                    : <AlertCircle size={15} color="#d97706" />}
                <Text style={[styles.readinessText, { color: readiness.ok ? '#15803d' : '#b45309' }]}>
                    {readiness.text}
                </Text>
            </View>

            {/* Schedule lobby-details card (schedule segment only) */}
            {renderType === 'schedule' && (
                <TouchableOpacity style={styles.scheduleCard} onPress={() => setShowScheduleForm(true)}>
                    <View style={styles.scheduleCardLeft}>
                    <Text style={styles.scheduleCardTitle}>Lobby Details</Text>
                        <Text style={styles.scheduleCardText} numberOfLines={1}>
                            {scheduleValues
                                ? `ID/PASS ${scheduleValues.idp_time || '—'} · START ${scheduleValues.start_time || '—'}`
                                : 'Tap to enter title, ID pass time & start time'}
                        </Text>
                    </View>
                    <View style={styles.scheduleCardEdit}>
                        <Pencil size={14} color={Theme.colors.accent} />
                        <Text style={styles.scheduleCardEditText}>{scheduleValues ? 'Edit' : 'Enter'}</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Theme source tabs + grid */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, designTab === 'community' && styles.tabBtnActive]}
                    onPress={() => setDesignTab('community')}
                >
                    <Text style={[styles.tabBtnText, designTab === 'community' && styles.tabBtnTextActive]}>Community</Text>
                    {designTab === 'community' && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, designTab === 'user' && styles.tabBtnActive]}
                    onPress={() => setDesignTab('user')}
                >
                    <Text style={[styles.tabBtnText, designTab === 'user' && styles.tabBtnTextActive]}>Your Themes</Text>
                    {designTab === 'user' && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredThemes}
                renderItem={({ item, index }) => (
                    <View style={styles.gridItemWrapper}>
                        <DesignThemeCard
                            theme={item}
                            index={index}
                            variant="grid"
                            isSelected={item.id === selectedThemeId}
                            onPress={() => setSelectedThemeId(item.id)}
                        />
                    </View>
                )}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={styles.flatListContent}
                ListEmptyComponent={
                    designTab === 'user' ? (
                        <View style={styles.personalEmptyContainer}>
                            <View style={styles.personalEmptyIconWrapper}>
                                <Layout size={32} color={Theme.colors.accent} />
                            </View>
                            <Text style={styles.personalEmptyTitle}>No Personal Designs Found</Text>
                            <Text style={styles.personalEmptySub}>Create unique {currentType?.label} designs in the Design section.</Text>
                            <TouchableOpacity
                                style={styles.goDesignBtn}
                                onPress={() => navigation.navigate('Dashboard', { tab: 'design' })}
                            >
                                <Text style={styles.goDesignBtnText}>Go to Design Section</Text>
                                <Play size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.emptyDesigns}>
                            <Palette size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyDesignsText}>No {currentType?.label} designs found in this category</Text>
                        </View>
                    )
                }
                showsVerticalScrollIndicator={false}
            />

            <View style={styles.footer}>
                <View style={styles.renderRow}>
                    <TouchableOpacity
                        style={[styles.renderBtnNew, showScope && styles.renderBtnSplit, (isGenerating || renderDisabled) && styles.disabledBtn]}
                        onPress={handleRenderPress}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <ActivityIndicator color="#fff" />
                                <Text style={styles.renderBtnTextNew}>{renderStatus}</Text>
                            </View>
                        ) : (
                            <Text style={styles.renderBtnTextNew}>Render {currentType?.label}</Text>
                        )}
                    </TouchableOpacity>
                    {showScope && (
                        <TouchableOpacity
                            style={[styles.scopeBtn, isGenerating && styles.disabledBtn]}
                            onPress={() => setShowMatchPicker(true)}
                            disabled={isGenerating}
                        >
                            <Text style={styles.scopeBtnText}>
                                {selectedMatchNumber ? `M${selectedMatchNumber}` : 'All'}
                            </Text>
                            <ChevronDown size={14} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[styles.cancelBtnNew, isGenerating && styles.disabledBtn]}
                    onPress={() => navigation.goBack()}
                    disabled={isGenerating}
                >
                    <Text style={styles.cancelBtnTextNew}>Cancel</Text>
                </TouchableOpacity>
            </View>

            <ResultsBottomSheet
                visible={showResultSheet}
                onClose={() => setShowResultSheet(false)}
                imageUri={generatedResult}
            />

            <AdjustmentPreviewSheet
                visible={showAdjustmentSheet}
                renderedImageUri={renderedImageUri}
                onClose={() => setShowAdjustmentSheet(false)}
            />

            <ScheduleFormSheet
                visible={showScheduleForm}
                onClose={() => setShowScheduleForm(false)}
                onSave={handleScheduleSave}
                lobbyId={id}
            />

            {/* Match scope picker — Overall or one recorded match */}
            <Modal visible={showMatchPicker} animationType="slide" transparent onRequestClose={() => setShowMatchPicker(false)}>
                <View style={styles.pickerBackdrop}>
                    <View style={styles.pickerSheet}>
                        <Text style={styles.pickerTitle}>Render Scope</Text>
                        <TouchableOpacity
                            style={[styles.pickerOption, selectedMatchNumber === null && styles.pickerOptionActive]}
                            onPress={() => { selectMatch(null); setShowMatchPicker(false); }}
                        >
                            <Text style={[styles.pickerOptionText, selectedMatchNumber === null && styles.pickerOptionTextActive]}>
                                Overall — all matches combined
                            </Text>
                        </TouchableOpacity>
                        {matches.map(m => (
                            <TouchableOpacity
                                key={m.id}
                                style={[styles.pickerOption, selectedMatchNumber === m.match_number && styles.pickerOptionActive]}
                                onPress={() => { selectMatch(m.match_number); setShowMatchPicker(false); }}
                            >
                                <Text style={[styles.pickerOptionText, selectedMatchNumber === m.match_number && styles.pickerOptionTextActive]}>
                                    Match {m.match_number}{m.label ? ` · ${m.label}` : ''}
                                </Text>
                                <Text style={styles.pickerOptionMeta}>{m.source} · {m.team_count} teams</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowMatchPicker(false)}>
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showEditModal} animationType="slide" transparent={false} onRequestClose={() => setShowEditModal(false)}>
               <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                  <Text style={{textAlign: 'center', margin: 20, fontSize: 18}}>Edit Modal Removed for space concerns. Will abstract.</Text>
                  <TouchableOpacity onPress={() => setShowEditModal(false)}><Text style={{textAlign: 'center', color: 'blue'}}>Close</Text></TouchableOpacity>
               </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

// Styles
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: Theme.colors.primary },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Theme.colors.primary, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' },
    infoButton: { padding: 4 },
    segmentedControlContainer: { paddingHorizontal: 20, paddingVertical: 10 },
    segmentedControl: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 25, padding: 4 },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 21, flexDirection: 'row', justifyContent: 'center', gap: 5 },
    segmentBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    segmentText: { fontSize: 12, fontFamily: Theme.fonts.outfit.semibold, color: '#94a3b8' },
    segmentTextActive: { color: Theme.colors.accent },
    readinessBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    readinessText: { fontSize: 12, fontFamily: Theme.fonts.outfit.semibold, flex: 1 },
    scheduleCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 20, marginTop: 8, marginBottom: 4,
        padding: 12, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
    },
    scheduleCardLeft: { flex: 1, marginRight: 10 },
    scheduleCardTitle: { fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: '#1e3a8a', marginBottom: 3 },
    scheduleCardText: { fontSize: 12, fontFamily: Theme.fonts.outfit.medium, color: '#3b82f6' },
    scheduleCardEdit: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
    scheduleCardEditText: { fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, maxHeight: '70%' },
    pickerTitle: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a', marginBottom: 12 },
    pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, marginBottom: 6 },
    pickerOptionActive: { backgroundColor: '#eff6ff' },
    pickerOptionText: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: '#334155', flex: 1 },
    pickerOptionTextActive: { color: Theme.colors.accent },
    pickerOptionMeta: { fontSize: 11, fontFamily: Theme.fonts.outfit.medium, color: '#94a3b8' },
    pickerCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    pickerCancelText: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: '#94a3b8' },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tabBtn: { paddingVertical: 12, marginRight: 24, position: 'relative' },
    tabBtnActive: {},
    tabBtnText: { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: '#94a3b8' },
    tabBtnTextActive: { color: '#0f172a' },
    tabIndicator: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: Theme.colors.accent },
    flatListContent: { padding: 12 },
    gridItemWrapper: { flex: 1, padding: 8 },
    footer: { padding: 20, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    renderRow: { flexDirection: 'row' },
    renderBtnNew: { flex: 1, backgroundColor: Theme.colors.accent, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    renderBtnSplit: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
    scopeBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingHorizontal: 18, height: 52, backgroundColor: Theme.colors.accentHover,
        borderTopRightRadius: 14, borderBottomRightRadius: 14, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.3)',
    },
    scopeBtnText: { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.bold },
    renderBtnTextNew: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    cancelBtnNew: { backgroundColor: '#f1f5f9', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cancelBtnTextNew: { color: '#0f172a', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    personalEmptyContainer: { alignItems: 'center', paddingVertical: 60 },
    personalEmptyIconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    personalEmptyTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#1e293b' },
    personalEmptySub: { fontSize: 14, fontFamily: Theme.fonts.outfit.regular, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    goDesignBtn: { marginTop: 20, backgroundColor: Theme.colors.accent, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8 },
    goDesignBtnText: { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.bold },
    emptyDesigns: { alignItems: 'center', paddingVertical: 60 },
    emptyDesignsText: { marginTop: 12, color: '#94a3b8', fontFamily: Theme.fonts.outfit.medium, textAlign: 'center', paddingHorizontal: 30 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    disabledBtn: { opacity: 0.6 }
});
