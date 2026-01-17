import React, { useState, useCallback, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    Dimensions,
    ScrollView,
    TextInput,
    Modal,
    RefreshControl,
    Image,
    StatusBar,
    Platform,
    Alert,
    Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabaseClient';
import { Trophy, Award, Share2, Download, Search, Palette, Layout, Settings, Check, X, RefreshCw, Edit, Image as ImageIcon, Camera, Instagram, Youtube } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Theme } from '../styles/theme';
import DesignRenderer from '../components/DesignRenderer';
import { getUserThemes, getCommunityDesigns, renderLobbyDesign, renderResults, getDesignImageSource, uploadLogo } from '../lib/dataService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ResultsBottomSheet = ({ visible, onClose, imageUri }) => {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        Alert.alert('Demo', 'Save to Gallery will be implemented soon!');
    };

    const handleShare = async () => {
        Alert.alert('Demo', 'Share Result will be implemented soon!');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.sheetOverlay}>
                <TouchableOpacity 
                    style={styles.sheetDismiss} 
                    activeOpacity={1} 
                    onPress={onClose} 
                />
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Result Generated</Text>
                        <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                            <X size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
                        <View style={styles.resultPreviewContainer}>
                            <Image 
                                source={{ uri: imageUri }} 
                                style={styles.resultPreviewImage} 
                                resizeMode="contain" 
                            />
                        </View>

                        <View style={styles.sheetActionRow}>
                            <TouchableOpacity 
                                style={[styles.sheetActionBtn, styles.downloadActionBtn]} 
                                onPress={handleDownload}
                                disabled={downloading}
                            >
                                {downloading ? (
                                    <ActivityIndicator color="#1A73E8" />
                                ) : (
                                    <>
                                        <Download size={20} color="#1A73E8" />
                                        <Text style={styles.downloadActionText}>Save to Gallery</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.sheetActionBtn, styles.shareActionBtn]} 
                                onPress={handleShare}
                            >
                                <Share2 size={20} color="#FFFFFF" />
                                <Text style={styles.shareActionText}>Share Result</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const LiveLobbyScreen = ({ route, navigation }) => {
    const { id } = route?.params || {};
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lobby, setLobby] = useState(null);
    const [sharing, setSharing] = useState(false);
    const [themes, setThemes] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Carousel State
    const [activeThemeIndex, setActiveThemeIndex] = useState(0);
    const carouselRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedResult, setGeneratedResult] = useState(null);
    const [showResultSheet, setShowResultSheet] = useState(false);

    // Design Edit State
    const [designData, setDesignData] = useState({
        brandLogo: null,
        lobbyLogo: null,
        lobbyName: '',
        scrimsText: '',
        organiserName: '',
        instagram: '',
        youtube: ''
    });

    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('carousel'); // 'carousel' or 'result'

    // Sync designData with lobby data when it loads
    React.useEffect(() => {
        if (lobby) {
            setDesignData(prev => ({
                ...prev,
                lobbyName: lobby.name || ''
            }));
        }
    }, [lobby]);

    useFocusEffect(
        useCallback(() => {
            const initializeScreen = async () => {
                if (id) {
                    setLoading(true);
                    await Promise.all([
                        fetchLobbyData(),
                        loadThemes()
                    ]);
                    setLoading(false);
                } else {
                    setError('No lobby ID provided');
                    setLoading(false);
                }
            };

            initializeScreen();
        }, [id])
    );

    const loadThemes = async () => {
        try {
            const [userThemes, communityDesigns] = await Promise.all([
                getUserThemes(),
                getCommunityDesigns()
            ]);
            
            const allAvailable = [...(userThemes || []), ...(communityDesigns || [])];
            const uniqueThemes = allAvailable.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setThemes(uniqueThemes);
            return uniqueThemes;
        } catch (error) {
            console.error('Error loading themes:', error);
            return [];
        }
    };

    const handleGenerateTable = async () => {
        const activeTheme = themes[activeThemeIndex];
        if (!activeTheme) {
            Alert.alert('Error', 'Please select a theme first');
            return;
        }

        try {
            setIsGenerating(true);
            const result = await renderResults(id, activeTheme.id);
            
            if (result) {
                if (result instanceof ArrayBuffer || (result && result.constructor && result.constructor.name === 'ArrayBuffer')) {
                    const base64 = Buffer.from(result).toString('base64');
                    setGeneratedResult(`data:image/png;base64,${base64}`);
                } else if (typeof result === 'string') {
                    setGeneratedResult(result);
                } else if (result.url) {
                    setGeneratedResult(result.url);
                }
                setShowResultSheet(true);
            }
        } catch (error) {
            console.error('Error generating table:', error);
            Alert.alert('Error', 'Failed to generate results table. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const fetchLobbyData = async () => {
        try {
            setLoading(true);
            const [lobbyResult, teamsResult] = await Promise.all([
                supabase.from('lobbies').select('*').eq('id', id).single(),
                supabase.from('lobby_teams').select('*').eq('lobby_id', id)
            ]);

            if (lobbyResult.error) throw lobbyResult.error;
            setLobby(lobbyResult.data);

            const sortedTeams = (teamsResult.data || []).map(team => {
                const points = typeof team.total_points === 'object' ? team.total_points : { kill_points: 0, placement_points: 0 };
                return {
                    ...team,
                    total: (points.kill_points || 0) + (points.placement_points || 0),
                    kill_points: points.kill_points || 0,
                    placement_points: points.placement_points || 0,
                    wins: points.wins || 0
                };
            }).sort((a, b) => b.total - a.total);

            setTeams(sortedTeams);
            return sortedTeams;
        } catch (error) {
            setError(error.message);
            Alert.alert('Error', 'Failed to load lobby data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
                <Text style={{ color: '#fff', marginTop: 10 }}>Loading...</Text>
            </View>
        );
    }

    const renderThemeItem = ({ item, index }) => {
        const isActive = index === activeThemeIndex;
        return (
            <View style={[styles.carouselItem, isActive && styles.activeCarouselItem]}>
                <View style={styles.themeCard}>
                    <DesignRenderer
                        theme={item}
                        data={teams.slice(0, 20)}
                        lobby={lobby}
                        width={SCREEN_WIDTH * 0.85}
                    />
                    <View style={styles.themeOverlay}>
                        <View style={styles.themeBadge}>
                            <Palette size={12} color={Theme.colors.accent} />
                            <Text style={styles.themeBadgeText}>PREMIUM THEME</Text>
                        </View>
                        <Text style={styles.themeNameLabel}>{item.name || `Design #${index + 1}`}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.newDesignContainer}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.newHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <X size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.newHeaderTitle}>
                    Select Theme
                </Text>
                <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editBtn}>
                    <Edit size={20} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.carouselContent}>
                <FlatList
                    ref={carouselRef}
                    data={themes}
                    renderItem={renderThemeItem}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                        setActiveThemeIndex(index);
                    }}
                    keyExtractor={(item) => item.id}
                    snapToInterval={SCREEN_WIDTH}
                    decelerationRate="fast"
                    contentContainerStyle={styles.carouselList}
                />
                
                {/* Paging Dots */}
                <View style={styles.pagination}>
                    {themes.map((_, i) => (
                        <View 
                            key={i} 
                            style={[
                                styles.dot, 
                                activeThemeIndex === i && styles.activeDot
                            ]} 
                        />
                    ))}
                </View>
                
                <View style={styles.bottomActionContainer}>
                    <TouchableOpacity 
                        style={styles.generateButton}
                        onPress={handleGenerateTable}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Layout size={20} color="#fff" />
                                <Text style={styles.generateButtonText}>Generate Table</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results Bottom Sheet */}
            <ResultsBottomSheet 
                visible={showResultSheet}
                onClose={() => setShowResultSheet(false)}
                imageUri={generatedResult}
            />

            {/* Edit Design Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowEditModal(false)}
            >
                <SafeAreaView style={styles.editModalContainer}>
                    <StatusBar barStyle="light-content" />
                    <View style={styles.editModalHeader}>
                        <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.editModalTitle}>Edit Design Details</Text>
                        <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.doneButton} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={Theme.colors.accent} />
                            ) : (
                                <Check size={24} color={Theme.colors.accent} />
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.editModalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.editSection}>
                            <Text style={styles.editSectionTitle}>Logos</Text>
                            <View style={styles.logoGrid}>
                                <TouchableOpacity style={styles.logoPicker} onPress={() => handlePickLogo('brandLogo')}>
                                    {designData.brandLogo ? (
                                        <Image source={{ uri: designData.brandLogo }} style={styles.logoPreview} />
                                    ) : (
                                        <View style={styles.logoPlaceholder}>
                                            <ImageIcon size={24} color={Theme.colors.textSecondary} />
                                            <Text style={styles.logoPickerText}>Brand Logo</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.logoPicker} onPress={() => handlePickLogo('lobbyLogo')}>
                                    {designData.lobbyLogo ? (
                                        <Image source={{ uri: designData.lobbyLogo }} style={styles.logoPreview} />
                                    ) : (
                                        <View style={styles.logoPlaceholder}>
                                            <ImageIcon size={24} color={Theme.colors.textSecondary} />
                                            <Text style={styles.logoPickerText}>Lobby Logo</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.editSection}>
                            <Text style={styles.editSectionTitle}>Text Content</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Lobby Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. WINTER CHAMPIONSHIP"
                                    placeholderTextColor={Theme.colors.textSecondary}
                                    value={designData.lobbyName}
                                    onChangeText={(text) => setDesignData(prev => ({ ...prev, lobbyName: text }))}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Scrims / Match Text</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. QUALIFIERS | DAY 2"
                                    placeholderTextColor={Theme.colors.textSecondary}
                                    value={designData.scrimsText}
                                    onChangeText={(text) => setDesignData(prev => ({ ...prev, scrimsText: text }))}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Organiser Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Pro Gaming League"
                                    placeholderTextColor={Theme.colors.textSecondary}
                                    value={designData.organiserName}
                                    onChangeText={(text) => setDesignData(prev => ({ ...prev, organiserName: text }))}
                                />
                            </View>
                        </View>

                        <View style={styles.editSection}>
                            <Text style={styles.editSectionTitle}>Social Handles</Text>
                            <View style={styles.inputGroup}>
                                <View style={styles.inputWithIcon}>
                                    <Instagram size={20} color="#E1306C" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInputWithIcon}
                                        placeholder="@instagram_handle"
                                        placeholderTextColor={Theme.colors.textSecondary}
                                        value={designData.instagram}
                                        onChangeText={(text) => setDesignData(prev => ({ ...prev, instagram: text }))}
                                    />
                                </View>
                            </View>
                            <View style={styles.inputGroup}>
                                <View style={styles.inputWithIcon}>
                                    <Youtube size={20} color="#FF0000" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInputWithIcon}
                                        placeholder="YouTube Channel Name"
                                        placeholderTextColor={Theme.colors.textSecondary}
                                        value={designData.youtube}
                                        onChangeText={(text) => setDesignData(prev => ({ ...prev, youtube: text }))}
                                    />
                                </View>
                            </View>
                        </View>
                        
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
    },
    lobbyInfo: {
        padding: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
    },
    lobbyNameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    lobbyGameText: {
        fontSize: 14,
        color: Theme.colors.accent,
        marginTop: 4,
        fontWeight: '600',
    },
    designViewContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    designCardContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        marginVertical: 10,
        borderRadius: 15,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    designHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    designTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    imageWrapper: {
        width: '100%',
        aspectRatio: 0.7,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        overflow: 'hidden',
    },
    renderedImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 10,
        color: Theme.colors.textSecondary,
        fontSize: 14,
    },
    shareDesignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.accent,
        marginTop: 15,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    shareDesignText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.secondary,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerCell: {
        color: Theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        alignItems: 'center',
    },
    evenRow: {
        backgroundColor: Theme.colors.primary,
    },
    oddRow: {
        backgroundColor: Theme.colors.secondary,
    },
    cell: {
        color: Theme.colors.textPrimary,
        fontSize: 14,
        textAlign: 'center',
    },
    rankCell: { width: 30 },
    teamCell: { flex: 1, textAlign: 'left', paddingLeft: 10 },
    pointCell: { width: 45 },
    totalCell: { color: Theme.colors.accent, fontWeight: 'bold' },
    teamName: {
        color: Theme.colors.textPrimary,
        fontWeight: '500',
        textAlign: 'left',
    },
    topRank: {
        color: Theme.colors.accent,
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: Theme.colors.secondary,
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        borderWidth: 1,
        borderColor: Theme.colors.accent,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.textSecondary,
    },
    activeTabText: {
        color: Theme.colors.accent,
    },
    mvpPlayerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        textAlign: 'left',
    },
    mvpTeamName: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        textAlign: 'left',
    },
    mvpKills: {
        width: 60,
        color: Theme.colors.accent,
        fontWeight: 'bold',
        fontSize: 18,
    },
    // Design Selector Styles
    designSelectorContainer: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    designSelectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    designSelectorTitle: {
        fontSize: 22,
        fontWeight: 'bold', 
        color: Theme.colors.textPrimary,
    },
    closeButton: {
        padding: 8,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 45,
        gap: 10,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    searchInput: {
        flex: 1,
        color: Theme.colors.textPrimary,
        fontSize: 16,
    },
    infoButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Theme.colors.primary,
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    infoIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Theme.colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center', 
    },
    infoText: {
        color: Theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    filterButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 20,
        gap: 10,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    filterButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    designCarousel: {
        paddingHorizontal: 20,
        paddingVertical: 30,
        gap: 20,
    },
    designCard: {
        width: Dimensions.get('window').width * 0.75,
        height: Dimensions.get('window').width * 0.75,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    activeDesignCard: {
        borderColor: Theme.colors.accent,
    },
    designCardImage: {
        width: '100%',
        height: '100%',
    },
    designCardPlaceholder: {
        width: Dimensions.get('window').width * 0.75,
        height: Dimensions.get('window').width * 0.75,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionIndicatorContainer: {
        alignItems: 'center',
        marginTop: -10,
    },
    selectionPill: {
        flexDirection: 'row', 
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8, 
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    selectionPillText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    categoriesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        gap: 30,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonActive: {
        borderColor: '#a855f7', // Purple as in image
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#a855f7', 
    },
    categoryText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: '#fff',
    },
    downloadButton: {
        marginHorizontal: 20,
        marginTop: 40, 
        marginBottom: 30,
        backgroundColor: '#e2d5f7', // Light purple as in image
        borderRadius: 30,
        paddingVertical: 18,
        alignItems: 'center',
    },
    downloadButtonText: {
        color: '#1e1b4b', // Dark navy text
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Theme.colors.textSecondary,
        fontSize: 16,
    },
    activeIconButton: {
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
    },
    designContainer: {
        backgroundColor: '#000', // Ensure dark background for designs
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.primary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        marginBottom: 20,
    },
    themeList: {
        marginBottom: 20,
    },
    themeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        marginBottom: 10,
    },
    themeOptionActive: {
        borderColor: Theme.colors.accent,
        backgroundColor: 'rgba(26, 115, 232, 0.05)',
    },
    themePreviewPlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    themePreviewImage: {
        width: '100%',
        height: '100%',
    },
    themePlaceholderText: {
        fontSize: 10,
        color: Theme.colors.textSecondary,
        fontWeight: 'bold',
    },
    themeOptionName: {
        fontSize: 16,
        color: Theme.colors.textPrimary,
        fontWeight: '500',
    },
    noThemesText: {
        textAlign: 'center',
        color: Theme.colors.textSecondary,
        marginTop: 20,
    },
    // Edit Modal Styles
    editModalContainer: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    editModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    editModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    editModalContent: {
        flex: 1,
        padding: 20,
    },
    editSection: {
        marginBottom: 25,
    },
    editSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.accent,
        marginBottom: 15,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    logoGrid: {
        flexDirection: 'row',
        gap: 15,
    },
    logoPicker: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    logoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    logoPickerText: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        fontWeight: '500',
    },
    logoPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        marginBottom: 8,
        fontWeight: '500',
    },
    textInput: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 10,
        padding: 12,
        color: Theme.colors.textPrimary,
        fontSize: 15,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    textInputWithIcon: {
        flex: 1,
        paddingVertical: 12,
        color: Theme.colors.textPrimary,
        fontSize: 15,
    },
    doneButton: {
        padding: 4,
    },
    themeSelectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.primary,
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    themeInfo: {
        flex: 1,
        marginLeft: 15,
    },
    selectedThemeName: {
        fontSize: 15,
        fontWeight: '600',
        color: Theme.colors.textPrimary,
    },
    changeThemeText: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginTop: 2,
    },
    // New Design System Styles
    newDesignContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF', 
    },
    newHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    newHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
        textAlign: 'center',
        flex: 1,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    editBtn: {
        padding: 8,
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    carouselContent: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    carouselList: {
        paddingVertical: 30,
    },
    carouselItem: {
        width: SCREEN_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeCarouselItem: {
        // Reserved
    },
    themeCard: {
        width: SCREEN_WIDTH * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    themeOverlay: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    themeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(26, 115, 232, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 6,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(26, 115, 232, 0.1)',
    },
    themeBadgeText: {
        color: Theme.colors.accent,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    themeNameLabel: {
        color: '#333333',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 15,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E0E0E0',
    },
    activeDot: {
        width: 24,
        backgroundColor: Theme.colors.accent,
    },
    bottomActionContainer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Theme.colors.accent,
        borderRadius: 18,
        paddingVertical: 18,
        gap: 12,
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    generateButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    resultContent: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    fullResultImage: {
        flex: 1,
        width: '100%',
    },
    resultActions: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    shareFab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.accent,
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    shareFabText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Bottom Sheet Styles
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetDismiss: {
        flex: 1,
    },
    sheetContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingBottom: Platform.OS === 'ios' ? 40 : 25,
        maxHeight: SCREEN_HEIGHT * 0.85,
    },
    sheetHeader: {
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sheetHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
        marginBottom: 10,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    sheetCloseBtn: {
        position: 'absolute',
        right: 20,
        top: 20,
        padding: 5,
    },
    sheetScroll: {
        padding: 20,
    },
    resultPreviewContainer: {
        width: '100%',
        aspectRatio: 0.75,
        backgroundColor: '#F8F9FA',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        marginBottom: 25,
    },
    resultPreviewImage: {
        width: '100%',
        height: '100%',
    },
    sheetActionRow: {
        flexDirection: 'row',
        gap: 15,
    },
    sheetActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 15,
        gap: 10,
    },
    downloadActionBtn: {
        backgroundColor: '#F0F7FF',
        borderWidth: 1,
        borderColor: '#1A73E8',
    },
    downloadActionText: {
        color: '#1A73E8',
        fontSize: 15,
        fontWeight: 'bold',
    },
    shareActionBtn: {
        backgroundColor: '#1A73E8',
    },
    shareActionText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});

export default LiveLobbyScreen;
