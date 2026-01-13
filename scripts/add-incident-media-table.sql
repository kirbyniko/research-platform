-- Incident Media Schema
-- Stores image and video links that serve as evidence/sources themselves
-- These do NOT require quote verification

-- ============================================
-- MEDIA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS incident_media (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  
  -- Media info
  url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL,  -- 'image', 'video'
  
  -- Metadata
  title TEXT,                        -- Optional caption/title
  description TEXT,                  -- What the media shows
  credit TEXT,                       -- Photo/video credit/attribution
  license TEXT,                      -- e.g., 'public_domain', 'cc_by', 'fair_use', 'unknown'
  
  -- Source info (where the media was found)
  source_url TEXT,                   -- Page where media was found (if different from direct URL)
  source_publication VARCHAR(200),   -- e.g., "Associated Press", "Reuters"
  
  -- Timestamps
  media_date DATE,                   -- When the photo/video was taken (if known)
  captured_at TIMESTAMP,             -- When it was added to this incident
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT,
  
  -- Status
  is_primary BOOLEAN DEFAULT false,  -- Main/featured image for the incident
  display_order INTEGER DEFAULT 0,   -- For ordering multiple images
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_incident_media_incident_id ON incident_media(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_media_type ON incident_media(media_type);

-- Comment for documentation
COMMENT ON TABLE incident_media IS 'Stores image and video links as evidence sources - no quote verification required';
COMMENT ON COLUMN incident_media.media_type IS 'Type of media: image or video';
COMMENT ON COLUMN incident_media.license IS 'License type: public_domain, cc_by, cc_by_sa, cc_by_nc, fair_use, unknown';
COMMENT ON COLUMN incident_media.is_primary IS 'If true, this is the main/featured image for display';
