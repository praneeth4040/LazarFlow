import { Lobby } from '../../shared/domain/models/Lobby';
import { Team, TeamMember } from '../../shared/domain/models/Team';
import { User } from '../../shared/domain/models/User';

export interface PointAllocation {
    placement: number;
    points: number;
}

export interface DefaultPointsSystems {
    [gameKey: string]: PointAllocation[];
}

export interface MetadataField {
    key: string;
    value: string;
}

// Params logic for forms
export interface CreateLobbyFormState {
    name: string;
    game: string;
    pointsSystem: PointAllocation[];
    killPoints: number;
}

export interface DraftTeam {
    id?: string;
    team_name: string;
    members: TeamMember[];
    respective_slotlist_postion: number;
    total_points?: number;
}

export type ManageTeamsMode = 'manual' | 'ai';
