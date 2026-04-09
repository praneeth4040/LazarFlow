export interface ProcessedSlot {
    slot: number;
    mappedTeamId: string | null;
    players: string[];
}

export interface ExtractedAIResult {
    rank: string | number;
    kills?: number;
    players?: { name: string; kills?: number }[];
}

export interface MatchResult {
    team_id: string;
    team_name: string;
    position: string | number;
    kills: number;
    placement_points: number;
    kill_points: number;
    total_points: number;
    isExtracted?: boolean;
    members?: { name: string; kills: number; isExtracted?: boolean }[];
}

export interface LobbyPointSystemData {
    placement: number;
    points: number;
}

export interface LobbyData {
    id: string;
    name: string;
    kill_points: number;
    points_system: LobbyPointSystemData[];
}
