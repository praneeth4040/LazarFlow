import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { ChevronDown, Check, Skull, AlertCircle, Maximize2, Edit2 } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';
import { ExtractedAIResult } from '../types';

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
    onViewVerification: (url: string) => void;
    onSubmit: () => void;
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
    onViewVerification,
    onSubmit,
    onDismiss,
}) => {
    const [editingPlayer, setEditingPlayer] = useState<{ resIdx: number, pIdx: number } | null>(null);

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
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.rankPrefix}>#</Text>
                                <Text style={styles.rankInput}>{res.rank}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {isMapped ? (
                                    <View style={[styles.matchedBadge, { position: 'relative' }]}>
                                        <Check size={10} color="#fff" />
                                        <Text style={styles.matchedBadgeText}>MAPPED</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.unmatchedBadge, { position: 'relative' }]}>
                                        <AlertCircle size={10} color="#fff" />
                                        <Text style={styles.matchedBadgeText}>UNMAPPED</Text>
                                    </View>
                                )}
                            </View>
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

                        {/* Verification Images List */}
                        {res.verification_urls && res.verification_urls.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                {res.verification_urls.map((url, uIdx) => (
                                    <TouchableOpacity 
                                        key={uIdx}
                                        style={[styles.verificationImageContainer, { flex: 1, minWidth: '45%', marginBottom: 0 }]}
                                        onPress={() => onViewVerification(url)}
                                        activeOpacity={0.9}
                                    >
                                        <Image 
                                            source={{ uri: url }} 
                                            style={styles.verificationImage}
                                            resizeMode="cover"
                                        />
                                        <View style={{ 
                                            position: 'absolute', 
                                            bottom: 4, 
                                            right: 4, 
                                            backgroundColor: 'rgba(0,0,0,0.5)', 
                                            padding: 4, 
                                            borderRadius: 6,
                                            borderWidth: 1,
                                            borderColor: 'rgba(255,255,255,0.2)'
                                        }}>
                                            <Maximize2 size={10} color="#fff" />
                                        </View>
                                        {res.verification_urls!.length > 1 && (
                                            <View style={{ 
                                                position: 'absolute', 
                                                top: 4, 
                                                left: 4, 
                                                backgroundColor: Theme.colors.accent, 
                                                paddingHorizontal: 6, 
                                                paddingVertical: 2, 
                                                borderRadius: 4,
                                            }}>
                                                <Text style={{ color: '#fff', fontSize: 8, fontFamily: Theme.fonts.outfit.bold }}>V{uIdx + 1}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Editable player kills */}
                        <View style={[styles.expandedMembersContainer, isMapped && { backgroundColor: '#fff', borderColor: '#d1fae5' }]}>
                            <View style={styles.membersHeaderRow}>
                                <Text style={styles.membersHeaderLabel}>PLAYER KILLS</Text>
                            </View>
                            {editable.players.length > 0 ? (
                                <View style={styles.membersList}>
                                    {editable.players.map((player: any, pIdx: number) => {
                                        const isEditing = editingPlayer?.resIdx === index && editingPlayer?.pIdx === pIdx;
                                        return (
                                            <View key={pIdx} style={[styles.playerListItem, isMapped && { borderColor: '#d1fae5' }]}>
                                                <View style={styles.playerListItemLeft}>
                                                    <View style={styles.playerAvatarPlaceholderSmall}>
                                                        <Text style={styles.avatarLetterSmall}>{pIdx + 1}</Text>
                                                    </View>
                                                    {isEditing ? (
                                                        <TextInput
                                                            style={[styles.memberNameText, { 
                                                                color: Theme.colors.accent, 
                                                                borderBottomWidth: 1, 
                                                                borderColor: Theme.colors.accent,
                                                                paddingVertical: 0
                                                            }]}
                                                            value={player.name}
                                                            onChangeText={(newName) => {
                                                                const newPlayers = editable.players.map((p: any, i: number) =>
                                                                    i === pIdx ? { ...p, name: newName } : p
                                                                );
                                                                onUpdateEditableData(index, { ...editable, players: newPlayers });
                                                            }}
                                                            onBlur={() => setEditingPlayer(null)}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <Text style={styles.memberNameText} numberOfLines={1}>{player.name}</Text>
                                                    )}
                                                    <TouchableOpacity 
                                                        style={{ marginLeft: 8, padding: 4 }}
                                                        onPress={() => setEditingPlayer(isEditing ? null : { resIdx: index, pIdx: pIdx })}
                                                    >
                                                        <Edit2 size={12} color={isEditing ? Theme.colors.accent : Theme.colors.textSecondary} />
                                                    </TouchableOpacity>
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
                                        );
                                    })}
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