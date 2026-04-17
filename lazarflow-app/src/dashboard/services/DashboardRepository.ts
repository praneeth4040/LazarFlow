import { 
    getLobbies, 
    deleteLobby, 
    endLobby,
    getUserThemes, 
    getCommunityDesigns, 
    uploadTheme, 
    promoteLobby 
} from '../../lib/dataService';
import { Lobby, Theme, PromoData } from '../types';

export class DashboardRepository {
    static async fetchLobbies(limit: number | null = null, includeTeams: boolean = true): Promise<Lobby[]> {
        return await getLobbies(limit, includeTeams);
    }

    static async deleteLobby(lobbyId: string): Promise<void> {
        await deleteLobby(lobbyId);
    }

    static async endLobby(lobbyId: string): Promise<void> {
        await endLobby(lobbyId);
    }

    static async fetchUserThemes(userId: string, forceRefresh: boolean = false): Promise<Theme[]> {
        return await getUserThemes(userId, forceRefresh);
    }

    static async fetchCommunityDesigns(): Promise<Theme[]> {
        return await getCommunityDesigns();
    }

    static async uploadDesignTheme(name: string, uri: string): Promise<void> {
        await uploadTheme(name, uri);
    }

    static async promoteTournament(lobbyId: string, data: Partial<PromoData>): Promise<void> {
        await promoteLobby(lobbyId, {
            start_date: data.startDate,
            start_time: data.startTime,
            contact_details: data.contactDetails,
            additional_details: data.additionalDetails
        });
    }
}
