-- Migration: 016-verifier-role-system.sql
-- Third-Party Verifier Role System
-- Created: 2026-01-22

-- ============================================================================
-- VERIFIER FLAGS ON USERS TABLE
-- ============================================================================

-- Add verifier flag to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verifier BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verifier_since TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verifier_specialty TEXT[], -- e.g. ['legal', 'medical', 'government']
  ADD COLUMN IF NOT EXISTS verifier_max_concurrent INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS verifier_notes TEXT;

COMMENT ON COLUMN users.is_verifier IS 'Whether this user can perform 3rd party verification';
COMMENT ON COLUMN users.verifier_since IS 'When this user became a verifier';
COMMENT ON COLUMN users.verifier_specialty IS 'Areas of expertise for verification matching';
COMMENT ON COLUMN users.verifier_max_concurrent IS 'Max concurrent verification requests allowed';
COMMENT ON COLUMN users.verifier_notes IS 'Admin notes about this verifier';

-- ============================================================================
-- VERIFIER STATISTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS verifier_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Lifetime stats
  total_verifications_completed INTEGER DEFAULT 0,
  total_records_verified INTEGER DEFAULT 0,
  total_data_items_verified INTEGER DEFAULT 0,
  
  -- Outcome stats  
  verifications_passed INTEGER DEFAULT 0,
  verifications_partial INTEGER DEFAULT 0,
  verifications_failed INTEGER DEFAULT 0,
  
  -- Performance
  avg_completion_time_hours DECIMAL(10,2),
  
  -- Current workload
  current_assigned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================================================
-- UPDATE VERIFICATION_REQUESTS FOR BETTER ASSIGNMENT
-- ============================================================================

ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS preferred_verifier_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assignment_notes TEXT,
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2);

COMMENT ON COLUMN verification_requests.preferred_verifier_id IS 'Optional: preferred verifier (by expertise match)';
COMMENT ON COLUMN verification_requests.assignment_notes IS 'Notes about why this was assigned to specific verifier';

-- ============================================================================
-- VIEWS FOR VERIFIER DASHBOARD
-- ============================================================================

-- View: Available verifiers with workload
CREATE OR REPLACE VIEW available_verifiers AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.verifier_specialty,
  u.verifier_max_concurrent,
  COALESCE(vs.current_assigned, 0) as current_assigned,
  COALESCE(vs.total_verifications_completed, 0) as total_completed,
  COALESCE(vs.avg_completion_time_hours, 0) as avg_hours,
  u.verifier_max_concurrent - COALESCE(vs.current_assigned, 0) as available_capacity
FROM users u
LEFT JOIN verifier_stats vs ON u.id = vs.user_id
WHERE u.is_verifier = true
ORDER BY available_capacity DESC, total_completed DESC;

-- View: Verifier's queue
CREATE OR REPLACE VIEW verifier_queue AS
SELECT 
  vr.*,
  p.name as project_name,
  p.slug as project_slug,
  rt.name as record_type_name,
  u.email as requester_email,
  u.name as requester_name
FROM verification_requests vr
JOIN records r ON vr.record_id = r.id
JOIN record_types rt ON r.record_type_id = rt.id
JOIN projects p ON vr.project_id = p.id
LEFT JOIN users u ON vr.requested_by = u.id
WHERE vr.status IN ('pending', 'in_progress')
ORDER BY 
  CASE vr.priority 
    WHEN 'high' THEN 1 
    WHEN 'urgent' THEN 1
    WHEN 'normal' THEN 2 
    WHEN 'low' THEN 3 
  END,
  vr.requested_at ASC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Update verifier current_assigned count
CREATE OR REPLACE FUNCTION update_verifier_workload()
RETURNS TRIGGER AS $$
BEGIN
  -- Update old assignee's workload if changed
  IF OLD.assigned_to IS NOT NULL AND (NEW.assigned_to IS NULL OR NEW.assigned_to != OLD.assigned_to) THEN
    UPDATE verifier_stats 
    SET current_assigned = GREATEST(0, current_assigned - 1),
        updated_at = NOW()
    WHERE user_id = OLD.assigned_to;
  END IF;
  
  -- Update new assignee's workload if changed
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR NEW.assigned_to != OLD.assigned_to) THEN
    INSERT INTO verifier_stats (user_id, current_assigned)
    VALUES (NEW.assigned_to, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_assigned = verifier_stats.current_assigned + 1,
      updated_at = NOW();
  END IF;
  
  -- When completed, decrement and update stats
  IF NEW.status IN ('completed', 'rejected') AND OLD.status NOT IN ('completed', 'rejected') THEN
    IF NEW.assigned_to IS NOT NULL THEN
      UPDATE verifier_stats 
      SET 
        current_assigned = GREATEST(0, current_assigned - 1),
        total_verifications_completed = total_verifications_completed + 1,
        verifications_passed = verifications_passed + CASE WHEN NEW.verification_result = 'passed' THEN 1 ELSE 0 END,
        verifications_partial = verifications_partial + CASE WHEN NEW.verification_result = 'partial' THEN 1 ELSE 0 END,
        verifications_failed = verifications_failed + CASE WHEN NEW.verification_result = 'failed' THEN 1 ELSE 0 END,
        updated_at = NOW()
      WHERE user_id = NEW.assigned_to;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workload updates
DROP TRIGGER IF EXISTS trigger_verifier_workload ON verification_requests;
CREATE TRIGGER trigger_verifier_workload
  AFTER UPDATE ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_verifier_workload();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_is_verifier ON users(is_verifier) WHERE is_verifier = true;
CREATE INDEX IF NOT EXISTS idx_verification_requests_assigned ON verification_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_requests_status_priority ON verification_requests(status, priority);
