-- Remove templates table (no longer needed)
-- Migration: Remove SVG/PNG template system
-- Date: 2025-11-22

DROP TABLE IF EXISTS public.templates CASCADE;

-- Note: This will also drop:
-- - All foreign key constraints referencing templates
-- - Any indexes on the templates table
-- - tournaments.selected_template_id column will become null if it exists

-- Verification query: Confirm table is dropped
-- Run this after migration to verify:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name = 'templates';
-- Expected result: 0 rows
