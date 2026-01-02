import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Bot, User, Trash2, ArrowLeft, Loader2, Sparkles, Send } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';
import { extractTeamsFromText } from '../lib/aiExtraction';

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
                .select('id, team_name, members, total_points')
                .eq('tournament_id', tournamentId);

            if (error) throw error;
            setTeams(data.map(t => ({ 
                id: t.id, 
                name: t.team_name, 
                members: t.members || [], 
                total_points: t.total_points 
            })));
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
            const extracted = await extractTeamsFromText(aiText);

            if (extracted.length === 0) {
                Alert.alert('Info', 'No team names could be identified. Try a clearer format.');
                return;
            }

            setTeams([...teams, ...extracted]);
            setAiText('');
            setMode('manual');
            Alert.alert('Success', `Extracted ${extracted.length} teams!`);
        } catch (error) {
            Alert.alert('Error', 'AI extraction failed');
        } finally {
            setLoading(false);
        }
    };

    const [expandedTeamIndex, setExpandedTeamIndex] = useState(null);
    const [newMemberName, setNewMemberName] = useState('');

    const toggleExpandTeam = (index) => {
        if (expandedTeamIndex === index) {
            setExpandedTeamIndex(null);
        } else {
            setExpandedTeamIndex(index);
            setNewMemberName('');
        }
    };

    const handleAddMember = (index) => {
        if (!newMemberName.trim()) return;
        const updatedTeams = [...teams];
        const memberName = newMemberName.trim();

        // Members can be objects or strings in this app's database schema
        // We'll use objects to support future stats
        const newMember = { name: memberName, kills: 0, wwcd: 0, matches_played: 0 };

        updatedTeams[index].members = [...(updatedTeams[index].members || []), newMember];
        setTeams(updatedTeams);
        setNewMemberName('');
    };

    const handleRemoveMember = (teamIndex, memberIndex) => {
        const updatedTeams = [...teams];
        updatedTeams[teamIndex].members = updatedTeams[teamIndex].members.filter((_, i) => i !== memberIndex);
        setTeams(updatedTeams);
    };

    const handleSave = async () => {
        if (teams.length < 1) {
            Alert.alert('Error', 'Please add at least 1 team');
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
                total_points: t.total_points || { matches_played: 0, wins: 0, kill_points: 0, placement_points: 0 }
            }));

            const { error } = await supabase.from('tournament_teams').insert(teamsToInsert);
            if (error) throw error;

            Alert.alert('Success', 'Teams and members saved successfully!', [
                { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
            ]);
        } catch (error) {
            console.error('Error saving teams:', error);
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

                <Text style={styles.sectionTitle}>Teams & Members ({teams.length})</Text>
                {teams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <User size={48} color={Theme.colors.border} />
                        <Text style={styles.emptyText}>No teams added yet</Text>
                    </View>
                ) : (
                    <View style={styles.teamList}>
                        {teams.map((team, index) => (
                            <View key={index} style={styles.teamCardContainer}>
                                <TouchableOpacity
                                    style={[styles.teamCard, expandedTeamIndex === index && styles.teamCardExpanded]}
                                    onPress={() => toggleExpandTeam(index)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.teamNumber}>{index + 1}</Text>
                                    <Text style={styles.teamName}>{team.name}</Text>
                                    <View style={styles.teamMeta}>
                                        <Text style={styles.memberCount}>{team.members?.length || 0} members</Text>
                                        <TouchableOpacity onPress={() => handleRemoveTeam(index)} style={styles.removeBtn}>
                                            <Trash2 size={18} color={Theme.colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>

                                {expandedTeamIndex === index && (
                                    <View style={styles.memberSection}>
                                        <View style={styles.memberInputRow}>
                                            <TextInput
                                                style={styles.memberInput}
                                                placeholder="Add member name..."
                                                value={newMemberName}
                                                onChangeText={setNewMemberName}
                                                placeholderTextColor={Theme.colors.textSecondary}
                                                onSubmitEditing={() => handleAddMember(index)}
                                            />
                                            <TouchableOpacity
                                                style={styles.addMemberBtn}
                                                onPress={() => handleAddMember(index)}
                                            >
                                                <Plus size={16} color="#fff" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.memberList}>
                                            {team.members && team.members.length > 0 ? (
                                                team.members.map((member, mIdx) => (
                                                    <View key={mIdx} style={styles.memberItem}>
                                                        <User size={14} color={Theme.colors.textSecondary} />
                                                        <Text style={styles.memberName}>
                                                            {typeof member === 'object' ? member.name : member}
                                                        </Text>
                                                        <TouchableOpacity
                                                            onPress={() => handleRemoveMember(index, mIdx)}
                                                            style={styles.removeMemberBtn}
                                                        >
                                                            <X size={14} color={Theme.colors.textSecondary} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))
                                            ) : (
                                                <Text style={styles.noMembersText}>No members added yet</Text>
                                            )}
                                        </View>
                                    </View>
                                )}
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
    teamCardContainer: {
        marginBottom: 10,
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        overflow: 'hidden',
    },
    teamCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    teamCardExpanded: {
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        backgroundColor: 'rgba(26, 115, 232, 0.02)',
    },
    teamNumber: {
        width: 30,
        fontWeight: 'bold',
        color: Theme.colors.accent,
        fontSize: 16,
    },
    teamName: {
        flex: 1,
        fontSize: 16,
        color: Theme.colors.textPrimary,
        fontWeight: '600',
    },
    teamMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    memberCount: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        backgroundColor: Theme.colors.secondary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    removeBtn: {
        padding: 4,
    },
    memberSection: {
        padding: 16,
        backgroundColor: 'rgba(26, 115, 232, 0.01)',
    },
    memberInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    memberInput: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 8,
        padding: 10,
        color: Theme.colors.textPrimary,
        fontSize: 14,
    },
    addMemberBtn: {
        backgroundColor: Theme.colors.accent,
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberList: {
        gap: 8,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        gap: 10,
    },
    memberName: {
        flex: 1,
        fontSize: 14,
        color: Theme.colors.textPrimary,
    },
    removeMemberBtn: {
        padding: 4,
    },
    noMembersText: {
        textAlign: 'center',
        fontSize: 12,
        color: Theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 4,
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
