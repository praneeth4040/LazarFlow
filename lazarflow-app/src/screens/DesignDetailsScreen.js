import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, StatusBar, Platform, Dimensions, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Share2, Heart, Download, Info, Palette, X, Trophy } from 'lucide-react-native';
import { Theme } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { getDesignImageSource } from '../lib/dataService';

const { width } = Dimensions.get('window');

const DesignDetailsScreen = ({ route, navigation }) => {
    const { theme } = route.params;
    const [applying, setApplying] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [lobbies, setLobbies] = useState([]);
    const [loadingLobbies, setLoadingLobbies] = useState(false);

    const imageSource = getDesignImageSource(theme);

    const handleUseDesign = () => {
        Alert.alert('Coming Soon', 'The ability to apply designs directly to your lobbies is coming soon!');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                {/* Header Image Section */}
                <View style={styles.imageContainer}>
                    {imageSource ? (
                        <Image source={imageSource} style={styles.image} resizeMode="cover" />
                    ) : (
                        <View style={[styles.image, styles.placeholderImage]}>
                            <Palette size={64} color={Theme.colors.textSecondary} />
                        </View>
                    )}
                    
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(15, 23, 42, 1)']}
                        style={styles.gradientOverlay}
                    />

                    <SafeAreaView style={styles.headerOverlay}>
                        <TouchableOpacity 
                            style={styles.backButton} 
                            onPress={() => navigation.goBack()}
                        >
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Share2 size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Heart size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Content Section */}
                <View style={styles.contentContainer}>
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>{theme.name || 'Untitled Design'}</Text>
                        <View style={styles.authorRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{(theme.author || 'C').charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.authorName}>Created by {theme.author || 'Community Member'}</Text>
                        </View>
                    </View>

                    <View style={styles.descriptionSection}>
                        <Text style={styles.sectionTitle}>About this Design</Text>
                        <Text style={styles.description}>
                            {theme.description || 'A professional lobby standings layout designed for esports competitions. Features a clean look with high readability for live streams and social media posts.'}
                        </Text>
                    </View>

                    <View style={styles.tagsSection}>
                        {['Esports', 'Lobby', 'Standings', 'Clean'].map((tag, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
                <View style={styles.bottomBarContent}>
                    <TouchableOpacity 
                        style={styles.useButton} 
                        onPress={handleUseDesign}
                    >
                        <Text style={styles.useButtonText}>Use this Design</Text>
                        <Check size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.secondary,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    imageContainer: {
        width: '100%',
        height: 400,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        backgroundColor: Theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
    },
    contentContainer: {
        marginTop: -40,
        backgroundColor: Theme.colors.secondary,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    titleSection: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 12,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    authorName: {
        fontSize: 16,
        color: Theme.colors.textSecondary,
        fontWeight: '500',
    },
    descriptionSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: Theme.colors.textSecondary,
        lineHeight: 24,
    },
    tagsSection: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    tag: {
        backgroundColor: Theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    tagText: {
        color: Theme.colors.textSecondary,
        fontSize: 13,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Theme.colors.secondary,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
    bottomBarContent: {
        padding: 16,
    },
    useButton: {
        backgroundColor: Theme.colors.accent,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: Theme.colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    useButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.secondary,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
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
    lobbyList: {
        paddingBottom: 40,
    },
    lobbyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    lobbyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    lobbyInfo: {
        flex: 1,
    },
    lobbyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        marginBottom: 4,
    },
    lobbyGame: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
    },
});

export default DesignDetailsScreen;
