import React from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import { Camera, Search, Plus } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';

const SCREEN_W = require('react-native').Dimensions.get('window').width;

interface ManualSectionProps {
    referenceImage: any;
    teamSearch: string;
    filteredSearchTeams: any[];
    onPickReferenceImage: () => void;
    onTeamSearchChange: (text: string) => void;
    onAddTeam: (team: any) => void;
    onOpenZoomModal: () => void;
}

export const ManualSection: React.FC<ManualSectionProps> = ({
    referenceImage,
    teamSearch,
    filteredSearchTeams,
    onPickReferenceImage,
    onTeamSearchChange,
    onAddTeam,
    onOpenZoomModal,
}) => {
    const refImgH = referenceImage && referenceImage.width && referenceImage.height
        ? Math.min(420, Math.round(SCREEN_W / (referenceImage.width / referenceImage.height)))
        : 260;

    return (
        <View>
            {/* ── Reference Screenshot — full-bleed, no card ────── */}
            <View style={{ marginHorizontal: -20, marginBottom: 16 }}>
                {referenceImage ? (
                    /* Tap to open full-screen zoom modal */
                    <TouchableOpacity onPress={onOpenZoomModal} activeOpacity={0.9}>
                        <Image
                            source={{ uri: referenceImage.uri }}
                            style={{ width: SCREEN_W, height: refImgH }}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={onPickReferenceImage}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, backgroundColor: Theme.colors.accent + '0a', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Theme.colors.accent + '25' }}
                        activeOpacity={0.75}
                    >
                        <Camera size={17} color={Theme.colors.accent} />
                        <Text style={{ color: Theme.colors.accent, fontWeight: '600', fontSize: 14 }}>Add Reference Screenshot</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Team Search ──────────────────────────────────── */}
            <View style={styles.searchSection}>
                <View style={styles.searchInputContainer}>
                    <Search size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search & Add Team..."
                        value={teamSearch}
                        onChangeText={onTeamSearchChange}
                        placeholderTextColor={Theme.colors.textSecondary}
                    />
                </View>
                {filteredSearchTeams.length > 0 && (
                    <View style={styles.searchResults}>
                        {filteredSearchTeams.map(team => (
                            <TouchableOpacity key={team.id} style={styles.searchItem} onPress={() => { onAddTeam(team); onTeamSearchChange(''); }}>
                                <Text style={styles.searchItemName}>{team.team_name}</Text>
                                <Plus size={18} color={Theme.colors.accent} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
};