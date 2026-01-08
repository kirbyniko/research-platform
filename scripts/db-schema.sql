-- ICE Deaths Database Schema

CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    nationality VARCHAR(255) NOT NULL,
    date_of_death DATE NOT NULL,
    custody_status VARCHAR(100) NOT NULL,
    official_cause_of_death TEXT,
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facilities (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    state VARCHAR(10) NOT NULL,
    type VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    event TEXT NOT NULL,
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS discrepancies (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
    ice_claim TEXT NOT NULL,
    counter_evidence TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    publisher VARCHAR(255) NOT NULL,
    date DATE,
    url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL
);

-- Indexes
CREATE INDEX idx_cases_date_of_death ON cases(date_of_death);
CREATE INDEX idx_cases_nationality ON cases(nationality);
CREATE INDEX idx_facilities_case_id ON facilities(case_id);
CREATE INDEX idx_timeline_case_id ON timeline_events(case_id);
CREATE INDEX idx_discrepancies_case_id ON discrepancies(case_id);
CREATE INDEX idx_sources_case_id ON sources(case_id);
CREATE INDEX idx_categories_case_id ON categories(case_id);
