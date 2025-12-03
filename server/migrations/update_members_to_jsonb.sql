-- =====================================================
-- Update tournament_teams table to store player stats
-- Option 1: Simple approach (no separate tables)
-- =====================================================

-- Step 1: Add a new jsonb column temporarily
ALTER TABLE tournament_teams 
ADD COLUMN members_new jsonb DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing data from text[] to jsonb
UPDATE tournament_teams
SET members_new = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', member,
      'matches_played', 0,
      'kills', 0,
      'wwcd', 0
    )
  )
  FROM unnest(members) AS member
)
WHERE members IS NOT NULL AND array_length(members, 1) > 0;

-- Step 3: Drop the old members column
ALTER TABLE tournament_teams 
DROP COLUMN members;

-- Step 4: Rename the new column to members
ALTER TABLE tournament_teams 
RENAME COLUMN members_new TO members;

-- =====================================================
-- Example of the new structure:
-- =====================================================
-- members field now stores:
-- [
--   {
--     "name": "Player1",
--     "matches_played": 5,
--     "kills": 25,
--     "wwcd": 2
--   },
--   {
--     "name": "Player2", 
--     "matches_played": 5,
--     "kills": 18,
--     "wwcd": 1
--   }
-- ]

-- =====================================================
-- Verify the migration
-- =====================================================
-- SELECT team_name, members FROM tournament_teams LIMIT 5;
