import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, Alert, ScrollView, StatusBar, Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { Trophy, Award } from 'lucide-react-native';
import { Theme } from '../styles/theme';

const LiveTournamentScreen = ({ route }) => {
    const { id } = route?.params || {};
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState(null);

    useEffect(() => {
        if (id) {
            fetchTournamentData();
        }
    }, [id]);

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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.tourneyInfo}>
                <Text style={styles.tourneyName}>{tournament?.name}</Text>
                <Text style={styles.tourneyGame}>{tournament?.game}</Text>
            </View>

            <View style={styles.tableContainer}>
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
            </View>
        </SafeAreaView>
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
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Theme.colors.textSecondary,
        fontSize: 16,
    },
});

export default LiveTournamentScreen;
