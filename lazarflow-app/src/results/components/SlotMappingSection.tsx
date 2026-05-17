import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronDown, Save, X } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';

interface ProcessedSlot {
    slot: number;
    mappedTeamId: string | null;
    players: string[];
}

interface SlotMappingSectionProps {
    processedSlots: ProcessedSlot[];
    teams: any[];
    submittingMappings: boolean;
    onSelectSlot: (index: number) => void;
    onSaveMappings: () => void;
    onCancel: () => void;
    onDismiss: () => void;
}

export const SlotMappingSection: React.FC<SlotMappingSectionProps> = ({
    processedSlots,
    teams,
    submittingMappings,
    onSelectSlot,
    onSaveMappings,
    onCancel,
    onDismiss,
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
                        <Text style={styles.slotLabel}>SLOT {item.slot}</Text>
                    </View>

                    <View style={styles.slotBody}>
                        <Text style={styles.slotFieldLabel}>TEAM:</Text>
                        <TouchableOpacity
                            style={styles.slotPicker}
                            onPress={() => onSelectSlot(index)}
                        >
                            <Text style={[
                                styles.slotPickerText,
                                !item.mappedTeamId && { color: Theme.colors.textSecondary }
                            ]}>
                                {teams.find(t => t.id === item.mappedTeamId)?.team_name || 'Select Team'}
                            </Text>
                            <ChevronDown size={18} color={Theme.colors.textSecondary} />
                        </TouchableOpacity>

                        <Text style={styles.slotFieldLabel}>PLAYERS:</Text>
                        <View style={styles.slotPlayerList}>
                            {item.players && item.players.length > 0 ? (
                                item.players.map((p, pIdx) => (
                                    <View key={pIdx} style={styles.playerBadge}>
                                        <Text style={styles.playerBadgeText}>{p}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noPlayersText}>No players identified</Text>
                            )}
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