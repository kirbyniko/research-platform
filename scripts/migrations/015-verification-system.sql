-- Migration: 015-verification-system.sql
-- 3rd Party Verification System and Project Workflow Settings
-- Created: 2026-01-22

-- ============================================================================
-- PROJECT WORKFLOW SETTINGS
-- ============================================================================

-- Add project-level workflow settings
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS require_validation BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_different_validator BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS propose_edits_instant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS third_party_verification_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_quota_monthly INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS verification_quota_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_quota_reset_date DATE,
  ADD COLUMN IF NOT EXISTS trust_score DECIMAL(3,2);

-- ============================================================================
-- ROLE-BASED VERIFICATION PERMISSIONS
-- ============================================================================

-- Add verification permissions to project members
ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS can_propose_edits BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_bypass_different_validator BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_request_verification BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_quota_override INTEGER;

COMMENT ON COLUMN project_members.can_propose_edits IS 'Whether this member can propose edits to verified records';
COMMENT ON COLUMN project_members.can_bypass_different_validator IS 'Whether this member can validate their own reviewed records';
COMMENT ON COLUMN project_members.can_request_verification IS 'Whether this member can request 3rd party verification';
COMMENT ON COLUMN project_members.verification_quota_override IS 'Custom verification quota for this member (null = use project quota)';

-- ============================================================================
-- RECORD TYPE SOURCE/QUOTE REQUIREMENTS (extend 014)
-- ============================================================================

ALTER TABLE record_types
  ADD COLUMN IF NOT EXISTS require_at_least_one_source BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_primary_source BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS minimum_sources INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_quotes INTEGER DEFAULT 0;

-- ============================================================================
-- FIELD DEFINITION SOURCE REQUIREMENTS
-- ============================================================================

ALTER TABLE field_definitions
  ADD COLUMN IF NOT EXISTS requires_source BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_primary_source BOOLEAN DEFAULT false;

-- ============================================================================
-- ENHANCED SOURCE CLASSIFICATION
-- ============================================================================

-- Add source type classification to record_sources
ALTER TABLE record_sources
  ADD COLUMN IF NOT EXISTS source_type_classification VARCHAR(20) DEFAULT 'secondary',
  ADD COLUMN IF NOT EXISTS source_category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS publication VARCHAR(255),
  ADD COLUMN IF NOT EXISTS author VARCHAR(255),
  ADD COLUMN IF NOT EXISTS publication_date DATE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS linked_quote_ids INTEGER[] DEFAULT '{}';

-- Add source linking to quotes
ALTER TABLE record_quotes
  ADD COLUMN IF NOT EXISTS source_id INTEGER REFERENCES record_sources(id);

COMMENT ON COLUMN record_sources.source_type_classification IS 'primary, secondary, or tertiary';
COMMENT ON COLUMN record_sources.source_category IS 'official_document, news_article, press_release, academic_paper, witness_statement, social_media, internal_record, archive, other';

-- ============================================================================
-- RECORD VERIFICATION TRACKING
-- ============================================================================

ALTER TABLE records
  ADD COLUMN IF NOT EXISTS verification_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_scope VARCHAR(20),
  ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_data_hash TEXT;

COMMENT ON COLUMN records.verification_level IS '0: unverified, 1: self-verified, 2: audit-ready, 3: third-party-verified';
COMMENT ON COLUMN records.verification_scope IS 'NULL, data (individual items), or record (blanket verification)';
COMMENT ON COLUMN records.verified_data_hash IS 'Hash of record data at verification time - used to detect any changes for record-level verification';

