-- Check if members column is already JSONB
-- Run this first to see current status
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'tournament_teams' 
  AND column_name = 'members';

-- If it shows 'jsonb', the migration already worked!
-- If it shows 'ARRAY' or 'text[]', then you need to run the migration.
