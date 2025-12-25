import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, RefreshControl, StatusBar, Platform } from 'react-native';
import { Trophy, Home, History, User, Plus, Radio, Calculator, Flag, Settings, Edit, Trash2, ArrowRight, Sparkles, BarChart2, Award } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { Theme } from '../styles/theme';

const DashboardScreen = ({ navigation }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [tournaments, setTournaments] = useState([]);
    const [pastTournaments, setPastTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [activeSettingsId, setActiveSettingsId] = useState(null);

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
        Alert.alert('LexiView', 'LexiView is our advanced AI engine that extracts scoreboard data from images with extreme accuracy. Try it out in your next tournament!');
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
        if (activeTab === 'history') title = 'History';
        if (activeTab === 'profile') title = 'Profile';

        return (
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight + 10 }]}>
                <Text style={styles.headerTitle}>{title}</Text>
                {activeTab === 'home' && (
                    <TouchableOpacity style={styles.addButton} onPress={handleCreateTournament}>
                        <Plus size={24} color={Theme.colors.accent} />
                    </TouchableOpacity>
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

    const renderProfile = () => (
        <ScrollView style={styles.content}>
            <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <View style={styles.tierBadge}>
                    <Text style={styles.tierBadgeText}>Free Tier</Text>
                </View>
            </View>

            <View style={styles.profileMenu}>
                <TouchableOpacity style={styles.menuItem}>
                    <Text style={styles.menuText}>Account Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('PrivacyPolicy')}>
                    <Text style={styles.menuText}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TermsAndConditions')}>
                    <Text style={styles.menuText}>Terms & Conditions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

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
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 30,
        backgroundColor: Theme.colors.card,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileEmail: {
        fontSize: 18,
        fontWeight: '600',
        color: Theme.colors.textPrimary,
        marginBottom: 8,
    },
    tierBadge: {
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(26, 115, 232, 0.2)',
    },
    tierBadgeText: {
        color: Theme.colors.accent,
        fontSize: 12,
        fontWeight: '600',
    },
    profileMenu: {
        backgroundColor: Theme.colors.card,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    menuItem: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    menuText: {
        color: Theme.colors.textPrimary,
        fontSize: 16,
    },
    logoutItem: {
        borderBottomWidth: 0,
    },
    logoutText: {
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
});

export default DashboardScreen;
