-- Field-Level Verification Schema
-- Enables tracking which specific fields have been verified by which analysts

-- ============================================
-- FIELD VERIFICATION TRACKING
-- ============================================

-- Track individual field verifications
CREATE TABLE IF NOT EXISTS incident_field_verifications (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,  -- 'victim_name', 'incident_date', 'city', etc.
  field_value TEXT,  -- The value at time of verification
  
  -- First verification
  first_verified_by INTEGER REFERENCES users(id),
  first_verified_at TIMESTAMP,
  first_verification_notes TEXT,
  first_verification_source_ids INTEGER[],  -- Array of source IDs supporting this
  
  -- Second verification
  second_verified_by INTEGER REFERENCES users(id),
  second_verified_at TIMESTAMP,
  second_verification_notes TEXT,
  second_verification_source_ids INTEGER[],
  
  -- Status
  verification_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'first_review', 'verified', 'disputed'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(incident_id, field_name)
);

-- Track verification disputes/disagreements
CREATE TABLE IF NOT EXISTS verification_disputes (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  field_name VARCHAR(100),  -- NULL if whole incident dispute
  
  raised_by INTEGER NOT NULL REFERENCES users(id),
  raised_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  dispute_type VARCHAR(50) NOT NULL,  -- 'factual_error', 'missing_source', 'conflicting_info', 'bias_concern'
  description TEXT NOT NULL,
  
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution TEXT,
  resolution_status VARCHAR(20) DEFAULT 'open',  -- 'open', 'resolved', 'escalated'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to incidents table for two-analyst workflow
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS first_verified_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS first_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS first_verification_notes TEXT,
ADD COLUMN IF NOT EXISTS second_verified_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS second_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS second_verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS submitter_role VARCHAR(20);  -- 'guest', 'user', 'analyst', 'admin'

-- Also ensure we have victim_name column (aliased from subject_name in some places)
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS victim_name VARCHAR(200);

-- Copy subject_name to victim_name if it exists
UPDATE incidents SET victim_name = subject_name WHERE victim_name IS NULL AND subject_name IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_field_verif_incident ON incident_field_verifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_field_verif_status ON incident_field_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_field_verif_first ON incident_field_verifications(first_verified_by);
CREATE INDEX IF NOT EXISTS idx_field_verif_second ON incident_field_verifications(second_verified_by);

CREATE INDEX IF NOT EXISTS idx_disputes_incident ON verification_disputes(incident_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON verification_disputes(resolution_status);
CREATE INDEX IF NOT EXISTS idx_disputes_raised ON verification_disputes(raised_by);

CREATE INDEX IF NOT EXISTS idx_incidents_submitted ON incidents(submitted_by);
CREATE INDEX IF NOT EXISTS idx_incidents_first_verif ON incidents(first_verified_by);
CREATE INDEX IF NOT EXISTS idx_incidents_second_verif ON incidents(second_verified_by);
CREATE INDEX IF NOT EXISTS idx_incidents_verif_status ON incidents(verification_status);

-- ============================================
-- VERIFICATION WORKFLOW FUNCTIONS
-- ============================================

-- Function to check if a field can be verified by a given user
CREATE OR REPLACE FUNCTION can_verify_field(
  p_incident_id INTEGER,
  p_field_name VARCHAR(100),
  p_user_id INTEGER
) RETURNS TABLE(can_verify BOOLEAN, reason TEXT, next_step VARCHAR(20)) AS $$
DECLARE
  v_existing RECORD;
  v_incident RECORD;
BEGIN
  -- Get incident info
  SELECT submitted_by, first_verified_by INTO v_incident
  FROM incidents WHERE id = p_incident_id;
  
  -- Get existing field verification
  SELECT * INTO v_existing
  FROM incident_field_verifications
  WHERE incident_id = p_incident_id AND field_name = p_field_name;
  
  -- No existing verification - anyone can do first
  IF v_existing IS NULL THEN
    -- But can't verify your own submission
    IF v_incident.submitted_by = p_user_id THEN
      RETURN QUERY SELECT FALSE, 'Cannot verify your own submission', 'first_review'::VARCHAR(20);
    ELSE
      RETURN QUERY SELECT TRUE, 'Ready for first verification', 'first_review'::VARCHAR(20);
    END IF;
    RETURN;
  END IF;
  
  -- Already fully verified
  IF v_existing.verification_status = 'verified' THEN
    RETURN QUERY SELECT FALSE, 'Field already verified', 'verified'::VARCHAR(20);
    RETURN;
  END IF;
  
  -- Has first verification, needs second
  IF v_existing.verification_status = 'first_review' THEN
    -- Can't verify if you did the first verification
    IF v_existing.first_verified_by = p_user_id THEN
      RETURN QUERY SELECT FALSE, 'Cannot provide second verification - you did the first', 'second_review'::VARCHAR(20);
    ELSE
      RETURN QUERY SELECT TRUE, 'Ready for second verification', 'second_review'::VARCHAR(20);
    END IF;
    RETURN;
  END IF;
  
  -- Pending - same as no verification
  RETURN QUERY SELECT TRUE, 'Ready for first verification', 'first_review'::VARCHAR(20);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View for verification queue with field status
CREATE OR REPLACE VIEW v_verification_queue AS
SELECT 
  i.id,
  i.incident_id,
  i.incident_type,
  i.victim_name,
  COALESCE(i.victim_name, i.subject_name) as display_name,
  i.incident_date,
  i.city,
  i.state,
  i.facility,
  i.summary,
  i.verification_status,
  i.submitted_by,
  i.submitted_at,
  i.submitter_role,
  i.first_verified_by,
  i.first_verified_at,
  i.second_verified_by,
  i.second_verified_at,
  u1.email as submitted_by_email,
  u1.name as submitted_by_name,
  u2.email as first_verified_by_email,
  u2.name as first_verified_by_name,
  u3.email as second_verified_by_email,
  u3.name as second_verified_by_name,
  (SELECT COUNT(*) FROM incident_field_verifications WHERE incident_id = i.id) as total_fields,
  (SELECT COUNT(*) FROM incident_field_verifications WHERE incident_id = i.id AND verification_status = 'verified') as verified_fields,
  (SELECT COUNT(*) FROM incident_field_verifications WHERE incident_id = i.id AND verification_status = 'first_review') as first_review_fields,
  (SELECT COUNT(*) FROM incident_sources WHERE incident_id = i.id) as source_count,
  (SELECT COUNT(*) FROM incident_quotes WHERE incident_id = i.id) as quote_count,
  i.created_at
FROM incidents i
LEFT JOIN users u1 ON i.submitted_by = u1.id
LEFT JOIN users u2 ON i.first_verified_by = u2.id
LEFT JOIN users u3 ON i.second_verified_by = u3.id;

-- View for analyst workload
CREATE OR REPLACE VIEW v_analyst_workload AS
SELECT 
  u.id as analyst_id,
  u.email,
  u.name,
  (SELECT COUNT(*) FROM incidents WHERE first_verified_by = u.id) as first_verifications,
  (SELECT COUNT(*) FROM incidents WHERE second_verified_by = u.id) as second_verifications,
  (SELECT COUNT(*) FROM incident_field_verifications WHERE first_verified_by = u.id) as field_first_verifications,
  (SELECT COUNT(*) FROM incident_field_verifications WHERE second_verified_by = u.id) as field_second_verifications,
  (SELECT COUNT(*) FROM verification_disputes WHERE raised_by = u.id) as disputes_raised,
  (SELECT COUNT(*) FROM verification_disputes WHERE resolved_by = u.id) as disputes_resolved
FROM users u
WHERE u.role IN ('analyst', 'admin', 'editor');
