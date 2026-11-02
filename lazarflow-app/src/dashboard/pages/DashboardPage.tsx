import React, { useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Image, Modal, ScrollView, TextInput, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, User, Plus, Palette, Crown, X, Zap, Bell, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../styles/theme';
import { extractApiErrorMessage } from '../../lib/apiClient';
import { authService } from '../../lib/authService';
import { UserContext } from '../../context/UserContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useFocusEffect } from '@react-navigation/native';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { useOcrJobs } from '../../context/OcrJobContext';
import { useNotificationsUnread } from '../../hooks/useNotificationsUnread';

// Dashboard Hooks & Repository
import { useDashboard } from '../hooks/useDashboard';
import { DashboardRepository } from '../services/DashboardRepository';

// Dashboard Tabs
import HomeTab from '../components/HomeTab';
import LobbiesTab from '../components/LobbiesTab';
import DesignTab from '../components/DesignTab';
import ProfileTab from '../components/ProfileTab';

import { SubscriptionPlansPage } from '../../subscription/pages/SubscriptionPlansPage';

const DashboardPage = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { tier, lobbiesCreated, loading: subLoading, maxAILobbies, maxLayouts, expiresAt } = useSubscription();
    const { user, loading: userLoading, refreshUser } = useContext(UserContext);
    const { unreadCount, activeJobsCount } = useOcrJobs();
    const { unreadCount: dbUnreadCount } = useNotificationsUnread(user?.id);
    
    const dashboard = useDashboard(user, refreshUser);
    const [claimedPromo, setClaimedPromo] = React.useState(false);

    const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
        account: true,
        stats: false,
        history: false,
        partnership: false,
        legal: false
    });

    // Handle tab navigation from other screens
    useEffect(() => {
        if (route.params?.tab) {
            dashboard.setActiveTab(route.params.tab);
            navigation.setParams({ tab: undefined });
        }
    }, [route.params?.tab, navigation, dashboard]);

    useEffect(() => {
        if (user?.themes_count !== undefined) {
            dashboard.setActiveLayoutsCount(user.themes_count);
        }
    }, [user?.themes_count, dashboard]);

    useEffect(() => {
        if (dashboard.activeTab === 'profile' && expandedSections.stats && user?.id && dashboard.activeLayoutsCount === 0) {
            dashboard.fetchUserThemes();
        }
    }, [dashboard.activeTab, expandedSections.stats, user?.id, dashboard]);

    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                if (refreshUser) refreshUser();
                AsyncStorage.getItem(`@claimed_promo_free_weekly_${user.id}`).then((val) => {
                    if (val === 'true') setClaimedPromo(true);
                });
                if (dashboard.activeTab === 'home' || dashboard.activeTab === 'lobbies') {
                    const limit = dashboard.activeTab === 'home' ? 5 : null;
                    dashboard.fetchLobbies(dashboard.lobbies.length === 0, limit);
                }
            }
            return () => {};
        }, [user?.id, dashboard.activeTab]) // Intentionally omitting userLoading to prevent infinite focus loop
    );

    useEffect(() => {
        if (dashboard.activeTab === 'design') {
            if (dashboard.designTab === 'own') dashboard.fetchUserThemes();
            else dashboard.fetchCommunityThemes();
        }
    }, [dashboard.activeTab, dashboard.designTab]);

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            Alert.alert('Error', 'Failed to log out.');
        }
    };

    // ── Theme: delete ────────────────────────────────────────────────────────
    const handleDeleteTheme = (theme: any) => {
        Alert.alert(
            'Delete Design',
            `Delete "${theme.name || 'this design'}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        try {
                            const { deleteTheme } = require('../../lib/dataService');
                            await deleteTheme(theme.id);
                            
                            // Optimistic UI update: Remove instantly for snappy UX
                            dashboard.setUserThemesList((prev: any) => 
                                prev.filter((t: any) => t.id !== theme.id)
                            );
                            
                            // Ask dashboard to sync and clear AsyncStorage cache in the background
                            dashboard.fetchUserThemes(true);
                        } catch (err: any) {
                            Alert.alert('Error', extractApiErrorMessage(err, 'Failed to delete design.'));
                        }
                    },
                },
            ] as any,
        );
    };

    // ── Theme: share (testing mode) ──────────────────────────────────────────
    const handleShareTheme = async (theme: any) => {
        const { getThemeShareLink } = require('../../lib/dataService');
        const url = getThemeShareLink(theme.id);
        try {
            await Share.share({
                title: `Check out this design: ${theme.name || 'LazarFlow Design'}`,
                message: `Check out this design on LazarFlow:\n${url}`,
                url,
            });
        } catch (err) {
            console.warn('Share error', err);
        }
    };

    // ── Lobby: share link for teams / LazarTrack import ────────────────────
    // The recipient DOES NOT need the LazarFlow app installed.
    // The shared HTTPS link auto-redirects into the LazarTrack app.
    const handleShareLobby = async (lobby: any) => {
        const { getLobbyShareLink } = require('../../lib/dataService');
        const url = getLobbyShareLink(lobby.id);
        const game = lobby.game || 'General';
        const teamsCount =
            typeof lobby.teams_count === 'number'
                ? lobby.teams_count
                : Array.isArray(lobby.teams)
                  ? lobby.teams.length
                  : 0;
        const line1 = `🏆 *${lobby.name || 'Tournament'}* — ${game}\n`;
        const line2 = teamsCount ? `👥 ${teamsCount} teams registered\n\n` : '\n';
        const line3 =
            'Tap the link below to open this tournament in *LazarTrack* — ' +
            'your live match tracker. Results, standings, and updates are added automatically as the tournament runs:\n\n';
        const body = line1 + line2 + line3 + url + '\n\n(LazarTrack app required — free on Play Store / App Store)';

        try {
            const shareResult = await Share.share({
                title: `${lobby.name || 'Tournament'} — Open in LazarTrack`,
                message: body,
                url,
            });

            if (shareResult?.action === Share.sharedAction && shareResult.activityType) {
                console.log(`[share] Lobby ${lobby.id} shared via ${shareResult.activityType}`);
            }
        } catch (err) {
            console.warn('Lobby share error', err);
            Alert.alert('Unable to Share', 'Please copy the link manually:\n' + url);
        }
    };

    const confirmEndLobby = (lobby: any) => {
        Alert.alert("End Lobby", `Are you sure you want to end "${lobby.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "End", style: "destructive", onPress: async () => {
                await DashboardRepository.endLobby(lobby.id);
                dashboard.fetchLobbies();
                if (refreshUser) refreshUser();
            }}
        ] as any);
    };

    const confirmDeleteLobby = (lobby: any) => {
        Alert.alert("Delete Lobby", `Delete "${lobby.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await DashboardRepository.deleteLobby(lobby.id);
                dashboard.fetchLobbies();
                if (refreshUser) refreshUser();
            }}
        ] as any);
    };

    const renderHeader = () => {
        const renderHeaderRight = () => {
            const hasActiveSub = expiresAt && new Date(expiresAt) > new Date() && tier !== 'free';
            const showPromoIndicator = !hasActiveSub && !claimedPromo;
            
            return (
            <View style={styles.headerRight}>
                {hasActiveSub ? (
                    <View style={[styles.headerBalanceBadge, { backgroundColor: '#d1fae5', borderColor: '#10b981' }]}>
                        <Crown size={12} color="#10b981" style={{ marginRight: 4 }} />
                        <Text style={[styles.headerBalanceText, { color: '#047857' }]}>Unlimited</Text>
                    </View>
                ) : (
                    <View style={styles.headerBalanceBadge}>
                        <Zap size={12} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 4 }} />
                        <Text style={styles.headerBalanceText}>{user?.flux_balance || 0}</Text>
                    </View>
                )}
                {/* Notification Bell */}
                <TouchableOpacity
                    style={styles.bellBtn}
                    onPress={() => navigation.navigate('Notifications')}
                >
                    <View style={styles.bellIconWrapper}>
                        <Bell size={20} color={showPromoIndicator || activeJobsCount > 0 || dbUnreadCount > 0 ? Theme.colors.accent : Theme.colors.textPrimary} />
                    </View>
                    {showPromoIndicator ? (
                        <View style={[styles.bellBadge, styles.bellBadgePromo]}>
                            <Gift size={9} color="#fff" />
                            {unreadCount + dbUnreadCount > 0 && (
                                <Text style={[styles.bellBadgeText, { marginLeft: 2 }]}>
                                    {unreadCount + dbUnreadCount > 9 ? '9+' : unreadCount + dbUnreadCount}
                                </Text>
                            )}
                        </View>
                    ) : (unreadCount + dbUnreadCount > 0 && (
                        <View style={styles.bellBadge}>
                            <Text style={styles.bellBadgeText}>
                                {unreadCount + dbUnreadCount > 9 ? '9+' : unreadCount + dbUnreadCount}
                            </Text>
                        </View>
                    ))}
                </TouchableOpacity>
            </View>
            );
        };

        if (dashboard.activeTab === 'home') {
             return (
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image source={require('../../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                        <Text style={styles.headerTitle}>LazarFlow</Text>
                    </View>
                    {renderHeaderRight()}
                </View>
            );
        }

        let title = t('dashboard.tabs.home');
        if (dashboard.activeTab === 'lobbies') title = t('dashboard.tabs.lobbies');
        else if (dashboard.activeTab === 'design') title = t('dashboard.tabs.design');
        else if (dashboard.activeTab === 'plans') title = t('dashboard.tabs.plans');
        else if (dashboard.activeTab === 'profile') title = t('dashboard.tabs.profile');

        return (
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
                {renderHeaderRight()}
            </View>
        );
    };

    const renderContent = () => {
        if (dashboard.loading && !dashboard.refreshing) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Theme.colors.accent} />
                </View>
            );
        }

        switch (dashboard.activeTab) {
            case 'home':
                return (
                    <HomeTab 
                        user={user} 
                        tier={tier} 
                        lobbiesCreated={lobbiesCreated} 
                        maxAILobbies={maxAILobbies}
                        lobbies={dashboard.lobbies} 
                        refreshing={dashboard.refreshing} 
                        onRefresh={dashboard.onRefresh}
                        activeSettingsId={dashboard.activeSettingsId} 
                        toggleSettings={dashboard.setActiveSettingsId}
                        onViewAll={() => dashboard.setActiveTab('lobbies')} 
                        onCalculate={(l: any) => navigation.navigate('CalculateResults', { lobby: l })}
                        onRender={(id: string) => navigation.navigate('LiveLobby', { id })} 
                        onEdit={(l: any) => navigation.navigate('EditLobby', { lobbyId: l.id })}
                        onDelete={confirmDeleteLobby} 
                        onEnd={confirmEndLobby}
                        onManageTeams={(l: any) => navigation.navigate('ManageTeams', { lobbyId: l.id, lobbyName: l.name })}
                        onShare={handleShareLobby}
                    />
                );
            case 'lobbies':
                 return (
                    <LobbiesTab 
                        lobbies={dashboard.lobbies} 
                        pastLobbies={dashboard.pastLobbies} 
                        refreshing={dashboard.refreshing} 
                        onRefresh={dashboard.onRefresh}
                        activeSettingsId={dashboard.activeSettingsId} 
                        toggleSettings={dashboard.setActiveSettingsId}
                        historyPage={dashboard.historyPage} 
                        setHistoryPage={dashboard.setHistoryPage}
                        onCalculate={(l: any) => navigation.navigate('CalculateResults', { lobby: l })}
                        onRender={(id: string) => navigation.navigate('LiveLobby', { id })} 
                        onEdit={(l: any) => navigation.navigate('EditLobby', { lobbyId: l.id })}
                        onDelete={confirmDeleteLobby} 
                        onEnd={confirmEndLobby}
                        onManageTeams={(l: any) => navigation.navigate('ManageTeams', { lobbyId: l.id, lobbyName: l.name })}
                        onShare={handleShareLobby}
                    />
                );
            case 'design':
                return (
                    <DesignTab 
                        designTab={dashboard.designTab} 
                        setDesignTab={dashboard.setDesignTab} 
                        userThemesList={dashboard.userThemesList} 
                        communityThemesList={dashboard.communityThemesList}
                        loadingCommunity={dashboard.loadingCommunity} 
                        setPreviewImage={dashboard.setPreviewImage}
                        onRefresh={dashboard.onRefresh}
                        refreshing={dashboard.refreshing}
                        onNavigateToDesign={(theme) => navigation.navigate('DesignDetails', { theme })}
                    />
                );
            case 'plans':
                return <SubscriptionPlansPage navigation={navigation} route={{ params: { isTab: true } }} />;
            case 'profile':
                 return (
                    <ProfileTab 
                        user={user} 
                        tier={tier} 
                        lobbiesCreated={lobbiesCreated} 
                        maxAILobbies={maxAILobbies}
                        maxLayouts={maxLayouts} 
                        activeLayoutsCount={dashboard.activeLayoutsCount}
                        expandedSections={expandedSections} 
                        toggleSection={(s: string) => setExpandedSections(prev => ({...prev, [s]: !prev[s]}))}
                        handleLogout={handleLogout}
                        onNavigateToPlans={() => dashboard.setActiveTab('plans')} 
                        onNavigateToPrivacy={() => navigation.navigate('PrivacyPolicy' as never)}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            {renderHeader()}
            <View style={{ flex: 1 }}>
                 {renderContent()}
                 {dashboard.activeTab === 'home' && (
                    <TouchableOpacity style={styles.fabContainer} onPress={() => navigation.navigate('CreateLobby')} activeOpacity={0.8}>
                        <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <View style={{ transform: [{ rotate: '-45deg' }] }}><Plus size={24} color="#fff" /></View>
                        </LinearGradient>
                    </TouchableOpacity>
                 )}
            </View>

            <View style={styles.tabBar}>
                <TabItem icon={Home} label={t('dashboard.tabs.home')} active={dashboard.activeTab === 'home'} onPress={() => dashboard.setActiveTab('home')} isPremium={false} />
                <TabItem icon={Palette} label={t('dashboard.tabs.design')} active={dashboard.activeTab === 'design'} onPress={() => dashboard.setActiveTab('design')} isPremium={false} />
                <TabItem icon={Crown} label={t('dashboard.tabs.plans')} active={dashboard.activeTab === 'plans'} onPress={() => dashboard.setActiveTab('plans')} isPremium />
                <TabItem icon={User} label={t('dashboard.tabs.profile')} active={dashboard.activeTab === 'profile'} onPress={() => dashboard.setActiveTab('profile')} isPremium={false} />
            </View>

            <ImagePreviewModal 
                visible={!!dashboard.previewImage} 
                image={dashboard.previewImage} 
                onClose={() => dashboard.setPreviewImage(null)} 
            />

        </SafeAreaView>
    );

};

// --- Modals and Subcomponents ---

const TabItem = ({ icon: Icon, label, active, onPress, isPremium }: any) => (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
        <View style={styles.tabItemContent}>
            <Icon size={24} color={active ? (isPremium ? '#f59e0b' : Theme.colors.accent) : Theme.colors.textSecondary} />
            <Text style={[styles.tabLabel, active && (isPremium ? { color: '#f59e0b', fontWeight: '800' } : styles.tabLabelActive)]}>{label}</Text>
        </View>
    </TouchableOpacity>
);

const ImagePreviewModal = ({ visible, image, onClose }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.imagePreviewOverlay}>
            <TouchableOpacity style={styles.imagePreviewClose} onPress={onClose}><X size={24} color="#fff" /></TouchableOpacity>
            {image && <Image source={image} style={styles.imagePreviewFull} resizeMode="contain" />}
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.primary },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerLogo: { width: 32, height: 32 },
    headerTitle: { fontSize: 20, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textPrimary },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerBalanceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5' },
    headerBalanceText: { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: '#c2410c' },
    bellBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.secondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.border },
    bellIconWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 },
    bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: Theme.colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    bellBadgeText: { color: '#fff', fontSize: 10, fontFamily: Theme.fonts.outfit.bold },
    bellBadgePromo: { backgroundColor: '#EA4335', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabBar: { 
        flexDirection: 'row', 
        height: 70, 
        backgroundColor: Theme.colors.primary, 
        borderTopWidth: 1, 
        borderTopColor: Theme.colors.border,
        paddingBottom: 5
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabItemContent: { alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 4, fontFamily: Theme.fonts.outfit.medium },
    tabLabelActive: { color: Theme.colors.accent, fontWeight: '700' as any },
    fabContainer: { position: 'absolute', bottom: 25, right: 25, width: 52, height: 52, borderRadius: 14, transform: [{ rotate: '45deg' }], elevation: 10, zIndex: 100 },
    fabGradient: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    imagePreviewOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    imagePreviewClose: { position: 'absolute', top: 50, right: 20, padding: 10 },
    imagePreviewFull: { width: '100%', height: '80%' },
    closeBtnSmall: { padding: 4 }
});

export default DashboardPage;
