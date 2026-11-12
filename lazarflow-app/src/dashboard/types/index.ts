import { RenderTypeId, DEFAULT_RENDER_TYPE_ID } from '../../shared/domain/renderTypes';

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
    /** Render type of the template; absent on legacy themes (points_table) */
    type?: RenderTypeId;
    [key: string]: any;
}

/**
 * Resolve a theme's render type. Legacy themes predate the `type` column and
 * are all points-table templates, so they default to 'points_table'.
 */
export const getThemeType = (theme: Theme): RenderTypeId =>
    theme?.type ?? DEFAULT_RENDER_TYPE_ID;

export interface DashboardTabProps {
    user: User | null;
    tier: string;
    lobbiesCreated?: number;
    maxAILobbies?: number;
    maxLayouts?: number;
    activeSettingsId: string | null;
    toggleSettings: (id: string | null) => void;
}
