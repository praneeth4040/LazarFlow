import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, ScrollView, StatusBar, Platform, TouchableOpacity, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import { Trophy, Award, Share2, Download } from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy'; // Fix for deprecated method warning
import { Theme } from '../styles/theme';
import DesignRenderer from '../components/DesignRenderer';
import { getUserThemes } from '../lib/dataService';
import { Palette, X } from 'lucide-react-native';
import { Dimensions, Modal, Image } from 'react-native';

const LiveTournamentScreen = ({ route }) => {
    const { id } = route?.params || {};
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState(null);
    const [mvps, setMvps] = useState([]);
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [sharing, setSharing] = useState(false);
    const [designMode, setDesignMode] = useState(false);
    const [themes, setThemes] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState(null);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const viewShotRef = React.useRef();

    useFocusEffect(
        useCallback(() => {
            if (id) {
                fetchTournamentData();
                loadThemes();
            }
        }, [id])
    );

    const loadThemes = async () => {
        const userThemes = await getUserThemes();
        const verified = userThemes.filter(t => t.status === 'verified');
        setThemes(verified);
        if (verified.length > 0) {
            // Optionally auto-select the first one or leave null
            // setSelectedTheme(verified[0]);
        }
    };

    const handleShare = async () => {
        try {
            setSharing(true);
            const uri = await captureRef(viewShotRef, {
                format: 'png',
                quality: 0.8,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }
        } catch (error) {
            console.error('Error sharing image:', error);
            Alert.alert('Error', 'Failed to generate sharing image');
        } finally {
            setSharing(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            let csvContent = '';

            if (activeTab === 'leaderboard') {
                csvContent = 'Rank,Team,Wins,Placement Points,Kill Points,Total Points\n';
                teams.forEach((team, index) => {
                    csvContent += `${index + 1},"${team.team_name}",${team.wins || 0},${team.placement_points || 0},${team.kill_points || 0},${team.total || 0}\n`;
                });
            } else {
                csvContent = 'Rank,Player,Team,Kills\n';
                mvps.forEach((player, index) => {
                    csvContent += `${index + 1},"${player.name}","${player.team_name}",${player.kills || 0}\n`;
                });
            }

            const fileName = `${tournament?.name || 'Tournament'}_${activeTab}.csv`;
            const fileUri = FileSystem.cacheDirectory + fileName;

            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
                encoding: 'utf8',
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }
        } catch (error) {
            console.error('Error exporting CSV:', error);
            Alert.alert('Error', 'Failed to export CSV');
        }
    };

    const fetchTournamentData = async () => {
        try {
            setLoading(true);

            // Fetch tournament details
            const { data: tourney, error: tourneyError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', id)
                .single();

            if (tourneyError) throw tourneyError;
            setTournament(tourney);

            // Fetch teams
            const { data: teamsData, error: teamsError } = await supabase
                .from('tournament_teams')
                .select('*')
                .eq('tournament_id', id);

            if (teamsError) throw teamsError;

            // Calculate totals and sort
            const sortedTeams = (teamsData || []).map(team => {
                const points = typeof team.total_points === 'object'
                    ? team.total_points
                    : { kill_points: 0, placement_points: 0 };

                return {
                    ...team,
                    total: (points.kill_points || 0) + (points.placement_points || 0),
                    kill_points: points.kill_points || 0,
                    placement_points: points.placement_points || 0,
                    wins: points.wins || 0
                };
            }).sort((a, b) => b.total - a.total);

            setTeams(sortedTeams);

            // Calculate MVPs from individual members
            const allPlayers = [];
            (teamsData || []).forEach(team => {
                if (Array.isArray(team.members)) {
                    team.members.forEach(member => {
                        const m = typeof member === 'object' ? member : { name: member, kills: 0 };
                        allPlayers.push({
                            ...m,
                            team_name: team.team_name,
                        });
                    });
                }
            });

            const sortedMVPs = allPlayers
                .sort((a, b) => (b.kills || 0) - (a.kills || 0))
                .slice(0, 10); // Show top 10

            setMvps(sortedMVPs);
        } catch (error) {
            console.error('Error fetching tournament data:', error);
            Alert.alert('Error', 'Failed to load tournament data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
            </View>
        );
    }

    const config = tournament?.layout_config || {};
    const themeStyles = {
        container: { backgroundColor: config.backgroundColor || Theme.colors.secondary },
        header: { backgroundColor: config.primaryColor || Theme.colors.primary },
        headerText: { color: config.textColor || Theme.colors.textPrimary },
        accentText: { color: config.accentColor || Theme.colors.accent },
    };

    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.rankCell]}>#</Text>
            <Text style={[styles.headerCell, styles.teamCell]}>Team</Text>
            <Text style={[styles.headerCell, styles.pointCell]}>WW</Text>
            <Text style={[styles.headerCell, styles.pointCell]}>Place</Text>
            <Text style={[styles.headerCell, styles.pointCell]}>Kill</Text>
            <Text style={[styles.headerCell, styles.pointCell, styles.totalCell]}>Total</Text>
        </View>
    );

    const renderItem = ({ item, index }) => (
        <View style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
            <Text style={[styles.cell, styles.rankCell, index < 3 && styles.topRank]}>{index + 1}</Text>
            <View style={[styles.cell, styles.teamCell]}>
                <Text style={styles.teamName} numberOfLines={1}>{item.team_name}</Text>
            </View>
            <Text style={[styles.cell, styles.pointCell]}>{item.wins || 0}</Text>
            <Text style={[styles.cell, styles.pointCell]}>{item.placement_points || 0}</Text>
            <Text style={[styles.cell, styles.pointCell]}>{item.kill_points || 0}</Text>
            <Text style={[styles.cell, styles.pointCell, styles.totalCell]}>{item.total || 0}</Text>
        </View>
    );

    const renderMVPItem = ({ item, index }) => (
        <View style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
            <Text style={[styles.cell, styles.rankCell, index < 3 && styles.topRank]}>{index + 1}</Text>
            <View style={[styles.cell, styles.teamCell]}>
                <Text style={styles.mvpPlayerName}>{item.name}</Text>
                <Text style={styles.mvpTeamName}>{item.team_name}</Text>
            </View>
            <Text style={[styles.cell, styles.pointCell, styles.mvpKills]}>{item.kills || 0}</Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, themeStyles.container]}>
            <View style={[styles.tourneyInfo, themeStyles.header]}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.tourneyName, themeStyles.headerText]}>{tournament?.name}</Text>
                        <Text style={[styles.tourneyGame, themeStyles.accentText]}>{tournament?.game}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            onPress={() => setShowThemeSelector(true)}
                            style={[styles.iconButton, designMode && styles.activeIconButton]}
                        >
                            <Palette size={20} color={designMode ? Theme.colors.accent : Theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleShare} disabled={sharing} style={styles.iconButton}>
                            {sharing ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : <Share2 size={20} color={Theme.colors.textSecondary} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleExportCSV} style={styles.iconButton}>
                            <Download size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('leaderboard')}
                        style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
                    >
                        <Trophy size={18} color={activeTab === 'leaderboard' ? Theme.colors.accent : Theme.colors.textSecondary} />
                        <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>Leaderboard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('mvps')}
                        style={[styles.tab, activeTab === 'mvps' && styles.activeTab]}
                    >
                        <Award size={18} color={activeTab === 'mvps' ? Theme.colors.accent : Theme.colors.textSecondary} />
                        <Text style={[styles.tabText, activeTab === 'mvps' && styles.activeTabText]}>MVPs</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={[styles.tableContainer, designMode && styles.designContainer]}>
                {designMode && selectedTheme ? (
                    <DesignRenderer
                        theme={selectedTheme}
                        data={teams}
                        tournament={tournament}
                        width={Dimensions.get('window').width}
                    />
                ) : activeTab === 'leaderboard' ? (
                    <>
                        {renderHeader()}
                        <FlatList
                            data={teams}
                            keyExtractor={item => item.id}
                            renderItem={renderItem}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No teams added yet.</Text>
                                </View>
                            }
                        />
                    </>
                ) : (
                    <>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.headerCell, styles.rankCell]}>#</Text>
                            <Text style={[styles.headerCell, styles.teamCell]}>Player</Text>
                            <Text style={[styles.headerCell, styles.pointCell, { width: 60 }]}>Kills</Text>
                        </View>
                        <FlatList
                            data={mvps}
                            keyExtractor={(item, idx) => `mvp-${idx}`}
                            renderItem={renderMVPItem}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No player stats available.</Text>
                                </View>
                            }
                        />
                    </>
                )}
            </ViewShot>

            {/* Theme Selector Modal */}
            <Modal
                visible={showThemeSelector}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowThemeSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Design</Text>
                            <TouchableOpacity onPress={() => setShowThemeSelector(false)}>
                                <X size={24} color={Theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>Choose a verified design to overlay your data.</Text>

                        <ScrollView style={styles.themeList}>
                            <TouchableOpacity
                                style={[styles.themeOption, !designMode && styles.themeOptionActive]}
                                onPress={() => {
                                    setDesignMode(false);
                                    setShowThemeSelector(false);
                                }}
                            >
                                <View style={styles.themePreviewPlaceholder}>
                                    <Text style={styles.themePlaceholderText}>Default Table</Text>
                                </View>
                                <Text style={styles.themeOptionName}>Standard View</Text>
                            </TouchableOpacity>

                            {themes.map(theme => (
                                <TouchableOpacity
                                    key={theme.id}
                                    style={[styles.themeOption, selectedTheme?.id === theme.id && designMode && styles.themeOptionActive]}
                                    onPress={() => {
                                        setSelectedTheme(theme);
                                        setDesignMode(true);
                                        setShowThemeSelector(false);
                                    }}
                                >
                                    <View style={styles.themePreviewPlaceholder}>
                                        <Image
                                            source={{ uri: theme.url }}
                                            style={styles.themePreviewImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                    <Text style={styles.themeOptionName} numberOfLines={1}>{theme.name}</Text>
                                </TouchableOpacity>
                            ))}

                            {themes.length === 0 && (
                                <Text style={styles.noThemesText}>No verified themes found. Upload one in Dashboard.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
    },
    tourneyInfo: {
        padding: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
    },
    tourneyName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    tourneyGame: {
        fontSize: 14,
        color: Theme.colors.accent,
        marginTop: 4,
        fontWeight: '600',
    },
    tableContainer: {
        flex: 1,
        marginTop: 10,
        backgroundColor: Theme.colors.primary,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.secondary,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerCell: {
        color: Theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        alignItems: 'center',
    },
    evenRow: {
        backgroundColor: Theme.colors.primary,
    },
    oddRow: {
        backgroundColor: Theme.colors.secondary,
    },
    cell: {
        color: Theme.colors.textPrimary,
        fontSize: 14,
        textAlign: 'center',
    },
    rankCell: { width: 30 },
    teamCell: { flex: 1, textAlign: 'left', paddingLeft: 10 },
    pointCell: { width: 45 },
    totalCell: { color: Theme.colors.accent, fontWeight: 'bold' },
    teamName: {
        color: Theme.colors.textPrimary,
        fontWeight: '500',
        textAlign: 'left',
    },
    topRank: {
        color: Theme.colors.accent,
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: Theme.colors.secondary,
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        borderWidth: 1,
        borderColor: Theme.colors.accent,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.textSecondary,
    },
    activeTabText: {
        color: Theme.colors.accent,
    },
    mvpPlayerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        textAlign: 'left',
    },
    mvpTeamName: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        textAlign: 'left',
    },
    mvpKills: {
        width: 60,
        color: Theme.colors.accent,
        fontWeight: 'bold',
        fontSize: 18,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Theme.colors.textSecondary,
        fontSize: 16,
    },
    activeIconButton: {
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
    },
    designContainer: {
        backgroundColor: '#000', // Ensure dark background for designs
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.primary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        marginBottom: 20,
    },
    themeList: {
        marginBottom: 20,
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: 10,
    },
    themeOptionActive: {
        borderColor: Theme.colors.accent,
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
    },
    themePreviewPlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    themePreviewImage: {
        width: '100%',
        height: '100%',
    },
    themePlaceholderText: {
        fontSize: 10,
        color: Theme.colors.textSecondary,
        fontWeight: 'bold',
    },
    themeOptionName: {
        fontSize: 16,
        color: Theme.colors.textPrimary,
        fontWeight: '500',
    },
    noThemesText: {
        textAlign: 'center',
        color: Theme.colors.textSecondary,
        marginTop: 20,
    },
});

export default LiveTournamentScreen;
