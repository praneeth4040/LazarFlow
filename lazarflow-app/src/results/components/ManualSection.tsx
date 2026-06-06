import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, Dimensions, Animated, StyleSheet } from 'react-native';
import { Camera, Search, Plus, X, Maximize } from 'lucide-react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import { Theme } from '../../styles/theme';
import { styles } from '../styles/calculateResults.styles';
import { TeamEntrySheet } from './TeamEntrySheet';
import { MatchResult, LobbyData } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

interface ManualSectionProps {
    lobby: LobbyData;
    results: MatchResult[];
    referenceImage: any;
    onPickReferenceImage: () => void;
    onRemoveReferenceImage: () => void;
    teamSearch: string;
    onTeamSearchChange: (v: string) => void;
    filteredSearchTeams: any[];
    onAddTeam: (result: MatchResult) => void;
}

export const ManualSection: React.FC<ManualSectionProps> = ({
    lobby,
    results,
    referenceImage,
    onPickReferenceImage,
    onRemoveReferenceImage,
    teamSearch,
    onTeamSearchChange,
    filteredSearchTeams,
    onAddTeam,
}) => {
    const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
    const [sheetVisible, setSheetVisible] = useState(false);

    const refImgH = referenceImage && referenceImage.width && referenceImage.height
        ? Math.min(550, Math.round(SCREEN_W / (referenceImage.width / referenceImage.height)))
        : 350;

    // Inline Zoom State
    const scale = useRef(new Animated.Value(1)).current;
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    
    const lastScale = useRef(1);
    const lastTranslateX = useRef(0);
    const lastTranslateY = useRef(0);

    const handleSelectTeam = (team: any) => {
        setSelectedTeam(team);
        setSheetVisible(true);
    };

    const nextPos = results.length + 1;

    const onPinchGestureEvent = Animated.event(
        [{ nativeEvent: { scale: scale } }],
        { useNativeDriver: true }
    );

    const onPinchHandlerStateChange = (event: any) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            lastScale.current *= event.nativeEvent.scale;
            scale.setValue(lastScale.current);
        }
    };

    const onPanGestureEvent = Animated.event(
        [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
        { useNativeDriver: true }
    );

    const onPanHandlerStateChange = (event: any) => {
        if (event.nativeEvent.oldState === State.ACTIVE) {
            lastTranslateX.current += event.nativeEvent.translationX;
            lastTranslateY.current += event.nativeEvent.translationY;
            translateX.setOffset(lastTranslateX.current);
            translateX.setValue(0);
            translateY.setOffset(lastTranslateY.current);
            translateY.setValue(0);
        }
    };

    const resetZoom = () => {
        lastScale.current = 1;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
        scale.setValue(1);
        translateX.setOffset(0);
        translateX.setValue(0);
        translateY.setOffset(0);
        translateY.setValue(0);
    };

    return (
        <View>
            {/* ── Reference Screenshot — inline zoom ────── */}
            <View style={{ marginHorizontal: -20, marginBottom: 16, overflow: 'hidden', backgroundColor: '#fff' }}>
                {referenceImage ? (
                    <View style={{ height: refImgH, width: SCREEN_W }}>
                        <PanGestureHandler
                            onGestureEvent={onPanGestureEvent}
                            onHandlerStateChange={onPanHandlerStateChange}
                            minPointers={2} // Only pan when zooming
                        >
                            <Animated.View style={{ flex: 1 }}>
                                <PinchGestureHandler
                                    onGestureEvent={onPinchGestureEvent}
                                    onHandlerStateChange={onPinchHandlerStateChange}
                                >
                                    <Animated.View style={{ 
                                        flex: 1,
                                        transform: [
                                            { scale: scale },
                                            { translateX: translateX },
                                            { translateY: translateY }
                                        ]
                                    }}>
                                        <Image
                                            source={{ uri: referenceImage.uri }}
                                            style={{ width: SCREEN_W, height: refImgH }}
                                            resizeMode="contain"
                                        />
                                    </Animated.View>
                                </PinchGestureHandler>
                            </Animated.View>
                        </PanGestureHandler>

                        {/* Overlay Actions */}
                        <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={resetZoom}
                                style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 }}
                            >
                                <Maximize size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onPickReferenceImage}
                                style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 }}
                            >
                                <Camera size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onRemoveReferenceImage}
                                style={{ backgroundColor: 'rgba(255,0,0,0.6)', padding: 8, borderRadius: 20 }}
                            >
                                <X size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontFamily: Theme.fonts.outfit.medium }}>Pinch to zoom / 2-finger pan</Text>
                        </View>
                    </View>
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

            <View style={s.searchSection}>
                <View style={s.searchBar}>
                    <Search size={20} color="#94A3B8" />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search & Add Team..."
                        value={teamSearch}
                        onChangeText={onTeamSearchChange}
                        placeholderTextColor="#94A3B8"
                    />
                    {teamSearch.length > 0 && (
                        <TouchableOpacity onPress={() => onTeamSearchChange('')}>
                            <X size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

                {filteredSearchTeams.length > 0 && (
                    <View style={s.resultsList}>
                        {filteredSearchTeams.map(team => (
                            <TouchableOpacity 
                                key={team.id} 
                                style={s.resultItem} 
                                onPress={() => handleSelectTeam(team)}
                                activeOpacity={0.7}
                            >
                                <Text style={s.resultName}>{team.team_name || team.name}</Text>
                                <Plus size={20} color={Theme.colors.accent} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <TeamEntrySheet
                visible={sheetVisible}
                team={selectedTeam}
                lobby={lobby}
                nextPosition={nextPos}
                onClose={() => setSheetVisible(false)}
                onSubmit={(result) => {
                    onAddTeam(result);
                    onTeamSearchChange('');
                }}
            />
        </View>
    );
};

const s = StyleSheet.create({
    searchSection: {
        marginTop: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.medium,
        color: '#1e293b',
        marginLeft: 10,
    },
    resultsList: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    resultName: {
        fontSize: 16,
        fontFamily: Theme.fonts.outfit.semibold,
        color: '#1e293b',
    }
});
