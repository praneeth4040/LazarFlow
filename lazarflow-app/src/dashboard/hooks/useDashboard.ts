import { useState, useCallback, useEffect } from 'react';
import { DashboardRepository } from '../services/DashboardRepository';
import { Lobby, Theme, PromoData, User } from '../types';

export const useDashboard = (user: User | null, refreshUser?: () => void) => {
    const [activeTab, setActiveTab] = useState<string>('home');
    const [lobbies, setLobbies] = useState<Lobby[]>([]);
    const [pastLobbies, setPastLobbies] = useState<Lobby[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    
    // Tab States
    const [designTab, setDesignTab] = useState<string>('own');
    const [userThemesList, setUserThemesList] = useState<Theme[]>([]);
    const [communityThemesList, setCommunityThemesList] = useState<Theme[]>([]);
    const [loadingCommunity, setLoadingCommunity] = useState<boolean>(false);
    
    // Upload & Modals state
    const [activeLayoutsCount, setActiveLayoutsCount] = useState<number>(user?.themes_count || 0);
    const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadModalVisible, setUploadModalVisible] = useState<boolean>(false);
    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [previewImage, setPreviewImage] = useState<any>(null);
    const [showPromoModal, setShowPromoModal] = useState<boolean>(false);
    const [designDetails, setDesignDetails] = useState<{name: string}>({ name: '' });
    
    const [promoData, setPromoData] = useState<PromoData>({
        startDate: '',
        startTime: '',
        contactDetails: '',
        additionalDetails: ''
    });
    
    const [selectedLobbies, setSelectedLobbies] = useState<string[]>([]);
    const [historyPage, setHistoryPage] = useState<number>(1);
    
    const fetchLobbies = useCallback(async (showLoadingIndicator = false, limit: number | null = null) => {
        try {
            if (showLoadingIndicator) setLoading(true);
            if (!user?.id) return;
            
            const data = await DashboardRepository.fetchLobbies(limit, true);
            const processedData = (data || []).map((lobby: any) => {
                const count = lobby.teams_count || lobby.team_count || lobby.teamsCount || (lobby.teams ? lobby.teams.length : 0) || (lobby._count ? lobby._count.teams : 0) || 0;
                return {
                    ...lobby,
                    teams_count: count
                };
            });
            const activeData = processedData.filter((t: any) => t.status !== 'completed');
            const pastData = processedData.filter((t: any) => t.status === 'completed');

            setLobbies(activeData);
            setPastLobbies(pastData);
        } catch (error) {
            console.error('Error fetching lobbies:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    const fetchUserThemes = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await DashboardRepository.fetchUserThemes(user.id);
            setUserThemesList(data || []);
        } catch (error) {
            console.error('Error fetching themes:', error);
        }
    }, [user?.id]);

    const fetchCommunityThemes = useCallback(async () => {
        try {
            setLoadingCommunity(true);
            const themes = await DashboardRepository.fetchCommunityDesigns();
            setCommunityThemesList(themes);
        } catch (error) {
            console.error('Error fetching community themes:', error);
        } finally {
            setLoadingCommunity(false);
        }
    }, []);

    const onRefresh = useCallback(() => {
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
    }, [activeTab, designTab, fetchLobbies, fetchUserThemes, fetchCommunityThemes, refreshUser]);

    return {
        activeTab, setActiveTab,
        lobbies, setLobbies,
        pastLobbies, setPastLobbies,
        loading, setLoading,
        refreshing, setRefreshing,
        designTab, setDesignTab,
        userThemesList, setUserThemesList,
        communityThemesList, setCommunityThemesList,
        loadingCommunity,
        activeLayoutsCount, setActiveLayoutsCount,
        activeSettingsId, setActiveSettingsId,
        uploading, setUploading,
        uploadModalVisible, setUploadModalVisible,
        selectedImage, setSelectedImage,
        previewImage, setPreviewImage,
        showPromoModal, setShowPromoModal,
        promoData, setPromoData,
        selectedLobbies, setSelectedLobbies,
        historyPage, setHistoryPage,
        designDetails, setDesignDetails,
        fetchLobbies,
        fetchUserThemes,
        fetchCommunityThemes,
        onRefresh
    };
};
