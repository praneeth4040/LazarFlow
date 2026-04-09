import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { useSubscription } from '../../hooks/useSubscription';
import { useCreateLobby } from '../hooks/useCreateLobby';

export const CreateLobbyPage = ({ navigation }: any) => {
    const { canUseAI, maxAILobbies } = useSubscription();

    const {
        name, setName,
        game, handleGameChange,
        pointsSystem, handlePointsChange,
        killPoints, setKillPoints,
        loading, handleCreate
    } = useCreateLobby(canUseAI, maxAILobbies, navigation);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Lobby</Text>
                <View style={{ width: 40 }} />
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
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Game *</Text>
                    <View style={styles.gameGrid}>
                        {['freeFire', 'bgmi', 'other'].map((g) => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.gameCard, game === g && styles.gameCardActive]}
                                onPress={() => handleGameChange(g)}
                            >
                                <Text style={[styles.gameCardText, game === g && styles.gameCardTextActive]}>
                                    {g === 'freeFire' ? 'Free Fire' : g === 'bgmi' ? 'BGMI' : 'Other'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.label}>Points System</Text>
                        <View style={styles.killPointsContainer}>
                            <Sparkles size={16} color={Theme.colors.accent} />
                            <Text style={styles.killPointsLabel}>Kill Points:</Text>
                            <TextInput
                                style={styles.killPointsInput}
                                keyboardType="numeric"
                                value={String(killPoints)}
                                onChangeText={(v) => setKillPoints(parseInt(v) || 0)}
                            />
                        </View>
                    </View>

                    <View style={styles.pointsGrid}>
                        {pointsSystem.map((item, index) => (
                            <View key={index} style={styles.pointRow}>
                                <Text style={styles.placementText}>#{item.placement}</Text>
                                <TextInput
                                    style={styles.pointInput}
                                    keyboardType="numeric"
                                    value={String(item.points)}
                                    onChangeText={(v) => handlePointsChange(index, v)}
                                />
                                <Text style={styles.pointsSuffix}>pts</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.createButton, loading && styles.buttonDisabled]}
                    onPress={handleCreate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.createButtonText}>Create & Add Teams</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.primary },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Theme.colors.primary, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
    headerTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    backButton: { padding: 4 },
    scrollContent: { padding: 20, backgroundColor: Theme.colors.secondary },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    label: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.textPrimary, marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 12, padding: 16, color: Theme.colors.textPrimary, fontSize: 16, fontFamily: Theme.fonts.outfit.regular },
    gameGrid: { flexDirection: 'row', gap: 10 },
    gameCard: { flex: 1, paddingVertical: 12, backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: 8, alignItems: 'center' },
    gameCardActive: { borderColor: Theme.colors.accent, backgroundColor: 'rgba(26, 115, 232, 0.05)' },
    gameCardText: { color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.semibold },
    gameCardTextActive: { color: Theme.colors.accent },
    killPointsContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 115, 232, 0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
    killPointsLabel: { fontSize: 12, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent },
    killPointsInput: { width: 30, textAlign: 'center', fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent, padding: 0 },
    pointsGrid: { backgroundColor: Theme.colors.primary, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, padding: 10 },
    pointRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
    placementText: { width: 40, fontSize: 14, fontFamily: Theme.fonts.monospace, color: Theme.colors.textPrimary },
    pointInput: { flex: 1, textAlign: 'right', fontSize: 16, fontFamily: Theme.fonts.monospace, color: Theme.colors.accent, paddingVertical: 0 },
    pointsSuffix: { marginLeft: 8, fontSize: 12, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary },
    footer: { padding: 16, backgroundColor: Theme.colors.primary, borderTopWidth: 1, borderTopColor: Theme.colors.border },
    createButton: { backgroundColor: Theme.colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: Theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    createButtonText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    buttonDisabled: { opacity: 0.7 },
});
