-- Check what's actually stored in the members field
SELECT 
  team_name,
  jsonb_pretty(members) as member_data
FROM tournament_teams
WHERE members IS NOT NULL
LIMIT 3;

-- Check the data type of each field
SELECT 
  team_name,
  jsonb_typeof(members) as members_type,
  jsonb_array_length(members) as player_count
FROM tournament_teams
WHERE members IS NOT NULL
LIMIT 3;

-- Check if any members have 'kills' field
SELECT 
  team_name,
  member->>'name' as player_name,
  member->>'kills' as kills,
  member->>'matches_played' as matches_played,
  member->>'wwcd' as wwcd
FROM tournament_teams,
  jsonb_array_elements(members) as member
WHERE members IS NOT NULL
LIMIT 10;
