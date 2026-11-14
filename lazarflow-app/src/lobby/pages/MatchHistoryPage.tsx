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

interface EditMember { name: string; kills: string }
interface EditEntry {
    team_id: string | null;
    team_name: string;
    position: string;
    members: EditMember[];
    /** Team-level kills for entries stored without member rows */
    teamKills: string;
}

export const MatchHistoryPage = ({ route, navigation }: any) => {
    const { lobbyId, lobbyName } = route.params || {};

    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [entries, setEntries] = useState<EditEntry[] | null>(null);
    const [detail, setDetail] = useState<any>(null);
    const [proofByTeam, setProofByTeam] = useState<Record<string, string[]>>({});
    const [saving, setSaving] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [teamPickerIdx, setTeamPickerIdx] = useState<number | null>(null);

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
            return;
        }
        setExpanded(matchNumber);
        setEntries(null);
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
                members: (e.members || []).map((m: any) => ({
                    name: m.name || '', kills: String(m.kills ?? 0),
                })),
                teamKills: String(e.kills ?? 0),
            })));
        } catch (error) {
            Alert.alert('Error', extractApiErrorMessage(error, 'Could not load the match'));
            setExpanded(null);
        }
    };

    const patchEntry = (index: number, patch: Partial<EditEntry>) => {
        setEntries(prev => {
            if (!prev) return prev;
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
    };

    const patchMember = (entryIndex: number, memberIndex: number, kills: string) => {
        setEntries(prev => {
            if (!prev) return prev;
            const next = [...prev];
            const members = [...next[entryIndex].members];
            members[memberIndex] = { ...members[memberIndex], kills };
            next[entryIndex] = { ...next[entryIndex], members };
            return next;
        });
    };

    /** Same point math as the results entry flow. */
    const buildPayload = (editEntries: EditEntry[]) => ({
        results: editEntries.map(e => {
            const position = parseInt(e.position, 10) || 0;
            const memberKills = e.members.length > 0
                ? e.members.reduce((sum, m) => sum + (parseInt(m.kills, 10) || 0), 0)
                : (parseInt(e.teamKills, 10) || 0);
            const pointsEntry = lobby?.points_system?.find((p: any) => p.placement === position);
            const placementPoints = pointsEntry ? pointsEntry.points : 0;
            const killPoints = memberKills * (lobby?.kill_points || 0);
            return {
                team_id: e.team_id,
                team_name: e.team_name,
                position,
                kills: memberKills,
                placement_points: placementPoints,
                kill_points: killPoints,
                total_points: placementPoints + killPoints,
                members: e.members.map(m => ({ name: m.name, kills: parseInt(m.kills, 10) || 0 })),
            };
        }),
    });

    const handleSave = async (matchNumber: number) => {
        if (!entries) return;
        if (entries.some(e => !e.position || parseInt(e.position, 10) < 1)) {
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

    const entryPointsPreview = (e: EditEntry) => {
        const position = parseInt(e.position, 10) || 0;
        const pointsEntry = lobby?.points_system?.find((p: any) => p.placement === position);
        const memberKills = e.members.length > 0
            ? e.members.reduce((sum, m) => sum + (parseInt(m.kills, 10) || 0), 0)
            : (parseInt(e.teamKills, 10) || 0);
        const total = (pointsEntry ? pointsEntry.points : 0) + memberKills * (lobby?.kill_points || 0);
        return total;
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
                                        {entries.map((e, idx) => (
                                            <View key={idx} style={styles.teamEditor}>
                                                <TouchableOpacity
                                                    style={styles.teamEditorRow}
                                                    onPress={() => setTeamPickerIdx(idx)}
                                                >
                                                    <View style={{ flex: 1, marginRight: 8 }}>
                                                        <Text style={styles.teamEditorName} numberOfLines={1}>{e.team_name}</Text>
                                                        {!e.team_id && <Text style={styles.unlinkedTag}>NOT LINKED — tap to assign</Text>}
                                                    </View>
                                                    <Text style={styles.totalPreview}>{entryPointsPreview(e)} pts</Text>
                                                </TouchableOpacity>
                                                {/* Proof layer 2: this team's verification crops (AI path) */}
                                                {(proofByTeam[e.team_id]?.length ?? 0) > 0 && (
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.proofBlock}>
                                                        {proofByTeam[e.team_id].map((u: string, i: number) => (
                                                            <Image key={i} source={{ uri: u }} style={styles.proofCrop} />
                                                        ))}
                                                    </ScrollView>
                                                )}
                                                <View style={styles.fieldRow}>
                                                    <Text style={styles.fieldLabel}>Position</Text>
                                                    <TextInput
                                                        style={styles.fieldInput}
                                                        value={e.position}
                                                        onChangeText={v => patchEntry(idx, { position: v })}
                                                        keyboardType="number-pad"
                                                        placeholder="1"
                                                        placeholderTextColor={Theme.colors.textSecondary}
                                                    />
                                                </View>
                                                {e.members.length > 0 ? (
                                                    <View style={styles.memberGrid}>
                                                        {e.members.map((mem, mIdx) => (
                                                            <View key={mIdx} style={styles.memberField}>
                                                                <Text style={styles.memberName} numberOfLines={1}>{mem.name}</Text>
                                                                <TextInput
                                                                    style={styles.memberInput}
                                                                    value={mem.kills}
                                                                    onChangeText={v => patchMember(idx, mIdx, v)}
                                                                    keyboardType="number-pad"
                                                                    placeholder="0"
                                                                    placeholderTextColor={Theme.colors.textSecondary}
                                                                />
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : (
                                                    <View style={styles.fieldRow}>
                                                        <Text style={styles.fieldLabel}>Team kills</Text>
                                                        <TextInput
                                                            style={styles.fieldInput}
                                                            value={e.teamKills}
                                                            onChangeText={v => patchEntry(idx, { teamKills: v })}
                                                            keyboardType="number-pad"
                                                            placeholder="0"
                                                            placeholderTextColor={Theme.colors.textSecondary}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                        <TouchableOpacity
                                            style={[styles.saveBtn, saving && styles.btnDisabled]}
                                            onPress={() => handleSave(expanded)}
                                            disabled={saving}
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
    teamEditor: { marginBottom: 14, backgroundColor: Theme.colors.secondary, borderRadius: 10, padding: 10 },
    teamEditorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    teamEditorName: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    unlinkedTag: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.danger, marginTop: 2, letterSpacing: 0.4 },
    totalPreview: { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    fieldLabel: { width: 70, fontSize: 12, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textSecondary },
    fieldInput: { flex: 1, backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 8, color: Theme.colors.textPrimary, fontSize: 14 },
    memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    memberField: { width: '47%', backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 8 },
    memberName: { fontSize: 11, color: Theme.colors.textSecondary, marginBottom: 2 },
    memberInput: { backgroundColor: Theme.colors.secondary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 6, padding: 6, color: Theme.colors.textPrimary, fontSize: 14 },
    proofBlock: { marginBottom: 10 },
    proofLabel: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary, marginBottom: 6 },
    proofShot: { width: 220, height: 110, borderRadius: 8, marginRight: 8, backgroundColor: Theme.colors.secondary },
    proofCrop: { width: 120, height: 60, borderRadius: 6, marginRight: 8, backgroundColor: Theme.colors.secondary },
    saveBtn: { backgroundColor: Theme.colors.accent, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    btnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.bold },
});
