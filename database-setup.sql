-- Create tournaments table
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  game VARCHAR(50) NOT NULL,
  points_system JSONB NOT NULL,
  kill_points INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tournament_teams table
CREATE TABLE tournament_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  captain_name VARCHAR(255),
  members TEXT[] DEFAULT '{}',
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);

-- Enable RLS (Row Level Security)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Users can create tournaments" ON tournaments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own tournaments" ON tournaments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tournaments" ON tournaments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournaments" ON tournaments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tournament_teams
CREATE POLICY "Users can insert teams to their tournaments" ON tournament_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read teams of their tournaments" ON tournament_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update teams of their tournaments" ON tournament_teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete teams from their tournaments" ON tournament_teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tournaments 
      WHERE tournaments.id = tournament_teams.tournament_id 
      AND tournaments.user_id = auth.uid()
    )
  );

