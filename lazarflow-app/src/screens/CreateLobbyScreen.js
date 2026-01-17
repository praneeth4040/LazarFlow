// Main screen for creating a new lobby
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Sparkles, Trophy, Target, ChevronDown, Save, ArrowLeft, Crown } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';
import { useSubscription } from '../hooks/useSubscription';

const CreateLobbyScreen = ({ navigation }) => {
    const { canUseAI, tier, limits, lobbiesCreated, loading: subLoading } = useSubscription();
    const defaultPointsSystems = {
        freeFire: [
            { placement: 1, points: 12 },
            { placement: 2, points: 9 },
            { placement: 3, points: 8 },
            { placement: 4, points: 7 },
            { placement: 5, points: 6 },
            { placement: 6, points: 5 },
            { placement: 7, points: 4 },
            { placement: 8, points: 3 },
            { placement: 9, points: 2 },
            { placement: 10, points: 1 },
            { placement: 11, points: 0 },
            { placement: 12, points: 0 },
        ],
        bgmi: [
            { placement: 1, points: 10 },
            { placement: 2, points: 6 },
            { placement: 3, points: 5 },
            { placement: 4, points: 4 },
            { placement: 5, points: 3 },
            { placement: 6, points: 2 },
            { placement: 7, points: 1 },
            { placement: 8, points: 1 },
        ],
        other: [
            { placement: 1, points: 10 },
            { placement: 2, points: 8 },
            { placement: 3, points: 6 },
            { placement: 4, points: 4 },
            { placement: 5, points: 2 },
        ],
    };

    const [name, setName] = useState('');
    const [game, setGame] = useState('freeFire');
    const [pointsSystem, setPointsSystem] = useState(defaultPointsSystems.freeFire);
    const [killPoints, setKillPoints] = useState(1);
    const [placementCount, setPlacementCount] = useState(12);
    const [loading, setLoading] = useState(false);

    const handleGameChange = (selectedGame) => {
        setGame(selectedGame);
        const defaultSystem = defaultPointsSystems[selectedGame];
        setPointsSystem(defaultSystem);
        setPlacementCount(defaultSystem.length);
    };

    const handlePointsChange = (index, value) => {
        const newSystem = [...pointsSystem];
        newSystem[index].points = parseInt(value) || 0;
        setPointsSystem(newSystem);
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a lobby name');
            return;
        }

        if (!canUseAI && tier === 'free') {
            Alert.alert(
                'Limit Reached',
                'You have reached your monthly limit of 2 lobbies. Upgrade to a premium plan to create more!',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'View Plans', onPress: () => navigation.navigate('SubscriptionPlans') }
                ]
            );
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('lobbies')
                .insert([
                    {
                        name: name.trim(),
                        game: game,
                        user_id: user.id,
                        points_system: pointsSystem,
                        kill_points: killPoints,
                        status: 'active'
                    }
                ])
                .select('id, name')
                .single();

            if (error) throw error;

            Alert.alert('Success', 'Lobby created successfully!');
            navigation.navigate('ManageTeams', { lobbyId: data.id, lobbyName: data.name });
        } catch (error) {
            console.error('Error creating lobby:', error);
            Alert.alert('Error', error.message || 'Failed to create lobby');
        } finally {
            setLoading(false);
        }
    };

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
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Theme.colors.primary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 8,
        padding: 12,
        color: Theme.colors.textPrimary,
        fontSize: 16,
    },
    gameGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    gameCard: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: Theme.colors.primary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 8,
        alignItems: 'center',
    },
    gameCardActive: {
        borderColor: Theme.colors.accent,
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
    },
    gameCardText: {
        color: Theme.colors.textSecondary,
        fontWeight: '600',
    },
    gameCardTextActive: {
        color: Theme.colors.accent,
    },
    killPointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    killPointsLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Theme.colors.accent,
    },
    killPointsInput: {
        width: 30,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: 'bold',
        color: Theme.colors.accent,
        padding: 0,
    },
    pointsGrid: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        padding: 10,
    },
    pointRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    placementText: {
        width: 40,
        fontSize: 14,
        fontWeight: '700',
        color: Theme.colors.textPrimary,
    },
    pointInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
        fontWeight: '600',
        color: Theme.colors.accent,
        paddingVertical: 0,
    },
    pointsSuffix: {
        marginLeft: 8,
        fontSize: 12,
        color: Theme.colors.textSecondary,
    },
    footer: {
        padding: 16,
        backgroundColor: Theme.colors.primary,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
    createButton: {
        backgroundColor: Theme.colors.accent,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});

export default CreateLobbyScreen;
