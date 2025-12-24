import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { X, Plus, Bot, User, Trash2, ArrowLeft, Loader2, Sparkles, Send } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';

const ManageTeamsScreen = ({ route, navigation }) => {
    const { tournamentId, tournamentName } = route.params || {};
    const [mode, setMode] = useState('manual');
    const [teams, setTeams] = useState([]);
    const [currentTeam, setCurrentTeam] = useState('');
    const [aiText, setAiText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (tournamentId) {
            fetchExistingTeams();
        }
    }, [tournamentId]);

    const fetchExistingTeams = async () => {
        try {
            const { data, error } = await supabase
                .from('tournament_teams')
                .select('*')
                .eq('tournament_id', tournamentId);

            if (error) throw error;
            setTeams(data.map(t => ({ id: t.id, name: t.team_name, members: t.members || [] })));
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const handleAddTeam = () => {
        if (currentTeam.trim()) {
            setTeams([...teams, { name: currentTeam.trim(), members: [] }]);
            setCurrentTeam('');
        }
    };

    const handleRemoveTeam = (index) => {
        setTeams(teams.filter((_, i) => i !== index));
    };

    const handleAIExtract = async () => {
        if (!aiText.trim()) {
            Alert.alert('Error', 'Please paste some text');
            return;
        }

        setLoading(true);
        try {
            // Simplified AI extraction logic for now (splitting by lines/bullets)
            // In a real scenario, this would call an Edge Function or AI service
            const extracted = aiText
                .split('\n')
                .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
                .filter(line => line.length > 0 && line.length < 50);

            if (extracted.length === 0) {
                Alert.alert('Info', 'No team names could be identified. Try a clearer format.');
                return;
            }

            setTeams([...teams, ...extracted.map(name => ({ name, members: [] }))]);
            setAiText('');
            setMode('manual');
            Alert.alert('Success', `Extracted ${extracted.length} teams!`);
        } catch (error) {
            Alert.alert('Error', 'AI extraction failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (teams.length < 2) {
            Alert.alert('Error', 'Please add at least 2 teams');
            return;
        }

        setSubmitting(true);
        try {
            // Delete existing teams first to avoid duplicates (assuming full replacement)
            await supabase.from('tournament_teams').delete().eq('tournament_id', tournamentId);

            const teamsToInsert = teams.map(t => ({
                tournament_id: tournamentId,
                team_name: t.name,
                members: t.members,
                total_points: { matches_played: 0, wins: 0, kill_points: 0, placement_points: 0 }
            }));

            const { error } = await supabase.from('tournament_teams').insert(teamsToInsert);
            if (error) throw error;

            Alert.alert('Success', 'Teams saved successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to save teams');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Manage Teams</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{tournamentName}</Text>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                    {submitting ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.modeTabs}>
                <TouchableOpacity
                    style={[styles.modeTab, mode === 'manual' && styles.modeTabActive]}
                    onPress={() => setMode('manual')}
                >
                    <User size={18} color={mode === 'manual' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.modeTabText, mode === 'manual' && styles.modeTabTextActive]}>Manual</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeTab, mode === 'ai' && styles.modeTabActive]}
                    onPress={() => setMode('ai')}
                >
                    <Sparkles size={18} color={mode === 'ai' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.modeTabText, mode === 'ai' && styles.modeTabTextActive]}>AI Extract</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {mode === 'manual' ? (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter team name"
                            value={currentTeam}
                            onChangeText={setCurrentTeam}
                            placeholderTextColor={Theme.colors.textSecondary}
                            onSubmitEditing={handleAddTeam}
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddTeam}>
                            <Plus size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.aiContainer}>
                        <TextInput
                            style={styles.aiInput}
                            placeholder="Paste text with team names (one per line)..."
                            value={aiText}
                            onChangeText={setAiText}
                            multiline
                            placeholderTextColor={Theme.colors.textSecondary}
                        />
                        <TouchableOpacity style={styles.extractBtn} onPress={handleAIExtract} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <><Sparkles size={18} color="#fff" /><Text style={styles.extractBtnText}>Extract Teams</Text></>}
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Teams ({teams.length})</Text>
                {teams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <User size={48} color={Theme.colors.border} />
                        <Text style={styles.emptyText}>No teams added yet</Text>
                    </View>
                ) : (
                    <View style={styles.teamList}>
                        {teams.map((team, index) => (
                            <View key={index} style={styles.teamCard}>
                                <Text style={styles.teamNumber}>{index + 1}</Text>
                                <Text style={styles.teamName}>{team.name}</Text>
                                <TouchableOpacity onPress={() => handleRemoveTeam(index)} style={styles.removeBtn}>
                                    <Trash2 size={18} color={Theme.colors.danger} />
                                </TouchableOpacity>
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
    saveBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    saveBtnText: {
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
    inputContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 8,
        padding: 12,
        color: Theme.colors.textPrimary,
    },
    addBtn: {
        backgroundColor: Theme.colors.accent,
        width: 48,
        height: 48,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aiContainer: {
        marginBottom: 20,
    },
    aiInput: {
        backgroundColor: Theme.colors.primary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 8,
        padding: 12,
        height: 120,
        color: Theme.colors.textPrimary,
        textAlignVertical: 'top',
        marginBottom: 10,
    },
    extractBtn: {
        backgroundColor: Theme.colors.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    extractBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 12,
    },
    teamList: {
        gap: 10,
    },
    teamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    teamNumber: {
        width: 24,
        fontWeight: 'bold',
        color: Theme.colors.textSecondary,
    },
    teamName: {
        flex: 1,
        fontSize: 16,
        color: Theme.colors.textPrimary,
        fontWeight: '500',
    },
    removeBtn: {
        padding: 4,
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

export default ManageTeamsScreen;
