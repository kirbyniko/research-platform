-- Incidents Database Schema Migration
-- Expands system from deaths-only to comprehensive incident tracking

-- ============================================
-- MAIN INCIDENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  incident_id VARCHAR(100) UNIQUE NOT NULL,  -- YYYY-MM-DD-identifier
  incident_type VARCHAR(50) NOT NULL,
  
  -- Dates
  incident_date DATE,
  date_precision VARCHAR(20) DEFAULT 'exact',
  incident_date_end DATE,  -- For ongoing incidents
  
  -- Location
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'USA',
  facility VARCHAR(200),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Subject (person affected)
  subject_name VARCHAR(200),
  subject_name_public BOOLEAN DEFAULT false,
  subject_age INTEGER,
  subject_gender VARCHAR(50),
  subject_nationality VARCHAR(100),
  subject_immigration_status VARCHAR(100),
  subject_occupation VARCHAR(200),
  subject_years_in_us INTEGER,
  subject_family_in_us TEXT,
  
  -- Description
  summary TEXT,
  
  -- Outcome
  outcome_status VARCHAR(50),
  outcome_legal_action TEXT,
  outcome_settlement TEXT,
  outcome_policy_change TEXT,
  outcome_criminal_charges TEXT,
  outcome_internal_investigation TEXT,
  outcome_media_coverage VARCHAR(50),
  
  -- Metadata
  verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  tags TEXT[],  -- PostgreSQL array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100)
);

