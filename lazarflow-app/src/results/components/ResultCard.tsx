import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { X, ChevronDown, ChevronUp, Skull, Maximize2 } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';
import { MatchResult } from '../types';

interface ResultCardProps {
    item: MatchResult;
    index: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdateResult: (field: keyof MatchResult, value: any) => void;
    onUpdateMemberKills: (memberIndex: number, value: string) => void;
    onViewVerification?: (url: string) => void;
    onRemove: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
    item,
    index,
    isExpanded,
    onToggleExpand,
    onUpdateResult,
    onUpdateMemberKills,
    onViewVerification,
    onRemove,
}) => {
    const isAiSync = !!item.isExtracted || (item.members && item.members.some(m => !!m.isExtracted));
    const cardStyle = [styles.resultCard, isAiSync && styles.resultCardMapped];

    return (
        <View style={cardStyle}>
            <View style={styles.rankHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.rankPrefix}>#</Text>
                    <TextInput
                        style={styles.rankInput}
                        keyboardType="numeric"
                        value={String(item.position)}
                        onChangeText={(v) => onUpdateResult('position', v)}
                        placeholder="1"
                        placeholderTextColor={Theme.colors.accent + '80'}
                    />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
                        <X size={16} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.teamSelectorBox, isAiSync && styles.teamSelectorBoxMapped]}>
                <Text style={styles.teamNameText} numberOfLines={1}>{item.team_name}</Text>
                <TouchableOpacity
                    style={styles.dropdownToggle}
                    onPress={onToggleExpand}
                >
                    {isExpanded ? (
                        <ChevronUp size={20} color={isAiSync ? '#10b981' : Theme.colors.textPrimary} />
                    ) : (
                        <ChevronDown size={20} color={isAiSync ? '#10b981' : Theme.colors.textPrimary} />
                    )}
                </TouchableOpacity>
            </View>

            {isExpanded && (
                <View style={[styles.expandedMembersContainer, isAiSync && { backgroundColor: '#fff', borderColor: '#d1fae5' }]}>
                    {/* Verification Images List */}
                    {item.verification_urls && item.verification_urls.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {item.verification_urls.map((url, uIdx) => (
                                <TouchableOpacity 
                                    key={uIdx}
                                    style={[styles.verificationImageContainer, { flex: 1, minWidth: '45%', marginBottom: 0 }]}
                                    onPress={() => onViewVerification && onViewVerification(url)}
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
                                    {item.verification_urls!.length > 1 && (
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

                    <View style={styles.membersHeaderRow}>
                        <Text style={styles.membersHeaderLabel}>INDIVIDUAL KILLS</Text>
                    </View>
                    {item.members && item.members.length > 0 ? (
                        <View style={styles.membersList}>
                            {item.members.map((member, mIdx) => (
                                <View key={mIdx} style={[styles.playerListItem, member.isExtracted && styles.aiNameContainer, isAiSync && { borderColor: '#d1fae5' }]}>
                                    <View style={styles.playerListItemLeft}>
                                        <View style={styles.playerAvatarPlaceholderSmall}>
                                            <Text style={styles.avatarLetterSmall}>{mIdx + 1}</Text>
                                        </View>
                                        <Text style={styles.memberNameText} numberOfLines={1}>{member.name}</Text>
                                    </View>
                                    <View style={[styles.playerListItemRight, isAiSync && { borderColor: '#10b981' }]}>
                                        <Skull size={12} color={isAiSync ? '#10b981' : Theme.colors.accent} style={{ marginRight: 6 }} />
                                        <TextInput
                                            style={[styles.memberKillInput, isAiSync && { color: '#059669' }]}
                                            keyboardType="numeric"
                                            value={String(member.kills || 0)}
                                            onChangeText={(v) => onUpdateMemberKills(mIdx, v)}
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
            )}

            <View style={styles.killsInputContainer}>
                <Text style={styles.killsLabel}>Total Team Kills</Text>
                <View style={[styles.killsInputBox, isAiSync && styles.killsInputBoxMapped]}>
                    <TextInput
                        style={[styles.killsInput, isAiSync && { color: '#059669' }]}
                        keyboardType="numeric"
                        value={String(item.kills || 0)}
                        onChangeText={(v) => onUpdateResult('kills', v)}
                        placeholder="0"
                        placeholderTextColor={Theme.colors.textSecondary}
                    />
                </View>
            </View>

            <View style={styles.statsFooter}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>POSITION{'\n'}POINTS</Text>
                    <Text style={styles.statValue}>{item.placement_points || 0}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>KILL{'\n'}POINTS</Text>
                    <Text style={styles.statValue}>{item.kill_points || 0}</Text>
                </View>
                <View style={[styles.statBox, isAiSync ? { backgroundColor: '#10b981', borderColor: '#10b981' } : styles.totalStatBox]}>
                    <Text style={[styles.statLabel, { color: 'rgba(255,255,255,0.7)' }]}>TOTAL{'\n'}POINTS</Text>
                    <Text style={[styles.statValue, { color: '#fff' }]}>{item.total_points || 0}</Text>
                </View>
            </View>
        </View>
    );
};
