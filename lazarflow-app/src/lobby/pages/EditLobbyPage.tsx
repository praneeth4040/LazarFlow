import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Trophy, ChevronRight } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { useEditLobby } from '../hooks/useEditLobby';

export const EditLobbyPage = ({ route, navigation }: any) => {
    const { lobbyId } = route.params || {};

    const {
        name, setName,
        loading, saving,
        handleSave, confirmDelete
    } = useEditLobby(lobbyId, navigation);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Lobby</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.label}>Lobby Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter lobby name"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor={Theme.colors.textSecondary}
                    />
                    <Text style={styles.helperText}>Other settings like game and points system are locked after creation.</Text>
                </View>

                {/* Match Scores — per-match results + editing (MatchHistoryPage) */}
                <TouchableOpacity
                    style={styles.matchScoresCard}
                    onPress={() => navigation.navigate('MatchHistory', {
                        lobbyId,
                        lobbyName: name,
                    })}
                >
                    <View style={styles.matchScoresLeft}>
                        <Trophy size={18} color={Theme.colors.accent} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.matchScoresTitle}>Match Scores</Text>
                            <Text style={styles.matchScoresSub}>View and edit team results, match by match</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color={Theme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
                    <Trash2 size={20} color={Theme.colors.danger} />
                    <Text style={styles.deleteButtonText}>Delete Lobby</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.primary },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.secondary },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Theme.colors.primary, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
    headerTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    backButton: { padding: 4 },
    saveBtnText: { color: Theme.colors.accent, fontFamily: Theme.fonts.outfit.bold, fontSize: 16 },
    scrollContent: { padding: 20, backgroundColor: Theme.colors.secondary },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    label: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 8 },
    input: { backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, padding: 12, color: Theme.colors.textPrimary, fontSize: 16, fontFamily: Theme.fonts.outfit.regular },
    helperText: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 8, fontStyle: 'italic' },
    matchScoresCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12,
    },
    matchScoresLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
    matchScoresTitle: { fontSize: 15, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    matchScoresSub: { fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, marginTop: 2 },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderWidth: 1, borderColor: Theme.colors.danger, borderRadius: 12, marginTop: 20, gap: 8 },
    deleteButtonText: { color: Theme.colors.danger, fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
});
