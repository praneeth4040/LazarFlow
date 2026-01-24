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
import { Trophy, Award, Share2, Download, Search, Palette, Layout, Settings, Check, X, RefreshCw, Edit, Image as ImageIcon, Camera, Instagram, Youtube, Play, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Theme } from '../styles/theme';
import DesignRenderer from '../components/DesignRenderer';
import { getUserThemes, getCommunityDesigns, renderResults, uploadLogo, getLobby, getLobbyTeams } from '../lib/dataService';
import { useSubscription } from '../hooks/useSubscription';

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
    const { canCustomSocial, tier } = useSubscription();
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
    const [designTab, setDesignTab] = useState('community'); // 'community' or 'user'
    const [selectedThemeId, setSelectedThemeId] = useState(null);

    // Filter themes based on tab
    const filteredThemes = themes.filter(theme => {
        if (designTab === 'user') return theme.user_id !== null;
        return theme.user_id === null;
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
            
            // Show only verified designs
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
            const result = await renderResults(id, selectedThemeId);
            
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
            const [lobbyData, teamsData] = await Promise.all([
                getLobby(id),
                getLobbyTeams(id)
            ]);

            setLobby(lobbyData);

            const sortedTeams = (teamsData || []).map(team => {
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
            setError(error.message || 'Failed to load lobby data');
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

    const renderThemeItem = ({ item }) => {
        const isSelected = item.id === selectedThemeId;
        const imageSource = item.image_url ? { uri: item.image_url } : null;

        return (
            <TouchableOpacity 
                style={[styles.newDesignCard, isSelected && styles.selectedDesignCard]}
                onPress={() => setSelectedThemeId(item.id)}
                activeOpacity={0.8}
            >
                <View style={styles.designImageWrapper}>
                    {imageSource ? (
                        <Image source={imageSource} style={styles.designImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.designPlaceholder}>
                            <Palette size={32} color={Theme.colors.textSecondary} />
                        </View>
                    )}
                </View>
                <View style={styles.designCardFooter}>
                    <Text style={styles.designCardName} numberOfLines={1}>{item.name || 'Unnamed Design'}</Text>
                    {isSelected && (
                        <View style={styles.selectedCheck}>
                            <Check size={14} color="#fff" />
                        </View>
                    )}
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
            
            <View style={styles.newHeader}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <X size={24} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Design Render: {lobby?.name || 'Lobby'}</Text>
                        <Text style={styles.headerSubtitle}>Select a design for your tournament and click render</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.settingsBtn}>
                        <Settings size={22} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Choose Design</Text>
                        <View style={styles.tabSwitcher}>
                            <TouchableOpacity 
                                style={[styles.tabItem, designTab === 'community' && styles.activeTabItem]}
                                onPress={() => setDesignTab('community')}
                            >
                                <Share2 size={16} color={designTab === 'community' ? Theme.colors.accent : '#666'} />
                                <Text style={[styles.tabItemText, designTab === 'community' && styles.activeTabItemText]}>Community</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tabItem, designTab === 'user' && styles.activeTabItem]}
                                onPress={() => setDesignTab('user')}
                            >
                                <User size={16} color={designTab === 'user' ? Theme.colors.accent : '#666'} />
                                <Text style={[styles.tabItemText, designTab === 'user' && styles.activeTabItemText]}>Your Themes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {filteredThemes.length > 0 ? (
                        <View style={styles.designGrid}>
                            {filteredThemes.map(item => (
                                <View key={item.id} style={styles.gridItemWrapper}>
                                    {renderThemeItem({ item })}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyDesigns}>
                            <Palette size={48} color={Theme.colors.border} />
                            <Text style={styles.emptyDesignsText}>No designs found in this category</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                <View style={styles.selectedDesignInfo}>
                    <Text style={styles.selectedDesignLabel}>Selected Design: <Text style={styles.selectedDesignValue}>{selectedThemeName}</Text></Text>
                </View>
                <View style={styles.bottomButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.renderBtn, isGenerating && styles.disabledBtn]} 
                        onPress={handleGenerateTable}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Play size={20} color="#fff" fill="#fff" />
                                <Text style={styles.renderBtnText}>Render Design</Text>
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
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    lobbyGameText: {
        fontSize: 14,
        color: Theme.colors.accent,
        marginTop: 4,
        fontFamily: Theme.fonts.outfit.semibold,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.regular,
        textAlign: 'center',
    },
    rankCell: { width: 30 },
    teamCell: { flex: 1, textAlign: 'left', paddingLeft: 10 },
    pointCell: { width: 45 },
    totalCell: { color: Theme.colors.accent, fontFamily: Theme.fonts.outfit.bold },
    teamName: {
        color: Theme.colors.textPrimary,
        fontFamily: Theme.fonts.outfit.medium,
        textAlign: 'left',
    },
    topRank: {
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textSecondary,
    },
    activeTabText: {
        color: Theme.colors.accent,
    },
    mvpPlayerName: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        textAlign: 'left',
    },
    mvpTeamName: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        textAlign: 'left',
    },
    mvpKills: {
        width: 60,
        color: Theme.colors.accent,
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.bold, 
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
        fontFamily: Theme.fonts.outfit.regular,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.medium,
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
        fontFamily: Theme.fonts.outfit.medium,
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
        fontFamily: Theme.fonts.outfit.medium,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
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
        fontFamily: Theme.fonts.outfit.bold,
    },
    themeOptionName: {
        fontSize: 16,
        color: Theme.colors.textPrimary,
        fontFamily: Theme.fonts.outfit.medium,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.medium,
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
        fontFamily: Theme.fonts.outfit.medium,
    },
    textInput: {
        backgroundColor: Theme.colors.primary,
        borderRadius: 10,
        padding: 12,
        color: Theme.colors.textPrimary,
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.regular,
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
        fontFamily: Theme.fonts.outfit.regular,
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
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
    },
    changeThemeText: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
        marginTop: 2,
    },
    // New Design System Styles
    mainContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    newHeader: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748b',
        fontFamily: Theme.fonts.outfit.regular,
        marginTop: 2,
    },
    settingsBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    sectionContainer: {
        padding: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#0f172a',
    },
    tabSwitcher: {
        flexDirection: 'row', 
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        padding: 4,
    },
    tabItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 7,
        gap: 6,
    },
    activeTabItem: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabItemText: {
        fontSize: 12,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#64748b',
    },
    activeTabItemText: {
        color: Theme.colors.accent,
    },
    designGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    gridItemWrapper: {
        width: '50%',
        padding: 8,
    },
    newDesignCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    selectedDesignCard: {
        borderColor: Theme.colors.accent,
        borderWidth: 2,
    },
    designImageWrapper: {
        aspectRatio: 1,
        backgroundColor: '#f8fafc',
    },
    designImage: {
        width: '100%',
        height: '100%',
    },
    designPlaceholder: {
        flex: 1,
        alignItems: 'center', 
        justifyContent: 'center',
    },
    designCardFooter: {
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
    },
    designCardName: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#334155',
        flex: 1,
    },
    selectedCheck: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center', 
        justifyContent: 'center',
    },
    emptyDesigns: {
        alignItems: 'center',
        justifyContent: 'center', 
        paddingVertical: 60,
        gap: 15,
    },
    emptyDesignsText: {
        fontSize: 14,
        color: '#94a3b8',
        fontFamily: Theme.fonts.outfit.medium, 
    },
    bottomBar: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#fff',
    },
    selectedDesignInfo: {
        marginBottom: 15,
    },
    selectedDesignLabel: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: Theme.fonts.outfit.regular,
    },
    selectedDesignValue: {
        fontFamily: Theme.fonts.outfit.bold, 
        color: Theme.colors.accent,
    },
    bottomButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cancelBtnText: {
        fontSize: 15, 
        fontFamily: Theme.fonts.outfit.bold,
        color: '#64748b',
    },
    renderBtn: {
        flex: 2,
        height: 50,
        borderRadius: 12,
        backgroundColor: Theme.colors.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    renderBtnText: {
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#fff',
    },
    disabledBtn: {
        opacity: 0.6,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.bold,
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
        fontFamily: Theme.fonts.outfit.bold,
    },
    shareActionBtn: {
        backgroundColor: '#1A73E8',
    },
    shareActionText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: Theme.fonts.outfit.bold,
    },
});

export default LiveLobbyScreen;
