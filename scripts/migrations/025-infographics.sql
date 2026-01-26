-- Migration 025: Infographics System
-- Allows creation of interactive visualizations from record data

-- Infographic definitions
CREATE TABLE IF NOT EXISTS infographics (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Data scope - what data this infographic visualizes
  scope_type VARCHAR(50) NOT NULL CHECK (scope_type IN ('record', 'record_type', 'project')),
  record_id INTEGER REFERENCES records(id) ON DELETE CASCADE,  -- if scope_type = 'record'
  record_type_id INTEGER REFERENCES record_types(id) ON DELETE CASCADE,  -- if scope_type = 'record_type'
  -- if scope_type = 'project', uses project_id
  
  -- The component type and configuration (validated JSON)
  component_type VARCHAR(50) NOT NULL, -- 'dot-grid', 'scrollytelling', 'counter', 'comparison', 'timeline'
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Narrative content (rich text / markdown for storytelling)
  narrative_content JSONB DEFAULT '[]', -- Array of narrative blocks with text/positioning
  
  -- Publishing & visibility
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  is_public BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Verification (like records)
  verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'disputed')),
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  
  -- Embed settings
  allow_embed BOOLEAN DEFAULT true,
  embed_domains TEXT[], -- whitelist, null = any domain allowed
  
  -- Metadata
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(project_id, slug)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_infographics_project ON infographics(project_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_infographics_scope ON infographics(scope_type, record_type_id, record_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_infographics_public ON infographics(is_public, status) WHERE deleted_at IS NULL AND is_public = true;

-- Track data dependencies for cache invalidation
CREATE TABLE IF NOT EXISTS infographic_data_sources (
  id SERIAL PRIMARY KEY,
  infographic_id INTEGER NOT NULL REFERENCES infographics(id) ON DELETE CASCADE,
  record_type_id INTEGER NOT NULL REFERENCES record_types(id) ON DELETE CASCADE,
  filter_config JSONB, -- Optional: specific filters applied to this data source
  aggregation_type VARCHAR(50), -- 'count', 'sum', 'average', etc.
  aggregation_field VARCHAR(255), -- Which field to aggregate
  group_by_field VARCHAR(255), -- Which field to group by
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(infographic_id, record_type_id, aggregation_type, aggregation_field, group_by_field)
);

-- Infographic versions for history/verification
CREATE TABLE IF NOT EXISTS infographic_versions (
  id SERIAL PRIMARY KEY,
  infographic_id INTEGER NOT NULL REFERENCES infographics(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  config JSONB NOT NULL,
  narrative_content JSONB,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  change_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(infographic_id, version_number)
);

-- Comments/feedback on infographics (for verification workflow)
CREATE TABLE IF NOT EXISTS infographic_comments (
  id SERIAL PRIMARY KEY,
  infographic_id INTEGER NOT NULL REFERENCES infographics(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'general' CHECK (comment_type IN ('general', 'verification', 'suggestion', 'issue')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_infographic_comments ON infographic_comments(infographic_id) WHERE is_resolved = false;

-- Add infographic permissions to project_members
-- These should be added to the existing permissions array or we add specific columns
-- For now, let's track if they can: view_infographics, create_infographics, edit_infographics, publish_infographics, verify_infographics

-- We'll handle permissions through the existing role system + specific permission checks
-- Permissions mapping:
-- viewer: can view public infographics
-- contributor: can create infographics (draft only)
-- editor: can edit infographics, submit for review
-- admin: can publish infographics, verify
-- owner: all permissions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_infographic_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_infographic_updated_at ON infographics;
CREATE TRIGGER trigger_infographic_updated_at
  BEFORE UPDATE ON infographics
  FOR EACH ROW
  EXECUTE FUNCTION update_infographic_updated_at();

-- Add sample component type configurations as comments for reference
COMMENT ON COLUMN infographics.component_type IS 'Valid types: dot-grid, scrollytelling, counter, comparison, timeline, bar-chart, map';

COMMENT ON COLUMN infographics.config IS 'Component-specific configuration. Example for dot-grid:
{
  "dotSize": 8,
  "dotColor": "#dc2626",
  "dotSpacing": 4,
  "animationType": "scatter-in",
  "groupBy": "year",
  "legend": { "show": true, "position": "bottom" }
}';

COMMENT ON COLUMN infographics.narrative_content IS 'Array of narrative blocks:
[
  { "id": "intro", "text": "Since 2003...", "position": "top", "style": {} },
  { "id": "scene-1", "text": "Each dot represents...", "trigger": "scroll", "style": {} }
]';
