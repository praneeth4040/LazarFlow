import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';

interface ProcessedSlot {
    slot: number;
    mappedTeamId: string | null;
    players: string[];
}

interface AITeamResult {
    rank: number | string;
    kills: number;
}

interface TeamMappingModalProps {
    visible: boolean;
    teams: any[];
    selectedSlotIndex: number | null;
    selectedAiTeam: AITeamResult | null;
    processedSlots: ProcessedSlot[];
    mappings: Record<string, string>;
    onSelectTeam: (teamId: string) => void;
    onClearMapping: () => void;
    onClose: () => void;
    handleUpdateSlotMapping: (index: number, teamId: string | null) => void;
    setMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const TeamMappingModal: React.FC<TeamMappingModalProps> = ({
    visible,
    teams,
    selectedSlotIndex,
    selectedAiTeam,
    processedSlots,
    mappings,
    onSelectTeam,
    onClearMapping,
    onClose,
    handleUpdateSlotMapping,
    setMappings,
}) => {
    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Map AI Result</Text>
                    <TouchableOpacity onPress={onClose}>
                        <X size={24} color={Theme.colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.aiSummary}>
                    <Text style={styles.aiSummaryLabel}>AI extracted data for:</Text>
                    {selectedSlotIndex !== null ? (
                        <>
                            <Text style={styles.aiSummaryName}>SLOT {processedSlots[selectedSlotIndex]?.slot}</Text>
                            <Text style={styles.aiSummaryDetail}>{processedSlots[selectedSlotIndex]?.players?.length || 0} players identified</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.aiSummaryName}>#{selectedAiTeam?.rank}</Text>
                            <Text style={styles.aiSummaryDetail}>{selectedAiTeam?.kills} kills</Text>
                        </>
                    )}
                </View>

                <Text style={styles.sectionLabel}>Select Registered Team</Text>
                <ScrollView style={styles.teamOptionsList}>
                    {teams.map(team => {
                        let isSelected = false;
                        let isMappedToOther = false;

                        if (selectedSlotIndex !== null) {
                            isSelected = processedSlots[selectedSlotIndex].mappedTeamId === team.id;
                            isMappedToOther = processedSlots.some(
                                (slot, idx) => slot.mappedTeamId === team.id && idx !== selectedSlotIndex
                            );
                        } else {
                            isSelected = mappings[selectedAiTeam?.rank] === team.id;
                            isMappedToOther = Object.entries(mappings).some(
                                ([rank, registeredId]) => registeredId === team.id && parseInt(rank, 10) !== parseInt(String(selectedAiTeam?.rank), 10)
                            );
                        }

                        return (
                            <TouchableOpacity
                                key={team.id}
                                style={[
                                    styles.teamOption,
                                    isSelected && styles.teamOptionSelected,
                                    isMappedToOther && styles.teamOptionDisabled
                                ]}
                                disabled={isMappedToOther}
                                onPress={() => onSelectTeam(team.id)}
                            >
                                <View style={styles.teamOptionLeft}>
                                    <Text style={[
                                        styles.teamOptionText,
                                        isSelected && styles.teamOptionTextSelected,
                                        isMappedToOther && styles.teamOptionTextDisabled
                                    ]}>
                                        {team.team_name}
                                    </Text>
                                    {isMappedToOther && (
                                        <Text style={styles.alreadyMappedText}>Already assigned</Text>
                                    )}
                                </View>
                                {isSelected && (
                                    <Check size={20} color={Theme.colors.accent} />
                                )}
                                {isMappedToOther && (
                                    <X size={16} color={Theme.colors.textSecondary} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <TouchableOpacity
                    style={styles.clearMappingBtn}
                    onPress={onClearMapping}
                >
                    <Text style={styles.clearMappingText}>Clear Mapping</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};