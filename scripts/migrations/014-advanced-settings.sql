-- Migration: 014-advanced-settings.sql
-- Advanced project and record type settings for form customization

-- ============================================================================
-- Record Type Advanced Settings
-- ============================================================================

-- Guest form mode: how the guest form is configured
-- 'custom' = manually select fields with show_in_guest_form
-- 'mirror_review' = automatically show all review form fields
-- 'disabled' = no guest form for this type
ALTER TABLE record_types
  ADD COLUMN IF NOT EXISTS guest_form_mode VARCHAR(20) DEFAULT 'custom';

-- Allow analysts to skip guest form and go directly to review form
ALTER TABLE record_types
  ADD COLUMN IF NOT EXISTS analyst_can_skip_guest_form BOOLEAN DEFAULT true;

-- Quote requirements
ALTER TABLE record_types
  ADD COLUMN IF NOT EXISTS require_quotes_for_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_sources_for_quotes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_quote_requirement_bypass BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quote_bypass_roles TEXT[] DEFAULT '{}';

-- Validation requirements
ALTER TABLE record_types
  ADD COLUMN IF NOT EXISTS require_all_fields_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_validation_bypass BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_bypass_roles TEXT[] DEFAULT '{}';

-- Extensible settings JSONB
ALTER TABLE record_types
  ADD COLUMN IF NOT EXISTS type_settings JSONB DEFAULT '{}';

-- ============================================================================
-- Field Definition Enhancements
-- ============================================================================

-- Require source when quote is linked
ALTER TABLE field_definitions
  ADD COLUMN IF NOT EXISTS requires_source_for_quote BOOLEAN DEFAULT false;

-- Field must be verified before record can be published
ALTER TABLE field_definitions
  ADD COLUMN IF NOT EXISTS require_verified_for_publish BOOLEAN DEFAULT true;

-- ============================================================================
-- Database Usage Tracking
-- ============================================================================

-- Add database usage columns to storage tracking
ALTER TABLE project_storage_usage
  ADD COLUMN IF NOT EXISTS database_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS record_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS field_count INTEGER DEFAULT 0;

-- ============================================================================
-- User Storage Limits
-- ============================================================================

-- Add storage quota to users (1GB = 1073741824 bytes default)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT DEFAULT 1073741824,
  ADD COLUMN IF NOT EXISTS total_storage_used_bytes BIGINT DEFAULT 0;

-- ============================================================================
-- Helper Function: Calculate Database Usage
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_project_database_usage(p_project_id INTEGER)
RETURNS TABLE(
  total_bytes BIGINT, 
  record_count INTEGER, 
  field_count INTEGER,
  quote_count INTEGER,
  source_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total bytes from records, quotes, sources
    (
      COALESCE((SELECT SUM(pg_column_size(r.*)) FROM records r WHERE r.project_id = p_project_id AND r.deleted_at IS NULL), 0)::BIGINT +
      COALESCE((SELECT SUM(pg_column_size(rq.*)) FROM record_quotes rq JOIN records r ON rq.record_id = r.id WHERE r.project_id = p_project_id AND r.deleted_at IS NULL), 0)::BIGINT +
      COALESCE((SELECT SUM(pg_column_size(rs.*)) FROM record_sources rs JOIN records r ON rs.record_id = r.id WHERE r.project_id = p_project_id AND r.deleted_at IS NULL), 0)::BIGINT
    ) AS total_bytes,
    
    -- Record count
    (SELECT COUNT(*)::INTEGER FROM records WHERE project_id = p_project_id AND deleted_at IS NULL) AS record_count,
    
    -- Field definition count
    (SELECT COUNT(*)::INTEGER FROM field_definitions fd 
     JOIN record_types rt ON fd.record_type_id = rt.id 
     WHERE rt.project_id = p_project_id) AS field_count,
    
    -- Quote count
    (SELECT COUNT(*)::INTEGER FROM record_quotes rq 
     JOIN records r ON rq.record_id = r.id 
     WHERE r.project_id = p_project_id AND r.deleted_at IS NULL) AS quote_count,
    
    -- Source count
    (SELECT COUNT(*)::INTEGER FROM record_sources rs 
     JOIN records r ON rs.record_id = r.id 
     WHERE r.project_id = p_project_id AND r.deleted_at IS NULL) AS source_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Function: Update Project Storage Usage
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_storage_usage(p_project_id INTEGER)
RETURNS void AS $$
DECLARE
  usage RECORD;
BEGIN
  SELECT * INTO usage FROM calculate_project_database_usage(p_project_id);
  
  INSERT INTO project_storage_usage (project_id, database_bytes, record_count, field_count, updated_at)
  VALUES (p_project_id, usage.total_bytes, usage.record_count, usage.field_count, NOW())
  ON CONFLICT (project_id) 
  DO UPDATE SET 
    database_bytes = usage.total_bytes,
    record_count = usage.record_count,
    field_count = usage.field_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON COLUMN record_types.guest_form_mode IS 'How guest form fields are configured: custom, mirror_review, or disabled';
COMMENT ON COLUMN record_types.analyst_can_skip_guest_form IS 'Whether analysts can submit directly via review form';
COMMENT ON COLUMN record_types.require_quotes_for_review IS 'All fields must have linked quotes before passing review';
COMMENT ON COLUMN record_types.require_sources_for_quotes IS 'All quotes must have sources attached';
COMMENT ON COLUMN record_types.allow_quote_requirement_bypass IS 'Allow certain roles to bypass quote requirements';
COMMENT ON COLUMN record_types.quote_bypass_roles IS 'Array of roles that can bypass quote requirements';
COMMENT ON COLUMN record_types.require_all_fields_verified IS 'All fields must be verified before publishing';
COMMENT ON COLUMN record_types.allow_validation_bypass IS 'Allow certain roles to bypass validation requirements';
COMMENT ON COLUMN record_types.validation_bypass_roles IS 'Array of roles that can bypass validation requirements';
COMMENT ON COLUMN field_definitions.requires_source_for_quote IS 'Quotes linked to this field must have a source';
COMMENT ON COLUMN field_definitions.require_verified_for_publish IS 'This field must be verified before record can be published';