-- ============================================
-- AGENCIES INVOLVED (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS incident_agencies (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  agency VARCHAR(100) NOT NULL,
  role TEXT,  -- "arresting agency", "detaining agency", etc.
  UNIQUE(incident_id, agency)
);

-- ============================================
-- VIOLATIONS ALLEGED (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS incident_violations (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  violation_type VARCHAR(100) NOT NULL,
  description TEXT,
  constitutional_basis TEXT,
  UNIQUE(incident_id, violation_type)
);

-- ============================================
-- TYPE-SPECIFIC DETAILS (JSONB for flexibility)
-- ============================================

CREATE TABLE IF NOT EXISTS incident_details (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  detail_type VARCHAR(50) NOT NULL,  -- 'death', 'injury', 'arrest', etc.
  details JSONB NOT NULL,
  UNIQUE(incident_id, detail_type)
);

-- ============================================
-- SOURCES
-- ============================================

CREATE TABLE IF NOT EXISTS incident_sources (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  publication VARCHAR(200),
  author TEXT,
  published_date DATE,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_url TEXT,  -- Wayback machine link
  source_type VARCHAR(50) DEFAULT 'news_article'
);

-- ============================================
-- QUOTES
-- ============================================

CREATE TABLE IF NOT EXISTS incident_quotes (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES incident_sources(id) ON DELETE SET NULL,
  quote_text TEXT NOT NULL,
  category VARCHAR(50),  -- timeline, official, medical, legal, context, witness, etc.
  page_number INTEGER,
  paragraph_number INTEGER,
  confidence DECIMAL(3,2),  -- AI classification confidence 0.00-1.00
  verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(100),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TIMELINE
-- ============================================

CREATE TABLE IF NOT EXISTS incident_timeline (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  event_date DATE,
  event_time TIME,
  description TEXT NOT NULL,
  source_id INTEGER REFERENCES incident_sources(id) ON DELETE SET NULL,
  quote_id INTEGER REFERENCES incident_quotes(id) ON DELETE SET NULL,
  sequence_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RELATED INCIDENTS (many-to-many self-join)
-- ============================================

CREATE TABLE IF NOT EXISTS related_incidents (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  related_incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50),  -- 'same_raid', 'same_facility', 'follow_up', etc.
  UNIQUE(incident_id, related_incident_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_date_type ON incidents(incident_date, incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_state ON incidents(state);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(state, city);
CREATE INDEX IF NOT EXISTS idx_incidents_subject_name ON incidents(subject_name);
CREATE INDEX IF NOT EXISTS idx_incidents_verified ON incidents(verified);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);

CREATE INDEX IF NOT EXISTS idx_incident_agencies_incident ON incident_agencies(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_agencies_agency ON incident_agencies(agency);

CREATE INDEX IF NOT EXISTS idx_incident_violations_incident ON incident_violations(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_violations_type ON incident_violations(violation_type);

CREATE INDEX IF NOT EXISTS idx_incident_details_incident ON incident_details(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_details_type ON incident_details(detail_type);

CREATE INDEX IF NOT EXISTS idx_incident_sources_incident ON incident_sources(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_sources_url ON incident_sources(url);

CREATE INDEX IF NOT EXISTS idx_incident_quotes_incident ON incident_quotes(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_quotes_source ON incident_quotes(source_id);
CREATE INDEX IF NOT EXISTS idx_incident_quotes_category ON incident_quotes(category);
CREATE INDEX IF NOT EXISTS idx_incident_quotes_verified ON incident_quotes(verified);

CREATE INDEX IF NOT EXISTS idx_incident_timeline_incident ON incident_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_timeline_date ON incident_timeline(event_date);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_incidents_summary_fts ON incidents USING gin(to_tsvector('english', summary));

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_incidents_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_incidents_updated ON incidents;
CREATE TRIGGER trigger_incidents_updated
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_incidents_timestamp();

-- ============================================
-- MIGRATION FROM CASES TABLE
-- ============================================

-- This section migrates existing death cases to the new incidents table
-- Run this once after creating the tables

-- INSERT INTO incidents (
--   incident_id,
--   incident_type,
--   incident_date,
--   subject_name,
--   subject_age,
--   subject_nationality,
--   summary,
--   verified,
--   created_at
-- )
-- SELECT 
--   id,
--   'death',
--   date_of_death,
--   name,
--   age,
--   nationality,
--   official_cause_of_death,
--   COALESCE(verified, false),
--   COALESCE(created_at, CURRENT_TIMESTAMP)
-- FROM cases
-- ON CONFLICT (incident_id) DO NOTHING;

-- ============================================
-- VIEWS FOR CONVENIENCE
-- ============================================

CREATE OR REPLACE VIEW v_incidents_with_counts AS
SELECT 
  i.*,
  (SELECT COUNT(*) FROM incident_sources WHERE incident_id = i.id) as source_count,
  (SELECT COUNT(*) FROM incident_quotes WHERE incident_id = i.id) as quote_count,
  (SELECT COUNT(*) FROM incident_quotes WHERE incident_id = i.id AND verified = true) as verified_quote_count,
  (SELECT COUNT(*) FROM incident_timeline WHERE incident_id = i.id) as timeline_count,
  (SELECT array_agg(agency) FROM incident_agencies WHERE incident_id = i.id) as agencies,
  (SELECT array_agg(violation_type) FROM incident_violations WHERE incident_id = i.id) as violations
FROM incidents i;

CREATE OR REPLACE VIEW v_incident_stats AS
SELECT 
  incident_type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE verified = true) as verified_count,
  MIN(incident_date) as earliest_date,
  MAX(incident_date) as latest_date
FROM incidents
GROUP BY incident_type;

-- ============================================
-- SAMPLE DATA (commented out)
-- ============================================

-- Example: Rights violation (journalist arrest)
-- INSERT INTO incidents (incident_id, incident_type, incident_date, city, state, subject_occupation, subject_name_public, summary)
-- VALUES (
--   '2025-01-08-journalist-arrest-example',
--   'rights_violation',
--   '2025-01-08',
--   'Example City',
--   'CA',
--   'Journalist',
--   true,
--   'Reporter arrested for blocking roadway seconds after on-air criticism'
-- );
-- 
-- INSERT INTO incident_agencies (incident_id, agency, role)
-- SELECT id, 'local_police', 'arresting agency' FROM incidents WHERE incident_id = '2025-01-08-journalist-arrest-example';
-- 
-- INSERT INTO incident_violations (incident_id, violation_type, description)
-- SELECT id, 'first_amendment', 'Apparent retaliation for protected speech' FROM incidents WHERE incident_id = '2025-01-08-journalist-arrest-example';
-- 
-- INSERT INTO incident_details (incident_id, detail_type, details)
-- SELECT id, 'arrest', '{
--   "stated_reason": "Blocking roadway",
--   "actual_context": "Standing on sidewalk during live broadcast",
--   "charges": ["Obstruction"],
--   "timing_suspicious": true,
--   "pretext_arrest": true,
--   "journalism_related": true
-- }'::jsonb
-- FROM incidents WHERE incident_id = '2025-01-08-journalist-arrest-example';
