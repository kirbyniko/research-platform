-- Migration: 019 - Display Templates System
-- Purpose: Allow users to create custom visual layouts for record display
-- Date: 2026-01-23

-- =====================================================
-- DISPLAY TEMPLATES TABLE
-- =====================================================
-- Templates define how records are visually arranged and styled
-- Can be applied at record-type level (default for all records of that type)
-- Or at individual record level (override for specific record)

CREATE TABLE IF NOT EXISTS display_templates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Scope: Either record_type_id (for all records of type) OR record_id (for specific record)
  record_type_id INTEGER REFERENCES record_types(id) ON DELETE CASCADE,
  record_id INTEGER REFERENCES records(id) ON DELETE CASCADE,
  
  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- The template definition (layout, styles, field arrangements)
  -- Schema defined in TypeScript: DisplayTemplate interface
  template JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Is this the default template for the record type?
  -- Only one default per record type
  is_default BOOLEAN DEFAULT false,
  
  -- For AI-generated templates, store the original prompt
  ai_prompt TEXT,
  
  -- Audit fields
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Template must be for either a record type OR a specific record, not both or neither
  CONSTRAINT template_scope_check CHECK (
    (record_type_id IS NOT NULL AND record_id IS NULL) OR
    (record_type_id IS NULL AND record_id IS NOT NULL)
  )
);

-- Only one default template per record type
CREATE UNIQUE INDEX IF NOT EXISTS idx_display_templates_default 
  ON display_templates(record_type_id) 
  WHERE is_default = true AND record_type_id IS NOT NULL;

-- Quick lookup by record type
CREATE INDEX IF NOT EXISTS idx_display_templates_record_type 
  ON display_templates(record_type_id) 
  WHERE record_type_id IS NOT NULL;

-- Quick lookup by specific record
CREATE INDEX IF NOT EXISTS idx_display_templates_record 
  ON display_templates(record_id) 
  WHERE record_id IS NOT NULL;

-- Index for project-level queries
CREATE INDEX IF NOT EXISTS idx_display_templates_project 
  ON display_templates(project_id);

-- =====================================================
-- PERMISSION: Manage Appearances
-- =====================================================
-- Add permission column to project_members for template management

ALTER TABLE project_members 
ADD COLUMN IF NOT EXISTS can_manage_appearances BOOLEAN DEFAULT false;

-- Owners and admins should have this permission by default
UPDATE project_members 
SET can_manage_appearances = true 
WHERE role IN ('owner', 'admin');

-- =====================================================
-- MEDIA FIELD CONFIG
-- =====================================================
-- Add config options specific to media field type
-- These are stored in field_definitions.config JSONB

COMMENT ON COLUMN field_definitions.config IS 'Field-specific configuration. For media type: { accept?: string[], maxFiles?: number, maxSizeBytes?: number, displayMode?: "thumbnail"|"card"|"gallery"|"hero" }';

-- =====================================================
-- TRIGGER: Update timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_display_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS display_templates_updated_at ON display_templates;
CREATE TRIGGER display_templates_updated_at
  BEFORE UPDATE ON display_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_display_template_timestamp();
