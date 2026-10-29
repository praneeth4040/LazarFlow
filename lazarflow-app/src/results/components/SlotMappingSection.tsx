import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import { ChevronDown, Save, X, Search, CheckCircle, Edit2, Check } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';

interface ProcessedSlot {
    slot: number;
    mappedTeamId: string | null;
    players: string[];
    url?: string;
}

interface SlotMappingSectionProps {
    processedSlots: ProcessedSlot[];
    teams: any[];
    submittingMappings: boolean;
    onSelectSlot: (index: number) => void;
    onSaveMappings: () => void;
    onCancel: () => void;
    onDismiss: () => void;
    onInspectCrop?: (url: string) => void;
    onUpdatePlayerName?: (slotIndex: number, playerIndex: number, newName: string) => void;
}

const PlayerBadge = ({ name, onChangeName }: { name: string, onChangeName: (name: string) => void }) => {
    const inputRef = React.useRef<TextInput>(null);
    const [isFocused, setIsFocused] = React.useState(false);
    return (
        <View style={styles.playerBadge}>
            <View style={styles.playerDot} />
            <TextInput 
                ref={inputRef}
                style={styles.playerBadgeInput}
                value={name}
                onChangeText={onChangeName}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
            <TouchableOpacity 
                style={styles.playerRemoveBtn}
                onPress={() => {
                    if (isFocused) {
                        inputRef.current?.blur();
                    } else {
                        inputRef.current?.focus();
                    }
                }}
            >
                {isFocused ? (
                    <Check size={16} color="#10b981" />
                ) : (
                    <Edit2 size={14} color={Theme.colors.accent} />
                )}
            </TouchableOpacity>
        </View>
    );
};

export const SlotMappingSection: React.FC<SlotMappingSectionProps> = ({
    processedSlots,
    teams,
    submittingMappings,
    onSelectSlot,
    onSaveMappings,
    onCancel,
    onDismiss,
    onInspectCrop,
    onUpdatePlayerName,
}) => {
    return (
        <View style={styles.mappingSection}>
            <View style={styles.mappingHeader}>
                <Text style={styles.mappingTitle}>Lobby Slot Mapping</Text>
                <Text style={styles.mappingSubtitle}>Map extracted slots to registered teams</Text>
            </View>

            {processedSlots.map((item, index) => (
                <View key={index} style={styles.slotCard}>
                    <View style={styles.slotHeader}>
                        <View style={styles.slotBadge}>
                            <Text style={styles.slotLabel}>SLOT {String(item.slot).padStart(2, '0')}</Text>
                        </View>
                    </View>

                    <View style={styles.slotBody}>
                        {item.url && (
                            <View style={styles.ocrSection}>
                                <View style={styles.ocrHeaderRow}>
                                    <Text style={styles.slotFieldLabel}>IN-GAME LOBBY OCR SNIPPET</Text>
                                    <TouchableOpacity 
                                        style={styles.inspectBtn}
                                        onPress={() => item.url && onInspectCrop && onInspectCrop(item.url)}
                                    >
                                        <Search size={14} color="#1a1a1a" />
                                        <Text style={styles.inspectBtnText}>Inspect Crop</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.ocrContainer}>
                                    <Image 
                                        source={{ uri: item.url }} 
                                        style={styles.ocrImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.sectionSpacing}>
                            <Text style={styles.slotFieldLabel}>ASSIGNED TOURNAMENT TEAM</Text>
                            <TouchableOpacity
                                style={styles.slotPicker}
                                onPress={() => onSelectSlot(index)}
                            >
                                <View style={styles.teamNameContainer}>
                                    <Text style={[
                                        styles.slotPickerText,
                                        !item.mappedTeamId && { color: Theme.colors.textSecondary }
                                    ]}>
                                        {teams.find(t => t.id === item.mappedTeamId)?.team_name || 'Select Team'}
                                    </Text>
                                    {item.mappedTeamId && (
                                        <CheckCircle size={16} color="#1a1a1a" style={{ marginLeft: 6 }} />
                                    )}
                                </View>
                                <View style={styles.changeActionContainer}>
                                    <Text style={styles.changeActionText}>Change</Text>
                                    <ChevronDown size={18} color="#64748b" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sectionSpacing}>
                            <View style={styles.rosterHeaderRow}>
                                <Text style={styles.slotFieldLabel}>MAPPED ROSTER MEMBERS ({item.players?.length || 0})</Text>
                            </View>
                            <View style={styles.slotPlayerList}>
                                {item.players && item.players.length > 0 ? (
                                    item.players.map((p, pIdx) => (
                                        <PlayerBadge
                                            key={pIdx}
                                            name={p}
                                            onChangeName={(text) => onUpdatePlayerName && onUpdatePlayerName(index, pIdx, text)}
                                        />
                                    ))
                                ) : (
                                    <Text style={styles.noPlayersText}>No players identified</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            ))}

            <TouchableOpacity
                style={[styles.applyBtn, submittingMappings && styles.disabledBtn]}
                onPress={onSaveMappings}
                disabled={submittingMappings}
            >
                {submittingMappings ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <Save size={20} color="#fff" />
                        <Text style={styles.applyBtnText}>Save Mappings</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
                <Text style={styles.cancelBtnText}>Cancel & Dismiss</Text>
            </TouchableOpacity>
        </View>
    );
};