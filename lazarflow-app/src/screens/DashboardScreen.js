import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, StatusBar, Platform, Image, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Trophy, Home, History, User, Plus, Radio, Calculator, Flag, Settings, Edit, Trash2, ArrowRight, Sparkles, BarChart2, Award, Palette, Upload, Eye, Heart, MoreHorizontal, Phone, Check, X, Save, ChevronDown, ChevronUp, Crown, ShieldCheck, Zap } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../styles/theme';
import { authService } from '../lib/authService';
import { UserContext } from '../context/UserContext';
import { useSubscription } from '../hooks/useSubscription';
import { useFocusEffect } from '@react-navigation/native';
import { getUserThemes, getCommunityDesigns, getDesignImageSource, updateUserProfile, getLobbies, deleteLobby, createTheme, uploadTheme, uploadLogo, updateLobby, endLobby, getLobbyTeams } from '../lib/dataService';
import SubscriptionPlansScreen from './SubscriptionPlansScreen';

const CommunityDesignCard = React.memo(({ theme, index, isRightColumn = false, onPress }) => {
    const imageSource = getDesignImageSource(theme);
    const height = isRightColumn ? 180 + (index % 3) * 50 : 200 + (index % 3) * 40;
    
    return (
        <TouchableOpacity style={styles.pinCard} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.pinImageContainer}>
                {imageSource ? (
                    <Image 
                        source={imageSource} 
                        style={[styles.pinImage, { height }]} 
                        resizeMode="cover" 
                        fadeDuration={300}
                    />
                ) : (
                    <View style={[styles.pinImage, { height, backgroundColor: Theme.colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Palette size={32} color={Theme.colors.textSecondary} />
                    </View>
                )}
            </View>
            <View style={styles.pinContent}>
                <Text style={styles.pinTitle} numberOfLines={2}>{theme.name || `Design #${index + 1}`}</Text>
                <View style={styles.pinMeta}>
                    <View style={styles.pinAuthor}>
                        <View style={styles.pinAvatar}>
                            <Text style={styles.pinAvatarText}>{(theme.author || 'C').charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.pinAuthorName} numberOfLines={1}>{theme.author || 'Community'}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const UserThemeCard = React.memo(({ theme, index, isRightColumn = false, onPress }) => {
    const imageSource = getDesignImageSource(theme);
    const height = isRightColumn ? 180 + (index % 3) * 50 : 200 + (index % 3) * 40;
    
    return (
        <TouchableOpacity style={styles.pinCard} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.pinImageContainer}>
                {imageSource ? (
                    <Image 
                        source={imageSource} 
                        style={[styles.pinImage, { height }]} 
                        resizeMode="cover" 
                        fadeDuration={300}
                    />
                ) : (
                    <View style={[styles.pinImage, { height, backgroundColor: Theme.colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
                        <Palette size={32} color={Theme.colors.textSecondary} />
                    </View>
                )}
                
                {/* Status Overlay */}
                <View style={[
                    styles.previewOverlay, 
                    { 
                        top: 8, 
                        right: 8, 
                        backgroundColor: theme.status === 'pending' ? 'rgba(245, 158, 11, 0.8)' : 'rgba(16, 185, 129, 0.8)' 
                    }
                ]}>
                    <Text style={[styles.previewTag, { fontSize: 8 }]}>
                        {theme.status === 'pending' ? 'PENDING' : 'VERIFIED'}
                    </Text>
                </View>
            </View>
            <View style={styles.pinContent}>
                <Text style={styles.pinTitle} numberOfLines={2}>{theme.name || `Design #${index + 1}`}</Text>
                <View style={styles.pinMeta}>
                    <View style={styles.pinAuthor}>
                        <View style={[styles.pinAvatar, { backgroundColor: Theme.colors.accent }]}>
                            <User size={10} color="#fff" />
                        </View>
                        <Text style={styles.pinAuthorName} numberOfLines={1}>My Design</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
});

const DashboardScreen = ({ navigation, route }) => {
    const { tier, lobbiesCreated, loading: subLoading, maxAILobbies, maxLayouts } = useSubscription();
    const { user, loading: userLoading, refreshUser } = useContext(UserContext);
    
    const [activeTab, setActiveTab] = useState('home');

    // Handle tab navigation from other screens
    useEffect(() => {
        if (route.params?.tab) {
            setActiveTab(route.params.tab);
            // Clear the param so it doesn't switch back on re-renders
            navigation.setParams({ tab: undefined });
        }
    }, [route.params?.tab]);
    const [lobbies, setLobbies] = useState([]);
    const [pastLobbies, setPastLobbies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeSettingsId, setActiveSettingsId] = useState(null);
    const [activeLayoutsCount, setActiveLayoutsCount] = useState(0);
    const [expandedSections, setExpandedSections] = useState({
        account: true,
        stats: false,
        history: false,
        partnership: false,
        legal: false
    });
    const [designTab, setDesignTab] = useState('own');
    const [userThemesList, setUserThemesList] = useState([]);
    const [communityThemesList, setCommunityThemesList] = useState([]);
    const [loadingCommunity, setLoadingCommunity] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadModalVisible, setUploadModalVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [showPromoModal, setShowPromoModal] = useState(false);

    useEffect(() => {
        // Show promo modal for free users on load (once per session)
        if (tier === 'free' && !refreshing && !loading) {
            const timer = setTimeout(() => {
                setShowPromoModal(true);
            }, 1500); // Delay for better UX
            return () => clearTimeout(timer);
        }
    }, [tier, loading]);

    const [selectedImage, setSelectedImage] = useState(null);
    const [designDetails, setDesignDetails] = useState({
        name: ''
    });
    const [isUsernameExpanded, setIsUsernameExpanded] = useState(false);

    useEffect(() => {
        if (user?.id) {
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
    }, [user?.id]);

    useFocusEffect(
        React.useCallback(() => {
            if (user?.id && !userLoading) {
                fetchLobbies();
            }
            return () => {};
        }, [user?.id, userLoading])
    );

    const fetchLobbies = async () => {
        try {
            setLoading(true);
            if (!user?.id) return;

            console.log('Fetching lobbies...');
            const data = await getLobbies();
            console.log(`Found ${data?.length || 0} lobbies`);

            // Fetch team counts for each lobby
            const lobbiesWithCounts = await Promise.all((data || []).map(async (lobby) => {
                try {
                    const teams = await getLobbyTeams(lobby.id);
                    console.log(`Lobby ${lobby.id} (${lobby.name}) response:`, teams);
                    
                    let count = 0;
                    if (Array.isArray(teams)) {
                        count = teams.length;
                    } else if (teams && typeof teams === 'object') {
                        // Some APIs return { teams: [...] } or { count: X }
                        count = teams.count || (teams.teams ? teams.teams.length : 0);
                    }
                    
                    return { 
                        ...lobby, 
                        teams_count: count || lobby.teams_count || 0 
                    };
                } catch (err) {
                    console.warn(`Could not fetch teams for lobby ${lobby.id}:`, err);
                    return { ...lobby, teams_count: lobby.teams_count || 0 };
                }
            }));

            const active = lobbiesWithCounts.filter(t => t.status !== 'completed');
            const past = lobbiesWithCounts.filter(t => t.status === 'completed');

            setLobbies(active);
            setPastLobbies(past);
        } catch (error) {
            console.error('Error fetching lobbies:', error);
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
            Alert.alert('Error', 'Failed to load community designs');
        } finally {
            setLoadingCommunity(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'design') {
            if (designTab === 'own') {
                fetchUserThemes();
            } else {
                fetchCommunityThemes();
            }
        }
    }, [activeTab, designTab]);

    // Swipe gesture handling for tab navigation
    const tabOrder = ['home', 'design', 'plans', 'profile'];
    const startX = useRef(0);

    const handleTouchStart = (evt) => {
        startX.current = evt.nativeEvent.pageX;
    };

    const handleTouchEnd = (evt) => {
        const endX = evt.nativeEvent.pageX;
        const distance = startX.current - endX;
        const currentIndex = tabOrder.indexOf(activeTab);

        // Minimum swipe distance of 50px
        if (Math.abs(distance) > 50) {
            // Swipe left (distance > 0) - move to next tab
            if (distance > 0 && currentIndex < tabOrder.length - 1) {
                setActiveTab(tabOrder[currentIndex + 1]);
            }
            // Swipe right (distance < 0) - move to previous tab
            else if (distance < 0 && currentIndex > 0) {
                setActiveTab(tabOrder[currentIndex - 1]);
            }
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        // Force refresh all data on pull-to-refresh
        const promises = [
            fetchLobbies(),
            getUserThemes(true),
            getCommunityDesigns(true)
        ];
        if (refreshUser) promises.push(refreshUser());
        
        Promise.all(promises).finally(() => {
            setRefreshing(false);
        });
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
            // AppNavigator will handle the redirection since it listens to SIGNED_OUT event
        } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    const handleCreateLobby = () => {
        navigation.navigate('CreateLobby');
    };

    const handleBannerAction = () => {
        navigation.navigate('CreateLobby');
    };

    const handleDesignUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (result.canceled) return;

            setSelectedImage(result.assets[0]);
            setDesignDetails({
                name: ''
            });
            setUploadModalVisible(true);
        } catch (error) {
            console.error('Image Selection Error:', error);
            Alert.alert('Error', 'Failed to select image');
        }
    };

    const submitDesignUpload = async () => {
        if (!designDetails.name.trim()) {
            Alert.alert('Required', 'Please enter a name for your design');
            return;
        }

        // Enforce Layout Limits
        if (tier !== 'developer' && maxLayouts && activeLayoutsCount >= maxLayouts) {
            Alert.alert(
                'Layout Limit Reached',
                `Your current plan allows for ${maxLayouts} custom layouts. Upgrade to upload more!`,
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'View Plans', onPress: () => setActiveTab('plans') }
                ]
            );
            return;
        }

        try {
            setUploading(true);
            const { uri } = selectedImage;
            
            // Use new uploadTheme endpoint which handles file upload + record creation
            await uploadTheme(designDetails.name, uri);

            fetchUserThemes();
            setUploadModalVisible(false);
            Alert.alert('Success', 'Your custom design has been uploaded and is currently under verification.');
        } catch (error) {
            console.error('Upload Error:', error);
            Alert.alert('Upload Failed', error.message || 'Failed to upload design');
        } finally {
            setUploading(false);
        }
    };

    // --- Action Handlers ---

    const toggleSettings = (id) => {
        if (activeSettingsId === id) {
            setActiveSettingsId(null);
        } else {
            setActiveSettingsId(id);
        }
    };

    const confirmEndLobby = (lobby) => {
        Alert.alert(
            "End Lobby",
            `Are you sure you want to end "${lobby.name}"? It will be moved to past lobbies.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await endLobby(lobby.id);
                            // Realtime sub will update list, but we can also fetch manually to be sure
                            fetchLobbies();
                            if (refreshUser) refreshUser();
                        } catch (err) {
                            Alert.alert("Error", "Failed to end lobby");
                        }
                    }
                }
            ]
        );
    };

    const confirmDeleteLobby = (lobby) => {
        Alert.alert(
            "Delete Lobby",
            `Are you sure you want to delete "${lobby.name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteLobby(lobby.id);
                            fetchLobbies();
                            if (refreshUser) refreshUser();
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete lobby");
                        }
                    }
                }
            ]
        );
    };

    const handleEditLobby = (lobby) => {
        // Close settings
        setActiveSettingsId(null);
        navigation.navigate('EditLobby', { lobbyId: lobby.id });
    };

    const renderHeader = () => {
        let title = 'Home';
        if (activeTab === 'home') {
            const username = user?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
            title = `Welcome ${username}`;
        }
        if (activeTab === 'design') title = 'Design Studio';
        if (activeTab === 'plans') title = 'Subscription Plans';
        if (activeTab === 'profile') title = 'Account Settings';

        return (
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight + 6 }]}>
                {activeTab === 'home' ? (
                    <Text style={styles.headerTitle}>
                        Welcome <Text style={{ color: Theme.colors.accent }}>{user?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'}</Text>
                    </Text>
                ) : (
                    <Text style={styles.headerTitle}>{title}</Text>
                )}
            </View>
        );
    };

    const renderHome = () => (
        <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />}
            onScroll={() => setActiveSettingsId(null)} // Close settings on scroll
            scrollEventThrottle={16}
        >
            {/* Premium Access Banner */}
            {tier === 'free' && (
                <View style={styles.banner}>
                    <View style={styles.bannerBadge}>
                        <Sparkles size={12} color="#fff" />
                        <Text style={styles.bannerBadgeText}>PREMIUM</Text>
                    </View>
                    <Text style={styles.bannerTitle}>Unlock Premium Access</Text>
                    <Text style={styles.bannerDesc}>Get unlimited lobbies, custom layouts, LexiView AI & more!</Text>
                    <TouchableOpacity style={styles.bannerCta} onPress={() => setActiveTab('plans')}>
                        <Text style={styles.bannerCtaText}>Upgrade Now</Text>
                        <ArrowRight size={16} color="#1E3A8A" />
                    </TouchableOpacity>
                </View>
            )}

            <Text style={styles.sectionTitle}>Active Lobbies</Text>
            {lobbies.length > 0 ? (
                lobbies.map(lobby => (
                    <View key={lobby.id} style={[styles.card, { zIndex: activeSettingsId === lobby.id ? 10 : 1 }]}>
                        <TouchableOpacity
                            style={styles.cardMainClickArea}
                            onPress={() => navigation.navigate('LiveLobby', { id: lobby.id })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{lobby.name}</Text>
                                <Text style={styles.cardMeta}>
                                    {lobby.game} • {lobby.teams_count || 0} Teams • {new Date(lobby.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('LiveLobby', { id: lobby.id })} title="Go Live">
                                <Play size={18} color={Theme.colors.accent} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CalculateResults', { lobby: lobby })} title="Calculate">
                                <Calculator size={18} color="#94a3b8" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmEndLobby(lobby)} title="End Lobby">
                                <Flag size={18} color="#ef4444" />
                            </TouchableOpacity>

                            {/* Settings Button & Dropdown */}
                            <View>
                                <TouchableOpacity
                                    style={[styles.iconBtn, activeSettingsId === lobby.id && styles.iconBtnActive]}
                                    onPress={() => toggleSettings(lobby.id)}
                                >
                                    <Settings size={18} color="#94a3b8" />
                                </TouchableOpacity>

                                {activeSettingsId === lobby.id && (
                                    <View style={styles.dropdownMenu}>
                                        <TouchableOpacity style={styles.dropdownItem} onPress={() => handleEditLobby(lobby)}>
                                            <Edit size={16} color={Theme.colors.textPrimary} />
                                            <Text style={styles.dropdownText}>Edit</Text>
                                        </TouchableOpacity>
                                        <View style={styles.dropdownDivider} />
                                        <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                                            setActiveSettingsId(null);
                                            confirmDeleteLobby(lobby);
                                        }}>
                                            <Trash2 size={16} color={Theme.colors.danger} />
                                            <Text style={[styles.dropdownText, { color: Theme.colors.danger }]}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.emptyState}>
                    <Trophy size={48} color="#334155" />
                    <Text style={styles.emptyText}>No active lobbies</Text>
                </View>
            )}
            <View style={{ height: 80 }} />
        </ScrollView>
    );


    const renderDesign = () => (
        <ScrollView style={styles.content}>
            <View style={styles.designTabNav}>
                <TouchableOpacity
                    style={[styles.designTabBtn, designTab === 'own' && styles.designTabBtnActive]}
                    onPress={() => setDesignTab('own')}
                >
                    <Text style={[styles.designTabLabel, designTab === 'own' && styles.designTabLabelActive]}>Own</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.designTabBtn, designTab === 'community' && styles.designTabBtnActive]}
                    onPress={() => setDesignTab('community')}
                >
                    <Text style={[styles.designTabLabel, designTab === 'community' && styles.designTabLabelActive]}>Community</Text>
                </TouchableOpacity>
            </View>


            {designTab === 'own' && (
                <View style={styles.designSection}>
                    <TouchableOpacity style={styles.uploadAreaSmall} onPress={handleDesignUpload} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator color={Theme.colors.accent} />
                        ) : (
                            <>
                                <Upload size={24} color={Theme.colors.accent} />
                                <Text style={styles.uploadTitleSmall}>Upload New Design</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {userThemesList.length === 0 ? (
                        <View style={[styles.emptyState, { marginTop: 40 }]}>
                            <Palette size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyText}>No Custom Designs Yet</Text>
                            <Text style={styles.emptySubText}>Upload your first design to see it here!</Text>
                        </View>
                    ) : (
                        <View style={styles.pinterestGrid}>
                            <View style={styles.masonryColumn}>
                                {userThemesList.filter((_, i) => i % 2 === 0).map((theme, index) => (
                                    <UserThemeCard 
                                        key={theme.id || `own-left-${index}`} 
                                        theme={theme} 
                                        index={index} 
                                        onPress={() => setPreviewImage(getDesignImageSource(theme))}
                                    />
                                ))}
                            </View>
                            <View style={styles.masonryColumn}>
                                {userThemesList.filter((_, i) => i % 2 !== 0).map((theme, index) => (
                                    <UserThemeCard 
                                        key={theme.id || `own-right-${index}`} 
                                        theme={theme} 
                                        index={index} 
                                        isRightColumn={true}
                                        onPress={() => setPreviewImage(getDesignImageSource(theme))}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            )}

            {designTab === 'community' && (
                <View style={styles.designSection}>
                    {loadingCommunity ? (
                        <ActivityIndicator size="large" color={Theme.colors.accent} style={{ marginTop: 40 }} />
                    ) : communityThemesList.length === 0 ? (
                        <View style={[styles.emptyState, { marginTop: 40 }]}>
                            <Sparkles size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyText}>No Community Designs Found</Text>
                            <Text style={styles.emptySubText}>Check back later for new designs!</Text>
                        </View>
                    ) : (
                        <View style={styles.pinterestGrid}>
                            <View style={styles.masonryColumn}>
                                {communityThemesList.filter((_, i) => i % 2 === 0).map((themes, index) => (
                                    <CommunityDesignCard 
                                        key={themes.id || `left-${index}`} 
                                        theme={themes} 
                                        index={index} 
                                        onPress={() => setPreviewImage(getDesignImageSource(themes))}
                                    />
                                ))}
                            </View>
                            <View style={styles.masonryColumn}>
                                {communityThemesList.filter((_, i) => i % 2 !== 0).map((themes, index) => (
                                    <CommunityDesignCard 
                                        key={themes.id || `right-${index}`} 
                                        theme={themes} 
                                        index={index} 
                                        isRightColumn={true}
                                        onPress={() => setPreviewImage(getDesignImageSource(themes))}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );

    const renderHistoryContent = () => {
        if (pastLobbies.length === 0) {
            return (
                <View style={[styles.emptyState, { marginTop: 20 }]}>
                    <History size={40} color={Theme.colors.border} />
                    <Text style={styles.emptyText}>No past lobbies yet</Text>
                </View>
            );
        }

        return pastLobbies.map(lobby => (
            <TouchableOpacity
                key={lobby.id}
                style={[styles.card, { marginHorizontal: 0 }]}
                onPress={() => navigation.navigate('LiveLobby', { id: lobby.id })}
            >
                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{lobby.name}</Text>
                    <Text style={styles.cardMeta}>
                        {lobby.game || 'Game'} • {lobby.teams_count || 0} Teams • {new Date(lobby.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('LiveLobby', { id: lobby.id })} title="Leaderboard">
                        <BarChart2 size={16} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('LiveLobby', { id: lobby.id, view: 'mvp' })} title="MVPs">
                        <Award size={16} color={Theme.colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDeleteLobby(lobby)} title="Delete">
                        <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        ));
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getTierDisplayName = (tierName) => {
        const tierMap = {
            'free': 'Free Tier',
            'ranked': 'Ranked Tier',
            'competitive': 'Competitive Tier',
            'premier': 'Premier Tier',
            'developer': 'Developer Tier'
        };
        return tierMap[tierName?.toLowerCase()] || 'Free Tier';
    };

    const getTierColors = (tierName) => {
        const colorMap = {
            'free': { bg: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.2)' },
            'ranked': { bg: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
            'competitive': { bg: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.2)' },
            'premier': { bg: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.2)' },
            'developer': { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'rgba(239, 68, 68, 0.2)' }
        };
        return colorMap[tierName?.toLowerCase()] || colorMap['free'];
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const renderProfile = () => {
        const subTier = user?.subscription_tier || tier;
        const colors = getTierColors(subTier);
        const isInTrial = subTier?.toLowerCase() === 'free' && lobbiesCreated < 2;
        
        // Data from /me response (based on Terminal output)
        const email = user?.emails || user?.email || '—';
        const userId = user?.id || '—';
        const username = user?.username || '—';
        const displayName = user?.display_name || username || email.split('@')[0] || 'User';
        const phone = user?.phone || '—';
        const lastLogin = formatDate(user?.last_sign_in_at);
        const createdAt = formatDate(user?.created_at);
        const lobbiesCreatedCount = user?.lobbies_created_count ?? 0;

        const truncatedName = displayName.length > 10 ? displayName.substring(0, 10) + '...' : displayName;

        return (
            <ScrollView style={styles.content}>
                <View style={styles.profileHeaderHero}>
                    <View style={styles.heroGradient} />
                    <View style={styles.profileHeaderMain}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.profileNameContainer} 
                            onPress={() => setIsUsernameExpanded(!isUsernameExpanded)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.profileName}>
                                {isUsernameExpanded ? displayName : truncatedName}
                            </Text>
                            {displayName.length > 10 && (
                                <Text style={styles.expandHint}>
                                    {isUsernameExpanded ? '(tap to collapse)' : '(tap to expand)'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.profileContent, { marginTop: 20 }]}>
                    <View style={styles.badgeContainer}>
                        <View style={[styles.planBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                            <Text style={[styles.planBadgeText, { color: colors.color }]}>{getTierDisplayName(subTier)}</Text>
                        </View>
                    </View>

                    {isInTrial && (
                        <View style={styles.trialBanner}>
                            <View style={styles.trialHeader}>
                                <Sparkles size={16} color="#818cf8" />
                                <Text style={styles.trialTitle}>You're on Free Trial!</Text>
                            </View>
                            <Text style={styles.trialDescription}>
                                Enjoying full features with 3 layouts and custom social links.
                                Use {2 - lobbiesCreatedCount} more AI lobbies to keep these perks!
                            </Text>
                        </View>
                    )}

                    {/* Account Details */}
                    <View style={styles.infoGroup}>
                        <TouchableOpacity
                            style={styles.groupHeader}
                            onPress={() => toggleSection('account')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.groupLabel}>Account & Subscription</Text>
                            <Settings size={16} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {expandedSections.account && (
                            <View style={styles.groupContent}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Username</Text>
                                    <Text style={styles.infoValue}>{username}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Email</Text>
                                    <Text style={styles.infoValue}>{email}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Phone</Text>
                                    <Text style={styles.infoValue}>{phone}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Lobbies Created</Text>
                                    <Text style={styles.infoValue}>{lobbiesCreatedCount}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Account ID</Text>
                                    <Text style={[styles.infoValue, { fontFamily: Theme.fonts.monospace, fontSize: 10 }]} numberOfLines={1}>{userId}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Joined</Text>
                                    <Text style={styles.infoValue}>{createdAt}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Lobby History */}
                    <View style={styles.infoGroup}>
                        <TouchableOpacity
                            style={styles.groupHeader}
                            onPress={() => toggleSection('history')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.groupLabel}>Lobby History</Text>
                            <History size={16} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {expandedSections.history && (
                            <View style={styles.groupContent}>
                                {renderHistoryContent()}
                            </View>
                        )}
                    </View>

                    {/* Subscription Stats */}
                    <View style={styles.infoGroup}>
                        <TouchableOpacity
                            style={styles.groupHeader}
                            onPress={() => toggleSection('stats')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.groupLabel}>Subscription Stats</Text>
                            <BarChart2 size={16} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {expandedSections.stats && (
                            <View style={styles.groupContent}>
                                <View style={styles.statContainer}>
                                    <View style={styles.statHeader}>
                                        <View>
                                            <Text style={styles.statLabel}>Lobbies Created</Text>
                                            <Text style={styles.statSubLabel}>
                                                {tier === 'developer' ? 'Unlimited available' : `${Math.max(0, (maxAILobbies || 0) - lobbiesCreated)} remaining`}
                                            </Text>
                                        </View>
                                        <Text style={[styles.statValue, { color: colors.color }]}>
                                            {lobbiesCreated} / {(maxAILobbies === Infinity || !maxAILobbies) ? '∞' : maxAILobbies}
                                        </Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${(maxAILobbies === Infinity || !maxAILobbies) ? 100 : Math.min((lobbiesCreated / (maxAILobbies || 1)) * 100, 100)}%`,
                                                backgroundColor: colors.color
                                            }
                                        ]} />
                                    </View>
                                </View>

                                <View style={styles.statContainer}>
                                    <View style={styles.statHeader}>
                                        <View>
                                            <Text style={styles.statLabel}>Active Layouts</Text>
                                            <Text style={styles.statSubLabel}>
                                                {tier === 'developer' ? 'Unlimited available' : `${Math.max(0, (maxLayouts || 0) - activeLayoutsCount)} slots remaining`}
                                            </Text>
                                        </View>
                                        <Text style={[styles.statValue, { color: colors.color }]}>
                                            {activeLayoutsCount} / {(maxLayouts === Infinity || !maxLayouts) ? '∞' : maxLayouts}
                                        </Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${(maxLayouts === Infinity || !maxLayouts) ? 100 : Math.min((activeLayoutsCount / (maxLayouts || 1)) * 100, 100)}%`,
                                                backgroundColor: colors.color
                                            }
                                        ]} />
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={[styles.subscriptionBtn, { backgroundColor: Theme.colors.accent + '20', borderColor: Theme.colors.accent }]}
                                     onPress={() => setActiveTab('plans')}
                                 >
                                    <Sparkles size={18} color={Theme.colors.accent} style={{ marginRight: 8 }} />
                                    <Text style={[styles.subscriptionBtnText, { color: Theme.colors.accent }]}>
                                        {tier === 'free' ? 'Get Subscription' : 'View Subscription Plan'}
                                    </Text>
                                    <ArrowRight size={16} color={Theme.colors.accent} style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Partnership */}
                    <View style={styles.infoGroup}>
                        <TouchableOpacity
                            style={styles.groupHeader}
                            onPress={() => toggleSection('partnership')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.groupLabel}>Partnership</Text>
                            <Trophy size={16} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {expandedSections.partnership && (
                            <View style={styles.groupContent}>
                                <View style={styles.infoRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.infoLabel}>Become a Partner</Text>
                                        <Text style={styles.statSubLabel}>Collaborate effectively with LazarFlow</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.collabBtn}
                                        onPress={() => Alert.alert('Request Collaboration', 'Redirecting to email...', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Proceed', onPress: () => { } }
                                        ])}
                                    >
                                        <Text style={styles.collabBtnText}>Request</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Legal */}
                    <View style={styles.infoGroup}>
                        <TouchableOpacity
                            style={styles.groupHeader}
                            onPress={() => toggleSection('legal')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.groupLabel}>Legal & Support</Text>
                            <Flag size={16} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {expandedSections.legal && (
                            <View style={styles.groupContent}>
                                <TouchableOpacity
                                    style={styles.infoRow}
                                    onPress={() => navigation.navigate('PrivacyPolicy')}
                                >
                                    <Text style={styles.infoLabel}>Privacy Policy</Text>
                                    <ArrowRight size={14} color={Theme.colors.border} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.infoRow}
                                    onPress={() => navigation.navigate('TermsAndConditions')}
                                >
                                    <Text style={styles.infoLabel}>Terms & Conditions</Text>
                                    <ArrowRight size={14} color={Theme.colors.border} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity style={styles.mobileLogoutBtn} onPress={handleLogout}>
                        <Text style={styles.mobileLogoutBtnText}>⤴ Log Out</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        );
    };

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#38bdf8" />
                </View>
            );
        }

        return (
            <View style={{ flex: 1 }}>
                {activeTab === 'home' && renderHome()}
                {activeTab === 'design' && renderDesign()}
                {activeTab === 'plans' && <SubscriptionPlansScreen navigation={navigation} isTab={true} />}
                {activeTab === 'profile' && renderProfile()}
                
                {/* Design Studio Upload Form Bottom Sheet */}
                <Modal
                    visible={uploadModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setUploadModalVisible(false)}
                >
                    <View style={styles.bottomSheetOverlay}>
                        <TouchableOpacity 
                            style={styles.bottomSheetBackdrop} 
                            activeOpacity={1} 
                            onPress={() => setUploadModalVisible(false)} 
                        />
                        <View style={styles.uploadBottomSheet}>
                            <View style={styles.dragHandle} />
                            
                            <View style={styles.uploadModalHeader}>
                                <Text style={styles.uploadModalTitle}>Finalize Your Design</Text>
                                <TouchableOpacity 
                                    style={styles.closeBtnSmall}
                                    onPress={() => setUploadModalVisible(false)}
                                >
                                    <X size={20} color={Theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                style={styles.uploadModalBody} 
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                <View style={styles.uploadPreviewWrapper}>
                                    {selectedImage && (
                                        <Image 
                                            source={{ uri: selectedImage.uri }} 
                                            style={styles.uploadPreviewImage} 
                                            resizeMode="cover"
                                        />
                                    )}
                                    <View style={styles.previewOverlay}>
                                        <Text style={styles.previewTag}>PREVIEW</Text>
                                    </View>
                                </View>

                                <View style={styles.uploadInputGroup}>
                                    <Text style={styles.uploadInputLabel}>DESIGN NAME</Text>
                                    <View style={styles.styledInputWrapper}>
                                        <Palette size={18} color={Theme.colors.accent} style={{ marginRight: 12 }} />
                                        <TextInput
                                            style={styles.styledInput}
                                            placeholder="e.g. Minimalist Navy Standings"
                                            placeholderTextColor={Theme.colors.textSecondary}
                                            value={designDetails.name}
                                            onChangeText={(text) => setDesignDetails({ name: text })}
                                        />
                                    </View>
                                    <Text style={styles.inputHint}>This name will be visible in your Design Studio.</Text>
                                </View>
                            </ScrollView>

                            <View style={styles.uploadModalFooter}>
                                <TouchableOpacity 
                                    style={[styles.uploadSubmitBtnFull, uploading && styles.uploadSubmitBtnDisabled]} 
                                    onPress={submitDesignUpload}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.uploadSubmitBtnText}>Upload to Studio</Text>
                                            <Upload size={18} color="#fff" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Subscription Promo Modal */}
                <Modal
                    visible={showPromoModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowPromoModal(false)}
                >
                    <View style={styles.promoOverlay}>
                        <View style={styles.promoContainer}>
                            <TouchableOpacity 
                                style={styles.promoCloseBtn} 
                                onPress={() => setShowPromoModal(false)}
                            >
                                <X size={24} color="#fff" />
                            </TouchableOpacity>

                            <LinearGradient
                                colors={['#1e1b4b', '#312e81']}
                                style={styles.promoHeader}
                            >
                                <View style={styles.promoIconCircle}>
                                    <Crown size={40} color="#f59e0b" fill="#f59e0b" />
                                </View>
                                <Text style={styles.promoTitle}>Unlock Full Potential</Text>
                                <Text style={styles.promoSubtitle}>Upgrade to Premium today</Text>
                            </LinearGradient>

                            <View style={styles.promoBody}>
                                <View style={styles.promoFeatureRow}>
                                    <View style={styles.promoFeatureIcon}>
                                        <Zap size={18} color="#f59e0b" />
                                    </View>
                                    <Text style={styles.promoFeatureText}>Up to 150 AI Lobbies / month</Text>
                                </View>
                                <View style={styles.promoFeatureRow}>
                                    <View style={styles.promoFeatureIcon}>
                                        <Palette size={18} color="#f59e0b" />
                                    </View>
                                    <Text style={styles.promoFeatureText}>Unlimited Custom Layouts</Text>
                                </View>
                                <View style={styles.promoFeatureRow}>
                                    <View style={styles.promoFeatureIcon}>
                                        <ShieldCheck size={18} color="#f59e0b" />
                                    </View>
                                    <Text style={styles.promoFeatureText}>Ad-free experience & Priority Support</Text>
                                </View>

                                <TouchableOpacity 
                                    style={styles.promoMainBtn}
                                    onPress={() => {
                                        setShowPromoModal(false);
                                        setActiveTab('plans');
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#f59e0b', '#d97706']}
                                        style={styles.promoBtnGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.promoMainBtnText}>View All Plans</Text>
                                        <ArrowRight size={18} color="#fff" />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={styles.promoSecondaryBtn}
                                    onPress={() => setShowPromoModal(false)}
                                >
                                    <Text style={styles.promoSecondaryBtnText}>Maybe Later</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Image Preview Modal */}
                <Modal
                    visible={!!previewImage}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setPreviewImage(null)}
                >
                    <View style={styles.imagePreviewOverlay}>
                        <TouchableOpacity 
                            style={styles.imagePreviewClose} 
                            onPress={() => setPreviewImage(null)}
                        >
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                        {previewImage && (
                            <Image
                                source={previewImage}
                                style={styles.imagePreviewFull}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </Modal>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {renderHeader()}
            <View style={{ flex: 1 }} onStartShouldSetResponder={() => activeSettingsId !== null ? setActiveSettingsId(null) : false}>
                {renderContent()}
                {activeTab === 'home' && (
                    <TouchableOpacity style={styles.fabContainer} onPress={handleCreateLobby} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#1E3A8A', '#3B82F6']}
                            style={styles.fabGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={{ transform: [{ rotate: '-45deg' }] }}>
                                <Plus size={24} color="#fff" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* Floating PRO Badge for Free Users */}
            {tier === 'free' && activeTab === 'home' && (
                <TouchableOpacity 
                    style={styles.floatingProBadge} 
                    onPress={() => setActiveTab('plans')}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#f59e0b', '#d97706']}
                        style={styles.proBadgeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Crown size={16} color="#fff" fill="#fff" />
                        <Text style={styles.proBadgeText}>PRO</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
                    <Home size={24} color={activeTab === 'home' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('design')}>
                    <Palette size={24} color={activeTab === 'design' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'design' && styles.tabLabelActive]}>Design</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('plans')}>
                    <View style={styles.premiumTabItem}>
                        <Crown size={24} color={activeTab === 'plans' ? '#f59e0b' : Theme.colors.textSecondary} />
                        <Text style={[styles.tabLabel, { color: activeTab === 'plans' ? '#f59e0b' : Theme.colors.textSecondary, fontWeight: activeTab === 'plans' ? '800' : '400' }]}>Plans</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('profile')}>
                    <User size={24} color={activeTab === 'profile' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    headerUpgradeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f59e0b', // Amber/Gold color for upgrade
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    headerUpgradeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    addButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Theme.colors.textPrimary,
        marginBottom: 15,
    },
    banner: {
        backgroundColor: '#1E3A8A',
        borderRadius: 16,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: 'rgba(30, 58, 138, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
    bannerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 10,
        gap: 4,
    },
    bannerBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bannerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    bannerDesc: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 15,
    },
    premiumBanner: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    premiumBannerGradient: {
        padding: 16,
    },
    premiumBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    premiumBannerTextGroup: {
        flex: 1,
        marginRight: 12,
    },
    premiumBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    premiumBannerTitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#fff',
    },
    premiumBannerDesc: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#E0E7FF',
        opacity: 0.9,
    },
    premiumBannerBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    premiumBannerBadgeText: {
        color: '#1E3A8A',
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.bold,
    },
    bannerCta: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
        gap: 8,
    },
    bannerCtaText: {
        color: '#1E3A8A',
        fontFamily: Theme.fonts.outfit.semibold,
        fontSize: 14,
    },
    card: {
        backgroundColor: Theme.colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: Theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        position: 'relative', // Context for absolute positioning if needed
    },
    cardMainClickArea: {
        flex: 1,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
        marginBottom: 4,
    },
    cardMeta: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    iconBtn: {
        padding: 8,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    iconBtnActive: {
        backgroundColor: Theme.colors.border,
    },
    dropdownMenu: {
        position: 'absolute',
        top: '120%',
        right: 0,
        width: 120,
        backgroundColor: Theme.colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
        paddingVertical: 4,
        zIndex: 50, // Make sure it sits on top
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 8,
    },
    dropdownText: {
        fontSize: 14,
        color: Theme.colors.textPrimary,
        fontWeight: '500',
    },
    dropdownDivider: {
        height: 1,
        backgroundColor: Theme.colors.border,
        marginHorizontal: 0,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: Theme.colors.textSecondary,
        fontSize: 16,
        marginTop: 10,
    },
    profileHeaderHero: {
        height: 120,
        backgroundColor: Theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 115, 232, 0.1)', // Subtle gradient placeholder
    },
    avatarCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Theme.colors.accent,
        borderWidth: 3,
        borderColor: Theme.colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    avatarInitial: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileHeaderMain: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 15,
        zIndex: 2,
    },
    profileNameContainer: {
        flex: 1,
    },
    profileName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    expandHint: {
        fontSize: 10,
        color: Theme.colors.textSecondary,
        marginTop: 2,
    },
    profileContent: {
        paddingHorizontal: 20,
    },
    badgeContainer: {
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    planBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    planBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    trialBanner: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    trialHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    trialTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#818cf8',
    },
    trialDescription: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        lineHeight: 20,
    },
    infoGroup: {
        marginBottom: 16,
        backgroundColor: Theme.colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        overflow: 'hidden',
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    groupLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    groupContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    subscriptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 16,
        marginBottom: 8,
    },
    subscriptionBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    infoLabel: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.textPrimary,
        flex: 1,
        textAlign: 'right',
        marginLeft: 20,
    },
    statContainer: {
        marginBottom: 16,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: Theme.colors.textPrimary,
    },
    statSubLabel: {
        fontSize: 11,
        color: Theme.colors.textSecondary,
        marginTop: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: Theme.colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    collabBtn: {
        backgroundColor: Theme.colors.textPrimary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    collabBtnText: {
        color: Theme.colors.secondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    mobileLogoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: 10,
    },
    mobileLogoutBtnText: {
        color: Theme.colors.danger,
        fontSize: 16,
        fontWeight: '600',
    },
    tabBar: {
        flexDirection: 'row',
        height: 80,
        backgroundColor: Theme.colors.primary,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        paddingBottom: 20,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumTabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: 1.1 }],
    },
    tabLabel: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginTop: 4,
    },
    tabLabelActive: {
        color: Theme.colors.accent,
        fontWeight: '600',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        width: 52,
        height: 52,
        borderRadius: 14,
        transform: [{ rotate: '45deg' }],
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
        zIndex: 100,
    },
    fabGradient: {
        flex: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    // Design Studio Styles
    designTabNav: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    designTabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    designTabBtnActive: {
        backgroundColor: Theme.colors.accent,
    },
    designTabLabel: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textSecondary,
    },
    designTabLabelActive: {
        color: '#fff',
    },
    designSection: {
        gap: 16,
    },
    activeDesignCard: {
        backgroundColor: Theme.colors.card,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        gap: 16,
    },
    activePreview: {
        width: 80,
        height: 80,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeDesignInfo: {
        flex: 1,
    },
    activeDesignTitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 4,
    },
    activeDesignStatus: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    editDesignBtn: {
        padding: 8,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 8,
    },
    uploadAreaSmall: {
        height: 100,
        backgroundColor: Theme.colors.primary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
    },
    uploadTitleSmall: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
    },
    themesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    themeThumbCard: {
        width: '48%',
        backgroundColor: Theme.colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    themeThumb: {
        width: '100%',
        height: 120,
        backgroundColor: Theme.colors.primary,
    },
    themeInfo: {
        padding: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    themeName: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    useThemeBtn: {
        backgroundColor: Theme.colors.accent,
        padding: 4,
        borderRadius: 6,
    },
    emptySubText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    statusPending: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 0.5,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    statusVerified: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 0.5,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    statusText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    useThemeBtnDisabled: {
        opacity: 0.5,
        backgroundColor: Theme.colors.border,
    },
    // Upload Bottom Sheet Styles
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    bottomSheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    uploadBottomSheet: {
        backgroundColor: Theme.colors.secondary,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 12,
        paddingHorizontal: 24,
        paddingBottom: 40,
        maxHeight: '90%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 25,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: Theme.colors.border,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    uploadModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    uploadModalTitle: {
        fontSize: 22,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        letterSpacing: -0.5,
    },
    closeBtnSmall: {
        padding: 8,
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    uploadModalBody: {
        maxHeight: 400,
    },
    uploadPreviewWrapper: {
        width: '100%',
        height: 200,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 24,
        backgroundColor: Theme.colors.primary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    uploadPreviewImage: {
        width: '100%',
        height: '100%',
    },
    previewOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    previewTag: {
        color: '#fff',
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        letterSpacing: 1,
    },
    uploadInputGroup: {
        marginBottom: 24,
    },
    uploadInputLabel: {
        fontSize: 11,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textSecondary,
        marginBottom: 10,
        letterSpacing: 1,
    },
    styledInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    styledInput: {
        flex: 1,
        fontSize: 16,
        color: Theme.colors.textPrimary,
        fontFamily: Theme.fonts.outfit.medium,
    },
    inputHint: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginTop: 8,
        fontStyle: 'italic',
        fontFamily: Theme.fonts.outfit.regular,
    },
    uploadModalFooter: {
        marginTop: 8,
    },
    uploadSubmitBtnFull: {
        backgroundColor: Theme.colors.accent,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    uploadSubmitBtnDisabled: {
        opacity: 0.6,
        backgroundColor: Theme.colors.border,
    },
    uploadSubmitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    // Pinterest Style Grid
    pinterestGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    masonryColumn: {
        width: '48%',
    },
    pinCard: {
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    pinImageContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: Theme.colors.card,
        marginBottom: 8,
    },
    pinImage: {
        width: '100%',
        height: 220, // Taller aspect ratio for "Pin" look
        backgroundColor: Theme.colors.secondary,
    },
    pinContent: {
        paddingHorizontal: 4,
    },
    pinTitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
        marginBottom: 6,
        lineHeight: 20,
    },
    pinMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pinAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    pinAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    pinAvatarText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textSecondary,
    },
    pinAuthorName: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        flex: 1,
    },
    promoOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    promoContainer: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: Theme.colors.primary,
        borderRadius: 28,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.6,
        shadowRadius: 25,
    },
    promoCloseBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 6,
    },
    promoHeader: {
        padding: 35,
        alignItems: 'center',
    },
    promoIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    promoTitle: {
        fontSize: 26,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    promoSubtitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.regular,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
    promoBody: {
        padding: 24,
        backgroundColor: Theme.colors.primary,
    },
    promoFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    promoFeatureIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: Theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    promoFeatureText: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
    },
    promoMainBtn: {
        marginTop: 24,
        borderRadius: 16,
        overflow: 'hidden',
    },
    promoBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    promoMainBtnText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
    },
    promoSecondaryBtn: {
        marginTop: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    promoSecondaryBtnText: {
        color: Theme.colors.textSecondary,
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
    },
    floatingProBadge: {
        position: 'absolute',
        bottom: 25,
        left: 25,
        zIndex: 100,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
    },
    proBadgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    proBadgeText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        letterSpacing: 1,
    },
    // Image Preview Modal Styles
    imagePreviewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    imagePreviewClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
    },
    imagePreviewFull: {
        width: '100%',
        height: '80%',
    },
});

export default DashboardScreen;
