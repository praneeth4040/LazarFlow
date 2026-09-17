import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, StatusBar, Alert, Linking, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, Swords, Users, Flame, Download, Share2, ExternalLink, Copy, Check, Zap, Gamepad2 } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { UserContext } from '../../context/UserContext';
import { CustomAlert as AlertService } from '../../lib/AlertService';
import { formatAlphanumericDate } from '../../lib/dateUtils';
import { getLobbyIconConfig } from '../../dashboard/components/LobbyCard';

export const LobbySharePage = ({ route, navigation }: any) => {
    const { lobbyId } = route?.params || {};
    const { user } = useContext(UserContext);

    const [loading, setLoading] = useState(true);
    const [lobby, setLobby] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [playerStats, setPlayerStats] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [importing, setImporting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [newLobbyName, setNewLobbyName] = useState('');
    const [importResults, setImportResults] = useState(true);
    const [activeTab, setActiveTab] = useState<'standings' | 'mvps'>('standings');

    const loadLobbyData = useCallback(async () => {
        if (!lobbyId) {
            setError('No lobby ID provided');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const { getLobbyShareData } = require('../../lib/dataService');
            const data = await getLobbyShareData(lobbyId);

            if (!data?.lobby) {
                setError('Lobby not found or link is invalid');
                setLoading(false);
                return;
            }

            setLobby(data.lobby);
            setNewLobbyName(`${data.lobby.name || 'Shared Lobby'}`);

            const sortedTeams = (data.teams || []).map((team: any) => {
                const points = (team.total_points && typeof team.total_points === 'object')
                    ? team.total_points
                    : { kill_points: 0, placement_points: 0 };
                return {
                    ...team,
                    total: (points.kill_points || 0) + (points.placement_points || 0),
                    kill_points: points.kill_points || 0,
                    placement_points: points.placement_points || 0,
                };
            }).sort((a: any, b: any) => b.total - a.total);

            setTeams(sortedTeams);
            setPlayerStats(data.player_stats || []);
        } catch (e: any) {
            console.error('Failed to load shared lobby:', e);
            setError(e.message || 'Failed to load lobby data');
        } finally {
            setLoading(false);
        }
    }, [lobbyId]);

    useEffect(() => {
        loadLobbyData();
    }, [loadLobbyData]);

    const handleShare = async () => {
        const { getLobbyShareLink } = require('../../lib/dataService');
        const url = getLobbyShareLink(lobbyId);
        try {
            await Share.share({
                title: `${lobby?.name || 'Lobby'} - LazarFlow Tournament`,
                message: `Check out this tournament on LazarFlow:\n${lobby?.name || ''}\n${url}`,
                url,
            });
        } catch (e: any) {
            console.warn('Share error:', e);
        }
    };

    const handleCopyLink = async () => {
        const { getLobbyShareLink } = require('../../lib/dataService');
        const url = getLobbyShareLink(lobbyId);
        try {
            await Share.share({ message: url });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.warn('Copy link error:', e);
        }
    };

    const handleOpenLazarTrack = async () => {
        const { getLazarTrackImportLink } = require('../../lib/dataService');
        const lazarTrackUrl = getLazarTrackImportLink(lobbyId, {
            lobbyName: lobby?.name,
            game: lobby?.game,
            teamsCount: teams?.length || 0,
        });
        const fallbackUrl = (lobby as any)?.share_url || require('../../lib/dataService').getLobbyShareLink(lobbyId);
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.lazartrack.app';
        const appStoreUrl = 'https://apps.apple.com/app/idLazarTrack'; // update with real ID when available

        try {
            const canOpen = await Linking.canOpenURL(lazarTrackUrl);
            if (canOpen) {
                // App is installed -> open directly
                await Linking.openURL(lazarTrackUrl);
                return;
            }

            // Not installed -> prompt install with clear redirect to stores
            Alert.alert(
                'LazarTrack Not Installed',
                'Install LazarTrack (free) to view standings, track match results, and follow this tournament live.',
                [
                    { text: 'Close', style: 'cancel' },
                    {
                        text: 'Show Preview',
                        onPress: () => {
                            // keep user on page — they're looking at preview already
                        },
                    },
                    {
                        text: 'Install Android',
                        onPress: () => Linking.openURL(playStoreUrl).catch(() => {}),
                    },
                    {
                        text: 'Install iOS',
                        onPress: () => Linking.openURL(appStoreUrl).catch(() => {}),
                    },
                ] as any,
            );
        } catch (e: any) {
            console.warn('LazarTrack link error:', e);
            Alert.alert(
                'Error opening LazarTrack',
                'You can install LazarTrack from your app store and reopen this link.',
                [
                    { text: 'OK', onPress: () => Linking.openURL(fallbackUrl).catch(() => {}) },
                ] as any,
            );
        }
    };

    const handleImportToMyAccount = async () => {
        if (!user) {
            Alert.alert(
                'Login Required',
                'You need to be logged in to import lobbies to your account.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Go to Login',
                        onPress: () => navigation.navigate('Login'),
                    },
                ] as any,
            );
            return;
        }

        if (!newLobbyName.trim()) {
            AlertService.alert('Required', 'Please enter a lobby name');
            return;
        }

        try {
            setImporting(true);
            const { importSharedLobby } = require('../../lib/dataService');
            const result = await importSharedLobby(lobbyId, {
                asNewName: newLobbyName.trim(),
                importResults,
            });

            setImportModalVisible(false);
            AlertService.alert(
                'Success',
                `Lobby imported successfully as "${newLobbyName.trim()}"! You can find it in your Lobbies tab.`,
                [
                    {
                        text: 'View Lobbies',
                        onPress: () => navigation.navigate('Dashboard', { tab: 'lobbies' }),
                    },
                    { text: 'Stay Here' },
                ] as any,
            );
        } catch (e: any) {
            console.error('Import error:', e);
            const detail = e?.response?.data?.detail || e.message || 'Failed to import lobby';
            AlertService.alert('Import Failed', detail);
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Theme.colors.accent} />
                    <Text style={styles.loadingText}>Loading lobby data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !lobby) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')} style={styles.backButton}>
                        <ArrowLeft size={24} color="#0f172a" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Shared Lobby</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Trophy size={56} color="#cbd5e1" />
                    <Text style={styles.errorTitle}>Unable to Load Lobby</Text>
                    <Text style={styles.errorText}>{error || 'This lobby may have been deleted or the link is invalid.'}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => loadLobbyData()}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.goHomeBtn}
                        onPress={() => navigation.navigate('Dashboard')}
                    >
                        <Text style={styles.goHomeBtnText}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const { Icon: LobbyIcon, color: iconColor, bg: iconBg } = getLobbyIconConfig(lobby.game || '', 0);
    const status = (lobby.status || 'setup').toLowerCase();
    const isCompleted = ['completed', 'ended', 'finished'].includes(status);
    const statusBg = isCompleted ? '#64748b15' : status === 'setup' ? '#3b82f615' : '#10b98115';
    const statusColor = isCompleted ? '#64748b' : status === 'setup' ? '#3b82f6' : '#10b981';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard')}
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Shared Lobby</Text>
                <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
                    <Share2 size={20} color="#0f172a" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentInner}>
                <View style={styles.lobbyHeaderCard}>
                    <View style={[styles.lobbyIconContainer, { backgroundColor: iconBg }]}>
                        <LobbyIcon size={28} color={iconColor} />
                    </View>
                    <View style={styles.lobbyMeta}>
                        <Text style={styles.lobbyName} numberOfLines={2}>{lobby.name}</Text>
                        <View style={styles.lobbySubRow}>
                            <Text style={styles.lobbyGame}>{lobby.game || 'General'}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>{status.toUpperCase()}</Text>
                            </View>
                        </View>
                        {lobby.created_at && (
                            <Text style={styles.lobbyDate}>Created {formatAlphanumericDate(lobby.created_at)}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Users size={20} color="#3b82f6" />
                        <Text style={styles.statValue}>{teams.length}</Text>
                        <Text style={styles.statLabel}>Teams</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Trophy size={20} color="#f59e0b" />
                        <Text style={styles.statValue}>{lobby.total_matches || '—'}</Text>
                        <Text style={styles.statLabel}>Matches</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Zap size={20} color="#ef4444" />
                        <Text style={styles.statValue}>{lobby.kill_points ?? 0}</Text>
                        <Text style={styles.statLabel}>Kill Pts</Text>
                    </View>
                </View>

                <View style={styles.segmentedControlContainer}>
                    <View style={styles.segmentedControl}>
                        <TouchableOpacity
                            style={[styles.segmentBtn, activeTab === 'standings' && styles.segmentBtnActive]}
                            onPress={() => setActiveTab('standings')}
                        >
                            <Trophy size={16} color={activeTab === 'standings' ? Theme.colors.accent : '#94a3b8'} style={{ marginRight: 6 }} />
                            <Text style={[styles.segmentText, activeTab === 'standings' && styles.segmentTextActive]}>Standings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segmentBtn, activeTab === 'mvps' && styles.segmentBtnActive]}
                            onPress={() => setActiveTab('mvps')}
                        >
                            <Flame size={16} color={activeTab === 'mvps' ? Theme.colors.accent : '#94a3b8'} style={{ marginRight: 6 }} />
                            <Text style={[styles.segmentText, activeTab === 'mvps' && styles.segmentTextActive]}>Top Players</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'standings' && (
                    <View style={styles.standingsSection}>
                        {teams.length === 0 ? (
                            <View style={styles.emptySection}>
                                <Swords size={40} color="#cbd5e1" />
                                <Text style={styles.emptyText}>No teams registered yet</Text>
                            </View>
                        ) : (
                            teams.map((team, idx) => (
                                <View key={team.id || idx} style={styles.teamRow}>
                                    <View style={[styles.rankBox, idx === 0 && styles.rankGold, idx === 1 && styles.rankSilver, idx === 2 && styles.rankBronze]}>
                                        <Text style={[styles.rankText, idx < 3 && styles.rankTextMedal]}>#{idx + 1}</Text>
                                    </View>
                                    <View style={styles.teamInfo}>
                                        <Text style={styles.teamName} numberOfLines={1}>{team.team_name || `Team ${idx + 1}`}</Text>
                                        <Text style={styles.teamMembers} numberOfLines={1}>
                                            {(team.members || []).map((m: any) => m.name).filter(Boolean).join(', ') || 'No members'}
                                        </Text>
                                    </View>
                                    <View style={styles.teamStats}>
                                        <View style={styles.pointsBox}>
                                            <Text style={styles.pointsValue}>{team.total || 0}</Text>
                                            <Text style={styles.pointsLabel}>PTS</Text>
                                        </View>
                                        <View style={styles.killsBox}>
                                            <Text style={styles.killsValue}>{team.total_kills ?? team.kill_points ?? 0}</Text>
                                            <Text style={styles.killsLabel}>K</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {activeTab === 'mvps' && (
                    <View style={styles.standingsSection}>
                        {playerStats.length === 0 ? (
                            <View style={styles.emptySection}>
                                <Flame size={40} color="#cbd5e1" />
                                <Text style={styles.emptyText}>No player stats available yet</Text>
                            </View>
                        ) : (
                            playerStats.slice(0, 15).map((player, idx) => (
                                <View key={`${player.name}-${idx}`} style={styles.playerRow}>
                                    <View style={[styles.rankBox, idx === 0 && styles.rankGold]}>
                                        <Text style={[styles.rankText, idx === 0 && styles.rankTextMedal]}>#{idx + 1}</Text>
                                    </View>
                                    <View style={styles.teamInfo}>
                                        <Text style={styles.teamName} numberOfLines={1}>{player.name || 'Unknown'}</Text>
                                        <Text style={styles.teamMembers} numberOfLines={1}>{player.team_name || '—'}</Text>
                                    </View>
                                    <View style={styles.playerStatsRow}>
                                        <View style={styles.playerMiniStat}>
                                            <Text style={styles.miniStatVal}>{player.wwcd || 0}</Text>
                                            <Text style={styles.miniStatLabel}>WWCD</Text>
                                        </View>
                                        <View style={styles.playerMiniStat}>
                                            <Text style={styles.miniStatVal}>{player.matches_played || 0}</Text>
                                            <Text style={styles.miniStatLabel}>MP</Text>
                                        </View>
                                        <View style={styles.playerKillsBox}>
                                            <Text style={styles.killsValue}>{player.kills || 0}</Text>
                                            <Text style={styles.killsLabel}>K</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                <View style={{ height: 220 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.footerCopyBtn} onPress={handleCopyLink}>
                    {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} color={Theme.colors.textSecondary} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.footerImportMiniBtn, importing && styles.disabledBtn]}
                    onPress={() => setImportModalVisible(true)}
                    disabled={importing}
                >
                    <Download size={18} color={Theme.colors.accent} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.footerLazarTrackBtn, importing && styles.disabledBtn]}
                    onPress={handleOpenLazarTrack}
                    disabled={importing}
                >
                    <ExternalLink size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.footerLazarTrackBtnText}>Open in LazarTrack</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={importModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => !importing && setImportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={() => !importing && setImportModalVisible(false)}
                    />
                    <View style={styles.bottomSheet}>
                        <View style={styles.dragHandle} />
                        <Text style={styles.modalTitle}>Import Lobby</Text>
                        <Text style={styles.modalSubtitle}>
                            Create a copy of <Text style={{ fontWeight: '700' }}>"{lobby.name}"</Text> in your LazarFlow account. Teams and their members will be preserved.
                        </Text>

                        <View style={styles.modalInputGroup}>
                            <Text style={styles.inputLabel}>NEW LOBBY NAME</Text>
                            <TextInput
                                style={styles.styledInput}
                                placeholder="Enter lobby name"
                                placeholderTextColor="#94a3b8"
                                value={newLobbyName}
                                onChangeText={setNewLobbyName}
                                autoCapitalize="words"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.optionRow}
                            onPress={() => setImportResults(!importResults)}
                            disabled={!teams.some(t => (t.total || 0) > 0)}
                        >
                            <View style={[styles.checkBox, importResults && styles.checkBoxActive]}>
                                {importResults && <Check size={14} color="#fff" />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.optionTitle}>Import results & points</Text>
                                <Text style={styles.optionSub}>
                                    {teams.some(t => (t.total || 0) > 0)
                                        ? 'Copy standings, kills, and placement points'
                                        : 'No results to import yet — lobby is still in setup'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.modalActionsRow}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setImportModalVisible(false)}
                                disabled={importing}
                            >
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, importing && styles.disabledBtn]}
                                onPress={handleImportToMyAccount}
                                disabled={importing}
                            >
                                {importing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmBtnText}>Import Lobby</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        color: Theme.colors.textSecondary,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        backgroundColor: Theme.colors.primary,
    },
    backButton: {
        padding: 4,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentInner: {
        padding: 16,
    },
    lobbyHeaderCard: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.secondary,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: 16,
    },
    lobbyIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    lobbyMeta: {
        flex: 1,
        justifyContent: 'center',
    },
    lobbyName: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 6,
    },
    lobbySubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    lobbyGame: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: Theme.colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        textTransform: 'uppercase',
    },
    lobbyDate: {
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: Theme.fonts.outfit.regular,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    statValue: {
        marginTop: 6,
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    statLabel: {
        marginTop: 2,
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#94a3b8',
        letterSpacing: 0.5,
    },
    segmentedControlContainer: {
        marginBottom: 16,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 25,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 21,
    },
    segmentBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#94a3b8',
    },
    segmentTextActive: {
        color: Theme.colors.accent,
    },
    standingsSection: {
        gap: 8,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    rankBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    rankGold: { backgroundColor: '#fef3c7' },
    rankSilver: { backgroundColor: '#f1f5f9' },
    rankBronze: { backgroundColor: '#fed7aa' },
    rankText: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textSecondary,
    },
    rankTextMedal: { color: '#0f172a' },
    teamInfo: {
        flex: 1,
    },
    teamName: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    teamMembers: {
        marginTop: 2,
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: Theme.fonts.outfit.regular,
    },
    teamStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pointsBox: {
        alignItems: 'center',
        minWidth: 44,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#eff6ff',
    },
    pointsValue: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    pointsLabel: {
        fontSize: 9,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#3b82f6',
        marginTop: 1,
    },
    killsBox: {
        alignItems: 'center',
        minWidth: 36,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#fef2f2',
    },
    killsValue: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#ef4444',
    },
    killsLabel: {
        fontSize: 9,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#ef4444',
        marginTop: 1,
    },
    playerStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    playerMiniStat: {
        alignItems: 'center',
        minWidth: 36,
    },
    miniStatVal: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    miniStatLabel: {
        fontSize: 9,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
        marginTop: 1,
    },
    playerKillsBox: {
        alignItems: 'center',
        minWidth: 36,
        paddingHorizontal: 6,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#fef2f2',
    },
    emptySection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    emptyText: {
        marginTop: 10,
        color: '#94a3b8',
        fontFamily: Theme.fonts.outfit.medium,
        fontSize: 14,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    errorTitle: {
        marginTop: 16,
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    errorText: {
        marginTop: 8,
        fontSize: 14,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 300,
    },
    retryBtn: {
        marginTop: 24,
        backgroundColor: Theme.colors.accent,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryBtnText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
    },
    goHomeBtn: {
        marginTop: 12,
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    goHomeBtnText: {
        color: Theme.colors.textPrimary,
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        gap: 10,
        padding: 16,
        paddingBottom: 28,
        backgroundColor: Theme.colors.primary,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
    footerCopyBtn: {
        width: 48,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerImportMiniBtn: {
        width: 48,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerImportBtn: {
        flex: 1,
        backgroundColor: '#3b82f6',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    footerImportBtnText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
    },
    footerLazarTrackBtn: {
        flex: 1,
        backgroundColor: '#0f172a',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    footerLazarTrackBtnText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
    },
    disabledBtn: {
        opacity: 0.55,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: Theme.colors.primary,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 40,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: Theme.colors.border,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 20,
    },
    modalInputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 11,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textSecondary,
        marginBottom: 8,
        letterSpacing: 1,
    },
    styledInput: {
        backgroundColor: Theme.colors.secondary,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: Theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        gap: 12,
        marginBottom: 24,
    },
    checkBox: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    checkBoxActive: {
        backgroundColor: Theme.colors.accent,
        borderColor: Theme.colors.accent,
    },
    optionTitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    optionSub: {
        marginTop: 2,
        fontSize: 12,
        color: '#94a3b8',
        lineHeight: 18,
    },
    modalActionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelBtnText: {
        color: Theme.colors.textPrimary,
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
    },
    modalConfirmBtn: {
        flex: 1.4,
        height: 52,
        borderRadius: 14,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalConfirmBtnText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
    },
});

export default LobbySharePage;
