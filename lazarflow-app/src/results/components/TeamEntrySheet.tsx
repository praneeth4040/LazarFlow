import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Modal, ScrollView,
    TouchableOpacity, Dimensions, Animated, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { X, Check, Skull } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';
import { MatchResult, LobbyData } from '../types';

const { height: SCREEN_H } = Dimensions.get('window');

interface TeamEntrySheetProps {
    visible: boolean;
    team: any | null;
    lobby: LobbyData;
    nextPosition: number;
    initialData?: MatchResult | null;
    onClose: () => void;
    onSubmit: (result: MatchResult) => void;
}

export const TeamEntrySheet: React.FC<TeamEntrySheetProps> = ({
    visible, team, lobby, nextPosition, initialData, onClose, onSubmit
}) => {
    const [position, setPosition] = useState(nextPosition);
    const [totalKills, setTotalKills] = useState(0);
    const [memberKills, setMemberKills] = useState<Record<number, number>>({});
    
    const slideY = useRef(new Animated.Value(SCREEN_H)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setPosition(parseInt(String(initialData.position)) || nextPosition);
                setTotalKills(initialData.kills || 0);
                const mKills: Record<number, number> = {};
                initialData.members?.forEach((m, idx) => {
                    mKills[idx] = m.kills || 0;
                });
                setMemberKills(mKills);
            } else {
                setPosition(nextPosition);
                setTotalKills(0);
                setMemberKills({});
            }
            
            Animated.parallel([
                Animated.spring(slideY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideY, {
                    toValue: SCREEN_H,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible, nextPosition]);

    const getPlacementPoints = (pos: number) => {
        if (isNaN(pos)) return 0;
        const entry = lobby.points_system?.find(item => item.placement === pos);
        return entry ? entry.points : 0;
    };

    const placementPoints = getPlacementPoints(position);
    const killPoints = totalKills * (lobby.kill_points || 0);
    const totalPoints = placementPoints + killPoints;

    const handleUpdateMemberKill = (index: number, val: string) => {
        const numVal = parseInt(val) || 0;
        const newMemberKills = { ...memberKills, [index]: numVal };
        setMemberKills(newMemberKills);
        
        const sum = Object.values(newMemberKills).reduce((acc, curr) => acc + curr, 0);
        setTotalKills(sum);
    };

    const handleConfirm = () => {
        if (!team) return;
        
        const finalMembers = (team.members || []).map((m: any, idx: number) => ({
            name: typeof m === 'string' ? m : m.name,
            kills: memberKills[idx] || 0
        }));

        const result: MatchResult = {
            team_id: team.id,
            team_name: team.team_name || team.name,
            position: String(position),
            kills: totalKills,
            placement_points: placementPoints,
            kill_points: killPoints,
            total_points: totalPoints,
            members: finalMembers
        };

        onSubmit(result);
        onClose();
    };

    if (!team) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={s.overlay}>
                <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                </Animated.View>
                
                <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
                    <View style={s.dragHandle} />
                    
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flexShrink: 1 }}
                    >
                        {/* --- Identical to ResultCard.tsx structure --- */}
                        <ScrollView 
                            style={{ flexShrink: 1, padding: 20 }} 
                            showsVerticalScrollIndicator={false} 
                            keyboardShouldPersistTaps="handled"
                            bounces={false}
                        >
                            <View style={styles.resultCard}>
                                <View style={styles.rankHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.rankPrefix}>#</Text>
                                        <TextInput
                                            style={styles.rankInput}
                                            keyboardType="numeric"
                                            value={String(position)}
                                            onChangeText={(v) => setPosition(parseInt(v) || 1)}
                                            placeholder="1"
                                            placeholderTextColor={Theme.colors.accent + '80'}
                                        />
                                    </View>
                                </View>

                                <View style={styles.teamSelectorBox}>
                                    <Text style={styles.teamNameText} numberOfLines={1}>{team.team_name || team.name}</Text>
                                </View>

                                {/* Expanded Members View */}
                                <View style={styles.expandedMembersContainer}>
                                    <View style={styles.membersHeaderRow}>
                                        <Text style={styles.membersHeaderLabel}>INDIVIDUAL KILLS</Text>
                                    </View>
                                    {team.members && team.members.length > 0 ? (
                                        <View style={styles.membersList}>
                                            {team.members.map((member: any, mIdx: number) => (
                                                <View key={mIdx} style={styles.playerListItem}>
                                                    <View style={styles.playerListItemLeft}>
                                                        <View style={styles.playerAvatarPlaceholderSmall}>
                                                            <Text style={styles.avatarLetterSmall}>{mIdx + 1}</Text>
                                                        </View>
                                                        <Text style={styles.memberNameText} numberOfLines={1}>
                                                            {typeof member === 'string' ? member : member.name}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.playerListItemRight}>
                                                        <Skull size={12} color={Theme.colors.accent} style={{ marginRight: 6 }} />
                                                        <TextInput
                                                            style={styles.memberKillInput}
                                                            keyboardType="numeric"
                                                            value={String(memberKills[mIdx] || '')}
                                                            onChangeText={(v) => handleUpdateMemberKill(mIdx, v)}
                                                            placeholder="0"
                                                            placeholderTextColor={Theme.colors.textSecondary}
                                                        />
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <View>
                                            <Text style={styles.noPlayersText}>No team members found</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.killsInputContainer}>
                                    <Text style={styles.killsLabel}>Total Team Kills</Text>
                                    <View style={styles.killsInputBox}>
                                        <TextInput
                                            style={styles.killsInput}
                                            keyboardType="numeric"
                                            value={String(totalKills)}
                                            onChangeText={(v) => setTotalKills(parseInt(v) || 0)}
                                            placeholder="0"
                                            placeholderTextColor={Theme.colors.textSecondary}
                                        />
                                    </View>
                                </View>

                                <View style={styles.statsFooter}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>POSITION{'\n'}POINTS</Text>
                                        <Text style={styles.statValue}>{placementPoints}</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statLabel}>KILL{'\n'}POINTS</Text>
                                        <Text style={styles.statValue}>{killPoints}</Text>
                                    </View>
                                    <View style={[styles.statBox, styles.totalStatBox]}>
                                        <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>TOTAL{'\n'}POINTS</Text>
                                        <Text style={[styles.statValue, { color: '#fff' }]}>{totalPoints}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ height: 30 }} />
                        </ScrollView>

                        <View style={s.footer}>
                            <TouchableOpacity style={styles.applyBtn} onPress={handleConfirm}>
                                <Check size={20} color="#fff" />
                                <Text style={styles.applyBtnText}>Add Team to Results</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { 
        backgroundColor: '#FFFFFF', 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, 
        maxHeight: SCREEN_H * 0.9,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0
    },
    dragHandle: { 
        width: 32, 
        height: 4, 
        backgroundColor: '#E2E8F0', 
        borderRadius: 2, 
        alignSelf: 'center', 
        marginTop: 10 
    },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' }
});
