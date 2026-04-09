import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Trophy, Zap } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import LobbyCard from './LobbyCard';
import { DashboardTabProps, Lobby } from '../types';

export const getTierColors = (tierName: string) => {
    const colorMap: Record<string, any> = {
        'free': { bg: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: 'rgba(99, 102, 241, 0.2)' },
        'ranked': { bg: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
        'competitive': { bg: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.2)' },
        'premier': { bg: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.2)' },
        'developer': { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'rgba(239, 68, 68, 0.2)' }
    };
    return colorMap[tierName?.toLowerCase()] || colorMap['free'];
};

interface HomeTabProps extends DashboardTabProps {
    lobbies: Lobby[];
    refreshing: boolean;
    onRefresh: () => void;
    onViewAll: () => void;
    onCalculate: (lobby: Lobby) => void;
    onRender: (lobbyId: string) => void;
    onEdit: (lobby: Lobby) => void;
    onDelete: (lobby: Lobby) => void;
    onEnd: (lobby: Lobby) => void;
    onManageTeams: (lobby: Lobby) => void;
    selectedLobbies?: string[];
    toggleLobbySelection: (id: string) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ 
    user, 
    tier, 
    lobbiesCreated, 
    maxAILobbies, 
    lobbies, 
    refreshing, 
    onRefresh, 
    activeSettingsId, 
    toggleSettings, 
    onViewAll,
    onCalculate,
    onRender,
    onEdit,
    onDelete,
    onEnd,
    onManageTeams,
    selectedLobbies = [],
    toggleLobbySelection
}) => {
    return (
        <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />}
            onScroll={() => activeSettingsId && toggleSettings(null)}
            scrollEventThrottle={16}
        >
            {/* Greeting Section */}
            <View style={styles.greetingSection}>
                <Text style={styles.welcomeTitle}>Welcome back,</Text>
                <View style={styles.creditInfoContainer}>
                    <Zap size={14} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 6 }} />
                    <Text style={styles.welcomeSubtitle}>
                        You have {user?.flux_balance || 0} Credits remaining
                    </Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Lobbies</Text>
                  <TouchableOpacity onPress={onViewAll}>
                      <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
              </View>

            {lobbies.length > 0 ? (
                lobbies.slice(0, 5).map((lobby, index) => (
                    <LobbyCard 
                        key={lobby.id}
                        lobby={lobby}
                        index={index}
                        activeSettingsId={activeSettingsId}
                        toggleSettings={toggleSettings}
                        onCalculate={onCalculate}
                        onRender={onRender}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onEnd={onEnd}
                        onManageTeams={onManageTeams}
                        isSelected={selectedLobbies.includes(lobby.id)}
                        onLongPress={() => toggleLobbySelection(lobby.id)}
                        onPress={() => {
                            if (selectedLobbies.length > 0) {
                                toggleLobbySelection(lobby.id);
                            }
                        }}
                    />
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
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 16,
        backgroundColor: Theme.colors.secondary,
    },
    greetingSection: {
        marginBottom: 24,
    },
    creditInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: 24,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
        marginBottom: 4,
    },
    welcomeSubtitle: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    viewAllText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.accent,
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
});

export default HomeTab;
