import { BaseRepository } from './BaseRepository';
import { Lobby, LobbyStatus } from '../../domain/models/Lobby';
import { Team } from '../../domain/models/Team';

export class LobbyRepository extends BaseRepository {
  async getLobby(id: string): Promise<Lobby> {
    return this.get<Lobby>(`/api/lobbies/${id}`);
  }

  async createLobby(lobbyData: Partial<Lobby>): Promise<Lobby> {
    return this.post<Lobby>('/api/lobbies', lobbyData);
  }

  async deleteLobby(id: string): Promise<void> {
    return this.delete<void>(`/api/lobbies/${id}`);
  }

  async updateLobby(id: string, updates: Partial<Lobby>): Promise<Lobby> {
    return this.put<Lobby>(`/api/lobbies/${id}`, updates);
  }

  async getLobbyTeams(lobbyId: string): Promise<Team[]> {
    return this.get<Team[]>(`/api/lobbies/${lobbyId}/teams`);
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    return this.put<Team>(`/api/teams/${teamId}`, updates);
  }

  async batchUpdateTeams(lobbyId: string, updates: any[]): Promise<any> {
    return this.put<any>(`/api/lobbies/${lobbyId}/teams/batch`, updates);
  }

  /**
   * Submit one match's results (per-team positions + per-player kills).
   * The server stores the match row (with proofs) AND applies the aggregate
   * score deltas itself — the app never computes cumulative totals.
   */
  async submitMatch(lobbyId: string, payload: {
    results: any[];
    source?: 'manual' | 'ai' | 'bot';
    label?: string;
    screenshotUrls?: string[];
    cellRequestId?: string;
  }): Promise<any> {
    return this.post<any>(`/api/lobbies/${lobbyId}/matches`, payload);
  }

  async batchUpdateTeamMembers(lobbyId: string, updates: any[]): Promise<any> {
    return this.put<any>(`/api/lobbies/${lobbyId}/teams/members/batch`, updates);
  }

  async deleteTeam(teamId: string): Promise<void> {
    return this.delete<void>(`/api/teams/${teamId}`);
  }
}

export const lobbyRepository = new LobbyRepository();
