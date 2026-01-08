# Database Schema - Complete Design

## Overview

PostgreSQL database storing all case data, sources, extracted quotes, and verification state.

---

## Core Tables

### Cases
The central record for each death.

```sql
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  
  -- Identity
  name TEXT NOT NULL,                    -- Full name (LASTNAME, FIRSTNAME format)
  name_normalized TEXT,                  -- Lowercase for search
  aliases TEXT[],                        -- Alternative names/spellings
  
  -- Demographics
  age INTEGER,
  age_at_death INTEGER,                  -- Calculated if birth date known
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT,
  country_of_origin TEXT,
  
  -- Death information
  date_of_death DATE NOT NULL,
  date_of_death_approximate BOOLEAN DEFAULT FALSE,
  cause_of_death TEXT,
  cause_of_death_official TEXT,          -- ICE's stated cause
  cause_of_death_disputed BOOLEAN DEFAULT FALSE,
  manner_of_death TEXT,                  -- Natural, accident, suicide, homicide, undetermined
  
  -- Detention information
  facility_id INTEGER REFERENCES facilities(id),
  facility_name TEXT,                    -- Denormalized for convenience
  facility_type TEXT,                    -- ICE, contractor, county jail, etc.
  days_in_custody INTEGER,
  date_entered_custody DATE,
  
  -- Geographic
  state TEXT,
  city TEXT,
  
  -- Medical
  had_preexisting_conditions BOOLEAN,
  preexisting_conditions TEXT[],
  requested_medical_care BOOLEAN,
  medical_care_denied BOOLEAN,
  medical_care_delayed BOOLEAN,
  
  -- Legal
  had_deportation_order BOOLEAN,
  asylum_seeker BOOLEAN,
  had_legal_representation BOOLEAN,
  
  -- Metadata
  status TEXT DEFAULT 'draft',           -- draft, pending_review, verified, published
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- JSON for flexible fields
  additional_details JSONB DEFAULT '{}'
);

CREATE INDEX idx_cases_name ON cases(name_normalized);
CREATE INDEX idx_cases_date ON cases(date_of_death);
CREATE INDEX idx_cases_facility ON cases(facility_id);
CREATE INDEX idx_cases_status ON cases(status);
```

### Facilities
Detention facilities.

```sql
CREATE TABLE facilities (
  id SERIAL PRIMARY KEY,
  
  -- Identity
  name TEXT NOT NULL,
  name_normalized TEXT,
  aliases TEXT[],                        -- Common alternate names
  
  -- Type
  facility_type TEXT,                    -- ICE-owned, CDF, IGSA, county, etc.
  operator TEXT,                         -- GEO Group, CoreCivic, county name, etc.
  
  -- Location
  address TEXT,
  city TEXT,
  state TEXT NOT NULL,
  zip_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  
  -- Capacity
  capacity INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  opened_date DATE,
  closed_date DATE,
  
  -- Metadata
  ice_field_office TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_facilities_name ON facilities(name_normalized);
CREATE INDEX idx_facilities_state ON facilities(state);
```

### Documents
Original source documents (PDFs, etc.).

```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  
  -- File info
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_type TEXT,                        -- pdf, html, txt
  file_size INTEGER,
  file_hash TEXT NOT NULL UNIQUE,        -- SHA-256 for dedup
  storage_path TEXT,                     -- Path in file storage
  
  -- Content
  full_text TEXT,                        -- Extracted text
  page_count INTEGER,
  page_offsets JSONB,                    -- Array of {page, startChar, endChar}
  
  -- Classification
  document_type TEXT,                    -- death_report, autopsy, legal_filing, news_article
  source_url TEXT,
  
  -- Linkage
  case_id INTEGER REFERENCES cases(id),
  
  -- Processing
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  extraction_model TEXT,                 -- Which LLM version processed this
  processing_error TEXT,
  
  -- Metadata
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_documents_type ON documents(document_type);
```

### Sources
Web sources (articles, press releases, etc.).

