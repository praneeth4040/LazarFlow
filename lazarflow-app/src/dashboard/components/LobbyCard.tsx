import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Settings, Edit, Trash2, Flag, ArrowRight, Trophy, Swords, Gamepad2, Flame, HandMetalIcon, Check, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../styles/theme';
import { formatAlphanumericDate } from '../../lib/dateUtils';
import { Lobby } from '../types';

export const getLobbyIconConfig = (game: string, index: number = 0) => {
    const gameName = String(game || '').toLowerCase();
    
    if (gameName.includes('free fire')) {
        return { Icon: Flame, color: '#ef4444', bg: '#fee2e2' };
    }
    if (gameName.includes('bgmi') || gameName.includes('pubg')) {
        return { Icon: Swords, color: '#f59e0b', bg: '#fef3c7' };
    }
    if (gameName.includes('valorant') || gameName.includes('cs') || gameName.includes('cod')) {
        return { Icon: Gamepad2, color: '#6366f1', bg: '#e0e7ff' };
    }
    
    const fallbacks = [
        { Icon: Trophy, color: Theme.colors.accent, bg: Theme.colors.accent + '15' },
        { Icon: Swords, color: '#f59e0b', bg: '#fef3c7' },
        { Icon: Gamepad2, color: '#6366f1', bg: '#e0e7ff' },
        { Icon: Flame, color: '#ef4444', bg: '#fee2e2' }
    ];
    
    return fallbacks[index % fallbacks.length];
};

interface LobbyCardProps {
    lobby: Lobby;
    index: number;
    activeSettingsId: string | null;
    toggleSettings: (id: string | null) => void;
    onCalculate: (lobby: Lobby) => void;
    onRender: (lobbyId: string) => void;
    onEdit: (lobby: Lobby) => void;
    onDelete: (lobby: Lobby) => void;
    onEnd: (lobby: Lobby) => void;
    onManageTeams: (lobby: Lobby) => void;
    isSelected: boolean;
    onLongPress: () => void;
    onPress: () => void;
}

