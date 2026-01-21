-- Project Tags System Migration
-- Created: January 21, 2026

-- Project-level tags (shared across all record types in a project)
CREATE TABLE IF NOT EXISTS project_tags (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  category VARCHAR(100),           -- Optional grouping (e.g., "Incident Type", "Demographics")
  color VARCHAR(7) DEFAULT '#6b7280',  -- Hex color for display
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  UNIQUE(project_id, slug)
);

-- Junction table for tags on records
CREATE TABLE IF NOT EXISTS record_tags (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES project_tags(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER REFERENCES users(id),
  UNIQUE(record_id, tag_id)
);

-- Add tags_enabled setting to projects (default true)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags_enabled BOOLEAN DEFAULT true;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_record_tags_record ON record_tags(record_id);
CREATE INDEX IF NOT EXISTS idx_record_tags_tag ON record_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_category ON project_tags(project_id, category);

-- Comments for documentation
COMMENT ON TABLE project_tags IS 'Project-level tags that can be applied to any record in the project';
COMMENT ON TABLE record_tags IS 'Junction table linking tags to records';
COMMENT ON COLUMN project_tags.category IS 'Optional grouping for organizing tags in the UI';
COMMENT ON COLUMN project_tags.color IS 'Hex color code for tag badge display';
