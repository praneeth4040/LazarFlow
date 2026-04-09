import { useState, useEffect } from 'react';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { PointAllocation, MetadataField } from '../types';

export const useEditLobby = (lobbyId: string, navigation: any) => {
    const [lobby, setLobby] = useState<any>(null);
    const [name, setName] = useState('');
    const [metadataList, setMetadataList] = useState<MetadataField[]>([]);
    
    // We fetch these to display, but the user cant edit them here based on original logic
    const [game, setGame] = useState('freeFire');
    const [pointsSystem, setPointsSystem] = useState<PointAllocation[]>([]);
    const [killPoints, setKillPoints] = useState(1);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (lobbyId) {
            fetchLobby();
        }
    }, [lobbyId]);

    const fetchLobby = async () => {
        setLoading(true);
        try {
            const data = await lobbyRepository.getLobby(lobbyId);

            setLobby(data);
            setName(data.name);
            setGame(data.game || 'freeFire');
            setPointsSystem(data.points_system || []);
            setKillPoints(data.kill_points || 1);
            
            const meta = data.metadata || {};
            const list = Object.keys(meta).map(key => ({
                key,
                value: String(meta[key])
            }));
            setMetadataList(list);
        } catch (error) {
            console.error('Error fetching lobby:', error);
            Alert.alert('Error', 'Failed to load lobby details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const addMetadataField = () => {
        setMetadataList([...metadataList, { key: '', value: '' }]);
    };

    const removeMetadataField = (index: number) => {
        setMetadataList(metadataList.filter((_, i) => i !== index));
    };

    const updateMetadataField = (index: number, field: 'key' | 'value', value: string) => {
        const newList = [...metadataList];
        newList[index][field] = value;
        setMetadataList(newList);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a lobby name');
            return;
        }

        const metadataObj: Record<string, string> = {};
        metadataList.forEach(item => {
            if (item.key.trim()) {
                metadataObj[item.key.trim()] = item.value;
            }
        });

        setSaving(true);
        try {
            await lobbyRepository.updateLobby(lobbyId, {
                name: name.trim(),
                metadata: metadataObj
            });

            Alert.alert('Success', 'Lobby updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() } as any
            ]);
        } catch (error) {
            console.error('Error updating lobby:', error);
            Alert.alert('Error', 'Failed to update lobby');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = () => {
        Alert.alert(
            "Delete Lobby",
            `Are you sure you want to delete "${name}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" } as any,
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await lobbyRepository.deleteLobby(lobbyId);
                            navigation.navigate('Dashboard');
                        } catch (err) {
                            console.error('Error deleting lobby:', err);
                            Alert.alert("Error", "Failed to delete lobby");
                        } finally {
                            setSaving(false);
                        }
                    }
                } as any
            ]
        );
    };

    return {
        lobby, name, setName,
        game, pointsSystem, killPoints,
        metadataList, addMetadataField, removeMetadataField, updateMetadataField,
        loading, saving,
        handleSave, confirmDelete
    };
};
