-- Migration 017: Media System and Default Field Settings
-- Adds record_media table and record type settings for quotes/sources/media

-- Record Media - for embedded videos, images, documents, etc.
CREATE TABLE IF NOT EXISTS record_media (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Media details
  media_type VARCHAR(50) NOT NULL, -- 'video', 'image', 'audio', 'document', 'embed'
  url VARCHAR(1000) NOT NULL, -- Direct URL to media
  embed_url VARCHAR(1000), -- Embeddable URL (e.g., YouTube embed URL)
  title VARCHAR(500),
  description TEXT,
  
  -- Metadata
  provider VARCHAR(100), -- 'youtube', 'vimeo', 'twitter', 'custom', etc.
  thumbnail_url VARCHAR(1000),
  duration_seconds INTEGER, -- For video/audio
  file_size_bytes BIGINT, -- For uploaded files
  mime_type VARCHAR(100),
  
  -- Linking
  linked_fields TEXT[] DEFAULT '{}', -- Which fields this media supports
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_media_record ON record_media(record_id);
CREATE INDEX IF NOT EXISTS idx_record_media_project ON record_media(project_id);
CREATE INDEX IF NOT EXISTS idx_record_media_type ON record_media(media_type);

-- Add default field settings to record_types
ALTER TABLE record_types 
  ADD COLUMN IF NOT EXISTS use_quotes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_sources BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS use_media BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON TABLE record_media IS 'Stores media attachments (videos, images, audio, documents) for records with embedding support';
COMMENT ON COLUMN record_media.embed_url IS 'Embeddable URL for iframe display (e.g., YouTube embed URL)';
COMMENT ON COLUMN record_media.provider IS 'Media provider: youtube, vimeo, twitter, soundcloud, etc.';
COMMENT ON COLUMN record_types.use_quotes IS 'Enable quotes section for this record type';
COMMENT ON COLUMN record_types.use_sources IS 'Enable sources section for this record type';
COMMENT ON COLUMN record_types.use_media IS 'Enable media attachments for this record type';