-- ============================================================================
-- VERIFICATION REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  
  -- Request info
  requested_by INTEGER NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  priority VARCHAR(20) DEFAULT 'normal',
  request_notes TEXT,
  
  -- What to verify
  verification_scope VARCHAR(20) NOT NULL DEFAULT 'record',
  items_to_verify JSONB,
  
  -- Assignment
  assigned_to INTEGER REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status: pending, in_progress, completed, rejected, needs_revision
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Results
  completed_at TIMESTAMPTZ,
  verification_result VARCHAR(20),
  verifier_notes TEXT,
  rejection_reason TEXT,
  issues_found JSONB,
  
  -- Billing
  billed BOOLEAN DEFAULT false,
  billing_amount DECIMAL(10,2)
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_project ON verification_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_record ON verification_requests(record_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_assigned ON verification_requests(assigned_to);

COMMENT ON COLUMN verification_requests.verification_scope IS 'record = verify entire record, data = verify specific items';
COMMENT ON COLUMN verification_requests.items_to_verify IS 'For data-level: [{type: "field"|"quote"|"source", id: number, field_slug: string}]';
COMMENT ON COLUMN verification_requests.verification_result IS 'passed, failed, or partial';

-- ============================================================================
-- VERIFICATION RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_results (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  
  -- What was verified
  item_type VARCHAR(20) NOT NULL,
  item_id INTEGER,
  field_slug VARCHAR(100),
  
  -- Result
  verified BOOLEAN NOT NULL,
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  verified_by INTEGER NOT NULL REFERENCES users(id),
  
  -- Verifier notes (always allowed - success or failure)
  notes TEXT,
  caveats TEXT,
  issues TEXT[],
  
  -- Invalidation tracking
  invalidated_at TIMESTAMPTZ,
  invalidated_reason TEXT,
  invalidated_by_change_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_verification_results_request ON verification_results(request_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_item ON verification_results(item_type, item_id);

COMMENT ON COLUMN verification_results.item_type IS 'field, quote, source, or record';
COMMENT ON COLUMN verification_results.notes IS 'Verifier notes explaining the decision';
COMMENT ON COLUMN verification_results.caveats IS 'Warnings or conditions even if verified';
COMMENT ON COLUMN verification_results.invalidated_by_change_id IS 'Reference to the change that invalidated this verification';

-- ============================================================================
-- VERIFICATION HISTORY (AUDIT LOG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_history (
  id SERIAL PRIMARY KEY,
  verification_result_id INTEGER REFERENCES verification_results(id),
  record_id INTEGER NOT NULL REFERENCES records(id),
  
  -- What happened
  action VARCHAR(50) NOT NULL,
  -- verified, invalidated, re_verified, verification_requested, verification_rejected
  
  -- Details
  details JSONB,
  performed_by INTEGER REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_history_record ON verification_history(record_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_result ON verification_history(verification_result_id);

-- ============================================================================
-- HELPER FUNCTION: Calculate Data Hash for Record-Level Verification
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_record_data_hash(p_record_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_hash TEXT;
  v_data JSONB;
BEGIN
  -- Collect all data that should invalidate verification if changed
  SELECT jsonb_build_object(
    'data', r.data,
    'quotes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rq.id,
        'quote_text', rq.quote_text,
        'source', rq.source,
        'source_url', rq.source_url,
        'source_id', rq.source_id,
        'linked_fields', rq.linked_fields
      ) ORDER BY rq.id)
      FROM record_quotes rq WHERE rq.record_id = p_record_id
    ), '[]'),
    'sources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'url', rs.url,
        'title', rs.title,
        'source_type', rs.source_type,
        'source_type_classification', rs.source_type_classification,
        'notes', rs.notes,
        'linked_fields', rs.linked_fields
      ) ORDER BY rs.id)
      FROM record_sources rs WHERE rs.record_id = p_record_id
    ), '[]')
  ) INTO v_data
  FROM records r WHERE r.id = p_record_id;
  
  -- Create MD5 hash of the data
  v_hash := md5(v_data::text);
  
  RETURN v_hash;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Invalidate Record-Level Verification on Any Change
-- ============================================================================

CREATE OR REPLACE FUNCTION invalidate_record_verification()
RETURNS TRIGGER AS $$
DECLARE
  v_record_id INTEGER;
  v_current_hash TEXT;
  v_stored_hash TEXT;
BEGIN
  -- Get the record ID based on which table was modified
  IF TG_TABLE_NAME = 'records' THEN
    v_record_id := NEW.id;
  ELSIF TG_TABLE_NAME IN ('record_quotes', 'record_sources') THEN
    v_record_id := NEW.record_id;
  END IF;
  
  -- Get stored hash for record-level verification
  SELECT verified_data_hash INTO v_stored_hash
  FROM records
  WHERE id = v_record_id
    AND verification_level = 3
    AND verification_scope = 'record';
  
  -- If no record-level verification, nothing to invalidate
  IF v_stored_hash IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate current hash
  v_current_hash := calculate_record_data_hash(v_record_id);
  
  -- If hash changed, invalidate the verification
  IF v_current_hash != v_stored_hash THEN
    UPDATE records
    SET 
      verification_level = 1, -- Demote to self-verified
      verification_scope = NULL,
      verified_data_hash = NULL
    WHERE id = v_record_id;
    
    -- Log the invalidation
    INSERT INTO verification_history (record_id, action, details, performed_at)
    VALUES (
      v_record_id,
      'invalidated',
      jsonb_build_object(
        'reason', 'Record data changed after record-level verification',
        'table', TG_TABLE_NAME,
        'operation', TG_OP
      ),
      NOW()
    );
    
    -- Invalidate all verification results for this record
    UPDATE verification_results vr
    SET 
      invalidated_at = NOW(),
      invalidated_reason = 'Record data changed (record-level verification)'
    FROM verification_requests req
    WHERE vr.request_id = req.id
      AND req.record_id = v_record_id
      AND vr.invalidated_at IS NULL
      AND req.verification_scope = 'record';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for record-level verification invalidation
DROP TRIGGER IF EXISTS trg_invalidate_record_verification_on_record ON records;
CREATE TRIGGER trg_invalidate_record_verification_on_record
  AFTER UPDATE ON records
  FOR EACH ROW
  WHEN (OLD.data IS DISTINCT FROM NEW.data)
  EXECUTE FUNCTION invalidate_record_verification();

DROP TRIGGER IF EXISTS trg_invalidate_record_verification_on_quote ON record_quotes;
CREATE TRIGGER trg_invalidate_record_verification_on_quote
  AFTER INSERT OR UPDATE OR DELETE ON record_quotes
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_record_verification();

DROP TRIGGER IF EXISTS trg_invalidate_record_verification_on_source ON record_sources;
CREATE TRIGGER trg_invalidate_record_verification_on_source
  AFTER INSERT OR UPDATE OR DELETE ON record_sources
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_record_verification();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE verification_requests IS 'Requests for 3rd party verification of records or data items';
COMMENT ON TABLE verification_results IS 'Individual verification results for each item in a verification request';
COMMENT ON TABLE verification_history IS 'Audit log of all verification actions';
