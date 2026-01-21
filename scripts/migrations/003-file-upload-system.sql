-- File Upload System Migration
-- Created: January 21, 2026
-- Part of: Research Platform file storage feature

-- ============================================
-- STORAGE PLANS (Subscription tiers)
-- ============================================
CREATE TABLE IF NOT EXISTS storage_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- "Free", "Starter", "Pro", "Enterprise"
  slug VARCHAR(50) NOT NULL UNIQUE,
  storage_limit_bytes BIGINT NOT NULL,  -- Max storage in bytes
  bandwidth_limit_bytes BIGINT,         -- Monthly bandwidth limit (optional)
  max_file_size_bytes BIGINT NOT NULL,  -- Max single file size
  price_cents INTEGER DEFAULT 0,        -- Monthly price in cents (0 for free)
  features JSONB DEFAULT '{}',          -- Additional features
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default plans
INSERT INTO storage_plans (name, slug, storage_limit_bytes, bandwidth_limit_bytes, max_file_size_bytes, price_cents, sort_order, features)
VALUES 
  ('Free', 'free', 0, 0, 0, 0, 0, '{"uploads_enabled": false}'),
  ('Starter', 'starter', 5368709120, 53687091200, 26214400, 1000, 1, '{"uploads_enabled": true}'),  -- 5GB storage, 50GB bandwidth, 25MB max file
  ('Pro', 'pro', 53687091200, 536870912000, 104857600, 5000, 2, '{"uploads_enabled": true}'),       -- 50GB storage, 500GB bandwidth, 100MB max file
  ('Enterprise', 'enterprise', 536870912000, 5368709120000, 524288000, 20000, 3, '{"uploads_enabled": true}')  -- 500GB storage, 5TB bandwidth, 500MB max file
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PROJECT SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS project_subscriptions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES storage_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, expired, past_due
  storage_limit_override_bytes BIGINT,          -- Custom limit if negotiated
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  stripe_subscription_id VARCHAR(255),          -- External billing reference
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id)
);

-- ============================================
-- STORAGE USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS project_storage_usage (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bytes_used BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id)
);

-- Monthly bandwidth tracking
CREATE TABLE IF NOT EXISTS project_bandwidth_usage (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  bytes_uploaded BIGINT NOT NULL DEFAULT 0,
  bytes_downloaded BIGINT NOT NULL DEFAULT 0,
  UNIQUE(project_id, period_start)
);

-- ============================================
-- PROJECT FILES (uploaded files metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS project_files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_id INTEGER REFERENCES records(id) ON DELETE SET NULL,  -- Optional link to record
  field_slug VARCHAR(255),                    -- Which field this file belongs to
  
  -- File info
  filename VARCHAR(500) NOT NULL,             -- Stored filename (may include UUID)
  original_filename VARCHAR(500) NOT NULL,    -- User's original filename
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  
  -- Storage location (Cloudflare R2)
  storage_key VARCHAR(1000) NOT NULL,         -- R2 object key
  storage_bucket VARCHAR(255) NOT NULL,
  cdn_url VARCHAR(2000),                      -- Public CDN URL if applicable
  
  -- Metadata
  width INTEGER,                              -- For images
  height INTEGER,                             -- For images
  duration_seconds NUMERIC,                   -- For video/audio
  checksum VARCHAR(64),                       -- SHA-256 hash
  metadata JSONB DEFAULT '{}',                -- Additional metadata
  
  -- Upload info
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_guest_upload BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',       -- pending, active, deleted, quarantined
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id)
);

-- ============================================
-- UPLOAD PERMISSIONS (extend project_members)
-- ============================================
ALTER TABLE project_members 
  ADD COLUMN IF NOT EXISTS can_upload BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS upload_quota_bytes BIGINT;  -- NULL = unlimited (within project quota)

-- Add guest upload settings to projects
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS guest_upload_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_upload_quota_bytes BIGINT DEFAULT 10485760,  -- 10MB default
  ADD COLUMN IF NOT EXISTS guest_upload_max_file_size BIGINT DEFAULT 5242880; -- 5MB default

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_record ON project_files(record_id);
CREATE INDEX IF NOT EXISTS idx_project_files_status ON project_files(status);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_at ON project_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_project ON project_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_status ON project_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_project_bandwidth_period ON project_bandwidth_usage(project_id, period_start);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE storage_plans IS 'Subscription tiers defining storage/bandwidth limits';
COMMENT ON TABLE project_subscriptions IS 'Links projects to their storage subscription plan';
COMMENT ON TABLE project_storage_usage IS 'Current storage usage per project';
COMMENT ON TABLE project_bandwidth_usage IS 'Monthly bandwidth tracking per project';
COMMENT ON TABLE project_files IS 'Metadata for all uploaded files';
COMMENT ON COLUMN project_files.status IS 'pending: awaiting confirmation, active: available, deleted: soft-deleted, quarantined: flagged';
COMMENT ON COLUMN project_members.can_upload IS 'Whether this member can upload files';
COMMENT ON COLUMN project_members.upload_quota_bytes IS 'Per-user upload quota (NULL = project limit)';
