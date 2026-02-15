import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { X, Sparkles, Save, ArrowLeft, Trash2, Plus } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { getLobby, updateLobby, deleteLobby } from '../lib/dataService';

const EditLobbyScreen = ({ route, navigation }) => {
    const { lobbyId } = route.params || {};
    const [lobby, setLobby] = useState(null);
    const [name, setName] = useState('');
    const [game, setGame] = useState('freeFire');
    const [pointsSystem, setPointsSystem] = useState([]);
    const [killPoints, setKillPoints] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [metadataList, setMetadataList] = useState([]); // [{key: '', value: ''}]

    useEffect(() => {
        if (lobbyId) {
            fetchLobby();
        }
    }, [lobbyId]);

    const fetchLobby = async () => {
        setLoading(true);
        try {
            const data = await getLobby(lobbyId);

            setLobby(data);
            setName(data.name);
            setGame(data.game || 'freeFire');
            setPointsSystem(data.points_system || []);
            setKillPoints(data.kill_points || 1);
            
            // Convert object metadata to list for easier editing
            const meta = data.metadata || {};
            const list = Object.keys(meta).map(key => ({
                key,
                value: String(meta[key])
            }));
            setMetadataList(list);
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

    const addMetadataField = () => {
        setMetadataList([...metadataList, { key: '', value: '' }]);
    };

    const removeMetadataField = (index) => {
        setMetadataList(metadataList.filter((_, i) => i !== index));
    };

    const updateMetadataField = (index, field, value) => {
        const newList = [...metadataList];
        newList[index][field] = value;
        setMetadataList(newList);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a lobby name');
            return;
        }

        // Convert list back to object, filtering out empty keys
        const metadataObj = {};
        metadataList.forEach(item => {
            if (item.key.trim()) {
                metadataObj[item.key.trim()] = item.value;
            }
        });

        setSaving(true);
        try {
            await updateLobby(lobbyId, {
                name: name.trim(),
                metadata: metadataObj
            });

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
                            await deleteLobby(lobbyId);
                            navigation.navigate('Dashboard');
                        } catch (err) {
                            console.error('Error deleting lobby:', err);
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
                    <Text style={styles.helperText}>Other settings like game and points system are locked after creation.</Text>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.label}>Custom Metadata</Text>
                        <TouchableOpacity style={styles.addMetaBtn} onPress={addMetadataField}>
                            <Plus size={16} color={Theme.colors.accent} />
                            <Text style={styles.addMetaBtnText}>Add Field</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {metadataList.length === 0 ? (
                        <Text style={styles.emptyMetaText}>No custom metadata added yet.</Text>
                    ) : (
                        metadataList.map((item, index) => (
                            <View key={index} style={styles.metaRow}>
                                <TextInput
                                    style={[styles.metaInput, styles.metaKeyInput]}
                                    placeholder="Key (e.g. dha)"
                                    value={item.key}
                                    onChangeText={(v) => updateMetadataField(index, 'key', v)}
                                    placeholderTextColor={Theme.colors.textSecondary}
                                />
                                <TextInput
                                    style={[styles.metaInput, styles.metaValueInput]}
                                    placeholder="Value"
                                    value={item.value}
                                    onChangeText={(v) => updateMetadataField(index, 'value', v)}
                                    placeholderTextColor={Theme.colors.textSecondary}
                                />
                                <TouchableOpacity onPress={() => removeMetadataField(index)} style={styles.removeMetaBtn}>
                                    <X size={18} color={Theme.colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
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
    helperText: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        marginTop: 8,
        fontStyle: 'italic',
    },
    addMetaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addMetaBtnText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.accent,
    },
    emptyMetaText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: 20,
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderStyle: 'dashed',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    metaInput: {
        backgroundColor: Theme.colors.primary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 8,
        padding: 10,
        color: Theme.colors.textPrimary,
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
    },
    metaKeyInput: {
        flex: 1,
        fontFamily: Theme.fonts.monospace,
    },
    metaValueInput: {
        flex: 1.5,
    },
    removeMetaBtn: {
        padding: 5,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: 12,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    settingTextContent: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
    },
    settingDescription: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        marginTop: 2,
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
