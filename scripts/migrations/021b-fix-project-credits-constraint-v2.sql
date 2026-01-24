-- Migration 021b: Fix user_credits unique constraint properly
-- The previous attempt used indexes, but ON CONFLICT needs a proper unique constraint

-- First, check if there are any duplicate project_id rows
-- If there are, we need to clean them up first

-- Remove the indexes created in 021a
DROP INDEX IF EXISTS idx_user_credits_unique;
DROP INDEX IF EXISTS idx_user_credits_project_unique;

-- Add a proper unique constraint on project_id (where project_id is not null)
-- This will work with ON CONFLICT (project_id)
ALTER TABLE user_credits 
ADD CONSTRAINT user_credits_project_id_key UNIQUE (project_id);
