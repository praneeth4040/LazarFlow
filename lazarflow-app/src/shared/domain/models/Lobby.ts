export interface PointsSystemEntry {
  placement: number;
  points: number;
}

export type LobbyStatus = 'setup' | 'active' | 'completed' | 'cancelled';

export interface Lobby {
  id: string;
  user_id: string;
  name: string;
  status: LobbyStatus;
  game?: string;
  kill_points: number;
  points_system: PointsSystemEntry[];
  created_at: string;
  updated_at: string;
  total_teams?: number;
  total_matches?: number;
  metadata?: Record<string, string>;
}

export interface LobbyResult {
  team_id: string;
  team_name: string;
  position: number;
  kills: number;
  placement_points: number;
  kill_points: number;
  total_points: number;
  members: {
    name: string;
    kills: number;
  }[];
}
