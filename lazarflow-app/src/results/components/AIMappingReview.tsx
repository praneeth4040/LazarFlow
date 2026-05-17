import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronDown, Check, Skull, AlertCircle } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';
import { ExtractedAIResult, MatchResult } from '../types';

interface AIResultPlayer {
    name: string;
    kills?: number;
}

type AIResult = ExtractedAIResult;

interface EditableAIData {
    players: AIResultPlayer[];
    totalKills: number;
}

interface AIMappingReviewProps {
    aiResults: AIResult[];
    mappings: Record<string, string>;
    editableAiData: Record<number, EditableAIData>;
    teams: any[];
    lobby: any;
    submitting: boolean;
    onSelectTeam: (result: AIResult) => void;
    onUpdateEditableData: (index: number, data: EditableAIData) => void;
    onSubmit: () => void;
    onCancel: () => void;
    onDismiss: () => void;
}

export const AIMappingReview: React.FC<AIMappingReviewProps> = ({
    aiResults,
    mappings,
    editableAiData,
    teams,
    lobby,
    submitting,
    onSelectTeam,
    onUpdateEditableData,
    onSubmit,
    onCancel,
    onDismiss,
}) => {
    return (
        <View style={styles.mappingSection}>
            <View style={styles.mappingHeader}>
                <Text style={styles.mappingTitle}>Review & Submit</Text>
                <Text style={styles.mappingSubtitle}>Map teams, adjust kills if needed, then submit in one step</Text>
            </View>

            {aiResults.map((res, index) => {
                const rankStr = String(res.rank);
                const isMapped = !!mappings[rankStr];
                const editable = editableAiData[index] || {
                    players: (res.players || []).map((p: any) => ({ name: p.name, kills: p.kills || 0 })),
                    totalKills: res.kills || 0,
                };
                const placementPoints = lobby.points_system?.find((p: any) => p.placement === parseInt(rankStr))?.points || 0;
                const killPoints = editable.totalKills * (lobby.kill_points || 0);
                const totalPoints = placementPoints + killPoints;

                return (
                    <View key={index} style={[
                        styles.resultCard,
                        isMapped ? styles.resultCardMapped : styles.resultCardUnmapped
                    ]}>
                        {/* Rank + status badge */}
                        <View style={styles.rankHeader}>
                            <Text style={styles.rankPrefix}>#</Text>
                            <Text style={styles.rankInput}>{res.rank}</Text>
                            {isMapped ? (
                                <View style={styles.matchedBadge}>
                                    <Check size={10} color="#fff" />
                                    <Text style={styles.matchedBadgeText}>MAPPED</Text>
                                </View>
                            ) : (
                                <View style={styles.unmatchedBadge}>
                                    <AlertCircle size={10} color="#fff" />
                                    <Text style={styles.matchedBadgeText}>UNMAPPED</Text>
                                </View>
                            )}
                        </View>

                        {/* Team picker */}
                        <TouchableOpacity
                            style={[styles.teamSelectorBox, isMapped && styles.teamSelectorBoxMapped]}
                            onPress={() => onSelectTeam(res)}
                        >
                            <Text style={[
                                styles.teamNameText,
                                !isMapped && { color: Theme.colors.textSecondary }
                            ]} numberOfLines={1}>
                                {teams.find(t => t.id === mappings[rankStr])?.team_name || 'Select Team...'}
                            </Text>
                            <ChevronDown size={20} color={isMapped ? Theme.colors.accent : Theme.colors.textPrimary} />
                        </TouchableOpacity>

                        {/* Editable player kills */}
                        <View style={[styles.expandedMembersContainer, isMapped && { backgroundColor: '#fff', borderColor: '#d1fae5' }]}>
                            <View style={styles.membersHeaderRow}>
                                <Text style={styles.membersHeaderLabel}>PLAYER KILLS</Text>
                            </View>
                            {editable.players.length > 0 ? (
                                <View style={styles.membersList}>
                                    {editable.players.map((player: any, pIdx: number) => (
                                        <View key={pIdx} style={[styles.playerListItem, isMapped && { borderColor: '#d1fae5' }]}>
                                            <View style={styles.playerListItemLeft}>
                                                <View style={styles.playerAvatarPlaceholderSmall}>
                                                    <Text style={styles.avatarLetterSmall}>{pIdx + 1}</Text>
                                                </View>
                                                <Text style={styles.memberNameText} numberOfLines={1}>{player.name}</Text>
                                            </View>
                                            <View style={[styles.playerListItemRight, isMapped && { borderColor: '#10b981' }]}>
                                                <Skull size={12} color={isMapped ? '#10b981' : Theme.colors.accent} style={{ marginRight: 6 }} />
                                                <TextInput
                                                    style={[styles.memberKillInput, isMapped && { color: '#059669' }]}
                                                    keyboardType="numeric"
                                                    value={String(player.kills)}
                                                    onChangeText={(val) => {
                                                        const newKills = parseInt(val) || 0;
                                                        const newPlayers = editable.players.map((p: any, i: number) =>
                                                            i === pIdx ? { ...p, kills: newKills } : p
                                                        );
                                                        const newTotal = newPlayers.reduce((sum: number, p: any) => sum + (p.kills || 0), 0);
                                                        onUpdateEditableData(index, { players: newPlayers, totalKills: newTotal });
                                                    }}
                                                    placeholder="0"
                                                    placeholderTextColor={Theme.colors.textSecondary}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.noPlayersText}>No players identified</Text>
                            )}
                        </View>

                        {/* Live points summary */}
                        <View style={styles.statsFooter}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>POSITION{'\n'}POINTS</Text>
                                <Text style={styles.statValue}>{placementPoints}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>KILL{'\n'}POINTS</Text>
                                <Text style={styles.statValue}>{killPoints}</Text>
                            </View>
                            <View style={[styles.statBox, isMapped ? { backgroundColor: '#10b981', borderColor: '#10b981' } : styles.totalStatBox]}>
                                <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>TOTAL{'\n'}POINTS</Text>
                                <Text style={[styles.statValue, { color: '#fff' }]}>{totalPoints}</Text>
                            </View>
                        </View>
                    </View>
                );
            })}

            {/* Single submit — replaces the old Apply Results + Submit Results two-step */}
            <TouchableOpacity
                style={[styles.applyBtn, submitting && styles.disabledBtn]}
                onPress={onSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <Check size={20} color="#fff" />
                        <Text style={styles.applyBtnText}>Submit Results</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
                <Text style={styles.cancelBtnText}>Cancel & Dismiss</Text>
            </TouchableOpacity>
        </View>
    );
};