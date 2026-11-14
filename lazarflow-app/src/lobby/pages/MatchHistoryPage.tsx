/**
 * MatchHistoryPage.tsx — lobby match list with per-match score editing.
 *
 * Lists every stored match (number, label, source, team count). Expanding a
 * match loads its full row and lets the user edit each team's position and
 * per-player kills; placement/kill points are recomputed from the lobby's
 * points system on save (same math as the results entry flow). Saving PUTs
 * the whole edited match — the server reverses the old score deltas and
 * applies the new ones, so lobby totals stay exact.
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp, Trophy } from 'lucide-react-native';

import { Theme } from '../../styles/theme';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { extractApiErrorMessage } from '../../lib/apiClient';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { ManualResultCard } from '../../results/components/ManualResultCard';
import { TeamEntrySheet } from '../../results/components/TeamEntrySheet';
import { MatchResult } from '../../results/types';

interface EditMember { name: string; kills: string }

export const MatchHistoryPage = ({ route, navigation }: any) => {
    const { lobbyId, lobbyName } = route.params || {};

    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [entries, setEntries] = useState<MatchResult[] | null>(null);
    const [detail, setDetail] = useState<any>(null);
    const [proofByTeam, setProofByTeam] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [sheet, setSheet] = useState<{ mode: 'edit' | 'add'; idx: number; team: any } | null>(null);

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

    /** Open a match for editing: fetch the full row and hydrate the editor. */
    const openEditor = async (matchNumber: number) => {
        if (expanded === matchNumber) {
            setExpanded(null);
            setEntries(null);
            setDetail(null);
            setProofByTeam({});
            setSheet(null);
            return;
        }
        setExpanded(matchNumber);
        setEntries(null);
        setSheet(null);
        try {
            const fetched = await require('../../lib/dataService').fetchLobbyMatchDetail(lobbyId, matchNumber);
            setDetail(fetched);
            const proofs: Record<string, string[]> = {};
            for (const e of fetched.results || []) {
                if (e.team_id && e.verification_urls?.length) proofs[e.team_id] = e.verification_urls;
            }
            setProofByTeam(proofs);
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
            setExpanded(null);
        }
    };

    const handleSheetSubmit = (result: MatchResult) => {
        if (!sheet) return;
        setEntries(prev => {
            const list = [...(prev || [])];
            if (sheet.mode === 'edit') {
                const old = list[sheet.idx];
                // preserve the stored proof references — the sheet doesn't carry them
                list[sheet.idx] = {
                    ...result,
                    verification_urls: old?.verification_urls,
                    cell_request_id: old?.cell_request_id,
                };
            } else {
                list.push(result);
            }
            return list;
        });
        setSheet(null);
    };

    /** Entries are complete MatchResults maintained by TeamEntrySheet. */
    const buildPayload = (list: MatchResult[]) => ({
        results: list.map(e => ({
            team_id: e.team_id,
            team_name: e.team_name,
            position: parseInt(String(e.position), 10) || 0,
            kills: e.kills || 0,
            placement_points: e.placement_points || 0,
            kill_points: e.kill_points || 0,
            total_points: e.total_points || 0,
            members: (e.members || []).map(m => ({ name: m.name, kills: m.kills || 0 })),
        })),
    });

    const handleSave = async (matchNumber: number) => {
        if (!entries) return;
        if (entries.some(e => !e.position || parseInt(String(e.position), 10) < 1)) {
            Alert.alert('Error', 'Every team needs a position (1 or higher)');
            return;
        }
        setSaving(true);
        try {
            await require('../../lib/dataService').updateLobbyMatch(lobbyId, matchNumber, buildPayload(entries));
            Alert.alert('Success', `Match ${matchNumber} updated — lobby totals recalculated.`);
            setExpanded(null);
            setEntries(null);
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
                                                        <Image key={i} source={{ uri: u }} style={styles.proofShot} />
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                        {entries.map((e, idx) => {
                                            const crop = e.team_id ? proofByTeam[e.team_id]?.[0] : undefined;
                                            return (
                                            <View key={idx} style={styles.entryRow}>
                                                <ManualResultCard
                                                    item={e}
                                                    index={idx}
                                                    onEdit={() => setSheet({
                                                        mode: 'edit', idx,
                                                        team: { id: e.team_id, team_name: e.team_name, members: e.members },
                                                    })}
                                                    onRemove={() => setEntries(prev => (prev || []).filter((_, i) => i !== idx))}
                                                />
                                                {crop && <Image source={{ uri: crop }} style={styles.entryCrop} />}
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
                                                setSheet({ mode: 'add', idx: -1, team: free });
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
            {sheet && (
                <TeamEntrySheet
                    visible={!!sheet}
                    team={sheet.team}
                    lobby={lobby ?? { id: lobbyId, name: lobbyName, points_system: [], kill_points: 0 }}
                    nextPosition={(entries?.length ?? 0) + 1}
                    initialData={sheet.mode === 'edit' ? entries?.[sheet.idx] ?? null : null}
                    onClose={() => setSheet(null)}
                    onSubmit={handleSheetSubmit}
                />
            )}
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
    entryRow: { marginBottom: 2 },
    entryCrop: { width: 96, height: 48, borderRadius: 6, marginLeft: 42, marginBottom: 6 },
    addEntryBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Theme.colors.accent, marginBottom: 12 },
    addEntryText: { color: Theme.colors.accent, fontFamily: Theme.fonts.outfit.bold, fontSize: 14 },
    matchCard: { backgroundColor: Theme.colors.primary, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 10, overflow: 'hidden' },
    matchHeader: { padding: 14 },
    matchTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    matchTitle: { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    matchMeta: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 3, textTransform: 'capitalize' },
    editor: { borderTopWidth: 1, borderTopColor: Theme.colors.border, padding: 14 },
    teamEditor: { marginBottom: 12, backgroundColor: Theme.colors.secondary, borderRadius: 12, padding: 12 },
    teHeader: { flexDirection: 'row', alignItems: 'center' },
    teThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: Theme.colors.primary },
    teThumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.border },
    teName: { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    teChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 3 },
    teChipLinked: { backgroundColor: 'rgba(52, 168, 83, 0.12)' },
    teChipLinkedText: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.success },
    teChipUnlinked: { backgroundColor: 'rgba(251, 188, 4, 0.15)' },
    teChipUnlinkedText: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: '#B45309' },
    tePts: { fontSize: 17, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    tePtsUnit: { fontSize: 11, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textSecondary },
    teBody: { flexDirection: 'row', gap: 10, marginTop: 12 },
    teFieldCol: { flex: 1 },
    teFieldLabel: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary, marginBottom: 5, letterSpacing: 0.5 },
    teInput: { backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 10, color: Theme.colors.textPrimary, fontSize: 15, fontFamily: Theme.fonts.outfit.semibold },
    fieldLabel: { width: 70, fontSize: 12, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textSecondary },
    memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    memberField: { width: '47%', backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 8 },
    memberName: { fontSize: 11, color: Theme.colors.textSecondary, marginBottom: 2 },
    memberInput: { backgroundColor: Theme.colors.secondary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 6, padding: 6, color: Theme.colors.textPrimary, fontSize: 14 },
    proofBlock: { marginBottom: 10 },
    proofLabel: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary, marginBottom: 6 },
    proofShot: { width: 220, height: 110, borderRadius: 8, marginRight: 8, backgroundColor: Theme.colors.secondary },
    saveBtn: { backgroundColor: Theme.colors.accent, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    btnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.bold },
});
