import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, Platform, ActivityIndicator, Alert as RNAlert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Share2, Palette, Trash2, BookmarkPlus, BadgeCheck } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { UserContext } from '../../context/UserContext';

interface DesignDetailsPageProps {
    route: any;
    navigation: any;
}

const { getDesignImageSource, getTheme, deleteTheme, saveThemeCopy, getThemeShareLink } = require('../../lib/dataService');

export const DesignDetailsPage: React.FC<DesignDetailsPageProps> = ({ route, navigation }) => {
    const { theme: initialTheme, themeId } = route.params || {};
    const { user } = useContext(UserContext);

    const [theme, setTheme] = useState<any>(initialTheme || null);
    const [loading, setLoading] = useState<boolean>(!initialTheme && !!themeId);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!initialTheme && themeId) {
            const fetchThemeData = async () => {
                try {
                    const data = await getTheme(themeId);
                    setTheme(data);
                } catch (error) {
                    Alert.alert('Error', 'Failed to load design details. It may have been deleted.');
                    navigation.goBack();
                } finally {
                    setLoading(false);
                }
            };
            fetchThemeData();
        }
    }, [themeId, initialTheme]);

    const isOwner = !!user?.id && !!theme?.user_id && user.id === theme.user_id;

    // Resolve creator display name
    const creatorName =
        theme?.creator_username ||
        theme?.display_name ||
        theme?.author ||
        (theme?.user_id ? 'LazarFlow User' : 'LazarFlow Team');

    const handleShare = async () => {
        try {
            const url = getThemeShareLink(theme.id);
            await Share.share({
                message: `Check out this design on LazarFlow: ${url}`,
                url: url,
            });
        } catch (error: any) {
            Alert.alert('Error', 'Failed to share design.');
        }
    };

    const handleDelete = () => {
        RNAlert.alert(
            'Delete Design',
            'Are you sure you want to delete this design? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            await deleteTheme(theme.id);
                            navigation.goBack();
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to delete design.');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        try {
            setActionLoading(true);
            await saveThemeCopy(theme.id);
            
            // Invalidate cache so the dashboard knows to refetch
            const userId = user?.id;
            if (userId) {
                await AsyncStorage.removeItem(`cache_user_themes_${userId}`);
            }

            Alert.alert('Saved!', `"${theme.name}" has been saved to your designs and is ready to use.`);
            navigation.goBack(); // Return to dashboard to see the new design
        } catch (err: any) {
            Alert.alert('Error', 'Failed to save design. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
            </View>
        );
    }

    if (!theme) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontFamily: Theme.fonts.outfit.medium }}>Design not found.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: Theme.colors.accent, fontFamily: Theme.fonts.outfit.bold }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const imageSource = getDesignImageSource(theme);
    const isVerified = theme.status === 'verified';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                {/* Header Image */}
                <View style={styles.imageContainer}>
                    {imageSource ? (
                        <Image source={imageSource} style={styles.image} resizeMode="cover" />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <Palette size={64} color={Theme.colors.textSecondary} />
                        </View>
                    )}

                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(15, 23, 42, 1)']}
                        style={styles.gradientOverlay}
                    />

                    <SafeAreaView style={styles.headerOverlay}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.headerActions}>
                            {/* Share — enabled for owner */}
                            {isOwner && (
                                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                                    <Share2 size={20} color="#fff" />
                                </TouchableOpacity>
                            )}
                            {/* Delete — only for owner */}
                            {isOwner && (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: 'rgba(239,68,68,0.35)' }]}
                                    onPress={handleDelete}
                                    disabled={actionLoading}
                                >
                                    <Trash2 size={20} color="#ef4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </SafeAreaView>
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.titleSection}>
                        <View style={styles.titleHeaderRow}>
                            <Text style={styles.title}>{theme.name || 'Untitled Design'}</Text>
                            {/* Status pill */}
                            <View style={[styles.statusPill, { backgroundColor: isVerified ? '#10b98120' : '#f59e0b20' }]}>
                                <View style={[styles.statusDot, { backgroundColor: isVerified ? '#10b981' : '#f59e0b' }]} />
                                <Text style={[styles.statusLabel, { color: isVerified ? '#10b981' : '#f59e0b' }]}>
                                    {theme.status?.toUpperCase() || 'PENDING'}
                                </Text>
                            </View>
                        </View>

                        {/* Creator */}
                        <View style={styles.authorRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{creatorName.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.authorLabel}>Created by</Text>
                                <Text style={styles.authorName}>{creatorName}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>About this Design</Text>
                        {theme.description ? (
                            <Text style={styles.description}>{theme.description}</Text>
                        ) : (
                            <Text style={[styles.description, { fontStyle: 'italic', opacity: 0.5 }]}>
                                No description provided.
                            </Text>
                        )}
                    </View>

                    {/* Tags */}
                    {theme.tags && theme.tags.length > 0 && (
                        <View style={styles.tagsSection}>
                            {theme.tags.map((tag: string, index: number) => (
                                <View key={index} style={styles.tag}>
                                    <Text style={styles.tagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
                <View style={styles.bottomBarContent}>
                    {isOwner ? (
                        /* Owner sees: Verified badge (non-interactive) */
                        <View style={[styles.statusBanner, { backgroundColor: isVerified ? '#10b98115' : '#f59e0b15', borderColor: isVerified ? '#10b981' : '#f59e0b' }]}>
                            <BadgeCheck size={20} color={isVerified ? '#10b981' : '#f59e0b'} />
                            <Text style={[styles.statusBannerText, { color: isVerified ? '#10b981' : '#f59e0b' }]}>
                                {isVerified ? 'Design Verified' : 'Verification Pending'}
                            </Text>
                        </View>
                    ) : (
                        /* Non-owner sees: Save Design button */
                        <TouchableOpacity
                            style={[styles.saveButton, actionLoading && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <BookmarkPlus size={20} color="#fff" />
                                    <Text style={styles.saveButtonText}>Save this Design</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.secondary },
    scrollContent: { paddingBottom: 110 },
    imageContainer: { width: '100%', height: 400, position: 'relative' },
    image: { width: '100%', height: '100%' },
    placeholderImage: { backgroundColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
    gradientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    headerActions: { flexDirection: 'row', gap: 10 },
    actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    contentContainer: { marginTop: -40, backgroundColor: Theme.colors.secondary, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 32 },
    titleSection: { marginBottom: 24 },
    titleHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
    title: { fontSize: 26, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, flex: 1 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusLabel: { fontSize: 11, fontFamily: Theme.fonts.outfit.bold, letterSpacing: 0.5 },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontFamily: Theme.fonts.outfit.bold, fontSize: 16 },
    authorLabel: { fontSize: 11, color: Theme.colors.textSecondary, fontFamily: Theme.fonts.outfit.regular },
    authorName: { fontSize: 15, color: Theme.colors.textPrimary, fontFamily: Theme.fonts.outfit.semibold || Theme.fonts.outfit.bold },
    descriptionSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary, marginBottom: 10 },
    description: { fontSize: 15, fontFamily: Theme.fonts.outfit.regular, color: Theme.colors.textSecondary, lineHeight: 24 },
    tagsSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    tag: { backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Theme.colors.border },
    tagText: { color: Theme.colors.textSecondary, fontSize: 13, fontFamily: Theme.fonts.outfit.regular },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Theme.colors.secondary, borderTopWidth: 1, borderTopColor: Theme.colors.border },
    bottomBarContent: { padding: 16 },
    statusBanner: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5 },
    statusBannerText: { fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    saveButton: { backgroundColor: Theme.colors.accent, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: Theme.colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    saveButtonText: { color: '#fff', fontSize: 17, fontFamily: Theme.fonts.outfit.bold },
});
