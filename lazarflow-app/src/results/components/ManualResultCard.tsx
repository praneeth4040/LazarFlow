import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { Theme } from '../../styles/theme';
import { MatchResult } from '../types';

interface ManualResultCardProps {
    item: MatchResult;
    index: number;
    onEdit: () => void;
    onRemove: () => void;
}

export const ManualResultCard: React.FC<ManualResultCardProps> = ({
    item,
    onEdit,
    onRemove,
}) => {
    return (
        <View style={s.container}>
            <TouchableOpacity 
                style={s.row} 
                onPress={onEdit} 
                activeOpacity={0.7}
            >
                <View style={s.colRank}>
                    <Text style={s.rankPrefix}>#</Text>
                    <Text style={s.rankText}>{item.position}</Text>
                </View>
                <View style={s.colName}>
                    <Text style={s.nameText} numberOfLines={1}>{item.team_name}</Text>
                </View>
                <View style={s.colPts}>
                    <Text style={s.valText}>{item.placement_points || 0}</Text>
                </View>
                <View style={s.colKills}>
                    <Text style={s.killsText}>{item.kills || 0}</Text>
                </View>
                <View style={s.colTotal}>
                    <Text style={s.totalText}>{item.total_points || 0}</Text>
                </View>
                
                <View style={s.actions}>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); onRemove(); }} style={s.removeBtn}>
                        <X size={14} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const s = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    colRank: { width: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    rankPrefix: { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    rankText: { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent },
    colName: { flex: 1, paddingLeft: 8 },
    nameText: { fontSize: 14, fontFamily: Theme.fonts.outfit.semibold, color: '#1E293B' },
    colPts: { width: 45, alignItems: 'center' },
    colKills: { width: 45, alignItems: 'center' },
    killsText: { fontSize: 13, fontFamily: Theme.fonts.outfit.bold, color: Theme.colors.accent, textAlign: 'center' },
    colTotal: { width: 50, alignItems: 'center' },
    valText: { fontSize: 13, fontFamily: Theme.fonts.outfit.medium, color: '#64748B' },
    totalText: { fontSize: 14, fontFamily: Theme.fonts.outfit.bold, color: '#0F172A' },
    actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 4, width: 24, justifyContent: 'center' },
    removeBtn: { padding: 4 },
});
