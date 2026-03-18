import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Image, Modal, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, User, Plus, Palette, Crown, X, Upload, ArrowRight, Zap, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import { Theme } from '../styles/theme';
import { authService } from '../lib/authService';
import { UserContext } from '../context/UserContext';
import { useSubscription } from '../hooks/useSubscription';
import { useFocusEffect } from '@react-navigation/native';
import { getUserThemes, getCommunityDesigns, getLobbies, deleteLobby, uploadTheme, endLobby, getLobbyTeams } from '../lib/dataService';
import SubscriptionPlansScreen from './SubscriptionPlansScreen';
import { CustomAlert as Alert } from '../lib/AlertService';

// Import New Tab Components

import HomeTab, { getTierColors } from './Dashboard/HomeTab';
import LobbiesTab from './Dashboard/LobbiesTab';
import DesignTab from './Dashboard/DesignTab';
import ProfileTab from './Dashboard/ProfileTab';

const DashboardScreen = ({ navigation, route }) => {
    const { tier, lobbiesCreated, loading: subLoading, maxAILobbies, maxLayouts } = useSubscription();
    const { user, loading: userLoading, refreshUser } = useContext(UserContext);
    
    const [activeTab, setActiveTab] = useState('home');
    const [lobbies, setLobbies] = useState([]);
    const [pastLobbies, setPastLobbies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSettingsId, setActiveSettingsId] = useState(null);
    const [activeLayoutsCount, setActiveLayoutsCount] = useState(user?.themes_count || 0);

    const [designTab, setDesignTab] = useState('own');
    const [userThemesList, setUserThemesList] = useState([]);
    const [communityThemesList, setCommunityThemesList] = useState([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [expandedSections, setExpandedSections] = useState({
        account: true,
        stats: false,
        history: false,
        partnership: false,
        legal: false
    });
    const [designDetails, setDesignDetails] = useState({ name: '' });

    // Handle tab navigation from other screens
    useEffect(() => {
        if (route.params?.tab) {
            setActiveTab(route.params.tab);
            navigation.setParams({ tab: undefined });
        }
    }, [route.params?.tab]);

    useEffect(() => {
        if (user?.themes_count !== undefined) {
            setActiveLayoutsCount(user.themes_count);
        }
    }, [user?.themes_count]);

    useEffect(() => {
        if (activeTab === 'profile' && expandedSections.stats && user?.id && activeLayoutsCount === 0) {
            const fetchLayoutsCount = async () => {
                try {
                    const themes = await getUserThemes(user.id);
                    setActiveLayoutsCount(themes?.length || 0);
                } catch (err) {
                    console.error('Error fetching layout count:', err);
                }
            };
            fetchLayoutsCount();
        }
    }, [activeTab, expandedSections.stats, user?.id]);

    useFocusEffect(
        React.useCallback(() => {
            if (user?.id && !userLoading) {
                // Only fetch if we are on Home or Lobbies tabs
                if (activeTab === 'home' || activeTab === 'lobbies') {
                    const limit = activeTab === 'home' ? 5 : null;
                    
                    // Fetch if we focus on Lobbies or Home tabs to ensure data is fresh
                    const shouldFetch = true;

                    if (shouldFetch) {
                        fetchLobbies(lobbies.length === 0, limit);
                    }                }
            }
            return () => {};
        }, [user?.id, userLoading, activeTab])
    );

    const fetchLobbies = async (showLoadingIndicator = false, limit = null) => {
        try {
            if (showLoadingIndicator) setLoading(true);
            if (!user?.id) return;
            
            // USE OPTIMIZED ENDPOINT: includeTeams=true gets counts in ONE call
            const data = await getLobbies(limit, true);
            console.log(`[Dashboard] Fetched ${data?.length || 0} lobbies. First item teams_count:`, data?.[0]?.teams_count, 'teams array length:', data?.[0]?.teams?.length);

            const processedData = (data || []).map(lobby => {
                const count = lobby.teams_count || lobby.team_count || lobby.teamsCount || (lobby.teams ? lobby.teams.length : 0) || (lobby._count ? lobby._count.teams : 0) || 0;
                return {
                    ...lobby,
                    teams_count: count
                };
            });
            console.log(`[Dashboard] Processed first item teams_count:`, processedData?.[0]?.teams_count);
            const activeData = processedData.filter(t => t.status !== 'completed');
            const pastData = processedData.filter(t => t.status === 'completed');

            setLobbies(activeData);
            setPastLobbies(pastData);
        } catch (error) {
            console.error('❌ Error fetching lobbies:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchUserThemes = async () => {
        try {
            const data = await getUserThemes();
            setUserThemesList(data || []);
        } catch (error) {
            console.error('Error fetching themes:', error);
        }
    };

    const fetchCommunityThemes = async () => {
        try {
            setLoadingCommunity(true);
            const themes = await getCommunityDesigns();
            setCommunityThemesList(themes);
        } catch (error) {
            console.error('Error fetching community themes:', error);
        } finally {
            setLoadingCommunity(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'design') {
            if (designTab === 'own') fetchUserThemes();
            else fetchCommunityThemes();
        }
    }, [activeTab, designTab]);

    const onRefresh = () => {
        setRefreshing(true);
        const promises = [];
        if (activeTab === 'home' || activeTab === 'lobbies' || activeTab === 'profile') {
            promises.push(fetchLobbies(false, activeTab === 'home' ? 5 : null));
        }
        if (activeTab === 'design') {
            if (designTab === 'own') promises.push(fetchUserThemes());
            else promises.push(fetchCommunityThemes());
        }
        if (refreshUser) promises.push(refreshUser());
        Promise.all(promises).finally(() => setRefreshing(false));
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            Alert.alert('Error', 'Failed to log out.');
        }
    };

    const handleDesignUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (result.canceled) return;
        setSelectedImage(result.assets[0]);
        setDesignDetails({ name: '' });
        setUploadModalVisible(true);
    };

    const submitDesignUpload = async () => {
        if (!designDetails.name.trim()) {
            Alert.alert('Required', 'Please enter a name');
            return;
        }
        if (tier !== 'developer' && maxLayouts && activeLayoutsCount >= maxLayouts) {
            Alert.alert('Limit Reached', 'Upgrade to upload more layouts!');
            return;
        }
        try {
            setUploading(true);
            await uploadTheme(designDetails.name, selectedImage.uri);
            fetchUserThemes();
            setUploadModalVisible(false);
            Alert.alert('Success', 'Design uploaded and pending verification.');
        } catch (error) {
            Alert.alert('Upload Failed', error.message);
        } finally {
            setUploading(false);
        }
    };

    const confirmEndLobby = (lobby) => {
        Alert.alert("End Lobby", `Are you sure you want to end "${lobby.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "End", style: "destructive", onPress: async () => {
                await endLobby(lobby.id);
                fetchLobbies();
                if (refreshUser) refreshUser();
            }}
        ]);
    };

    const confirmDeleteLobby = (lobby) => {
        Alert.alert("Delete Lobby", `Delete "${lobby.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await deleteLobby(lobby.id);
                fetchLobbies();
                if (refreshUser) refreshUser();
            }}
        ]);
    };

    const renderHeader = () => {
        let title = 'Home';
        if (activeTab === 'home') {
            return (
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                        <Text style={styles.headerTitle}>LazarFlow</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[styles.headerTierBadge, { backgroundColor: getTierColors(tier).bg, borderColor: getTierColors(tier).border }]}>
                            <Crown size={12} color={getTierColors(tier).color} style={{ marginRight: 4 }} />
                            <Text style={[styles.headerTierText, { color: getTierColors(tier).color }]}>{tier.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>
            );
        }
        if (activeTab === 'lobbies') title = 'All Lobbies';
        else if (activeTab === 'design') title = 'Design Studio';
        else if (activeTab === 'plans') title = 'Subscription Plans';
        else if (activeTab === 'profile') title = 'Account Settings';

        return (
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={styles.headerRight} />
            </View>
        );
    };

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Theme.colors.accent} />
                </View>
            );
        }

        switch (activeTab) {
            case 'home':
                return (
                    <HomeTab 
                        user={user} tier={tier} lobbiesCreated={lobbiesCreated} maxAILobbies={maxAILobbies}
                        lobbies={lobbies} refreshing={refreshing} onRefresh={onRefresh}
                        activeSettingsId={activeSettingsId} toggleSettings={setActiveSettingsId}
                        onViewAll={() => setActiveTab('lobbies')} onCalculate={(l) => navigation.navigate('CalculateResults', { lobby: l })}
                        onRender={(id) => navigation.navigate('LiveLobby', { id })} onEdit={(l) => navigation.navigate('EditLobby', { lobbyId: l.id })}
                        onDelete={confirmDeleteLobby} onEnd={confirmEndLobby}
                        onManageTeams={(l) => navigation.navigate('ManageTeams', { lobbyId: l.id, lobbyName: l.name })}
                    />
                );
            case 'lobbies':
                return (
                    <LobbiesTab 
                        lobbies={lobbies} pastLobbies={pastLobbies} refreshing={refreshing} onRefresh={onRefresh}
                        activeSettingsId={activeSettingsId} toggleSettings={setActiveSettingsId}
                        historyPage={historyPage} setHistoryPage={setHistoryPage}
                        onCalculate={(l) => navigation.navigate('CalculateResults', { lobby: l })}
                        onRender={(id) => navigation.navigate('LiveLobby', { id })} onEdit={(l) => navigation.navigate('EditLobby', { lobbyId: l.id })}
                        onDelete={confirmDeleteLobby} onEnd={confirmEndLobby}
                        onManageTeams={(l) => navigation.navigate('ManageTeams', { lobbyId: l.id, lobbyName: l.name })}
                    />
                );
            case 'design':
                return (
                    <DesignTab 
                        designTab={designTab} setDesignTab={setDesignTab} handleDesignUpload={handleDesignUpload}
                        uploading={uploading} userThemesList={userThemesList} communityThemesList={communityThemesList}
                        loadingCommunity={loadingCommunity} setPreviewImage={setPreviewImage}
                    />
                );
            case 'plans':
                return <SubscriptionPlansScreen navigation={navigation} isTab={true} />;
            case 'profile':
                return (
                    <ProfileTab 
                        user={user} tier={tier} lobbiesCreated={lobbiesCreated} maxAILobbies={maxAILobbies}
                        maxLayouts={maxLayouts} activeLayoutsCount={activeLayoutsCount}
                        expandedSections={expandedSections} toggleSection={(s) => setExpandedSections(prev => ({...prev, [s]: !prev[s]}))}
                        handleLogout={handleLogout}
                        onNavigateToPlans={() => setActiveTab('plans')} onNavigateToPrivacy={() => navigation.navigate('PrivacyPolicy')}
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
                {activeTab === 'home' && (
                    <TouchableOpacity style={styles.fabContainer} onPress={() => navigation.navigate('CreateLobby')} activeOpacity={0.8}>
                        <LinearGradient colors={['#1E3A8A', '#3B82F6']} style={styles.fabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <View style={{ transform: [{ rotate: '-45deg' }] }}><Plus size={24} color="#fff" /></View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.tabBar}>
                <TabItem icon={Home} label="Home" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
                <TabItem icon={Palette} label="Design" active={activeTab === 'design'} onPress={() => setActiveTab('design')} />
                <TabItem icon={Crown} label="Plans" active={activeTab === 'plans'} onPress={() => setActiveTab('plans')} isPremium />
                <TabItem icon={User} label="Profile" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
            </View>

            {/* Modals from original DashboardScreen */}
            <UploadModal visible={uploadModalVisible} onClose={() => setUploadModalVisible(false)} selectedImage={selectedImage} designDetails={designDetails} setDesignDetails={setDesignDetails} uploading={uploading} onSubmit={submitDesignUpload} />
            <ImagePreviewModal visible={!!previewImage} image={previewImage} onClose={() => setPreviewImage(null)} />
        </SafeAreaView>
    );
};

const TabItem = ({ icon: Icon, label, active, onPress, isPremium }) => (
    <TouchableOpacity style={styles.tabItem} onPress={onPress}>
        <View style={isPremium ? styles.premiumTabItem : null}>
            <Icon size={24} color={active ? (isPremium ? '#f59e0b' : Theme.colors.accent) : Theme.colors.textSecondary} />
            <Text style={[styles.tabLabel, active && (isPremium ? { color: '#f59e0b', fontWeight: '800' } : styles.tabLabelActive)]}>{label}</Text>
        </View>
    </TouchableOpacity>
);

const UploadModal = ({ visible, onClose, selectedImage, designDetails, setDesignDetails, uploading, onSubmit }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity style={styles.bottomSheetBackdrop} activeOpacity={1} onPress={onClose} />
            <View style={styles.uploadBottomSheet}>
                <View style={styles.dragHandle} />
                <View style={styles.uploadModalHeader}>
                    <Text style={styles.uploadModalTitle}>Finalize Your Design</Text>
                    <TouchableOpacity style={styles.closeBtnSmall} onPress={onClose}><X size={20} color={Theme.colors.textSecondary} /></TouchableOpacity>
                </View>
                <ScrollView style={styles.uploadModalBody}>
                    <View style={styles.uploadPreviewWrapper}>
                        {selectedImage && <Image source={{ uri: selectedImage.uri }} style={styles.uploadPreviewImage} resizeMode="cover" />}
                    </View>
                    <View style={styles.uploadInputGroup}>
                        <Text style={styles.uploadInputLabel}>DESIGN NAME</Text>
                        <TextInput style={styles.styledInput} placeholder="e.g. Minimalist Navy" value={designDetails.name} onChangeText={(t) => setDesignDetails({ name: t })} />
                    </View>
                </ScrollView>
                <TouchableOpacity style={styles.uploadSubmitBtnFull} onPress={onSubmit} disabled={uploading}>
                    {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadSubmitBtnText}>Upload to Studio</Text>}
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const ImagePreviewModal = ({ visible, image, onClose }) => (
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
    headerRight: { flex: 1, alignItems: 'flex-end' },
    headerTierBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    headerTierText: { fontSize: 10, fontFamily: Theme.fonts.outfit.bold },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', height: 80, backgroundColor: Theme.colors.primary, borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingBottom: 20 },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4 },
    tabLabelActive: { color: Theme.colors.accent, fontWeight: '600' },
    premiumTabItem: { alignItems: 'center', justifyContent: 'center', transform: [{ scale: 1.1 }] },
    fabContainer: { position: 'absolute', bottom: 25, right: 25, width: 52, height: 52, borderRadius: 14, transform: [{ rotate: '45deg' }], elevation: 10, zIndex: 100 },
    fabGradient: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
    bottomSheetBackdrop: { ...StyleSheet.absoluteFillObject },
    uploadBottomSheet: { backgroundColor: Theme.colors.secondary, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
    dragHandle: { width: 40, height: 5, backgroundColor: Theme.colors.border, borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 },
    uploadModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    uploadModalTitle: { fontSize: 22, fontFamily: Theme.fonts.outfit.bold },
    uploadPreviewWrapper: { width: '100%', height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 24 },
    uploadPreviewImage: { width: '100%', height: '100%' },
    styledInput: { backgroundColor: Theme.colors.primary, borderRadius: 16, padding: 16, fontSize: 16 },
    uploadSubmitBtnFull: { backgroundColor: Theme.colors.accent, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    uploadSubmitBtnText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    imagePreviewOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    imagePreviewClose: { position: 'absolute', top: 50, right: 20, padding: 10 },
    imagePreviewFull: { width: '100%', height: '80%' },
});

export default DashboardScreen;
