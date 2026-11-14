/**
 * MatchHistoryPage.tsx — lobby match list with per-match score editing.
 *
 * The expanded editor mirrors the AI mapping-review cards (same shared
 * styles): rank + status badge, team selector, verification-image slider
 * and per-player kill rows. Editing is inline; Save PUTs the whole match —
 * the server reverses the old score deltas and applies the new ones, so
 * lobby totals stay exact. Entries without a linked team are marked
 * UNIDENTIFIED and never aggregate into registered teams; any entry can be
 * (re)assigned to a team later via the team selector.
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, StatusBar, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, ChevronDown, ChevronUp, Trophy, Check, AlertCircle, X, Skull,
} from 'lucide-react-native';

import { Theme } from '../../styles/theme';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { extractApiErrorMessage } from '../../lib/apiClient';
import { VerificationImageSlider } from '../../results/components/VerificationImageSlider';
import { styles as cs } from '../../results/styles/calculateResults.styles';
import { MatchResult } from '../../results/types';

export const MatchHistoryPage = ({ route, navigation }: any) => {
    const { lobbyId, lobbyName } = route.params || {};

    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [entries, setEntries] = useState<any[] | null>(null);
    const [detail, setDetail] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [assignIdx, setAssignIdx] = useState<number | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [lobby, setLobby] = useState<any>(null);

    const loadMatches = useCallback(async () => {
        try {
            setLoading(true);
            const { fetchLobbyMatches, getLobby, getLobbyTeams } = require('../../lib/dataService');
            const [list, lobbyData, teamsData] = await Promise.all([
                fetchLobbyMatches(lobbyId), getLobby(lobbyId), getLobbyTeams(lobbyId),
            ]);
            setMatches(list);
            setLobby(lobbyData);
            setTeams(teamsData || []);
        } catch (error) {
            Alert.alert('Error', extractApiErrorMessage(error, 'Could not load match history'));
        } finally {
            setLoading(false);
        }
    }, [lobbyId]);

    React.useEffect(() => {
        if (lobbyId) loadMatches();
    }, [lobbyId, loadMatches]);

    const closeEditor = () => {
        setExpanded(null);
        setEntries(null);
        setDetail(null);
        setAssignIdx(null);
    };

    /** Open a match for editing: fetch the full row and hydrate the editor. */
    const openEditor = async (matchNumber: number) => {
        if (expanded === matchNumber) {
            closeEditor();
            return;
        }
        setExpanded(matchNumber);
        setEntries(null);
        setAssignIdx(null);
        try {
            const fetched = await require('../../lib/dataService').fetchLobbyMatchDetail(lobbyId, matchNumber);
            setDetail(fetched);
            setEntries((fetched.results || []).map((e: any) => ({
                team_id: e.team_id || null,
                team_name: e.team_name || 'Unknown',
                position: String(e.position ?? ''),
                kills: e.kills || 0,
                placement_points: e.placement_points || 0,
                kill_points: e.kill_points || 0,
                total_points: e.total_points || 0,
                members: (e.members || []).map((m: any) => ({ name: m.name || '', kills: m.kills || 0 })),
                verification_urls: e.verification_urls,
                cell_request_id: e.cell_request_id,
            })));
        } catch (error) {
            Alert.alert('Error', extractApiErrorMessage(error, 'Could not load the match'));
            closeEditor();
        }
    };

    const patchEntry = (index: number, patch: any) => {
        setEntries(prev => {
            if (!prev) return prev;
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const patchMemberName = (entryIndex: number, memberIndex: number, name: string) => {
        setEntries(prev => {
            if (!prev) return prev;
            const next = [...prev];
            const members = [...(next[entryIndex].members || [])];
            members[memberIndex] = { ...members[memberIndex], name };
            next[entryIndex] = { ...next[entryIndex], members };
            return next;
        });
    };

    const patchMemberKill = (entryIndex: number, memberIndex: number, kills: string) => {
        setEntries(prev => {
            if (!prev) return prev;
            const next = [...prev];
            const members = [...(next[entryIndex].members || [])];
            members[memberIndex] = { ...members[memberIndex], kills };
            next[entryIndex] = { ...next[entryIndex], members };
            return next;
        });
    };

    const removeEntry = (index: number) => {
        setEntries(prev => (prev || []).filter((_, i) => i !== index));
    };

    /** Entries are complete MatchResults maintained by the inline editor. */
    const buildPayload = (list: any[]) => ({
        results: list.map(e => ({
            team_id: e.team_id,
            team_name: e.team_name,
            position: parseInt(String(e.position), 10) || 0,
            kills: parseInt(String(e.kills), 10) || 0,
            placement_points: parseInt(String(e.placement_points), 10) || 0,
            kill_points: parseInt(String(e.kill_points), 10) || 0,
            total_points: parseInt(String(e.total_points), 10) || 0,
            members: (e.members || []).map((m: any) => ({
                name: m.name, kills: parseInt(String(m.kills), 10) || 0,
            })),
        })),
    });

    const handleSave = async (matchNumber: number) => {
        if (!entries) return;
        if (entries.length === 0) {
            Alert.alert('Error', 'A match needs at least one team — delete the match instead.');
            return;
        }
        if (entries.some(e => !e.position || parseInt(String(e.position), 10) < 1)) {
            Alert.alert('Error', 'Every team needs a position (1 or higher)');
            return;
        }
        setSaving(true);
        try {
            await require('../../lib/dataService').updateLobbyMatch(lobbyId, matchNumber, buildPayload(entries));
            Alert.alert('Success', `Match ${matchNumber} updated — lobby totals recalculated.`);
            closeEditor();
            loadMatches();
        } catch (error) {
            Alert.alert('Error', extractApiErrorMessage(error, 'Could not update the match'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Match History</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{lobbyName}</Text>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Theme.colors.accent} />
            ) : matches.length === 0 ? (
                <View style={styles.emptyState}>
                    <Trophy size={44} color={Theme.colors.border} />
                    <Text style={styles.emptyText}>No matches recorded yet</Text>
                    <Text style={styles.emptySub}>Score a match from the results screen and it will appear here.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {matches.map(m => (
                        <View key={m.id} style={styles.matchCard}>
                            <TouchableOpacity
                                style={styles.matchHeader}
                                onPress={() => openEditor(m.match_number)}
                            >
                                <View style={styles.matchTitleRow}>
                                    <Text style={styles.matchTitle}>
                                        Match {m.match_number}{m.label ? ` · ${m.label}` : ''}
                                    </Text>
                                    {expanded === m.match_number
                                        ? <ChevronUp size={18} color={Theme.colors.textSecondary} />
                                        : <ChevronDown size={18} color={Theme.colors.textSecondary} />}
                                </View>
                                <Text style={styles.matchMeta}>
                                    {m.source} · {m.team_count} teams{m.screenshot_count ? ` · ${m.screenshot_count} proof shots` : ''}
                                </Text>
                            </TouchableOpacity>

                            {expanded === m.match_number && (
                                entries === null ? (
                                    <ActivityIndicator style={{ marginVertical: 16 }} color={Theme.colors.accent} />
                                ) : (
                                    <View style={styles.editor}>
                                        {/* Proof layer 1: the match screenshots */}
                                        {(detail?.screenshots?.length ?? 0) > 0 && (
                                            <View style={styles.proofBlock}>
                                                <Text style={styles.proofLabel}>MATCH SCREENSHOTS</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                    {detail.screenshots.map((u: string, i: number) => (
                                                        <TouchableOpacity key={i} onPress={() => setViewerUrl(u)}>
                                                            <Image source={{ uri: u }} style={styles.proofShot} />
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}

                                        {entries.map((e, idx) => {
                                            const linked = !!e.team_id;
                                            return (
                                                <View key={idx} style={[cs.resultCard, linked ? cs.resultCardMapped : cs.resultCardUnmapped]}>
                                                    {/* Rank + status badge + remove */}
                                                    <View style={cs.rankHeader}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={cs.rankPrefix}>#</Text>
                                                            <TextInput
                                                                style={cs.rankInput}
                                                                keyboardType="numeric"
                                                                value={String(e.position ?? '')}
                                                                onChangeText={(v) => patchEntry(idx, { position: v })}
                                                                placeholder="1"
                                                                placeholderTextColor={Theme.colors.accent + '80'}
                                                            />
                                                        </View>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                            {linked ? (
                                                                <View style={[cs.matchedBadge, { position: 'relative' }]}>
                                                                    <Check size={10} color="#fff" />
                                                                    <Text style={cs.matchedBadgeText}>LINKED</Text>
                                                                </View>
                                                            ) : (
                                                                <View style={[cs.unmatchedBadge, { position: 'relative' }]}>
                                                                    <AlertCircle size={10} color="#fff" />
                                                                    <Text style={cs.matchedBadgeText}>UNIDENTIFIED</Text>
                                                                </View>
                                                            )}
                                                            <TouchableOpacity
                                                                onPress={() => removeEntry(idx)}
                                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                            >
                                                                <X size={16} color={Theme.colors.danger} />
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>

                                                    {/* Team selector — tap to link/unlink */}
                                                    <TouchableOpacity
                                                        style={[cs.teamSelectorBox, linked && cs.teamSelectorBoxMapped]}
                                                        onPress={() => setAssignIdx(idx)}
                                                    >
                                                        <Text
                                                            style={[cs.teamNameText, !linked && { color: Theme.colors.textSecondary }]}
                                                            numberOfLines={1}
                                                        >
                                                            {e.team_name}
                                                        </Text>
                                                        <ChevronDown size={20} color={linked ? Theme.colors.accent : Theme.colors.textPrimary} />
                                                    </TouchableOpacity>

                                                    {/* Proof layer 2: verification crops */}
                                                    <VerificationImageSlider
                                                        urls={e.verification_urls}
                                                        onViewVerification={(u: string) => setViewerUrl(u)}
                                                    />

                                                    {e.members.length > 0 ? (
                                                        <View style={[cs.expandedMembersContainer, linked && { backgroundColor: '#fff', borderColor: '#d1fae5' }]}>
                                                            <View style={cs.membersHeaderRow}>
                                                                <Text style={cs.membersHeaderLabel}>PLAYER KILLS</Text>
                                                            </View>
                                                            <View style={cs.membersList}>
                                                                {e.members.map((mem: any, mIdx: number) => (
                                                                    <View key={mIdx} style={cs.playerListItem}>
                                                                        <View style={cs.playerListItemLeft}>
                                                                            <View style={cs.playerAvatarPlaceholderSmall}>
                                                                                <Text style={cs.avatarLetterSmall}>{mIdx + 1}</Text>
                                                                            </View>
                                                                            <TextInput
                                                                                style={cs.memberNameText}
                                                                                value={String(mem.name ?? '')}
                                                                                onChangeText={(v) => patchMemberName(idx, mIdx, v)}
                                                                                placeholderTextColor={Theme.colors.textSecondary}
                                                                            />
                                                                        </View>
                                                                        <View style={cs.playerListItemRight}>
                                                                            <Skull size={12} color={Theme.colors.accent} style={{ marginRight: 6 }} />
                                                                            <TextInput
                                                                                style={cs.memberKillInput}
                                                                                keyboardType="numeric"
                                                                                value={String(mem.kills ?? 0)}
                                                                                onChangeText={(v) => patchMemberKill(idx, mIdx, v)}
                                                                                placeholder="0"
                                                                                placeholderTextColor={Theme.colors.textSecondary}
                                                                            />
                                                                        </View>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View style={cs.killsInputContainer}>
                                                            <Text style={cs.killsLabel}>TOTAL TEAM KILLS</Text>
                                                            <View style={cs.killsInputBox}>
                                                                <TextInput
                                                                    style={cs.killsInput}
                                                                    keyboardType="numeric"
                                                                    value={String(e.kills ?? 0)}
                                                                    onChangeText={(v) => patchEntry(idx, { kills: v })}
                                                                    placeholder="0"
                                                                    placeholderTextColor={Theme.colors.textSecondary}
                                                                />
                                                            </View>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}

                                        <TouchableOpacity
                                            style={styles.addEntryBtn}
                                            onPress={() => {
                                                const used = new Set(entries.map(e => e.team_id).filter(Boolean));
                                                const free = teams.find(t => !used.has(t.id));
                                                if (!free) {
                                                    Alert.alert('Info', 'All registered teams are already in this match.');
                                                    return;
                                                }
                                                setEntries(prev => {
                                                    const list = [...(prev || [])];
                                                    list.push({
                                                        team_id: free.id,
                                                        team_name: free.team_name,
                                                        position: String(list.length + 1),
                                                        kills: 0,
                                                        placement_points: 0,
                                                        kill_points: 0,
                                                        total_points: 0,
                                                        members: (free.members || []).map((m: any) => ({
                                                            name: typeof m === 'string' ? m : m.name, kills: 0,
                                                        })),
                                                        verification_urls: [],
                                                    });
                                                    return list;
                                                });
                                            }}
                                        >
                                            <Text style={styles.addEntryText}>+ Add Team</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.saveBtn, saving && styles.btnDisabled]}
                                            onPress={() => handleSave(expanded)}
                                            disabled={saving || (entries?.length ?? 0) === 0}
                                        >
                                            {saving
                                                ? <ActivityIndicator color="#fff" />
                                                : <Text style={styles.saveBtnText}>Save & Recalculate Totals</Text>}
                                        </TouchableOpacity>
                                    </View>
                                )
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Team assignment picker — link / unlink / re-link any entry */}
            <Modal visible={assignIdx !== null} animationType="slide" transparent onRequestClose={() => setAssignIdx(null)}>
                <View style={styles.pickerBackdrop}>
                    <View style={styles.pickerSheet}>
                        <Text style={styles.pickerTitle}>Assign Team</Text>
                        <TouchableOpacity
                            style={styles.pickerOption}
                            onPress={() => {
                                if (assignIdx !== null) {
                                    patchEntry(assignIdx, { team_id: null, team_name: `Unidentified (Rank ${entries?.[assignIdx]?.position ?? ''})`.trim() });
                                }
                                setAssignIdx(null);
                            }}
                        >
                            <Text style={styles.pickerOptionText}>No team (unidentified)</Text>
                        </TouchableOpacity>
                        {teams.map(t => (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.pickerOption, assignIdx !== null && entries?.[assignIdx]?.team_id === t.id && styles.pickerOptionActive]}
                                onPress={() => {
                                    if (assignIdx !== null) patchEntry(assignIdx, { team_id: t.id, team_name: t.team_name });
                                    setAssignIdx(null);
                                }}
                            >
                                <Text style={[styles.pickerOptionText, assignIdx !== null && entries?.[assignIdx]?.team_id === t.id && styles.pickerOptionTextActive]}>
                                    {t.team_name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.pickerCancel} onPress={() => setAssignIdx(null)}>
                            <Text style={styles.pickerCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Full-screen proof viewer */}
            <Modal visible={!!viewerUrl} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
                <View style={styles.viewerBackdrop}>
                    <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerUrl(null)}>
                        <X size={22} color="#fff" />
                    </TouchableOpacity>
                    {viewerUrl && (
                        <Image source={{ uri: viewerUrl }} style={styles.viewerImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.secondary },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Theme.colors.primary, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
    backButton: { padding: 4 },
    headerInfo: { flex: 1, marginLeft: 16 },
    headerTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    headerSubtitle: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
    content: { padding: 16, paddingBottom: 40 },
    emptyState: { alignItems: 'center', marginTop: 80, gap: 10 },
    emptyText: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    emptySub: { fontSize: 13, color: Theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
    matchCard: { backgroundColor: Theme.colors.primary, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 10, overflow: 'hidden' },
    matchHeader: { padding: 14 },
    matchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    matchTitle: { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    matchMeta: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 3, textTransform: 'capitalize' },
    editor: { borderTopWidth: 1, borderTopColor: Theme.colors.border, padding: 14 },
    proofBlock: { marginBottom: 12 },
    proofLabel: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary, marginBottom: 6, letterSpacing: 0.5 },
    proofShot: { width: 220, height: 110, borderRadius: 8, marginRight: 8, backgroundColor: Theme.colors.secondary },
    addEntryBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.accent, marginBottom: 12 },
    addEntryText: { color: Theme.colors.accent, fontFamily: Theme.fonts.outfit.bold, fontSize: 14 },
    saveBtn: { backgroundColor: Theme.colors.accent, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    btnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.bold },
    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: Theme.colors.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, maxHeight: '70%' },
    pickerTitle: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 12 },
    pickerOption: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, marginBottom: 6 },
    pickerOptionActive: { backgroundColor: 'rgba(26, 115, 232, 0.1)' },
    pickerOptionText: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary },
    pickerOptionTextActive: { color: Theme.colors.accent },
    pickerCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    pickerCancelText: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary },
    viewerBackdrop: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    viewerClose: { position: 'absolute', top: 50, right: 24, padding: 8, zIndex: 2 },
    viewerImage: { width: '100%', height: '80%' },
});
