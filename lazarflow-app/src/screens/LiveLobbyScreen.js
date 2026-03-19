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
    Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import { Trophy, Award, Share2, Download, Search, Palette, Layout, Settings, Check, X, RefreshCw, Edit, Image as ImageIcon, Camera, Instagram, Youtube, Play, User, ArrowLeft, Info } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Theme } from '../styles/theme';
import DesignRenderer from '../components/DesignRenderer';
import { getUserThemes, getCommunityDesigns, renderResults, uploadLogo, getLobby, getLobbyTeams, getLobbyPlayerStats, getDesignImageSource } from '../lib/dataService';
import { useSubscription } from '../hooks/useSubscription';
import { CustomAlert as Alert } from '../lib/AlertService';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ResultsBottomSheet = ({ visible, onClose, imageUri }) => {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setDownloading(true);
            
            if (!imageUri) {
                Alert.alert('Error', 'No image to save');
                return;
            }

            // Skip permission request - we're saving to cache directory, not media library
            let localUri = '';

            // If it's a remote URL
            if (imageUri.startsWith('http')) {
                const filename = FileSystem.cacheDirectory + `result_${Date.now()}.png`;
                const downloadResult = await FileSystem.downloadAsync(imageUri, filename);
                localUri = downloadResult.uri;
            } 
            // If it's base64
            else if (imageUri.startsWith('data:image')) {
                const base64Code = imageUri.split('base64,')[1];
                const filename = FileSystem.cacheDirectory + `result_${Date.now()}.png`;
                await FileSystem.writeAsStringAsync(filename, base64Code, {
                    encoding: 'base64',
                });
                localUri = filename;
            } else {
                localUri = imageUri;
            }

            // Save to library
            const asset = await MediaLibrary.createAssetAsync(localUri);
            
            // On Android, createAssetAsync already saves to DCIM. 
            // On iOS, we might want to put it in a specific album, but createAssetAsync is usually enough for the gallery.
            
            Alert.alert('Success', 'Image saved to gallery!');
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Error', 'Failed to save image to gallery');
        } finally {
            setDownloading(false);
        }
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
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Download size={20} color="#fff" />
                                        <Text style={styles.downloadActionText}>Save to Gallery</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const LiveLobbyScreen = ({ route, navigation }) => {
    const { canCustomSocial, tier } = useSubscription();
    const { id } = route?.params || {};
    const [teams, setTeams] = useState([]);
    const [playerStats, setPlayerStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lobby, setLobby] = useState(null);
    const [sharing, setSharing] = useState(false);
    const [themes, setThemes] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Carousel State
    const [activeThemeIndex, setActiveThemeIndex] = useState(0);
    const carouselRef = useRef(null);
    const mvpCanvasRef = useRef(null);
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

    const handleDownloadMvp = async () => {
        try {
            setIsGenerating(true);
            if (mvpCanvasRef.current) {
                const uri = await captureRef(mvpCanvasRef, {
                    format: 'png',
                    quality: 1,
                    result: 'tmpfile'
                });
                setGeneratedResult(uri);
                setShowResultSheet(true);
            }
        } catch (error) {
            console.error('Error generating MVP image:', error);
            Alert.alert('Error', 'Failed to generate MVP image');
        } finally {
            setIsGenerating(false);
        }
    };

    const [error, setError] = useState(null);
    const [designTab, setDesignTab] = useState('community'); // 'community' or 'user'
    const [renderType, setRenderType] = useState('standings'); // 'standings' or 'mvps'
    const [selectedThemeId, setSelectedThemeId] = useState(null);

    // Filter themes based on tab
    const filteredThemes = themes.filter(theme => {
        if (designTab === 'user') return !!theme.user_id; // Returns true if user_id exists
        return !theme.user_id; // Returns true if user_id is null/undefined
    });

    // Sync designData with lobby data when it loads
    React.useEffect(() => {
        if (lobby) {
            setDesignData(prev => ({
                ...prev,
                lobbyName: lobby.name || ''
            }));
        }
    }, [lobby]);

    // Set initial selected theme
    React.useEffect(() => {
        if (themes.length > 0 && !selectedThemeId) {
            setSelectedThemeId(themes[0].id);
        }
    }, [themes]);

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({ headerShown: false });
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
            
            // Show only verified designs (Pending designs should only be visible in Design Studio)
            const filteredThemes = allAvailable.filter(t => t.status === 'verified');
            
            const uniqueThemes = filteredThemes.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            setThemes(uniqueThemes);
            return uniqueThemes;
        } catch (error) {
            console.error('Error loading themes:', error);
            return [];
        }
    };

    const handleGenerateTable = async () => {
        if (!selectedThemeId) {
            Alert.alert('Error', 'Please select a design first');
            return;
        }

        try {
            setIsGenerating(true);
            const result = await renderResults(id, selectedThemeId, renderType);
            
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
            const [lobbyResult, teamsResult, playerStatsResult] = await Promise.allSettled([
                getLobby(id),
                getLobbyTeams(id),
                getLobbyPlayerStats(id)
            ]);

            if (lobbyResult.status === 'rejected') {
                console.error("❌ Lobby Details Fetch Failed:", lobbyResult.reason?.response?.status, lobbyResult.reason?.message);
                throw new Error('Tournament not found or unauthorized');
            }

            if (teamsResult.status === 'rejected') {
                console.error("⚠️ Teams Fetch Failed:", teamsResult.reason?.response?.status, teamsResult.reason?.message);
                // We can still load the lobby UI even if teams fail
            }

            if (playerStatsResult.status === 'rejected') {
                console.error("⚠️ Player Stats Fetch Failed:", playerStatsResult.reason?.response?.status, playerStatsResult.reason?.message);
            } else {
                setPlayerStats(playerStatsResult.value || []);
            }

            const lobbyData = lobbyResult.value;
            setLobby(lobbyData);

            const teamsData = teamsResult.status === 'fulfilled' ? teamsResult.value : [];
            const sortedTeams = (teamsData || []).map(team => {
                const points = (team.total_points && typeof team.total_points === 'object') ? team.total_points : { kill_points: 0, placement_points: 0 };
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
            console.error('Fetch Error:', error);
            setError(error.message || 'Failed to load lobby data');
            Alert.alert('Error', error.message || 'Failed to load lobby data');
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

    const renderThemeItem = ({ item }) => {
        const isSelected = item.id === selectedThemeId;
        const imageSource = getDesignImageSource(item);
        
        // Mock status based on index for variety
        const getStatus = (id) => {
            if (isSelected) return 'Active now';
            const index = themes.findIndex(t => t.id === id);
            const statuses = ['Available', 'Template', 'Premium', 'Template'];
            return statuses[index % statuses.length];
        };

        return (
            <TouchableOpacity 
                style={[styles.newDesignCard, isSelected && styles.selectedDesignCard]}
                onPress={() => setSelectedThemeId(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.designImageWrapper}>
                    {imageSource ? (
                        <Image 
                            source={imageSource} 
                            style={styles.designImage} 
                            resizeMode="cover" 
                        />
                    ) : (
                        <View style={styles.designPlaceholder}>
                            <Palette size={32} color={Theme.colors.textSecondary} />
                        </View>
                    )}
                    {isSelected && (
                        <View style={styles.activeDesignCheck}>
                            <Check size={14} color="#fff" />
                        </View>
                    )}
                </View>
                <View style={styles.designCardFooter}>
                    <Text style={styles.designCardName} numberOfLines={1}>{item.name || 'Unnamed Design'}</Text>
                    <Text style={[styles.designCardStatus, isSelected && styles.activeStatusText]}>
                        {getStatus(item.id)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const handlePickLogo = async (type) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required to upload logos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                setSaving(true);
                const asset = result.assets[0];
                const uploadedUrl = await uploadLogo(asset.uri);
                if (uploadedUrl) {
                    setDesignData(prev => ({ ...prev, [type]: uploadedUrl }));
                }
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            Alert.alert('Error', 'Failed to upload logo');
        } finally {
            setSaving(false);
        }
    };

    const selectedThemeName = themes.find(t => t.id === selectedThemeId)?.name || 'None';

    return (
        <SafeAreaView style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Design Render</Text>
                <TouchableOpacity style={styles.infoButton}>
                    <Info size={24} color="#0f172a" />
                </TouchableOpacity>
            </View>

            <View style={styles.segmentedControlContainer}>
                <View style={styles.segmentedControl}>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, renderType === 'standings' && styles.segmentBtnActive]} 
                        onPress={() => setRenderType('standings')}
                    >
                        <Text style={[styles.segmentText, renderType === 'standings' && styles.segmentTextActive]}>Standings</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, renderType === 'mvps' && styles.segmentBtnActive]} 
                        onPress={() => setRenderType('mvps')}
                    >
                        <Text style={[styles.segmentText, renderType === 'mvps' && styles.segmentTextActive]}>MVPs</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {renderType === 'standings' ? (
                <>
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity 
                            style={[styles.tabBtn, designTab === 'community' && styles.tabBtnActive]} 
                            onPress={() => setDesignTab('community')}
                        >
                            <Text style={[styles.tabBtnText, designTab === 'community' && styles.tabBtnTextActive]}>Community</Text>
                            {designTab === 'community' && <View style={styles.tabIndicator} />}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, designTab === 'user' && styles.tabBtnActive]} 
                            onPress={() => setDesignTab('user')}
                        >
                            <Text style={[styles.tabBtnText, designTab === 'user' && styles.tabBtnTextActive]}>Your Themes</Text>
                            {designTab === 'user' && <View style={styles.tabIndicator} />}
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={filteredThemes}
                        renderItem={({ item }) => (
                            <View style={styles.gridItemWrapper}>
                                {renderThemeItem({ item })}
                            </View>
                        )}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        contentContainerStyle={styles.flatListContent}
                        ListEmptyComponent={
                            designTab === 'user' ? (
                                <View style={styles.personalEmptyContainer}>
                                    <View style={styles.personalEmptyIconWrapper}>
                                        <Layout size={32} color={Theme.colors.accent} />
                                    </View>
                                    <Text style={styles.personalEmptyTitle}>No Personal Designs Found</Text>
                                    <Text style={styles.personalEmptySub}>You haven't uploaded any custom designs yet. Create unique themes in the Design section to use them in your tournaments.</Text>
                                    <TouchableOpacity 
                                        style={styles.goDesignBtn} 
                                        onPress={() => navigation.navigate('Dashboard', { tab: 'design' })}
                                    >
                                        <Text style={styles.goDesignBtnText}>Go to Design Section</Text>
                                        <Play size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.emptyDesigns}>
                                    <Palette size={48} color={Theme.colors.border} />
                                    <Text style={styles.emptyDesignsText}>No designs found in this category</Text>
                                </View>
                            )
                        }
                        showsVerticalScrollIndicator={false}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.renderBtnNew, isGenerating && styles.disabledBtn]} 
                            onPress={handleGenerateTable}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.renderBtnTextNew}>Render Design</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtnNew} onPress={() => navigation.goBack()}>
                            <Text style={styles.cancelBtnTextNew}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                <View style={styles.mvpMainContainer}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mvpListContent}>
                        <Text style={styles.mvpListHeaderTitle}>Top Players (MVP)</Text>
                        
                        <View style={styles.mvpUnderDevelopmentBox}>
                            <Info size={16} color={Theme.colors.accent} style={{ marginTop: 2 }} />
                            <View style={styles.mvpUnderDevelopmentTextWrapper}>
                                <Text style={styles.mvpUnderDevelopmentTitle}>Custom Designs Coming Soon</Text>
                                <Text style={styles.mvpUnderDevelopmentText}>The custom design system for MVPs is currently under development. For now, you can download a clean, structured leaderboard.</Text>
                            </View>
                        </View>

                        {playerStats.length === 0 ? (
                            <View style={styles.emptyDesigns}>
                                <Trophy size={48} color={Theme.colors.border} />
                                <Text style={styles.emptyDesignsText}>No player stats available yet</Text>
                            </View>
                        ) : (
                            playerStats.map((player, index) => (
                                <View key={index} style={styles.mvpListItem}>
                                    <Text style={styles.mvpListRank}>#{index + 1}</Text>
                                    <View style={styles.mvpListInfo}>
                                        <Text style={styles.mvpListName}>{player.name}</Text>
                                        <Text style={styles.mvpListTeam}>{player.team_name}</Text>
                                    </View>
                                    <View style={styles.mvpListStatsRow}>
                                        <View style={styles.mvpMiniStatBox}>
                                            <Text style={styles.mvpMiniStatVal}>{player.wwcd || 0}</Text>
                                            <Text style={styles.mvpMiniStatLabel}>WWCD</Text>
                                        </View>
                                        <View style={styles.mvpMiniStatBox}>
                                            <Text style={styles.mvpMiniStatVal}>{player.matches_played || 0}</Text>
                                            <Text style={styles.mvpMiniStatLabel}>MATCHES</Text>
                                        </View>
                                        <View style={styles.mvpListKillsBox}>
                                            <Text style={styles.mvpListKillsVal}>{player.kills || 0}</Text>
                                            <Text style={styles.mvpListKillsLabel}>KILLS</Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.renderBtnNew, isGenerating && styles.disabledBtn]} 
                            onPress={handleDownloadMvp}
                            disabled={isGenerating || playerStats.length === 0}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Download size={20} color="#fff" style={{ position: 'absolute', left: 20 }} />
                                    <Text style={styles.renderBtnTextNew}>Download MVP Image</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Hidden Canvas for MVP Download */}
                    <View style={{ position: 'absolute', left: -10000, top: 0 }}>
                        <ViewShot ref={mvpCanvasRef} options={{ format: 'png', quality: 1 }}>
                            <View style={{ width: 1080, backgroundColor: '#ffffff', padding: 60, paddingBottom: 80 }}>
                                <View style={{ alignItems: 'center', marginBottom: 60 }}>
                                    <Text style={{ fontSize: 60, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' }}>{lobby?.name || 'Tournament'}</Text>
                                    <Text style={{ fontSize: 36, fontFamily: Theme.fonts.outfit.semibold, color: Theme.colors.accent, marginTop: 10 }}>TOP PLAYERS (MVP)</Text>
                                </View>
                                {playerStats.slice(0, 15).map((player, index) => (
                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 3, borderColor: '#f1f5f9', paddingVertical: 30 }}>
                                        <Text style={{ fontSize: 48, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent, width: 140 }}>#{index + 1}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 48, fontFamily: Theme.fonts.outfit.bold, color: '#0f172a' }}>{player.name}</Text>
                                            <Text style={{ fontSize: 28, fontFamily: Theme.fonts.outfit.medium, color: '#64748b', marginTop: 12 }}>{player.team_name}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 60, alignItems: 'center' }}>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 40, fontFamily: Theme.fonts.outfit.bold, color: '#1e293b' }}>{player.wwcd || 0}</Text>
                                                <Text style={{ fontSize: 20, fontFamily: Theme.fonts.outfit.bold, color: '#94a3b8', marginTop: 8 }}>WWCD</Text>
                                            </View>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ fontSize: 40, fontFamily: Theme.fonts.outfit.bold, color: '#1e293b' }}>{player.matches_played || 0}</Text>
                                                <Text style={{ fontSize: 20, fontFamily: Theme.fonts.outfit.bold, color: '#94a3b8', marginTop: 8 }}>MATCHES</Text>
                                            </View>
                                            <View style={{ alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 20, width: 220 }}>
                                                <Text style={{ fontSize: 64, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent }}>{player.kills || 0}</Text>
                                                <Text style={{ fontSize: 24, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent, marginTop: 4 }}>KILLS</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ViewShot>
                    </View>
                </View>
            )}

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
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.editSectionTitle}>Social Handles</Text>
                                {!canCustomSocial && (
                                    <TouchableOpacity onPress={() => navigation.navigate('SubscriptionPlans')}>
                                        <Text style={{ color: Theme.colors.accent, fontSize: 12, fontWeight: '600' }}>Upgrade to Unlock</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={[styles.inputGroup, !canCustomSocial && { opacity: 0.5 }]}>
                                <View style={styles.inputWithIcon}>
                                    <Instagram size={20} color="#E1306C" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInputWithIcon}
                                        placeholder="@instagram_handle"
                                        placeholderTextColor={Theme.colors.textSecondary}
                                        value={designData.instagram}
                                        onChangeText={(text) => setDesignData(prev => ({ ...prev, instagram: text }))}
                                        editable={canCustomSocial}
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputGroup, !canCustomSocial && { opacity: 0.5 }]}>
                                <View style={styles.inputWithIcon}>
                                    <Youtube size={20} color="#FF0000" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInputWithIcon}
                                        placeholder="YouTube Channel Name"
                                        placeholderTextColor={Theme.colors.textSecondary}
                                        value={designData.youtube}
                                        onChangeText={(text) => setDesignData(prev => ({ ...prev, youtube: text }))}
                                        editable={canCustomSocial}
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
    mainContainer: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: Theme.colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
    },
    infoButton: {
        padding: 4,
    },
    segmentedControlContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 25,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 21,
    },
    segmentBtnActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#94a3b8',
    },
    segmentTextActive: {
        color: Theme.colors.accent,
    },
    mvpMainContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    mvpListContent: {
        padding: 20,
    },
    mvpListHeaderTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1e293b',
        marginBottom: 12,
    },
    mvpUnderDevelopmentBox: {
        flexDirection: 'row',
        backgroundColor: '#eff6ff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    mvpUnderDevelopmentTextWrapper: {
        flex: 1,
        marginLeft: 10,
    },
    mvpUnderDevelopmentTitle: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1e3a8a',
        marginBottom: 4,
    },
    mvpUnderDevelopmentText: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#3b82f6',
        lineHeight: 18,
    },
    mvpListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    mvpListRank: {
        fontSize: 20,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
        width: 40,
    },
    mvpListInfo: {
        flex: 1,
        paddingRight: 10,
    },
    mvpListName: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1e293b',
    },
    mvpListTeam: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#64748b',
        marginTop: 4,
    },
    mvpListStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    mvpMiniStatBox: {
        alignItems: 'center',
    },
    mvpMiniStatVal: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1e293b',
    },
    mvpMiniStatLabel: {
        fontSize: 9,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
        marginTop: 2,
    },
    mvpListKillsBox: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    mvpListKillsVal: {
        fontSize: 22,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
    },
    mvpListKillsLabel: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#64748b',
        marginTop: 2,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tabBtn: {
        paddingVertical: 12,
        marginRight: 24,
        position: 'relative',
    },
    tabBtnActive: {
    },
    tabBtnText: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#94a3b8',
    },
    tabBtnTextActive: {
        color: '#0f172a',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Theme.colors.accent,
    },
    flatListContent: {
        padding: 12,
    },
    gridItemWrapper: {
        flex: 1,
        padding: 8,
    },
    newDesignCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    selectedDesignCard: {
    },
    designImageWrapper: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 16,
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    designImage: {
        width: '100%',
        height: '100%',
    },
    activeDesignCheck: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    designCardFooter: {
        paddingTop: 10,
        paddingHorizontal: 4,
    },
    designCardName: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
        marginBottom: 2,
    },
    designCardStatus: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#64748b',
    },
    activeStatusText: {
        color: Theme.colors.accent,
    },
    footer: {
        padding: 20,
        gap: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    renderBtnNew: {
        backgroundColor: Theme.colors.accent,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    renderBtnTextNew: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    cancelBtnNew: {
        backgroundColor: '#f1f5f9',
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnTextNew: {
        color: '#0f172a',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    personalEmptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    personalEmptyIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    personalEmptyTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#1e293b',
    },
    personalEmptySub: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#64748b',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    goDesignBtn: {
        marginTop: 20,
        backgroundColor: Theme.colors.accent,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    goDesignBtnText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
    },
    emptyDesigns: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyDesignsText: {
        marginTop: 12,
        color: '#94a3b8',
        fontFamily: Theme.fonts.outfit.medium,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetDismiss: {
        flex: 1,
    },
    sheetContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '90%',
    },
    sheetHeader: {
        alignItems: 'center',
        paddingVertical: 15,
        position: 'relative',
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#e2e8f0',
        borderRadius: 2,
        marginBottom: 15,
    },
    sheetTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
    },
    sheetCloseBtn: {
        position: 'absolute',
        right: 0,
        top: 25,
    },
    resultPreviewContainer: {
        width: '100%',
        aspectRatio: 0.7,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
        marginBottom: 20,
    },
    resultPreviewImage: {
        width: '100%',
        height: '100%',
    },
    sheetActionRow: {
        gap: 12,
    },
    sheetActionBtn: {
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    downloadActionBtn: {
        backgroundColor: Theme.colors.accent,
    },
    downloadActionText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
    },
    editModalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    editModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    editModalTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
    },
    editSection: {
        padding: 20,
    },
    editSectionTitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.accent,
        letterSpacing: 1,
        marginBottom: 15,
    },
    logoGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    logoPicker: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoPreview: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        alignItems: 'center',
        gap: 4,
    },
    logoPickerText: {
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: Theme.fonts.outfit.medium,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#64748b',
        marginBottom: 8,
    },
    textInput: {
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 15,
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#0f172a',
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    textInputWithIcon: {
        flex: 1,
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.regular,
        color: '#0f172a',
    },
    disabledBtn: {
        opacity: 0.6,
    },
});

export default LiveLobbyScreen;
