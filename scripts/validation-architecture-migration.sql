-- Validation Architecture Migration
-- Adds support for two-phase workflow: Review (edit) then Validation (read-only verify)
-- Run this migration to enable the new workflow

-- ============================================
-- Phase 1: Add validation tracking columns to incidents
-- ============================================

-- First validation tracking
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS first_validated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS first_validated_at TIMESTAMP;

-- Second validation tracking  
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS second_validated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS second_validated_at TIMESTAMP;

-- Rejection tracking
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

-- ============================================
-- Phase 2: Create validation_issues table
-- ============================================

CREATE TABLE IF NOT EXISTS validation_issues (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  validation_session_id INTEGER,  -- Groups issues from same validation attempt
  field_type VARCHAR(50) NOT NULL,  -- 'field', 'quote', 'timeline', 'source'
  field_name VARCHAR(100) NOT NULL, -- 'name', 'age', 'timeline_3', 'quote_5', etc.
  issue_reason TEXT NOT NULL,       -- Why it's not validated
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,            -- NULL until fixed in review
  resolved_by INTEGER REFERENCES users(id),
  
  CONSTRAINT valid_field_type CHECK (field_type IN ('field', 'quote', 'timeline', 'source'))
);

-- ============================================
-- Phase 3: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_validation_issues_incident ON validation_issues(incident_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_unresolved ON validation_issues(incident_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_needs_validation ON incidents(verification_status) WHERE verification_status IN ('second_review', 'first_validation');
CREATE INDEX IF NOT EXISTS idx_incidents_rejected ON incidents(verification_status) WHERE verification_status = 'rejected';

-- ============================================
-- Phase 4: Add comments for documentation
-- ============================================

COMMENT ON TABLE validation_issues IS 'Tracks issues found during validation that need fixing in review';
COMMENT ON COLUMN validation_issues.validation_session_id IS 'Groups issues from the same validation attempt for audit trail';
COMMENT ON COLUMN validation_issues.field_type IS 'Type of item: field, quote, timeline, or source';
COMMENT ON COLUMN validation_issues.field_name IS 'Identifier of the specific item (e.g., name, quote_5, timeline_3)';
COMMENT ON COLUMN validation_issues.resolved_at IS 'When this issue was fixed in a subsequent review';

COMMENT ON COLUMN incidents.first_validated_by IS 'User who completed first validation (read-only verification)';
COMMENT ON COLUMN incidents.second_validated_by IS 'User who completed second validation (publishes case)';
COMMENT ON COLUMN incidents.rejection_reason IS 'Reason the case was rejected during validation';
COMMENT ON COLUMN incidents.rejected_by IS 'User who rejected the case';

-- ============================================
-- Phase 5: Update verification_status allowed values
-- ============================================
-- Note: PostgreSQL doesn't enforce enum on VARCHAR, so this is documentation
-- Allowed values: 'pending', 'first_review', 'second_review', 'first_validation', 'verified', 'rejected'

-- Done! Run this to verify:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'incidents' AND column_name LIKE '%validat%' OR column_name LIKE '%reject%';