const LobbyCard: React.FC<LobbyCardProps> = ({ 
    lobby, 
    index, 
    activeSettingsId, 
    toggleSettings, 
    onCalculate, 
    onRender, 
    onEdit, 
    onDelete, 
    onEnd,
    onManageTeams,
    isSelected,
    onLongPress,
    onPress
}) => {
    const { Icon, color, bg } = getLobbyIconConfig(lobby.game, index);

    // Local toggle state — instant, no prop round-trip delay
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const menuBtnRef = React.useRef<React.ElementRef<typeof TouchableOpacity>>(null);

    // Close when another card's settings are opened (parent sets a different id)
    useEffect(() => {
        if (activeSettingsId !== lobby.id && isOpen) {
            setIsOpen(false);
        }
    }, [activeSettingsId, lobby.id]);

    const handleSettingsPress = useCallback(() => {
        const next = !isOpen;
        if (next && menuBtnRef.current) {
            // Measure absolute screen position of the button so the Modal
            // dropdown can be placed directly below it, above the nav bar.
            menuBtnRef.current.measure((_fx, _fy, width, height, px, py) => {
                const screenWidth = Dimensions.get('window').width;
                setDropdownPos({
                    top:   py + height + 4,
                    right: screenWidth - (px + width),  // right edge = screen width minus button's right x
                });
            });
        }
        setIsOpen(next);
        toggleSettings(next ? lobby.id : null);
    }, [isOpen, lobby.id, toggleSettings]);

    const isPromoted = lobby.is_promoted;

    return (
        <TouchableOpacity 
            style={[
                styles.lobbyCard, 
                { zIndex: isOpen ? 10 : 1 },
                isSelected && styles.lobbyCardSelected,
                isPromoted && styles.lobbyCardPromoted
            ]}
            onLongPress={onLongPress}
            onPress={onPress}
            activeOpacity={onPress || onLongPress ? 0.8 : 1}
        >
            {isPromoted && (
                <LinearGradient
                    colors={['rgba(251, 191, 36, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFillObject as any, { borderRadius: 16 }]}
                    pointerEvents="none"
                />
            )}
            
            <View style={styles.lobbyCardHeader}>
                <View style={[styles.lobbyIconContainer, { backgroundColor: isSelected ? Theme.colors.accent : bg }]}>
                    {isSelected ? (
                        <Check size={20} color="#fff" />
                    ) : (
                        <Icon size={20} color={color} />
                    )}
                </View>
                <View style={styles.lobbyTitleGroup}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.lobbyName} numberOfLines={1}>{lobby.name}</Text>
                    </View>
                    <Text style={styles.lobbyGame}>{lobby.game}</Text>
                </View>
                {(() => {
                    const rawStatus = (lobby.status || 'setup').toLowerCase();
                    const isCompleted = ['completed', 'ended', 'finished'].includes(rawStatus);
                    const isSetup = rawStatus === 'setup';
                    
                    const statusBg = isCompleted ? '#64748b15' : isSetup ? '#3b82f615' : '#10b98115';
                    const statusColor = isCompleted ? '#64748b' : isSetup ? '#3b82f6' : '#10b981';

                    return (
                        <View style={[styles.lobbyStatusBadge, { backgroundColor: statusBg }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {rawStatus.toUpperCase()}
                            </Text>
                        </View>
                    );
                })()}
            </View>

            <View style={styles.lobbyCardStats}>
                <View style={[styles.statItem, { flex: 0.8 }]}>
                    <Text style={styles.statLabel}>TEAMS</Text>
                    <Text style={styles.statValueText}>{lobby.teams_count || 0} Teams</Text>
                </View>
                
                <View style={[styles.statItem, { flex: 1.2, alignItems: 'flex-start', paddingLeft: 10 }]}>
                    <Text style={styles.statLabel}>UPDATED</Text>
                    <Text style={styles.statValueText}>{lobby.updated_at || lobby.created_at ? formatAlphanumericDate(lobby.updated_at || lobby.created_at) : '—'}</Text>
                </View>

                <View style={[styles.statItem, { flex: 1, alignItems: 'flex-end' }]}>
                    {lobby.status === 'setup' ? (
                        <TouchableOpacity 
                            style={styles.manageTeamsLink}
                            onPress={() => onManageTeams(lobby)}
                        >
                            <Text style={styles.manageTeamsLinkText}>Manage Teams</Text>
                            <ArrowRight size={14} color={Theme.colors.accent} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ height: 20 }} />
                    )}
                </View>
            </View>

            <View style={styles.lobbyCardFooter}>
                <TouchableOpacity 
                    style={styles.calculateBtn} 
                    onPress={() => onCalculate(lobby)}
                >
                    <Text style={styles.calculateBtnText}>Calculate</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.renderBtn} 
                    onPress={() => onRender(lobby.id)}
                >
                    <Text style={styles.renderBtnText}>Render</Text>
                </TouchableOpacity>

                <View style={styles.settingsBtnWrapper}>
                    <TouchableOpacity
                        ref={menuBtnRef}
                        style={[styles.settingsIconBtn, isOpen && styles.settingsIconBtnActive]}
                        onPress={handleSettingsPress}
                    >
                        <Settings size={18} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Render dropdown in a Modal so it floats above the nav bar */}
                    <Modal
                        visible={isOpen}
                        transparent
                        animationType="none"
                        onRequestClose={handleSettingsPress}
                        statusBarTranslucent
                    >
                        {/* Transparent backdrop — tap anywhere to close */}
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            activeOpacity={1}
                            onPress={handleSettingsPress}
                        >
                            <View
                                style={[
                                    styles.dropdownMenu,
                                    {
                                        position: 'absolute',
                                        top:   dropdownPos.top,
                                        right: dropdownPos.right,
                                    },
                                ]}
                            >
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setIsOpen(false); toggleSettings(null); onEdit(lobby); }}>
                                    <Edit size={16} color={Theme.colors.textPrimary} />
                                    <Text style={styles.dropdownText}>Edit</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setIsOpen(false); toggleSettings(null); onDelete(lobby); }}>
                                    <Trash2 size={16} color={Theme.colors.danger} />
                                    <Text style={[styles.dropdownText, { color: Theme.colors.danger }]}>Delete</Text>
                                </TouchableOpacity>
                                <View style={styles.dropdownDivider} />
                                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setIsOpen(false); toggleSettings(null); onEnd(lobby); }}>
                                    <Flag size={16} color={Theme.colors.warning} />
                                    <Text style={[styles.dropdownText, { color: Theme.colors.warning }]}>End</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    lobbyCard: {
        backgroundColor: Theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: Theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
        // overflow: 'hidden' intentionally removed — it clips the settings dropdown.
    },
    lobbyCardSelected: {
        borderColor: Theme.colors.accent,
        backgroundColor: '#eff6ff',
        borderWidth: 2,
    },
    lobbyCardPromoted: {
        borderColor: '#fcd34d',
        borderWidth: 1,
    },
    lobbyCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    lobbyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    lobbyTitleGroup: {
        flex: 1,
    },
    lobbyName: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.bold,
        color: Theme.colors.textPrimary,
    },
    lobbyGame: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.regular,
        color: Theme.colors.textSecondary,
    },
    lobbyStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.bold,
        textTransform: 'uppercase',
    },
    lobbyCardStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Theme.colors.border + '30',
        marginBottom: 14,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#94a3b8',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    statValueText: {
        fontSize: 14,
        fontFamily: Theme.fonts.outfit.semibold,
        color: Theme.colors.textPrimary,
    },
    statItem: {
        flex: 1,
    },
    manageTeamsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    manageTeamsLinkText: {
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
        color: '#3b82f6',
    },
    lobbyCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    calculateBtn: {
        flex: 1,
        backgroundColor: '#3b82f6',
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    calculateBtnText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
    },
    renderBtn: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    renderBtnText: {
        color: '#475569',
        fontSize: 13,
        fontFamily: Theme.fonts.outfit.bold,
    },
    settingsBtnWrapper: {
        position: 'relative',
    },
    settingsIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    settingsIconBtnActive: {
        backgroundColor: Theme.colors.border,
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
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
        zIndex: 50,
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
});

export default React.memo(LobbyCard);
