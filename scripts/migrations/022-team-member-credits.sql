-- Migration 022: Team Member Credit Management
-- Adds per-team-member credit balances and allocation tracking

-- Create table for per-member credit balances within projects
CREATE TABLE IF NOT EXISTS project_member_credits (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  allocated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create table for credit allocation transactions
CREATE TABLE IF NOT EXISTS credit_allocations (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT,
  allocated_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add user_id to ai_usage for per-user tracking
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_member_credits_project ON project_member_credits(project_id);
CREATE INDEX IF NOT EXISTS idx_project_member_credits_user ON project_member_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_allocations_project ON credit_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_credit_allocations_to_user ON credit_allocations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);

-- Function to get member credit balance
CREATE OR REPLACE FUNCTION get_member_credits(p_project_id INTEGER, p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM project_member_credits
  WHERE project_id = p_project_id AND user_id = p_user_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- View for member credit summary
CREATE OR REPLACE VIEW project_member_credit_summary AS
SELECT 
  pmc.project_id,
  pmc.user_id,
  u.email,
  u.name,
  pm.role,
  pmc.balance,
  COALESCE(SUM(CASE WHEN au.created_at >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END), 0) as usage_hour,
  COALESCE(SUM(CASE WHEN au.created_at >= NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END), 0) as usage_day,
  COALESCE(SUM(CASE WHEN au.created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0) as usage_month,
  COALESCE(COUNT(au.id), 0) as usage_total,
  pmc.updated_at as last_updated
FROM project_member_credits pmc
JOIN users u ON u.id = pmc.user_id
JOIN project_members pm ON pm.project_id = pmc.project_id AND pm.user_id = pmc.user_id
LEFT JOIN ai_usage au ON au.user_id = pmc.user_id AND au.project_id = pmc.project_id
GROUP BY pmc.project_id, pmc.user_id, u.email, u.name, pm.role, pmc.balance, pmc.updated_at;

COMMENT ON TABLE project_member_credits IS 'Individual credit balances for team members within projects';
COMMENT ON TABLE credit_allocations IS 'History of credit allocations between team members';
COMMENT ON VIEW project_member_credit_summary IS 'Summary of member credits with usage statistics';
