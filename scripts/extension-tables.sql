-- Extension support tables for cases, quotes, and sources

-- Cases table (main case records from extension)
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  date_of_death DATE,
  age INTEGER,
  country_of_origin VARCHAR(100),
  facility VARCHAR(255),
  location VARCHAR(255),
  cause_of_death TEXT,
  ice_statement TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Case quotes table
CREATE TABLE IF NOT EXISTS case_quotes (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  source_url TEXT,
  page_number INTEGER,
  verified BOOLEAN DEFAULT FALSE,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Case sources table
CREATE TABLE IF NOT EXISTS case_sources (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title VARCHAR(500),
  author VARCHAR(255),
  published_date DATE,
  source_type VARCHAR(50) DEFAULT 'news',
  accessed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(case_id, url)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_date ON cases(date_of_death);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_case_quotes_case ON case_quotes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_quotes_category ON case_quotes(category);
CREATE INDEX IF NOT EXISTS idx_case_sources_case ON case_sources(case_id);

-- Add full text search capability
CREATE INDEX IF NOT EXISTS idx_cases_name_fts ON cases USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_case_quotes_text_fts ON case_quotes USING gin(to_tsvector('english', quote_text));
