import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Home, History, User, Plus, Radio, Calculator, Flag, Settings, Edit, Trash2, ArrowRight, Sparkles, BarChart2, Award } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';
import { useSubscription } from '../hooks/useSubscription';
import { getUserThemes } from '../lib/dataService';

const DashboardScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [tournaments, setTournaments] = useState([]);
    const [pastTournaments, setPastTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [activeSettingsId, setActiveSettingsId] = useState(null);
    const [activeLayoutsCount, setActiveLayoutsCount] = useState(0);
    const [expandedSections, setExpandedSections] = useState({
        account: true,
        stats: false,
        partnership: false,
        legal: false
    });

    const { tier, tournamentsCreated, loading: subLoading, limits } = useSubscription();

    useEffect(() => {
        if (user?.id) {
            const fetchLayoutsCount = async () => {
                const themes = await getUserThemes();
                setActiveLayoutsCount(themes.length);
            };
            fetchLayoutsCount();
        }
    }, [user?.id]);

    useEffect(() => {
        let subscription = null;

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            fetchTournaments();

            if (user) {
                // Subscribe to realtime updates for tournaments
                subscription = supabase
                    .channel(`tournaments-user-${user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'tournaments',
                            filter: `user_id=eq.${user.id}`,
                        },
                        () => fetchTournaments()
                    )
                    .subscribe();
            }
        };

        init();

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, []);

    const fetchTournaments = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const active = data.filter(t => t.status !== 'completed');
            const past = data.filter(t => t.status === 'completed');

            setTournaments(active);
            setPastTournaments(past);
        } catch (error) {
            console.error('Error fetching tournaments:', error);
            Alert.alert('Error', 'Failed to load tournaments');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchTournaments();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleCreateTournament = () => {
        navigation.navigate('CreateTournament');
    };

    const handleBannerAction = () => {
        navigation.navigate('CreateTournament');
    };

    // --- Action Handlers ---

    const toggleSettings = (id) => {
        if (activeSettingsId === id) {
            setActiveSettingsId(null);
        } else {
            setActiveSettingsId(id);
        }
    };

    const confirmEndTournament = (tournament) => {
        Alert.alert(
            "End Tournament",
            `Are you sure you want to end "${tournament.name}"? It will be moved to past tournaments.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "End",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('tournaments')
                                .update({ status: 'completed' })
                                .eq('id', tournament.id);
                            if (error) throw error;
                            // Realtime sub will update list, but we can also fetch manually to be sure
                            fetchTournaments();
                        } catch (err) {
                            Alert.alert("Error", "Failed to end tournament");
                        }
                    }
                }
            ]
        );
    };

    const confirmDeleteTournament = (tournament) => {
        Alert.alert(
            "Delete Tournament",
            `Are you sure you want to delete "${tournament.name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('tournaments')
                                .delete()
                                .eq('id', tournament.id);
                            if (error) throw error;
                            fetchTournaments();
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete tournament");
                        }
                    }
                }
            ]
        );
    };

    const handleEditTournament = (tournament) => {
        // Close settings
        setActiveSettingsId(null);
        navigation.navigate('EditTournament', { tournamentId: tournament.id });
    };


    const renderHeader = () => {
        let title = 'Home';
        if (activeTab === 'home') {
            const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
            title = `Welcome ${username}`;
        }
        if (activeTab === 'history') title = 'History';
        if (activeTab === 'profile') title = 'Profile';

        return (
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight + 10 }]}>
                {activeTab === 'home' ? (
                    <Text style={styles.headerTitle}>
                        Welcome <Text style={{ color: Theme.colors.accent }}>{user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'}</Text>
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
            {/* Banner */}
            <View style={styles.banner}>
                <View style={styles.bannerBadge}>
                    <Sparkles size={12} color="#fff" />
                    <Text style={styles.bannerBadgeText}>NEW FEATURE</Text>
                </View>
                <Text style={styles.bannerTitle}>Introducing LexiView</Text>
                <Text style={styles.bannerDesc}>Extract scoreboard data with 99.9% accuracy.</Text>
                <TouchableOpacity style={styles.bannerCta} onPress={handleBannerAction}>
                    <Text style={styles.bannerCtaText}>Try now</Text>
                    <ArrowRight size={16} color="#1E3A8A" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Active Tournaments</Text>
            {tournaments.length > 0 ? (
                tournaments.map(tournament => (
                    <View key={tournament.id} style={[styles.card, { zIndex: activeSettingsId === tournament.id ? 10 : 1 }]}>
                        <TouchableOpacity
                            style={styles.cardMainClickArea}
                            onPress={() => navigation.navigate('LiveTournament', { id: tournament.id })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{tournament.name}</Text>
                                <Text style={styles.cardMeta}>{tournament.game} • {new Date(tournament.created_at).toLocaleDateString()}</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('LiveTournament', { id: tournament.id })} title="Go Live">
                                <Radio size={18} color={Theme.colors.accent} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CalculateResults', { tournament: tournament })} title="Calculate">
                                <Calculator size={18} color="#94a3b8" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmEndTournament(tournament)} title="End Tournament">
                                <Flag size={18} color="#ef4444" />
                            </TouchableOpacity>

                            {/* Settings Button & Dropdown */}
                            <View>
                                <TouchableOpacity
                                    style={[styles.iconBtn, activeSettingsId === tournament.id && styles.iconBtnActive]}
                                    onPress={() => toggleSettings(tournament.id)}
                                >
                                    <Settings size={18} color="#94a3b8" />
                                </TouchableOpacity>

                                {activeSettingsId === tournament.id && (
                                    <View style={styles.dropdownMenu}>
                                        <TouchableOpacity style={styles.dropdownItem} onPress={() => handleEditTournament(tournament)}>
                                            <Edit size={16} color={Theme.colors.textPrimary} />
                                            <Text style={styles.dropdownText}>Edit</Text>
                                        </TouchableOpacity>
                                        <View style={styles.dropdownDivider} />
                                        <TouchableOpacity style={styles.dropdownItem} onPress={() => {
                                            setActiveSettingsId(null);
                                            confirmDeleteTournament(tournament);
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
                    <Text style={styles.emptyText}>No active tournaments</Text>
                </View>
            )}
            <View style={{ height: 100 }} />
        </ScrollView>
    );

    const renderHistory = () => (
        <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />}
        >
            <Text style={styles.sectionTitle}>Past Tournaments</Text>
            {pastTournaments.length > 0 ? (
                pastTournaments.map(tournament => (
                    <TouchableOpacity
                        key={tournament.id}
                        style={styles.card}
                        onPress={() => navigation.navigate('LiveTournament', { id: tournament.id })}
                    >
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{tournament.name}</Text>
                            <Text style={styles.cardMeta}>{new Date(tournament.created_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('LiveTournament', { id: tournament.id })} title="Leaderboard">
                                <BarChart2 size={18} color={Theme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('LiveTournament', { id: tournament.id, view: 'mvp' })} title="MVPs">
                                <Award size={18} color={Theme.colors.accent} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDeleteTournament(tournament)} title="Delete">
                                <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                ))
            ) : (
                <View style={styles.emptyState}>
                    <History size={48} color="#334155" />
                    <Text style={styles.emptyText}>No past tournaments</Text>
                </View>
            )}
        </ScrollView>
    );

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getTierDisplayName = (tierName) => {
        const isInTrial = tierName?.toLowerCase() === 'free' && tournamentsCreated < 2;
        const tierMap = {
            'free': isInTrial ? 'Free Trial' : 'Free Tier',
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
        const colors = getTierColors(tier);
        const isInTrial = tier?.toLowerCase() === 'free' && tournamentsCreated < 2;
        const displayName = user?.email?.split('@')[0] || 'User';

        return (
            <ScrollView style={styles.content}>
                <View style={styles.profileHeaderHero}>
                    <View style={styles.heroGradient} />
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>{user?.email?.charAt(0).toUpperCase()}</Text>
                    </View>
                </View>

                <View style={[styles.profileContent, { marginTop: -40 }]}>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <View style={styles.badgeContainer}>
                        <View style={[styles.planBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                            <Text style={[styles.planBadgeText, { color: colors.color }]}>{getTierDisplayName(tier)}</Text>
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
                                Use {2 - tournamentsCreated} more AI tournaments to keep these perks!
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
                            <Text style={styles.groupLabel}>Account Details</Text>
                            <Settings size={16} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {expandedSections.account && (
                            <View style={styles.groupContent}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>User ID</Text>
                                    <Text style={styles.infoValue} numberOfLines={1}>{user?.id}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Email</Text>
                                    <Text style={styles.infoValue}>{user?.email}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Member Since</Text>
                                    <Text style={styles.infoValue}>{formatDate(user?.created_at)}</Text>
                                </View>
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
                                            <Text style={styles.statLabel}>Tournaments Created</Text>
                                            <Text style={styles.statSubLabel}>
                                                {tier === 'developer' ? 'Unlimited available' : `${Math.max(0, limits.maxAILobbies - tournamentsCreated)} remaining`}
                                            </Text>
                                        </View>
                                        <Text style={[styles.statValue, { color: colors.color }]}>
                                            {tournamentsCreated} / {limits.maxAILobbies === Infinity ? '∞' : limits.maxAILobbies}
                                        </Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${limits.maxAILobbies === Infinity ? 100 : Math.min((tournamentsCreated / limits.maxAILobbies) * 100, 100)}%`,
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
                                                {tier === 'developer' ? 'Unlimited available' : `${Math.max(0, limits.maxLayouts - activeLayoutsCount)} slots remaining`}
                                            </Text>
                                        </View>
                                        <Text style={[styles.statValue, { color: colors.color }]}>
                                            {activeLayoutsCount} / {limits.maxLayouts === Infinity ? '∞' : limits.maxLayouts}
                                        </Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${limits.maxLayouts === Infinity ? 100 : Math.min((activeLayoutsCount / limits.maxLayouts) * 100, 100)}%`,
                                                backgroundColor: colors.color
                                            }
                                        ]} />
                                    </View>
                                </View>
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
        if (activeTab === 'home') return renderHome();
        if (activeTab === 'history') return renderHistory();
        if (activeTab === 'profile') return renderProfile();
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}
            <View style={{ flex: 1 }} onStartShouldSetResponder={() => activeSettingsId !== null ? setActiveSettingsId(null) : false}>
                {renderContent()}
                {activeTab === 'home' && (
                    <TouchableOpacity style={styles.fabContainer} onPress={handleCreateTournament} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#1E3A8A', '#3B82F6']}
                            style={styles.fabGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={{ transform: [{ rotate: '-45deg' }] }}>
                                <Plus size={28} color="#fff" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
                    <Home size={24} color={activeTab === 'home' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('history')}>
                    <History size={24} color={activeTab === 'history' ? Theme.colors.accent : Theme.colors.textSecondary} />
                    <Text style={[styles.tabLabel, activeTab === 'history' && styles.tabLabelActive]}>History</Text>
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
        paddingVertical: 15,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    addButton: {
        padding: 5,
    },
    content: {
        flex: 1,
        padding: 20,
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
        fontWeight: '600',
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
        fontWeight: '600',
        color: Theme.colors.textPrimary,
        marginBottom: 4,
    },
    cardMeta: {
        fontSize: 12,
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
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Theme.colors.accent,
        borderWidth: 4,
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
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileContent: {
        paddingHorizontal: 20,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    },
    badgeContainer: {
        alignItems: 'center',
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
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 16,
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
});

export default DashboardScreen;
