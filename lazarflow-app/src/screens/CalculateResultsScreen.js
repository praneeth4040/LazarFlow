import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Image, Platform, StatusBar, Modal } from 'react-native';
import { Target, Sparkles, Camera, X, Upload, Save, Search, Trash2, ArrowLeft, ChevronRight, Plus, Check } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';
import { extractResultsFromScreenshot } from '../lib/aiResultExtraction';
import { fuzzyMatch, fuzzyMatchName } from '../lib/aiUtils';

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
    const [aiResults, setAiResults] = useState([]);
    const [showMapping, setShowMapping] = useState(false);
    const [mappings, setMappings] = useState({}); // { [aiTeamName]: registeredTeamId }
    const [selectedAiTeam, setSelectedAiTeam] = useState(null); // The AI result currently being re-mapped
    const [mappingModalVisible, setMappingModalVisible] = useState(false);

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
            members: (team.members || []).map(m => ({
                name: typeof m === 'object' ? m.name : m,
                kills: 0
            }))
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

    const handleUpdateMemberKills = (resultIndex, memberIndex, kills) => {
        const updatedResults = [...results];
        const member = updatedResults[resultIndex].members[memberIndex];
        member.kills = parseInt(kills) || 0;

        // Auto-update team kills if they match the sum of member kills
        const totalMemberKills = updatedResults[resultIndex].members.reduce((sum, m) => sum + (m.kills || 0), 0);
        updatedResults[resultIndex].kills = totalMemberKills;

        // Re-calculate points
        updatedResults[resultIndex].kill_points = totalMemberKills * (tournament.kill_points || 0);
        updatedResults[resultIndex].total_points = updatedResults[resultIndex].placement_points + updatedResults[resultIndex].kill_points;

        setResults(updatedResults);
    };

    const handleRemoveResult = (index) => {
        setResults(results.filter((_, i) => i !== index));
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            handleAIUpload(result.assets);
        }
    };

    const handleAIUpload = async (imageAssets) => {
        setExtracting(true);
        try {
            const extracted = await extractResultsFromScreenshot(imageAssets);

            // Improved auto-mapping algorithm
            const initialMappings = {};
            const assignedTeamIds = new Set();

            extracted.forEach(res => {
                // Step 1: Try team name fuzzy match (High confidence primary check)
                const teamMatch = fuzzyMatch(res.team_name, teams);
                if (teamMatch && !assignedTeamIds.has(teamMatch.item.id)) {
                    initialMappings[res.team_name] = teamMatch.item.id;
                    assignedTeamIds.add(teamMatch.item.id);
                    return;
                }

                // Step 2: Try player-level matching (Secondary check for Match 2+)
                if (res.players && res.players.length > 0) {
                    for (const registeredTeam of teams) {
                        if (assignedTeamIds.has(registeredTeam.id)) continue;

                        const teamMembers = registeredTeam.members || [];
                        if (teamMembers.length === 0) continue;

                        // Count how many players in THIS AI result match THIS registered team
                        let matchCount = 0;
                        res.players.forEach(aiPlayer => {
                            const pMatch = fuzzyMatchName(aiPlayer.name, teamMembers, 0.85);
                            if (pMatch) matchCount++;
                        });

                        // Threshold: If 2 or more players match, consider it the same team
                        if (matchCount >= 2) {
                            console.log(`🤖 Auto-mapped "${res.team_name}" to "${registeredTeam.team_name}" via player matches (${matchCount})`);
                            initialMappings[res.team_name] = registeredTeam.id;
                            assignedTeamIds.add(registeredTeam.id);
                            break;
                        }
                    }
                }
            });

            setAiResults(extracted);
            setMappings(initialMappings);
            setShowMapping(true);
        } catch (err) {
            console.error('AI Error:', err);
            Alert.alert('Error', 'Failed to extract results from image');
        } finally {
            setExtracting(false);
        }
    };

    const handleApplyMapping = () => {
        const newResults = aiResults.map(res => {
            const teamId = mappings[res.team_name];
            const team = teams.find(t => t.id === teamId);

            if (!team) return null;

            const pos = parseInt(res.rank);
            const pointsEntry = tournament.points_system.find(p => p.placement === pos);
            const placementPoints = pointsEntry ? pointsEntry.points : 0;
            const killPoints = (res.kills || 0) * (tournament.kill_points || 0);

            return {
                team_id: team.id,
                team_name: team.team_name,
                position: String(res.rank),
                kills: res.kills || 0,
                placement_points: placementPoints,
                kill_points: killPoints,
                total_points: placementPoints + killPoints,
                players: res.players // Pass through for potential stat tracking
            };
        }).filter(r => r !== null);

        setResults([...newResults, ...results.filter(r => !newResults.some(nr => nr.team_id === r.team_id))]);
        setShowMapping(false);
        setMode('manual');
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

                // Update individual member stats in the members JSON
                const currentMembers = team.members || [];
                const updatedMembers = currentMembers.map(m => {
                    const memberName = typeof m === 'object' ? m.name : m;
                    const resultMember = result.members.find(rm => rm.name === memberName);
                    if (resultMember) {
                        return {
                            name: memberName,
                            kills: (m.kills || 0) + (resultMember.kills || 0),
                            matches_played: (m.matches_played || 0) + 1,
                            wwcd: (m.wwcd || 0) + (parseInt(result.position) === 1 ? 1 : 0)
                        };
                    }
                    return typeof m === 'object' ? m : { name: m, kills: 0, matches_played: 0, wwcd: 0 };
                });

                const { error } = await supabase
                    .from('tournament_teams')
                    .update({
                        total_points: newStats,
                        members: updatedMembers
                    })
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
                        {extracting ? (
                            <View style={styles.extractingLoader}>
                                <ActivityIndicator size="large" color={Theme.colors.accent} />
                                <Text style={styles.extractingText}>AI is analyzing screenshots...</Text>
                            </View>
                        ) : showMapping ? (
                            <View style={styles.mappingSection}>
                                <View style={styles.mappingHeader}>
                                    <Text style={styles.mappingTitle}>Verify AI Extraction</Text>
                                    <Text style={styles.mappingSubtitle}>Map extracted teams to your registered teams</Text>
                                </View>
                                {aiResults.map((res, index) => (
                                    <View key={index} style={styles.mappingRow}>
                                        <View style={styles.aiTeamInfo}>
                                            <View style={styles.aiTeamHeader}>
                                                <Text style={styles.aiTeamLabel}>AI Found:</Text>
                                                <Text style={styles.aiTeamStats}>Rank #{res.rank} • {res.kills} kills</Text>
                                            </View>
                                            <Text style={styles.aiTeamName}>{res.team_name}</Text>

                                            {res.players && res.players.length > 0 && (
                                                <View style={styles.aiPlayerList}>
                                                    {res.players.map((p, pIdx) => (
                                                        <View key={pIdx} style={styles.aiPlayerItem}>
                                                            <Text style={styles.aiPlayerName}>{p.name}</Text>
                                                            <Text style={styles.aiPlayerKills}>{p.kills}k</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.mappingArrow}>
                                            <ChevronRight size={16} color={Theme.colors.textSecondary} />
                                        </View>

                                        <View style={styles.teamPickerContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.teamPicker,
                                                    mappings[res.team_name] ? styles.teamPickerFilled : styles.teamPickerEmpty
                                                ]}
                                                onPress={() => {
                                                    setSelectedAiTeam(res);
                                                    setMappingModalVisible(true);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.selectedTeamName,
                                                    !mappings[res.team_name] && styles.unselectedText
                                                ]}>
                                                    {teams.find(t => t.id === mappings[res.team_name])?.team_name || 'Select Team'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                                <View style={styles.mappingActions}>
                                    <TouchableOpacity style={styles.cancelMappingBtn} onPress={() => setShowMapping(false)}>
                                        <Text style={styles.cancelMappingText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.applyMappingBtn} onPress={handleApplyMapping}>
                                        <Text style={styles.applyMappingText}>Apply Results</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.uploadCard} onPress={handlePickImage}>
                                <Upload size={48} color={Theme.colors.accent} />
                                <Text style={styles.uploadTitle}>Upload Screenshot</Text>
                                <Text style={styles.uploadSubtitle}>AI will auto-fill the standings from Free Fire / BGMI shots</Text>
                            </TouchableOpacity>
                        )}
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
                                        <Text style={styles.inputLabel}>Tealm Kills</Text>
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

                                {item.members && item.members.length > 0 && (
                                    <View style={styles.memberKillsSection}>
                                        <Text style={styles.memberKillsTitle}>Individual Player Kills</Text>
                                        {item.members.map((member, mIdx) => (
                                            <View key={mIdx} style={styles.memberKillRow}>
                                                <Text style={styles.memberKillName}>{member.name}</Text>
                                                <TextInput
                                                    style={styles.memberKillInput}
                                                    keyboardType="numeric"
                                                    value={String(member.kills || 0)}
                                                    onChangeText={(v) => handleUpdateMemberKills(index, mIdx, v)}
                                                    placeholder="0"
                                                />
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal
                transparent={true}
                visible={mappingModalVisible}
                animationType="slide"
                onRequestClose={() => setMappingModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Map AI Result</Text>
                            <TouchableOpacity onPress={() => setMappingModalVisible(false)}>
                                <X size={24} color={Theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.aiSummary}>
                            <Text style={styles.aiSummaryLabel}>AI extracted data for:</Text>
                            <Text style={styles.aiSummaryName}>{selectedAiTeam?.team_name}</Text>
                            <Text style={styles.aiSummaryDetail}>#{selectedAiTeam?.rank} • {selectedAiTeam?.kills} kills</Text>
                        </View>

                        <Text style={styles.sectionLabel}>Select Registered Team</Text>
                        <ScrollView style={styles.teamOptionsList}>
                            {teams.map(team => {
                                const isMappedToOther = Object.entries(mappings).some(
                                    ([aiName, registeredId]) => registeredId === team.id && aiName !== selectedAiTeam?.team_name
                                );
                                const isSelected = mappings[selectedAiTeam?.team_name] === team.id;

                                return (
                                    <TouchableOpacity
                                        key={team.id}
                                        style={[
                                            styles.teamOption,
                                            isSelected && styles.teamOptionSelected,
                                            isMappedToOther && styles.teamOptionDisabled
                                        ]}
                                        disabled={isMappedToOther}
                                        onPress={() => {
                                            setMappings({
                                                ...mappings,
                                                [selectedAiTeam.team_name]: team.id
                                            });
                                            setMappingModalVisible(false);
                                        }}
                                    >
                                        <View style={styles.teamOptionLeft}>
                                            <Text style={[
                                                styles.teamOptionText,
                                                isSelected && styles.teamOptionTextSelected,
                                                isMappedToOther && styles.teamOptionTextDisabled
                                            ]}>
                                                {team.team_name}
                                            </Text>
                                            {isMappedToOther && (
                                                <Text style={styles.alreadyMappedText}>Already assigned</Text>
                                            )}
                                        </View>
                                        {isSelected && (
                                            <Check size={20} color={Theme.colors.accent} />
                                        )}
                                        {isMappedToOther && (
                                            <X size={16} color={Theme.colors.textSecondary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.clearMappingBtn}
                            onPress={() => {
                                const newMappings = { ...mappings };
                                delete newMappings[selectedAiTeam.team_name];
                                setMappings(newMappings);
                                setMappingModalVisible(false);
                            }}
                        >
                            <Text style={styles.clearMappingText}>Clear Mapping</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    extractingLoader: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    extractingText: {
        color: Theme.colors.textPrimary,
        fontWeight: '600',
    },
    mappingSection: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        padding: 16,
    },
    mappingHeader: {
        marginBottom: 20,
    },
    mappingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    mappingSubtitle: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
    },
    mappingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        gap: 10,
    },
    aiTeamInfo: {
        flex: 1,
    },
    aiTeamLabel: {
        fontSize: 10,
        color: Theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    aiTeamName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    aiTeamStats: {
        fontSize: 11,
        color: Theme.colors.accent,
    },
    teamPickerContainer: {
        flex: 1,
    },
    teamPicker: {
        backgroundColor: Theme.colors.secondary,
        padding: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    selectedTeamName: {
        fontSize: 13,
        color: Theme.colors.textPrimary,
        fontWeight: 'bold',
    },
    unselectedText: {
        color: Theme.colors.textSecondary,
        fontWeight: 'normal',
    },
    teamPickerEmpty: {
        borderColor: Theme.colors.danger,
        backgroundColor: 'rgba(239, 68, 68, 0.02)',
    },
    teamPickerFilled: {
        borderColor: Theme.colors.accent,
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
    },
    aiTeamHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    aiPlayerList: {
        marginTop: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    aiPlayerItem: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.secondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignItems: 'center',
        gap: 4,
        borderWidth: 0.5,
        borderColor: Theme.colors.border,
    },
    aiPlayerName: {
        fontSize: 10,
        color: Theme.colors.textPrimary,
        maxWidth: 60,
    },
    aiPlayerKills: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Theme.colors.accent,
    },
    mappingArrow: {
        paddingHorizontal: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.primary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    aiSummary: {
        backgroundColor: Theme.colors.secondary,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    aiSummaryLabel: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginBottom: 4,
    },
    aiSummaryName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    aiSummaryDetail: {
        fontSize: 14,
        color: Theme.colors.accent,
        fontWeight: '600',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    teamOptionsList: {
        marginBottom: 20,
    },
    teamOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: 8,
    },
    teamOptionSelected: {
        borderColor: Theme.colors.accent,
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
    },
    teamOptionText: {
        fontSize: 16,
        color: Theme.colors.textPrimary,
    },
    teamOptionTextSelected: {
        color: Theme.colors.accent,
        fontWeight: 'bold',
    },
    teamOptionDisabled: {
        backgroundColor: Theme.colors.secondary,
        borderColor: Theme.colors.border,
        opacity: 0.6,
    },
    teamOptionTextDisabled: {
        color: Theme.colors.textSecondary,
    },
    alreadyMappedText: {
        fontSize: 10,
        color: Theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    teamOptionLeft: {
        flex: 1,
    },
    clearMappingBtn: {
        alignItems: 'center',
        padding: 12,
    },
    clearMappingText: {
        color: Theme.colors.danger,
        fontWeight: '600',
    },
    mappingActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    cancelMappingBtn: {
        flex: 1,
        padding: 14,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: Theme.colors.secondary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    cancelMappingText: {
        color: Theme.colors.textPrimary,
        fontWeight: 'bold',
    },
    applyMappingBtn: {
        flex: 2,
        padding: 14,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: Theme.colors.accent,
    },
    applyMappingText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    memberKillsSection: {
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    memberKillsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Theme.colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    memberKillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    memberKillName: {
        fontSize: 14,
        color: Theme.colors.textPrimary,
    },
    memberKillInput: {
        backgroundColor: Theme.colors.secondary,
        borderRadius: 4,
        padding: 4,
        width: 40,
        textAlign: 'center',
        fontSize: 14,
        color: Theme.colors.accent,
        fontWeight: 'bold',
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
