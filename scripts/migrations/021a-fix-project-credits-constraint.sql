-- Migration 021a: Fix user_credits unique constraint for project_id
-- The original migration 021 added project_id but didn't update the unique constraint

-- Drop the old unique constraint on user_id only
ALTER TABLE user_credits 
DROP CONSTRAINT IF EXISTS user_credits_user_id_key;

-- Add a unique constraint that allows either user_id OR project_id to be unique
-- For user-level credits: user_id is set, project_id is NULL
-- For project-level credits: project_id is set, user_id can be whoever purchased
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credits_unique 
ON user_credits(COALESCE(project_id, -user_id));

-- Also add a direct unique constraint on project_id for project credits
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credits_project_unique
ON user_credits(project_id) WHERE project_id IS NOT NULL;
