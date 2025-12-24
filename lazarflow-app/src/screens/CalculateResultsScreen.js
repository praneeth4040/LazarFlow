import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Image, Platform, StatusBar } from 'react-native';
import { Target, Sparkles, Camera, X, Upload, Save, Search, Trash2, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';

const CalculateResultsScreen = ({ route, navigation }) => {
    const { tournament } = route.params || {};
    const [mode, setMode] = useState('manual');
    const [teams, setTeams] = useState([]);
    const [results, setResults] = useState([]);
    const [teamSearch, setTeamSearch] = useState('');
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [extracting, setExtracting] = useState(false);

    useEffect(() => {
        if (tournament?.id) {
            fetchTeams();
        }
    }, [tournament?.id]);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tournament_teams')
                .select('*')
                .eq('tournament_id', tournament.id);
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
        };

        setResults([newResult, ...results]);
        setTeamSearch('');
        setFilteredTeams([]);
    };

    const handleUpdateResult = (index, field, value) => {
        const updatedResults = [...results];
        const val = field === 'kills' ? parseInt(value) || 0 : value;
        updatedResults[index][field] = val;

        if (field === 'position' && tournament.points_system) {
            const pos = parseInt(val);
            const pointsEntry = tournament.points_system.find(p => p.placement === pos);
            updatedResults[index].placement_points = pointsEntry ? pointsEntry.points : 0;
        }

        updatedResults[index].kill_points = updatedResults[index].kills * (tournament.kill_points || 0);
        updatedResults[index].total_points = updatedResults[index].placement_points + updatedResults[index].kill_points;
        setResults(updatedResults);
    };

    const handleRemoveResult = (index) => {
        setResults(results.filter((_, i) => i !== index));
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            handleAIUpload(result.assets[0]);
        }
    };

    const handleAIUpload = async (imageAsset) => {
        Alert.alert('Coming Soon', 'AI OCR features are being optimized for mobile. Please use manual entry for now.');
        // Implementation for AI extraction follows similar logic as web Client
        // Involves calling your backend /extract-results endpoint
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

                const { error } = await supabase
                    .from('tournament_teams')
                    .update({ total_points: newStats })
                    .eq('id', result.team_id);

                if (error) throw error;
            }

            Alert.alert('Success', 'Results submitted successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
        } catch (err) {
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
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{tournament?.name}</Text>
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
                        <TouchableOpacity style={styles.uploadCard} onPress={handlePickImage}>
                            <Upload size={48} color={Theme.colors.accent} />
                            <Text style={styles.uploadTitle}>Upload Screenshot</Text>
                            <Text style={styles.uploadSubtitle}>AI will auto-fill the standings</Text>
                        </TouchableOpacity>
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
                                        <Text style={styles.inputLabel}>Kills</Text>
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
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
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
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
    },
    submitBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    submitBtnText: {
        color: Theme.colors.accent,
        fontWeight: 'bold',
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
        fontWeight: '600',
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
        color: Theme.colors.textPrimary,
    },
    aiUploadSection: {
        marginBottom: 20,
    },
    uploadCard: {
        backgroundColor: Theme.colors.primary,
        borderWidth: 2,
        borderColor: Theme.colors.accent,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    uploadSubtitle: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
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
        fontWeight: 'bold',
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
        color: Theme.colors.textSecondary,
        marginBottom: 4,
    },
    fieldInput: {
        backgroundColor: Theme.colors.secondary,
        borderRadius: 6,
        padding: 8,
        color: Theme.colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
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
        fontWeight: 'bold',
    },
    pointsValue: {
        fontSize: 18,
        fontWeight: 'bold',
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
