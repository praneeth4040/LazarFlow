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
    Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabaseClient';
import { Trophy, Award, Share2, Download, Search, Palette, Layout, Settings, Check, X, RefreshCw, Edit, Image as ImageIcon, Camera, Instagram, Youtube } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Theme } from '../styles/theme';
import DesignRenderer from '../components/DesignRenderer';
import { getUserThemes, getCommunityDesigns, renderTournamentDesign, getDesignImageSource, uploadLogo } from '../lib/dataService';

const LiveTournamentScreen = ({ route }) => {
    const { id } = route?.params || {};
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tournament, setTournament] = useState(null);
    const [sharing, setSharing] = useState(false);
    const [themes, setThemes] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Design Edit State
    const [designData, setDesignData] = useState({
        brandLogo: null,
        tournamentLogo: null,
        tournamentName: '',
        scrimsText: '',
        organiserName: '',
        instagram: '',
        youtube: ''
    });

    const [error, setError] = useState(null);
    const [designMode, setDesignMode] = useState(false);
    const [viewMode, setViewMode] = useState('design');
    const [renderedImages, setRenderedImages] = useState({}); // Map of themeId -> base64Image
    const [renderingDesigns, setRenderingDesigns] = useState({}); // Map of themeId -> boolean
    const viewShotRef = React.useRef();

    // Sync designData with tournament data when it loads
    React.useEffect(() => {
        if (tournament) {
            setDesignData(prev => ({
                ...prev,
                tournamentName: tournament.name || ''
            }));
        }
    }, [tournament]);

    useFocusEffect(
        useCallback(() => {
            const initializeScreen = async () => {
                if (id) {
                    setLoading(true);
                    
                    // Parallelize data and theme loading
                    const [sortedTeams, availableThemes] = await Promise.all([
                        fetchTournamentData(),
                        loadThemes()
                    ]);
                    
                    // After loading themes and data, trigger render for first 4 themes
                    if (availableThemes && availableThemes.length > 0) {
                        const themesToRender = availableThemes.slice(0, 4);
                        handleRenderMultiple(themesToRender);
                    } else {
                        setLoading(false);
                    }
                } else {
                    console.error('No tournament ID provided to LiveTournamentScreen');
                    setError('No tournament ID provided');
                    setLoading(false);
                }
            };

            initializeScreen();
        }, [id])
    );

    const loadThemes = async () => {
        try {
            console.log('Loading themes...');
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

    const handlePickLogo = async (field) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaType.IMAGE,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                const uri = result.assets[0].uri;
                
                // Show local preview immediately
                setDesignData(prev => ({
                    ...prev,
                    [field]: uri
                }));

                // Upload to Supabase bucket "logos"
                const fileName = `${field}_${Date.now()}.png`;
                const publicUrl = await uploadLogo(uri, fileName);
                
                if (publicUrl) {
                    setDesignData(prev => ({
                        ...prev,
                        [field]: publicUrl // Store the URL for rendering
                    }));
                } else {
                    Alert.alert('Upload Failed', 'Failed to upload logo. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error picking logo:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSaveDesign = async () => {
        try {
            setSaving(true);
            // In the future, we will save this designData to the backend (tournaments table or separate design_configs table)
            // For now, we just close the modal and re-render everything with the new data
            setShowEditModal(false);
            
            // Re-render the visible designs with new data
            if (themes.length > 0) {
                const themesToRender = themes.slice(0, 4);
                handleRenderMultiple(themesToRender);
            }
            
            Alert.alert('Success', 'Design details updated for rendering!');
        } catch (error) {
            console.error('Error saving design:', error);
            Alert.alert('Error', 'Failed to save design details');
        } finally {
            setSaving(false);
        }
    };


    const handleShare = async (imageUrl = null) => {
        const urlToShare = imageUrl || Object.values(renderedImages)[0];
        if (!urlToShare) {
            Alert.alert('No Image', 'Please wait for a design to finish rendering before sharing.');
            return;
        }

        try {
            setSharing(true);
            
            let shareUri = urlToShare;
            
            // If it's a base64 data URL, save to file first for expo-sharing
            if (urlToShare.startsWith('data:image')) {
                const base64Data = urlToShare.split('base64,')[1];
                const fileName = `tournament_standings_${Date.now()}.png`;
                shareUri = FileSystem.cacheDirectory + fileName;
                await FileSystem.writeAsStringAsync(shareUri, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                });
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(shareUri);
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Failed to share image');
        } finally {
            setSharing(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            let csvContent = 'Rank,Team,Wins,Placement Points,Kill Points,Total Points\n';
            teams.forEach((team, index) => {
                csvContent += `${index + 1},"${team.team_name}",${team.wins || 0},${team.placement_points || 0},${team.kill_points || 0},${team.total || 0}\n`;
            });

            const fileName = `${tournament?.name || 'Tournament'}_Standings.csv`;
            const fileUri = FileSystem.cacheDirectory + fileName;

            await FileSystem.writeAsStringAsync(fileUri, csvContent, {
                encoding: 'utf8',
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }
        } catch (error) {
            console.error('Error exporting CSV:', error);
            Alert.alert('Error', 'Failed to export CSV');
        }
    };

    const fetchTournamentData = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching data for tournament ID:', id);

            if (!id) {
                console.error('No tournament ID provided');
                setLoading(false);
                return;
            }

            // Parallelize tournament and teams fetch
            const [tourneyResult, teamsResult] = await Promise.all([
                supabase
                    .from('tournaments')
                    .select('id, name, game, status, created_at, points_system, kill_points')
                    .eq('id', id)
                    .single(),
                supabase
                    .from('tournament_teams')
                    .select('id, team_name, members, total_points, tournament_id')
                    .eq('tournament_id', id)
            ]);

            if (tourneyResult.error) {
                console.error('Tournament fetch error:', tourneyResult.error);
                throw tourneyResult.error;
            }
            
            if (teamsResult.error) {
                console.error('Teams fetch error:', teamsResult.error);
                throw teamsResult.error;
            }

            console.log('Tournament data:', tourneyResult.data);
            setTournament(tourneyResult.data);
            console.log('Teams count:', teamsResult.data?.length || 0);

            // Calculate totals and sort
            const sortedTeams = (teamsResult.data || []).map(team => {
                const points = typeof team.total_points === 'object'
                    ? team.total_points
                    : { kill_points: 0, placement_points: 0 };

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
            console.error('Error fetching tournament data:', error);
            setError(error.message || 'Failed to load tournament data');
            Alert.alert('Error', 'Failed to load tournament data');
        } finally {
            setLoading(false);
        }
    };

    const handleRenderTheme = async (themeId) => {
        try {
            setRenderingDesigns(prev => ({ ...prev, [themeId]: true }));
            
            // Map designData to the payload format expected by the API
            const payload = {
                tournament_name: designData.tournamentName,
                scrims_text: designData.scrimsText,
                organiser_name: designData.organiserName,
                instagram: designData.instagram,
                youtube: designData.youtube,
                brand_logo: designData.brandLogo,
                tournament_logo: designData.tournamentLogo
            };

            const result = await renderTournamentDesign(id, themeId, payload);
            
            if (result) {
                // If the result is an ArrayBuffer (binary image data), convert to base64
                if (result instanceof ArrayBuffer || (result && result.constructor && result.constructor.name === 'ArrayBuffer')) {
                    const base64 = Buffer.from(result).toString('base64');
                    const imageUri = `data:image/png;base64,${base64}`;
                    setRenderedImages(prev => ({ ...prev, [themeId]: imageUri }));
                } else if (typeof result === 'string') {
                    // If it's already a base64 string or URL
                    setRenderedImages(prev => ({ ...prev, [themeId]: result }));
                } else if (result.url) {
                    setRenderedImages(prev => ({ ...prev, [themeId]: result.url }));
                }
            }
        } catch (error) {
            console.error(`Error rendering theme ${themeId}:`, error);
        } finally {
            setRenderingDesigns(prev => ({ ...prev, [themeId]: false }));
        }
    };

    const handleRenderMultiple = async (themesToRender) => {
        if (!id || !themesToRender || themesToRender.length === 0) {
            setLoading(false);
            return;
        }
        
        try {
            // Trigger all renders in parallel
            await Promise.all(themesToRender.map(theme => handleRenderTheme(theme.id)));
        } catch (error) {
            console.error('❌ Error in handleRenderMultiple:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.accent} />
                <Text style={{ color: '#fff', marginTop: 10 }}>Loading tournament data...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: '#ff4444', marginBottom: 20 }}>{error}</Text>
                <TouchableOpacity onPress={fetchTournamentData} style={styles.tab}>
                    <Text style={{ color: '#fff' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const config = tournament?.layout_config || {};
    const themeStyles = {
        container: { backgroundColor: '#f8fafc' }, // Light gray background for the app container
        header: { backgroundColor: '#fff' },
        headerText: { color: '#1e293b' },
        accentText: { color: Theme.colors.accent },
    };



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#fff' }]}>
            <StatusBar barStyle="dark-content" />
            
            {/* Minimal Header */}
            <View style={styles.tourneyInfo}>
                <View style={styles.headerTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.tourneyName}>{tournament?.name || 'Live Standings'}</Text>
                        {tournament?.game && <Text style={styles.tourneyGame}>{tournament.game}</Text>}
                    </View>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            onPress={() => setShowEditModal(true)}
                            style={styles.iconButton}
                        >
                            <Edit size={20} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleShare()} 
                            disabled={sharing || Object.values(renderingDesigns).some(v => v)} 
                            style={styles.iconButton}
                        >
                            {sharing ? (
                                <ActivityIndicator size="small" color={Theme.colors.accent} />
                            ) : (
                                <Share2 size={20} color={Theme.colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => {
                                const themesToRender = themes.slice(0, 4);
                                handleRenderMultiple(themesToRender);
                            }} 
                            disabled={Object.values(renderingDesigns).some(v => v)} 
                            style={styles.iconButton}
                        >
                            {Object.values(renderingDesigns).some(v => v) ? (
                                <ActivityIndicator size="small" color={Theme.colors.accent} />
                            ) : (
                                <RefreshCw size={20} color={Theme.colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.designViewContainer} showsVerticalScrollIndicator={false}>
                {themes.slice(0, 4).map((theme, index) => {
                    const isRendering = renderingDesigns[theme.id];
                    const renderedUrl = renderedImages[theme.id];

                    return (
                        <View key={theme.id} style={styles.designCardContainer}>
                            <View style={styles.designHeader}>
                                <Text style={styles.designTitle}>Design {index + 1}: {theme.name}</Text>
                                {isRendering && <ActivityIndicator size="small" color={Theme.colors.accent} />}
                            </View>
                            
                            <View style={styles.imageWrapper}>
                                {isRendering && !renderedUrl ? (
                                    <View style={styles.placeholderContainer}>
                                        <ActivityIndicator size="large" color={Theme.colors.accent} />
                                        <Text style={styles.placeholderText}>Rendering...</Text>
                                    </View>
                                ) : renderedUrl ? (
                                    <Image 
                                        source={{ uri: renderedUrl }} 
                                        style={styles.renderedImage}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={styles.placeholderContainer}>
                                        <DesignRenderer
                                        theme={theme}
                                        data={teams}
                                        tournament={tournament}
                                        designData={designData}
                                        width={Dimensions.get('window').width - 40}
                                    />
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity 
                                style={styles.shareDesignButton}
                                onPress={() => handleShare(renderedUrl)}
                                disabled={!renderedUrl}
                            >
                                <Share2 size={18} color="#fff" />
                                <Text style={styles.shareDesignText}>Share Design {index + 1}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </ScrollView>

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
                        <TouchableOpacity onPress={handleSaveDesign} style={styles.doneButton} disabled={saving}>
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

                                <TouchableOpacity style={styles.logoPicker} onPress={() => handlePickLogo('tournamentLogo')}>
                                    {designData.tournamentLogo ? (
                                        <Image source={{ uri: designData.tournamentLogo }} style={styles.logoPreview} />
                                    ) : (
                                        <View style={styles.logoPlaceholder}>
                                            <ImageIcon size={24} color={Theme.colors.textSecondary} />
                                            <Text style={styles.logoPickerText}>Tourney Logo</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.editSection}>
                            <Text style={styles.editSectionTitle}>Text Content</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Tournament Name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. WINTER CHAMPIONSHIP"
                                    placeholderTextColor={Theme.colors.textSecondary}
                                    value={designData.tournamentName}
                                    onChangeText={(text) => setDesignData(prev => ({ ...prev, tournamentName: text }))}
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
    tourneyInfo: {
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
    tourneyName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    tourneyGame: {
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
        backgroundColor: '#0f172a', // Dark background as in image
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
        color: '#fff',
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 45,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    infoButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', 
        justifyContent: 'center',
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
});

export default LiveTournamentScreen;
