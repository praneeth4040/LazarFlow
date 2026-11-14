export interface TeamMember {
  name: string;
  kills?: number;
  wwcd?: number;
  matches_played?: number;
  is_verified?: boolean;
}

export interface Team {
  id: string;
  lobby_id: string;
  team_name: string;
  members: TeamMember[];
  rank?: number;
  total_kills?: number;
  total_placement_points?: number;
  total_points?: number;
  /** Public URL of the team logo (logos bucket) — drawn into mapped logo slots */
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIExtractedTeam {
  rank: number | string;
  team_name: string;
  kills: number;
  members: string[] | TeamMember[];
  is_mapped?: boolean;
}
