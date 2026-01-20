-- =====================================================
-- RESEARCH PLATFORM SCHEMA MIGRATION
-- Version: 001
-- Description: Core tables for generalized research platform
-- =====================================================

-- Projects table - top-level containers for investigations
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Record Types - dynamic form types per project (replaces hardcoded incidents/statements)
CREATE TABLE IF NOT EXISTS record_types (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_plural VARCHAR(255),
  icon VARCHAR(50),
  description TEXT,
  color VARCHAR(20),
  
  -- Form workflow settings
  guest_form_enabled BOOLEAN DEFAULT true,
  requires_review BOOLEAN DEFAULT true,
  requires_validation BOOLEAN DEFAULT true,
  
  -- Display ordering
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_record_types_project ON record_types(project_id);

-- Field Groups - organize fields into collapsible sections
CREATE TABLE IF NOT EXISTS field_groups (
  id SERIAL PRIMARY KEY,
  record_type_id INTEGER NOT NULL REFERENCES record_types(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  collapsed_by_default BOOLEAN DEFAULT false,
  
  UNIQUE(record_type_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_field_groups_record_type ON field_groups(record_type_id);

-- Field Definitions - the schema for each record type
CREATE TABLE IF NOT EXISTS field_definitions (
  id SERIAL PRIMARY KEY,
  record_type_id INTEGER NOT NULL REFERENCES record_types(id) ON DELETE CASCADE,
  field_group_id INTEGER REFERENCES field_groups(id) ON DELETE SET NULL,
  
  -- Field identity
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  placeholder TEXT,
  
  -- Field type: text, textarea, number, date, datetime, boolean, 
  --             select, multi_select, radio, checkbox_group,
  --             url, email, location, person, file, rich_text,
  --             record_link, user_link
  field_type VARCHAR(50) NOT NULL,
  
  -- Type-specific configuration (options for select, min/max for numbers, etc.)
  config JSONB DEFAULT '{}',
  
  -- Default value (stored as JSONB to handle any type)
  default_value JSONB,
  
  -- Validation settings
  is_required BOOLEAN DEFAULT false,
  requires_quote BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '{}',
  
  -- Form visibility
  show_in_guest_form BOOLEAN DEFAULT false,
  show_in_review_form BOOLEAN DEFAULT true,
  show_in_validation_form BOOLEAN DEFAULT true,
  show_in_public_view BOOLEAN DEFAULT true,
  show_in_list_view BOOLEAN DEFAULT false,
  
  -- Display settings
  sort_order INTEGER DEFAULT 0,
  width VARCHAR(20) DEFAULT 'full',  -- full, half, third
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(record_type_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_field_definitions_record_type ON field_definitions(record_type_id);
CREATE INDEX IF NOT EXISTS idx_field_definitions_group ON field_definitions(field_group_id);

-- Generic Records - replaces incidents, statements tables
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  record_type_id INTEGER NOT NULL REFERENCES record_types(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- All field data stored as JSONB
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Workflow status
  status VARCHAR(50) DEFAULT 'pending_review',
  -- Values: pending_review, pending_validation, verified, rejected, archived
  
  -- Verification tracking: {field_slug: {verified: boolean, by: user_id, at: timestamp}}
  verified_fields JSONB DEFAULT '{}',
  
  -- Submission tracking
  submitted_by INTEGER REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id),
  validated_by INTEGER REFERENCES users(id),
  
  -- Guest submission info
  is_guest_submission BOOLEAN DEFAULT false,
  guest_email VARCHAR(255),
  guest_name VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_records_project ON records(project_id);
CREATE INDEX IF NOT EXISTS idx_records_record_type ON records(record_type_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC);

-- Record Quotes - generic version of incident_quotes
CREATE TABLE IF NOT EXISTS record_quotes (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  quote_text TEXT NOT NULL,
  source VARCHAR(500),
  source_url VARCHAR(1000),
  source_date DATE,
  source_type VARCHAR(100),
  
  -- Which fields this quote supports
  linked_fields TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_quotes_record ON record_quotes(record_id);
CREATE INDEX IF NOT EXISTS idx_record_quotes_project ON record_quotes(project_id);

-- Record Sources - generic version of incident_sources  
CREATE TABLE IF NOT EXISTS record_sources (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  url VARCHAR(1000) NOT NULL,
  title VARCHAR(500),
  source_type VARCHAR(100),
  accessed_date DATE,
  archived_url VARCHAR(1000),
  notes TEXT,
  
  linked_fields TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_sources_record ON record_sources(record_id);
CREATE INDEX IF NOT EXISTS idx_record_sources_project ON record_sources(project_id);

-- Record Proposed Changes - for edit review workflow
CREATE TABLE IF NOT EXISTS record_proposed_changes (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_type_id INTEGER NOT NULL REFERENCES record_types(id),
  
  proposed_data JSONB NOT NULL,
  changed_fields TEXT[] DEFAULT '{}',
  
  status VARCHAR(50) DEFAULT 'pending_review',
  -- Values: pending_review, pending_validation, approved, rejected
  
  submitted_by INTEGER REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id),
  
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Validation checkboxes state
  validated_fields JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_record_proposed_changes_record ON record_proposed_changes(record_id);
CREATE INDEX IF NOT EXISTS idx_record_proposed_changes_project ON record_proposed_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_record_proposed_changes_status ON record_proposed_changes(status);

-- Project Members - team membership with roles
CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role: owner, admin, reviewer, validator, analyst, viewer
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  
  -- Granular permission overrides
  permissions JSONB DEFAULT '{}',
  
  invited_by INTEGER REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- Project API Keys - for extension authentication
CREATE TABLE IF NOT EXISTS project_api_keys (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,  -- First chars for identification
  name VARCHAR(100),
  
  -- Permissions scope
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_api_keys_project ON project_api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_project_api_keys_user ON project_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_project_api_keys_hash ON project_api_keys(key_hash);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's projects with their role
CREATE OR REPLACE FUNCTION get_user_projects(p_user_id INTEGER)
RETURNS TABLE (
  project_id INTEGER,
  project_slug VARCHAR,
  project_name VARCHAR,
  role VARCHAR,
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.slug,
    p.name,
    pm.role,
    (p.created_by = p_user_id) as is_owner
  FROM projects p
  LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = p_user_id
  WHERE p.deleted_at IS NULL
    AND (p.created_by = p_user_id OR pm.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission for project action
CREATE OR REPLACE FUNCTION user_has_project_permission(
  p_user_id INTEGER,
  p_project_id INTEGER,
  p_permission VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR;
  v_is_owner BOOLEAN;
BEGIN
  -- Check if owner
  SELECT (created_by = p_user_id) INTO v_is_owner
  FROM projects WHERE id = p_project_id;
  
  IF v_is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Get role
  SELECT role INTO v_role
  FROM project_members
  WHERE project_id = p_project_id AND user_id = p_user_id;
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permission based on role
  RETURN CASE v_role
    WHEN 'admin' THEN TRUE
    WHEN 'reviewer' THEN p_permission IN ('view', 'review', 'analyze')
    WHEN 'validator' THEN p_permission IN ('view', 'validate')
    WHEN 'analyst' THEN p_permission IN ('view', 'analyze')
    WHEN 'viewer' THEN p_permission = 'view'
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql;
