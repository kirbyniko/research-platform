-- Migration 021: Convert to Project-Level Credits
-- Each project has its own credit pool instead of per-user credits

-- Add project_id to existing tables
ALTER TABLE user_credits 
ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_user_credits_project ON user_credits(project_id);

-- Add project_id to credit_transactions
ALTER TABLE credit_transactions
ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX idx_credit_transactions_project ON credit_transactions(project_id);

-- Add project_id to ai_usage
ALTER TABLE ai_usage
ADD COLUMN project_id_v2 INTEGER REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX idx_ai_usage_project_v2 ON ai_usage(project_id_v2);

-- Add comment explaining the system
COMMENT ON COLUMN user_credits.project_id IS 'If NULL, these are user-level credits. If set, these are project-level credits. For project credits, user_id indicates who purchased them.';

-- Create a view for easy project credit lookups
CREATE OR REPLACE VIEW project_credit_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  COALESCE(SUM(uc.balance), 0) as total_credits,
  COALESCE(SUM(uc.total_purchased), 0) as total_purchased,
  COALESCE(SUM(uc.total_used), 0) as total_used
FROM projects p
LEFT JOIN user_credits uc ON uc.project_id = p.id
GROUP BY p.id, p.name;

-- Initialize project credits for existing projects (give them 10 free credits to start)
INSERT INTO user_credits (user_id, project_id, balance, total_purchased, total_used)
SELECT 
  p.created_by,
  p.id,
  10, -- 10 free credits per project
  10,
  0
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM user_credits uc WHERE uc.project_id = p.id
)
ON CONFLICT DO NOTHING;
