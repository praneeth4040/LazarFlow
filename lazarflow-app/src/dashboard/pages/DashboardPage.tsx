import React, { useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Image, Modal, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, User, Plus, Palette, Crown, X, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Theme } from '../../styles/theme';
import { authService } from '../../lib/authService';
import { UserContext } from '../../context/UserContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useFocusEffect } from '@react-navigation/native';
import { CustomAlert as Alert } from '../../lib/AlertService';

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
    const { tier, lobbiesCreated, loading: subLoading, maxAILobbies, maxLayouts } = useSubscription();
    const { user, loading: userLoading, refreshUser } = useContext(UserContext);
    
    const dashboard = useDashboard(user, refreshUser);

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

    const handleDesignUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (result.canceled) return;
        dashboard.setSelectedImage(result.assets[0]);
        dashboard.setDesignDetails({ name: '' });
        dashboard.setUploadModalVisible(true);
    };

    const submitDesignUpload = async () => {
        if (!dashboard.designDetails.name.trim()) {
            Alert.alert('Required', 'Please enter a name');
            return;
        }
        if (tier !== 'developer' && maxLayouts && dashboard.activeLayoutsCount >= maxLayouts) {
            Alert.alert('Limit Reached', 'Upgrade to upload more layouts!');
            return;
        }
        try {
            dashboard.setUploading(true);
            await DashboardRepository.uploadDesignTheme(dashboard.designDetails.name, dashboard.selectedImage.uri);
            dashboard.fetchUserThemes();
            dashboard.setUploadModalVisible(false);
            Alert.alert('Success', 'Design uploaded and pending verification.');
        } catch (error: any) {
            const apiDetail = error.response?.data?.detail;
            const message = typeof apiDetail === 'string'
                ? apiDetail
                : Array.isArray(apiDetail)
                    ? apiDetail.map((e: any) => e.msg || JSON.stringify(e)).join('\n')
                    : error.message || 'Upload failed. Please try again.';
            Alert.alert('Upload Failed', message);
        } finally {
            dashboard.setUploading(false);
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

    const toggleLobbySelection = (id: string) => {
        const lobbyToSelect = dashboard.lobbies.find((l: any) => l.id === id);
        
        if (lobbyToSelect && lobbyToSelect.is_promoted) {
            Alert.alert('Notice', 'This tournament has already been promoted.');
            return;
        }

        dashboard.setSelectedLobbies((prev: any) => {
            if (prev.includes(id)) {
                return []; // Deselect if already selected
            }
            return [id]; // Only allow 1 selection at a time
        });
    };

    const handlePromoteLobbies = async () => {
        if (dashboard.selectedLobbies.length === 0) return;
        const invalidLobbies = dashboard.lobbies.filter((l: any) => dashboard.selectedLobbies.includes(l.id) && l.status !== 'setup');
        if (invalidLobbies.length > 0) {
            Alert.alert('Invalid Selection', 'Only tournaments in the "SETUP" status can be promoted.');
            return;
        }
        dashboard.setShowPromoModal(true);
    };

    const submitPromotion = async () => {
        if (!dashboard.promoData.startDate || !dashboard.promoData.startTime || !dashboard.promoData.contactDetails) {
            Alert.alert('Error', 'Please fill in Start Date, Start Time, and Contact Details.');
            return;
        }

        if (dashboard.selectedLobbies.length === 0) return;

        dashboard.setLoading(true);
        try {
            const lobbyId = dashboard.selectedLobbies[0];
            await DashboardRepository.promoteTournament(lobbyId, dashboard.promoData);
            
            dashboard.setLobbies((currentLobbies: any) => 
                currentLobbies.map((l: any) => l.id === lobbyId ? { ...l, is_promoted: true } : l)
            );
            
            Alert.alert('Success', 'Lobby promotion successful!');
            dashboard.setShowPromoModal(false);
            dashboard.setSelectedLobbies([]);
            dashboard.setPromoData({ startDate: '', startTime: '', contactDetails: '', additionalDetails: '' });
        } catch (error) {
            console.error('Error promoting lobby:', error);
            Alert.alert('Error', 'Failed to promote the tournament.');
        } finally {
            dashboard.setLoading(false);
        }
    };

    const renderHeader = () => {
        if (dashboard.selectedLobbies.length > 0) {
            return (
                <View style={[styles.header, styles.selectionHeader]}>
                    <View style={styles.headerLeft}>
                         <TouchableOpacity onPress={() => dashboard.setSelectedLobbies([])} style={styles.cancelSelectionBtn}>
                            <X size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <Text style={styles.selectionTitle}>{dashboard.selectedLobbies.length} Selected</Text>
                    </View>
                    <TouchableOpacity style={styles.promoteBtn} onPress={handlePromoteLobbies}>
                        <Zap size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.promoteBtnText}>Promote</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        let title = 'Home';
        if (dashboard.activeTab === 'home') {
             return (
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image source={require('../../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
                        <Text style={styles.headerTitle}>LazarFlow</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.headerBalanceBadge}>
                            <Zap size={12} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 4 }} />
                            <Text style={styles.headerBalanceText}>{user?.flux_balance || 0}</Text>
                        </View>
                    </View>
                </View>
            );
        }
        if (dashboard.activeTab === 'lobbies') title = 'All Lobbies';
        else if (dashboard.activeTab === 'design') title = 'Design Studio';
        else if (dashboard.activeTab === 'plans') title = 'Subscription Plans';
        else if (dashboard.activeTab === 'profile') title = 'Account Settings';

        return (
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={styles.headerRight} />
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
                        selectedLobbies={dashboard.selectedLobbies} 
                        toggleLobbySelection={toggleLobbySelection}
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
                        selectedLobbies={dashboard.selectedLobbies} 
                        toggleLobbySelection={toggleLobbySelection}
                    />
                );
            case 'design':
                return (
                    <DesignTab 
                        designTab={dashboard.designTab} 
                        setDesignTab={dashboard.setDesignTab} 
                        handleDesignUpload={handleDesignUpload}
                        uploading={dashboard.uploading} 
                        userThemesList={dashboard.userThemesList} 
                        communityThemesList={dashboard.communityThemesList}
                        loadingCommunity={dashboard.loadingCommunity} 
                        setPreviewImage={dashboard.setPreviewImage}
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
                <TabItem icon={Home} label="Home" active={dashboard.activeTab === 'home'} onPress={() => dashboard.setActiveTab('home')} isPremium={false} />
                <TabItem icon={Palette} label="Design" active={dashboard.activeTab === 'design'} onPress={() => dashboard.setActiveTab('design')} isPremium={false} />
                <TabItem icon={Crown} label="Plans" active={dashboard.activeTab === 'plans'} onPress={() => dashboard.setActiveTab('plans')} isPremium />
                <TabItem icon={User} label="Profile" active={dashboard.activeTab === 'profile'} onPress={() => dashboard.setActiveTab('profile')} isPremium={false} />
            </View>

            <UploadModal 
                visible={dashboard.uploadModalVisible} 
                onClose={() => dashboard.setUploadModalVisible(false)} 
                selectedImage={dashboard.selectedImage} 
                designDetails={dashboard.designDetails} 
                setDesignDetails={dashboard.setDesignDetails} 
                uploading={dashboard.uploading} 
                onSubmit={submitDesignUpload} 
            />
            <ImagePreviewModal 
                visible={!!dashboard.previewImage} 
                image={dashboard.previewImage} 
                onClose={() => dashboard.setPreviewImage(null)} 
            />
            <PromoModal 
                visible={dashboard.showPromoModal} 
                onClose={() => dashboard.setShowPromoModal(false)} 
                promoData={dashboard.promoData} 
                setPromoData={dashboard.setPromoData} 
                loading={dashboard.loading} 
                onSubmit={submitPromotion} 
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

const PromoModal = ({ visible, onClose, promoData, setPromoData, loading, onSubmit }: any) => {
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [showTimePicker, setShowTimePicker] = React.useState(false);
    const [date, setDate] = React.useState(new Date());

    const handleDateChange = (event: any, selectedDate: any) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
            const formattedDate = selectedDate.toISOString().split('T')[0];
            setPromoData({ ...promoData, startDate: formattedDate });
        }
    };

    const handleTimeChange = (event: any, selectedTime: any) => {
        setShowTimePicker(false);
        if (selectedTime) {
            setDate(selectedTime);
            const hours = String(selectedTime.getHours()).padStart(2, '0');
            const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
            setPromoData({ ...promoData, startTime: `${hours}:${minutes}` });
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.bottomSheetOverlay}>
                <TouchableOpacity style={styles.bottomSheetBackdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.uploadBottomSheet}>
                    <View style={styles.dragHandle} />
                    <View style={styles.uploadModalHeader}>
                        <Text style={styles.uploadModalTitle}>Promote Tournament</Text>
                        <TouchableOpacity onPress={onClose}><X size={24} color="#64748b" /></TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{ gap: 16, paddingBottom: 20 }}>
                            <TouchableOpacity 
                                style={[styles.styledInput, { justifyContent: 'center' }]} 
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: promoData.startDate ? Theme.colors.textPrimary : '#94a3b8' }}>
                                    {promoData.startDate || 'Start Date (e.g. 2024-12-25)'}
                                </Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                />
                            )}

                            <TouchableOpacity 
                                style={[styles.styledInput, { justifyContent: 'center' }]} 
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Text style={{ color: promoData.startTime ? Theme.colors.textPrimary : '#94a3b8' }}>
                                    {promoData.startTime || 'Start Time (e.g. 18:00)'}
                                </Text>
                            </TouchableOpacity>
                            {showTimePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="time"
                                    is24Hour={true}
                                    display="default"
                                    onChange={handleTimeChange}
                                />
                            )}

                            <TextInput
                                style={styles.styledInput}
                                placeholder="Contact Details (Phone / Link)"
                                placeholderTextColor="#94a3b8"
                                value={promoData.contactDetails}
                                onChangeText={(t) => setPromoData({...promoData, contactDetails: t})}
                            />
                            <TextInput
                                style={[styles.styledInput, { height: 100, textAlignVertical: 'top' }]}
                                placeholder="Additional Details (Optional)"
                                placeholderTextColor="#94a3b8"
                                multiline
                                value={promoData.additionalDetails}
                                onChangeText={(t) => setPromoData({...promoData, additionalDetails: t})}
                            />
                            <TouchableOpacity style={styles.uploadSubmitBtnFull} onPress={onSubmit} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadSubmitBtnText}>Promote Lobby</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const UploadModal = ({ visible, onClose, selectedImage, designDetails, setDesignDetails, uploading, onSubmit }: any) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity style={styles.bottomSheetBackdrop} activeOpacity={1} onPress={onClose} />
            <View style={styles.uploadBottomSheet}>
                <View style={styles.dragHandle} />
                <View style={styles.uploadModalHeader}>
                    <Text style={styles.uploadModalTitle}>Finalize Your Design</Text>
                    <TouchableOpacity style={styles.closeBtnSmall} onPress={onClose}><X size={20} color={Theme.colors.textSecondary} /></TouchableOpacity>
                </View>
                <ScrollView style={styles.uploadModalBody as any}>
                    <View style={styles.uploadPreviewWrapper}>
                        {selectedImage && <Image source={{ uri: selectedImage.uri }} style={styles.uploadPreviewImage} resizeMode="cover" />}
                    </View>
                    <View style={styles.uploadInputGroup as any}>
                        <Text style={styles.uploadInputLabel as any}>DESIGN NAME</Text>
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
    selectionHeader: { backgroundColor: '#eff6ff', borderBottomColor: '#bfdbfe' },
    selectionTitle: { fontSize: 18, fontFamily: Theme.fonts.outfit.bold, color: '#1e3a8a', marginLeft: 16 },
    cancelSelectionBtn: { padding: 4 },
    promoteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    promoteBtnText: { color: '#fff', fontSize: 14, fontFamily: Theme.fonts.outfit.bold },
    headerRight: { flex: 1, alignItems: 'flex-end' },
    headerBalanceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5' },
    headerBalanceText: { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: '#c2410c' },
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
    bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
    bottomSheetBackdrop: { ...StyleSheet.absoluteFillObject },
    uploadBottomSheet: { backgroundColor: Theme.colors.secondary, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
    dragHandle: { width: 40, height: 5, backgroundColor: Theme.colors.border, borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 },
    uploadModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    uploadModalTitle: { fontSize: 22, fontFamily: Theme.fonts.outfit.bold },
    uploadModalBody: { marginBottom: 24 },
    uploadPreviewWrapper: { width: '100%', height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 24 },
    uploadPreviewImage: { width: '100%', height: '100%' },
    uploadInputGroup: { marginTop: 16, marginBottom: 8 },
    uploadInputLabel: { fontSize: 12, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.textSecondary, marginBottom: 8, letterSpacing: 1 },
    styledInput: { backgroundColor: Theme.colors.primary, borderRadius: 16, padding: 16, fontSize: 16 },
    uploadSubmitBtnFull: { backgroundColor: Theme.colors.accent, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    uploadSubmitBtnText: { color: '#fff', fontSize: 16, fontFamily: Theme.fonts.outfit.bold },
    imagePreviewOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
    imagePreviewClose: { position: 'absolute', top: 50, right: 20, padding: 10 },
    imagePreviewFull: { width: '100%', height: '80%' },
    closeBtnSmall: { padding: 4 }
});

export default DashboardPage;
