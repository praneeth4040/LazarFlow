import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator, Image, Platform, StatusBar } from 'react-native';
import { Palette, Type, Image as LucideImage, Footer, Header, Save, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';
import * as ImagePicker from 'expo-image-picker';

const AccordionSection = ({ title, icon: Icon, isOpen, onToggle, children }) => (
    <View style={styles.accordionContainer}>
        <TouchableOpacity style={styles.accordionHeader} onPress={onToggle}>
            <View style={styles.accordionTitleRow}>
                <Icon size={20} color={Theme.colors.accent} />
                <Text style={styles.accordionTitle}>{title}</Text>
            </View>
            {isOpen ? <ChevronUp size={20} color={Theme.colors.textSecondary} /> : <ChevronDown size={20} color={Theme.colors.textSecondary} />}
        </TouchableOpacity>
        {isOpen && <View style={styles.accordionContent}>{children}</View>}
    </View>
);

const ColorInput = ({ label, value, onChange }) => (
    <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.colorRow}>
            <View style={[styles.colorPreview, { backgroundColor: value || '#000000' }]} />
            <TextInput
                style={styles.colorInput}
                value={value}
                onChangeText={onChange}
                placeholder="#000000"
                placeholderTextColor={Theme.colors.textSecondary}
            />
        </View>
    </View>
);

const AdvancedLayoutScreen = ({ route, navigation }) => {
    const { tournamentId } = route.params || {};
    const [activeSection, setActiveSection] = useState('background');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        backgroundColor: '#ffffff',
        backgroundImage: '',
        fontFamily: 'System',
        headerBackgroundColor: '#1a73e8',
        headerTextColor: '#ffffff',
        footerBackgroundColor: '#000000',
        footerTextColor: '#ffffff',
        footerText: 'POWERED BY LAZARFLOW',
        primaryColor: '#1a73e8',
    });

    useEffect(() => {
        if (tournamentId) fetchTournamentLayout();
    }, [tournamentId]);

    const fetchTournamentLayout = async () => {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('layout_config')
                .eq('id', tournamentId)
                .single();
            if (error) throw error;
            if (data?.layout_config) {
                setConfig({ ...config, ...data.layout_config });
            }
        } catch (err) {
            console.error('Error fetching layout:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('tournaments')
                .update({ layout_config: config })
                .eq('id', tournamentId);
            if (error) throw error;
            Alert.alert('Success', 'Layout saved successfully!');
        } catch (err) {
            Alert.alert('Error', 'Failed to save layout');
        } finally {
            setSaving(false);
        }
    };

    const pickImage = async (key) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(key, result.assets[0].uri);
        }
    };

    const uploadImage = async (key, uri) => {
        setSaving(true);
        try {
            const uriParts = uri.split('.');
            const fileType = uriParts[uriParts.length - 1];
            const fileName = `layout_${tournamentId}_${key}_${Date.now()}.${fileType}`;

            const formData = new FormData();
            formData.append('file', {
                uri,
                name: fileName,
                type: `image/${fileType}`,
            });

            const { data, error } = await supabase.storage
                .from('layouts')
                .upload(fileName, formData);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('layouts')
                .getPublicUrl(fileName);

            setConfig({ ...config, [key]: publicUrl });
        } catch (err) {
            Alert.alert('Error', 'Failed to upload image');
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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Advanced Layout</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color={Theme.colors.accent} /> : <Save size={24} color={Theme.colors.accent} />}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <AccordionSection
                    title="Background"
                    icon={Palette}
                    isOpen={activeSection === 'background'}
                    onToggle={() => setActiveSection(activeSection === 'background' ? null : 'background')}
                >
                    <ColorInput
                        label="Background Color"
                        value={config.backgroundColor}
                        onChange={(v) => setConfig({ ...config, backgroundColor: v })}
                    />
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Background Image</Text>
                        {config.backgroundImage ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: config.backgroundImage }} style={styles.imagePreview} />
                                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setConfig({ ...config, backgroundImage: '' })}>
                                    <Text style={styles.removeImageText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('backgroundImage')}>
                                <LucideImage size={24} color={Theme.colors.textSecondary} />
                                <Text style={styles.uploadBtnText}>Upload Image</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </AccordionSection>

                <AccordionSection
                    title="Typography"
                    icon={Type}
                    isOpen={activeSection === 'typography'}
                    onToggle={() => setActiveSection(activeSection === 'typography' ? null : 'typography')}
                >
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Font Family</Text>
                        <TextInput
                            style={styles.textInput}
                            value={config.fontFamily}
                            onChangeText={(v) => setConfig({ ...config, fontFamily: v })}
                            placeholder="System, Roboto, etc."
                            placeholderTextColor={Theme.colors.textSecondary}
                        />
                    </View>
                </AccordionSection>

                <AccordionSection
                    title="Header & Footer"
                    icon={Palette}
                    isOpen={activeSection === 'headerFooter'}
                    onToggle={() => setActiveSection(activeSection === 'headerFooter' ? null : 'headerFooter')}
                >
                    <ColorInput
                        label="Header Color"
                        value={config.headerBackgroundColor}
                        onChange={(v) => setConfig({ ...config, headerBackgroundColor: v })}
                    />
                    <ColorInput
                        label="Footer Color"
                        value={config.footerBackgroundColor}
                        onChange={(v) => setConfig({ ...config, footerBackgroundColor: v })}
                    />
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Footer Text</Text>
                        <TextInput
                            style={styles.textInput}
                            value={config.footerText}
                            onChangeText={(v) => setConfig({ ...config, footerText: v })}
                            placeholder="POWERED BY LAZARFLOW"
                            placeholderTextColor={Theme.colors.textSecondary}
                        />
                    </View>
                </AccordionSection>
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
    scrollContent: {
        padding: 16,
    },
    accordionContainer: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: 12,
        overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    accordionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accordionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    accordionContent: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        backgroundColor: 'rgba(26, 115, 232, 0.01)',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        marginBottom: 8,
    },
    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    colorPreview: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    colorInput: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 8,
        padding: 10,
        color: Theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    textInput: {
        backgroundColor: Theme.colors.secondary,
        borderRadius: 8,
        padding: 12,
        color: Theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: 8,
        gap: 10,
    },
    uploadBtnText: {
        color: Theme.colors.textSecondary,
        fontWeight: '600',
    },
    imagePreviewContainer: {
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
    },
    imagePreview: {
        width: '100%',
        height: 150,
    },
    removeImageBtn: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    removeImageText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default AdvancedLayoutScreen;
