-- =====================================================
-- Add Sample Player Stats to Existing Teams
-- Run this to populate member stats for testing
-- =====================================================

-- Option 1: Add random sample stats to ALL teams (for testing)
-- This will update all teams with random kills/matches/wwcd values
UPDATE tournament_teams
SET members = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', member->>'name',
      'matches_played', COALESCE((member->>'matches_played')::int, 3),
      'kills', COALESCE((member->>'kills')::int, (RANDOM() * 15)::int),  -- Random 0-15 kills
      'wwcd', COALESCE((member->>'wwcd')::int, 0)
    )
  )
  FROM jsonb_array_elements(members) AS member
)
WHERE members IS NOT NULL;

-- =====================================================
-- Option 2: Update a SPECIFIC team with actual stats
-- =====================================================
-- Example: Update team "1ez" with actual player stats
/*
UPDATE tournament_teams
SET members = '[
  {"name": "Player1", "matches_played": 5, "kills": 25, "wwcd": 2},
  {"name": "Player2", "matches_played": 5, "kills": 18, "wwcd": 1},
  {"name": "Player3", "matches_played": 5, "kills": 22, "wwcd": 2},
  {"name": "Player4", "matches_played": 5, "kills": 15, "wwcd": 0}
]'::jsonb
WHERE team_name = '1ez';
*/

-- =====================================================
-- Option 3: Add stats to members that don't have them yet
-- (If some teams have stats and others don't)
-- =====================================================
UPDATE tournament_teams
SET members = (
  SELECT jsonb_agg(
    CASE 
      WHEN member ? 'kills' THEN member  -- Already has stats, keep it
      ELSE jsonb_build_object(
        'name', member->>'name',
        'matches_played', 0,
        'kills', 0,
        'wwcd', 0
      )
    END
  )
  FROM jsonb_array_elements(members) AS member
)
WHERE members IS NOT NULL;

-- =====================================================
-- Verify the changes
-- =====================================================
-- View all teams and their player stats
SELECT 
  team_name,
  jsonb_pretty(members) as player_stats
FROM tournament_teams
LIMIT 5;

-- =====================================================
-- Manual Update Template
-- Copy this and modify for each team you want to update
-- =====================================================
/*
UPDATE tournament_teams
SET members = '[
  {"name": "YourPlayer1", "matches_played": 3, "kills": 12, "wwcd": 1},
  {"name": "YourPlayer2", "matches_played": 3, "kills": 8, "wwcd": 0},
  {"name": "YourPlayer3", "matches_played": 3, "kills": 15, "wwcd": 1},
  {"name": "YourPlayer4", "matches_played": 3, "kills": 10, "wwcd": 0}
]'::jsonb
WHERE team_name = 'YOUR_TEAM_NAME';
*/
