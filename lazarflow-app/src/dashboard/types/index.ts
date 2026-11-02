export interface User {
    id: string;
    email?: string;
    emails?: string;
    username?: string;
    display_name?: string;
    flux_balance?: number;
    themes_count?: number;
    subscription_tier?: string;
    [key: string]: any;
}

export interface Team {
    id: string;
    name: string;
    [key: string]: any;
}

export interface Lobby {
    id: string;
    name: string;
    status: string;
    teams_count?: number;
    team_count?: number;
    teamsCount?: number;
    teams?: Team[];
    _count?: {
        teams: number;
    };
    [key: string]: any;
}

export interface Theme {
    id: string;
    name: string;
    image_url?: string;
    uri?: string;
    [key: string]: any;
}

export interface DashboardTabProps {
    user: User | null;
    tier: string;
    lobbiesCreated?: number;
    maxAILobbies?: number;
    maxLayouts?: number;
    activeSettingsId: string | null;
    toggleSettings: (id: string | null) => void;
}