```sql
CREATE TABLE sources (
  id SERIAL PRIMARY KEY,
  
  -- URL info
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,
  domain TEXT,
  
  -- Content
  title TEXT,
  author TEXT,
  published_date DATE,
  body_text TEXT,
  
  -- Classification
  source_type TEXT,                      -- news, government, legal, advocacy
  credibility_score INTEGER,             -- 1-10
  
  -- Relevance
  is_relevant BOOLEAN,
  relevance_score DECIMAL,
  
  -- Linkage
  case_id INTEGER REFERENCES cases(id),
  is_primary_source BOOLEAN DEFAULT FALSE,
  
  -- Scraping
  scraped_at TIMESTAMP,
  scrape_method TEXT,                    -- playwright, fetch, manual
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sources_case ON sources(case_id);
CREATE INDEX idx_sources_url ON sources(url_hash);
CREATE INDEX idx_sources_domain ON sources(domain);
```

### Extracted Quotes
Quotes extracted from documents/sources.

```sql
CREATE TABLE extracted_quotes (
  id SERIAL PRIMARY KEY,
  
  -- Source reference
  document_id INTEGER REFERENCES documents(id),
  source_id INTEGER REFERENCES sources(id),
  case_id INTEGER REFERENCES cases(id),
  
  -- The quote
  quote_text TEXT NOT NULL,
  
  -- Position in source
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  page_number INTEGER,                   -- For PDFs
  
  -- Classification
  category TEXT NOT NULL,                -- timeline_event, medical, official_statement, background
  event_date DATE,
  event_date_approximate BOOLEAN DEFAULT FALSE,
  event_time TIME,
  
  -- AI extraction info
  confidence_score DECIMAL,
  extracted_by TEXT,                     -- Model name/version
  extracted_at TIMESTAMP DEFAULT NOW(),
  
  -- Verification
  status TEXT DEFAULT 'pending',         -- pending, verified, rejected, edited
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- If edited
  original_quote TEXT,
  original_char_start INTEGER,
  original_char_end INTEGER,
  edit_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure quote is from exactly one source
  CONSTRAINT quote_source_check CHECK (
    (document_id IS NOT NULL AND source_id IS NULL) OR
    (document_id IS NULL AND source_id IS NOT NULL)
  )
);

CREATE INDEX idx_quotes_document ON extracted_quotes(document_id);
CREATE INDEX idx_quotes_source ON extracted_quotes(source_id);
CREATE INDEX idx_quotes_case ON extracted_quotes(case_id);
CREATE INDEX idx_quotes_status ON extracted_quotes(status);
CREATE INDEX idx_quotes_date ON extracted_quotes(event_date);
```

### Timeline Events
Verified timeline events (derived from quotes or manually created).

```sql
CREATE TABLE timeline_events (
  id SERIAL PRIMARY KEY,
  
  -- Linkage
  case_id INTEGER NOT NULL REFERENCES cases(id),
  quote_id INTEGER REFERENCES extracted_quotes(id),
  
  -- Event info
  event_date DATE,
  event_date_approximate BOOLEAN DEFAULT FALSE,
  event_time TIME,
  event_description TEXT NOT NULL,
  
  -- Categorization
  event_type TEXT,                       -- arrest, detention, medical, death, legal, other
  severity TEXT,                         -- info, warning, critical
  
  -- Ordering (for events on same date)
  sort_order INTEGER DEFAULT 0,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_timeline_case ON timeline_events(case_id);
CREATE INDEX idx_timeline_date ON timeline_events(event_date);
```

---

## Supporting Tables

### Users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  descope_id TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'viewer',            -- viewer, editor, admin
  display_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
```

### Verification Sessions
Track verification work.

```sql
CREATE TABLE verification_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  document_id INTEGER REFERENCES documents(id),
  source_id INTEGER REFERENCES sources(id),
  
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Stats
  quotes_reviewed INTEGER DEFAULT 0,
  quotes_accepted INTEGER DEFAULT 0,
  quotes_rejected INTEGER DEFAULT 0,
  quotes_edited INTEGER DEFAULT 0,
  quotes_added INTEGER DEFAULT 0
);

