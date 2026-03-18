import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Trophy, History, Trash2 } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import LobbyCard from './components/LobbyCard';

const LobbiesTab = ({
    lobbies = [],
    pastLobbies = [],
    refreshing = false,
    onRefresh = () => {},
    activeSettingsId = null,
    toggleSettings = () => {},
    historyPage = 1,
    setHistoryPage = () => {},
    onCalculate = () => {},
    onRender = () => {},
    onEdit = () => {},
    onDelete = () => {},
    onEnd = () => {},
    onDeleteHistory = () => {},
    onManageTeams = () => {}
}) => {
    const renderHistoryContent = () => {
        if (!pastLobbies || pastLobbies.length === 0) {
            return (
                <View style={[styles.emptyState, { marginTop: 20 }]}>
                    <History size={40} color={Theme.colors.border} />
                    <Text style={styles.emptyText}>No past lobbies yet</Text>
                </View>
            );
        }

        const LOBBIES_PER_PAGE = 5;
        const totalPages = Math.ceil(pastLobbies.length / LOBBIES_PER_PAGE);
        const startIndex = (historyPage - 1) * LOBBIES_PER_PAGE;
        const endIndex = startIndex + LOBBIES_PER_PAGE;
        const paginatedLobbies = pastLobbies.slice(startIndex, endIndex);

        return (
            <>
                {paginatedLobbies.map((lobby, index) => (
                    <View key={lobby.id} style={[styles.lobbyCardMini, { marginHorizontal: 0 }]}>
                        <LobbyCard 
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
                        />
                    </View>
                ))}

                {totalPages > 1 && (
                    <View style={styles.paginationControls}>
                        <TouchableOpacity
                            style={[styles.paginationBtn, historyPage === 1 && styles.paginationBtnDisabled]}
                            onPress={() => historyPage > 1 && setHistoryPage(historyPage - 1)}
                            disabled={historyPage === 1}
                        >
                            <Text style={styles.paginationBtnText}>Prev</Text>
                        </TouchableOpacity>

                        <Text style={styles.paginationText}>
                            Page {historyPage} of {totalPages}
                        </Text>

                        <TouchableOpacity
                            style={[styles.paginationBtn, historyPage === totalPages && styles.paginationBtnDisabled]}
                            onPress={() => historyPage < totalPages && setHistoryPage(historyPage + 1)}
                            disabled={historyPage === totalPages}
                        >
                            <Text style={styles.paginationBtnText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </>
        );
    };

    return (
        <ScrollView
            style={styles.content}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} /> : null}
        >
            {/* Only show active lobbies section if lobbies prop is provided and has content (or if we are specifically in the Lobbies Tab) */}
            {lobbies && lobbies.length > 0 && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>All Active Lobbies</Text>
                    </View>
                    
                    {lobbies.map((lobby, index) => (
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
                        />
                    ))}
                </>
            )}

            {/* If we have no active lobbies but are in the full lobbies tab view, show empty state */}
            {(!lobbies || lobbies.length === 0) && !onDeleteHistory && (
                <View style={styles.emptyState}>
                    <Trophy size={48} color="#334155" />
                    <Text style={styles.emptyText}>No active lobbies</Text>
                </View>
            )}

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Text style={styles.sectionTitle}>Lobby History</Text>
            </View>
            <View style={{ paddingHorizontal: 0 }}>
                {renderHistoryContent()}
            </View>
            
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
    paginationControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
    paginationBtn: {
        backgroundColor: Theme.colors.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    paginationBtnDisabled: {
        backgroundColor: Theme.colors.border,
    },
    paginationBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    paginationText: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.textSecondary,
    },
    lobbyCardMini: {
        marginBottom: 12,
    }
});

export default LobbiesTab;
