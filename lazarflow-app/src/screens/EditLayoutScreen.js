import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { X, Save, ArrowLeft, Plus, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';

const EditLayoutScreen = ({ route, navigation }) => {
    const { layoutId } = route.params || {};
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tournament, setTournament] = useState(null);
    const [pointsSystem, setPointsSystem] = useState([]);
    const [killPoints, setKillPoints] = useState(1);
    const [name, setName] = useState('');

    useEffect(() => {
        if (layoutId) {
            fetchTournament();
        }
    }, [layoutId]);

    const fetchTournament = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', layoutId)
                .single();

            if (error) throw error;

            setTournament(data);
            setName(data.name);
            setPointsSystem(data.points_system || []);
            setKillPoints(data.kill_points || 1);
        } catch (error) {
            console.error('Error fetching tournament:', error);
            Alert.alert('Error', 'Failed to fetch tournament details');
        } finally {
            setLoading(false);
        }
    };

    const handlePointsChange = (index, value) => {
        const newSystem = [...pointsSystem];
        newSystem[index].points = parseInt(value) || 0;
        setPointsSystem(newSystem);
    };

    const handleAddRow = () => {
        const nextPlacement = pointsSystem.length + 1;
        setPointsSystem([...pointsSystem, { placement: nextPlacement, points: 0 }]);
    };

    const handleRemoveRow = (index) => {
        const newSystem = pointsSystem.filter((_, i) => i !== index).map((row, i) => ({
            ...row,
            placement: i + 1
        }));
        setPointsSystem(newSystem);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('tournaments')
                .update({
                    name: name,
                    points_system: pointsSystem,
                    kill_points: killPoints
                })
                .eq('id', layoutId);

            if (error) throw error;

            Alert.alert('Success', 'Layout saved successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to save layout');
        } finally {
            setSaving(false);
        }
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
                <Text style={styles.headerTitle}>Edit Layout</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : <Text style={styles.saveBtnText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Tournament Info</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Tournament Name"
                            placeholderTextColor={Theme.colors.textSecondary}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionLabel}>Points Distribution</Text>
                        <View style={styles.killPointsBadge}>
                            <Sparkles size={14} color={Theme.colors.accent} />
                            <Text style={styles.killLabel}>Kill Pts:</Text>
                            <TextInput
                                style={styles.killInput}
                                keyboardType="numeric"
                                value={String(killPoints)}
                                onChangeText={(v) => setKillPoints(parseInt(v) || 0)}
                            />
                        </View>
                    </View>

                    <View style={styles.pointsList}>
                        {pointsSystem.map((item, index) => (
                            <View key={index} style={styles.pointRow}>
                                <Text style={styles.placementText}>#{item.placement}</Text>
                                <TextInput
                                    style={styles.pointInput}
                                    keyboardType="numeric"
                                    value={String(item.points)}
                                    onChangeText={(v) => handlePointsChange(index, v)}
                                />
                                <Text style={styles.ptsText}>pts</Text>
                                <TouchableOpacity onPress={() => handleRemoveRow(index)} style={styles.removeRowBtn}>
                                    <X size={16} color={Theme.colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.addButton} onPress={handleAddRow}>
                        <Plus size={20} color={Theme.colors.accent} />
                        <Text style={styles.addButtonText}>Add Placement Row</Text>
                    </TouchableOpacity>
                </View>
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
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    saveBtnText: {
        color: Theme.colors.accent,
        fontWeight: 'bold',
        fontSize: 16,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    inputGroup: {
        backgroundColor: Theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    label: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginBottom: 4,
    },
    input: {
        fontSize: 16,
        color: Theme.colors.textPrimary,
        padding: 0,
        fontWeight: '500',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    killPointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    killLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Theme.colors.accent,
    },
    killInput: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Theme.colors.accent,
        width: 24,
        textAlign: 'center',
        padding: 0,
    },
    pointsList: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        overflow: 'hidden',
    },
    pointRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    placementText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        width: 40,
    },
    pointInput: {
        flex: 1,
        textAlign: 'right',
        fontSize: 16,
        fontWeight: '600',
        color: Theme.colors.accent,
        padding: 0,
    },
    ptsText: {
        marginLeft: 8,
        fontSize: 12,
        color: Theme.colors.textSecondary,
        width: 30,
    },
    removeRowBtn: {
        marginLeft: 8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Theme.colors.accent,
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    addButtonText: {
        color: Theme.colors.accent,
        fontWeight: '600',
    },
});

export default EditLayoutScreen;