CREATE INDEX idx_sessions_user ON verification_sessions(user_id);
CREATE INDEX idx_sessions_document ON verification_sessions(document_id);
```

### Scrape Queue
```sql
CREATE TABLE scrape_queue (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',         -- pending, processing, completed, failed
  
  linked_case_id INTEGER REFERENCES cases(id),
  search_query TEXT,
  
  added_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

CREATE INDEX idx_queue_status ON scrape_queue(status);
CREATE INDEX idx_queue_priority ON scrape_queue(priority DESC);
```

### Discrepancies
Track conflicting information.

```sql
CREATE TABLE discrepancies (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id),
  
  field_name TEXT NOT NULL,              -- Which field has conflict
  
  -- The conflicting values
  value_a TEXT,
  source_a_id INTEGER REFERENCES sources(id),
  
  value_b TEXT,
  source_b_id INTEGER REFERENCES sources(id),
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_value TEXT,
  resolution_notes TEXT,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_discrepancies_case ON discrepancies(case_id);
CREATE INDEX idx_discrepancies_resolved ON discrepancies(resolved);
```

---

## Views

### Case Summary View
```sql
CREATE VIEW case_summary AS
SELECT 
  c.id,
  c.name,
  c.date_of_death,
  c.cause_of_death,
  c.facility_name,
  c.state,
  c.status,
  f.operator as facility_operator,
  COUNT(DISTINCT s.id) as source_count,
  COUNT(DISTINCT d.id) as document_count,
  COUNT(DISTINCT te.id) as timeline_event_count,
  COUNT(DISTINCT eq.id) FILTER (WHERE eq.status = 'pending') as pending_quotes
FROM cases c
LEFT JOIN facilities f ON c.facility_id = f.id
LEFT JOIN sources s ON s.case_id = c.id
LEFT JOIN documents d ON d.case_id = c.id
LEFT JOIN timeline_events te ON te.case_id = c.id
LEFT JOIN extracted_quotes eq ON eq.case_id = c.id
GROUP BY c.id, f.operator;
```

### Verification Queue View
```sql
CREATE VIEW verification_queue AS
SELECT 
  d.id as document_id,
  d.filename,
  d.document_type,
  c.name as case_name,
  c.date_of_death,
  COUNT(eq.id) as total_quotes,
  COUNT(eq.id) FILTER (WHERE eq.status = 'pending') as pending_quotes,
  d.uploaded_at,
  d.processed_at
FROM documents d
JOIN cases c ON d.case_id = c.id
LEFT JOIN extracted_quotes eq ON eq.document_id = d.id
WHERE d.processed = TRUE
GROUP BY d.id, c.id
HAVING COUNT(eq.id) FILTER (WHERE eq.status = 'pending') > 0
ORDER BY d.uploaded_at DESC;
```

---

## Migrations

### Initial Setup
```sql
-- Run in order:
-- 1. Create users table
-- 2. Create facilities table  
-- 3. Create cases table
-- 4. Create documents table
-- 5. Create sources table
-- 6. Create extracted_quotes table
-- 7. Create timeline_events table
-- 8. Create supporting tables
-- 9. Create views
```

### Adding Quote Verification
```sql
-- Add to existing database
ALTER TABLE extracted_quotes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_quotes_status ON extracted_quotes(status);
```

---

## Data Integrity

### Constraints
```sql
-- Ensure date_of_death is reasonable
ALTER TABLE cases ADD CONSTRAINT valid_death_date 
CHECK (date_of_death >= '1990-01-01' AND date_of_death <= NOW());

-- Ensure quote positions are valid
ALTER TABLE extracted_quotes ADD CONSTRAINT valid_quote_positions
CHECK (char_start >= 0 AND char_end > char_start);

-- Ensure confidence is 0-1
ALTER TABLE extracted_quotes ADD CONSTRAINT valid_confidence
CHECK (confidence_score >= 0 AND confidence_score <= 1);
```

### Triggers
```sql
-- Update updated_at on cases
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cases_updated_at
BEFORE UPDATE ON cases
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Normalize names on insert
CREATE OR REPLACE FUNCTION normalize_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_normalized = LOWER(TRIM(NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cases_normalize_name
BEFORE INSERT OR UPDATE ON cases
FOR EACH ROW EXECUTE FUNCTION normalize_name();
```

---

## Backup Strategy

```sql
-- Daily backup of critical tables
pg_dump -t cases -t timeline_events -t extracted_quotes -t sources ice_deaths > backup_$(date +%Y%m%d).sql

-- Weekly full backup
pg_dump ice_deaths > full_backup_$(date +%Y%m%d).sql
```
