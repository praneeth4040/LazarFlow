-- Update a user's subscription tier
-- Replace 'user_id_here' with the actual user's ID
-- Replace 'new_tier_here' with the desired tier (e.g., 'developer', 'premier', 'competitive', 'ranked', 'free')

UPDATE profiles
SET subscription_tier = 'new_tier_here'
WHERE id = 'user_id_here';
