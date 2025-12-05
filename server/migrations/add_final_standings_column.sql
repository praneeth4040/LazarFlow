-- =====================================================
-- Add final_standings column to tournaments table
-- This stores the final leaderboard when a tournament is ended
-- =====================================================

-- Add the final_standings column as JSONB
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS final_standings JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN tournaments.final_standings IS 'Stores the final standings/leaderboard when tournament is completed. Array of team objects with rank, team_name, matches_played, wins, placement_points, kill_points, total_points';

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'tournaments' 
  AND column_name = 'final_standings';

