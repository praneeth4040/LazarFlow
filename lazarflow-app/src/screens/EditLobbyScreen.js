import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { X, Sparkles, Save, ArrowLeft, Trash2 } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';

const EditLobbyScreen = ({ route, navigation }) => {
    const { lobbyId } = route.params || {};
    const [lobby, setLobby] = useState(null);
    const [name, setName] = useState('');
    const [game, setGame] = useState('freeFire');
    const [pointsSystem, setPointsSystem] = useState([]);
    const [killPoints, setKillPoints] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (lobbyId) {
            fetchLobby();
        }
    }, [lobbyId]);

    const fetchLobby = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lobbies')
                .select('*')
                .eq('id', lobbyId)
                .single();

            if (error) throw error;

            setLobby(data);
            setName(data.name);
            setGame(data.game || 'freeFire');
            setPointsSystem(data.points_system || []);
            setKillPoints(data.kill_points || 1);
        } catch (error) {
            console.error('Error fetching lobby:', error);
            Alert.alert('Error', 'Failed to load lobby details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handlePointsChange = (index, value) => {
        const newSystem = [...pointsSystem];
        newSystem[index].points = parseInt(value) || 0;
        setPointsSystem(newSystem);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a lobby name');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('lobbies')
                .update({
                    name: name.trim(),
                    game: game,
                    points_system: pointsSystem,
                    kill_points: killPoints
                })
                .eq('id', lobbyId);

            if (error) throw error;

            Alert.alert('Success', 'Lobby updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error updating lobby:', error);
            Alert.alert('Error', 'Failed to update lobby');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            "Delete Lobby",
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setSaving(true);
                            const { error } = await supabase
                                .from('lobbies')
                                .delete()
                                .eq('id', lobbyId);
                            if (error) throw error;
                            navigation.navigate('Dashboard');
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete lobby");
                        } finally {
                            setSaving(false);
                        }
                    }
                }
            ]
        );
    };

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
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Game *</Text>
                    <View style={styles.gameGrid}>
                        {['freeFire', 'bgmi', 'other'].map((g) => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.gameCard, game === g && styles.gameCardActive]}
                                onPress={() => setGame(g)}
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

                <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
                    <Trash2 size={20} color={Theme.colors.danger} />
                    <Text style={styles.deleteButtonText}>Delete Lobby</Text>
                </TouchableOpacity>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
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
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    saveBtnText: {
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.bold,
        fontSize: 16,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.regular,
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
        fontFamily: Theme.fonts.outfit.semibold,
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
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.accent,
    },
    killPointsInput: {
        width: 30,
        textAlign: 'center',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.monospace,
        color: Theme.colors.textPrimary,
    },
    pointInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
        fontFamily: Theme.fonts.monospace,
        color: Theme.colors.accent,
        paddingVertical: 0,
    },
    pointsSuffix: {
        marginLeft: 8,
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 1,
        borderColor: Theme.colors.danger,
        borderRadius: 12,
        marginTop: 20,
        gap: 8,
    },
    deleteButtonText: {
        color: Theme.colors.danger,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
});

export default EditLobbyScreen;
