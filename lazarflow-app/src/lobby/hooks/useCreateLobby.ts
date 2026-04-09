import { useState, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { lobbyRepository } from '../../shared/infrastructure/repositories/LobbyRepository';
import { CustomAlert as Alert } from '../../lib/AlertService';
import { DefaultPointsSystems, PointAllocation, CreateLobbyFormState } from '../types';
import { LobbyStatus } from '../../shared/domain/models/Lobby';

export const defaultPointsSystems: DefaultPointsSystems = {
    freeFire: [
        { placement: 1, points: 12 }, { placement: 2, points: 9 }, { placement: 3, points: 8 },
        { placement: 4, points: 7 }, { placement: 5, points: 6 }, { placement: 6, points: 5 },
        { placement: 7, points: 4 }, { placement: 8, points: 3 }, { placement: 9, points: 2 },
        { placement: 10, points: 1 }, { placement: 11, points: 0 }, { placement: 12, points: 0 },
    ],
    bgmi: [
        { placement: 1, points: 10 }, { placement: 2, points: 6 }, { placement: 3, points: 5 },
        { placement: 4, points: 4 }, { placement: 5, points: 3 }, { placement: 6, points: 2 },
        { placement: 7, points: 1 }, { placement: 8, points: 1 },
    ],
    other: [
        { placement: 1, points: 10 }, { placement: 2, points: 8 }, { placement: 3, points: 6 },
        { placement: 4, points: 4 }, { placement: 5, points: 2 },
    ],
};

export const useCreateLobby = (canUseAI: boolean, maxAILobbies: number, navigation: any) => {
    const { user, refreshUser } = useContext(UserContext);
    
    const [name, setName] = useState('');
    const [game, setGame] = useState('freeFire');
    const [pointsSystem, setPointsSystem] = useState<PointAllocation[]>(defaultPointsSystems.freeFire);
    const [killPoints, setKillPoints] = useState(1);
    const [loading, setLoading] = useState(false);

    const handleGameChange = (selectedGame: string) => {
        setGame(selectedGame);
        const defaultSystem = defaultPointsSystems[selectedGame] || defaultPointsSystems.other;
        setPointsSystem(defaultSystem);
    };

    const handlePointsChange = (index: number, value: string) => {
        const newSystem = [...pointsSystem];
        newSystem[index].points = parseInt(value) || 0;
        setPointsSystem(newSystem);
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a lobby name');
            return;
        }

        if (!canUseAI) {
            Alert.alert(
                'Limit Reached',
                `You have reached your limit of ${maxAILobbies} lobbies. Upgrade to a premium plan to create more!`,
                [
                    { text: 'Later', style: 'cancel' } as any,
                    { text: 'View Plans', onPress: () => navigation.navigate('SubscriptionPlans') } as any
                ]
            );
            return;
        }

        setLoading(true);
        try {
            if (!user) throw new Error('Not authenticated');

            const payload = {
                name: name.trim(),
                game: game,
                points_system: pointsSystem,
                kill_points: killPoints,
                status: 'setup' as LobbyStatus
            };

            const data = await lobbyRepository.createLobby(payload);

            if (refreshUser) await refreshUser();

            Alert.alert('Success', 'Lobby created successfully!');
            navigation.navigate('ManageTeams', { lobbyId: data.id, lobbyName: data.name });
        } catch (error: any) {
            console.error('Error creating lobby:', error);
            Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to create lobby');
        } finally {
            setLoading(false);
        }
    };

    return {
        name, setName,
        game, handleGameChange,
        pointsSystem, handlePointsChange,
        killPoints, setKillPoints,
        loading, handleCreate
    };
};
