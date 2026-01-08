-- Documents and Quote Extraction Tables
-- Run this migration to add document processing and verification support

-- Documents table: stores uploaded PDFs and their extracted text
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    
    -- File info
    filename TEXT NOT NULL,
    original_filename TEXT,
    file_type TEXT DEFAULT 'pdf',
    file_size INTEGER,
    file_hash TEXT NOT NULL UNIQUE,  -- SHA-256 for dedup
    storage_path TEXT,               -- Path in file storage
    
    -- Content
    full_text TEXT,                  -- Extracted text
    page_count INTEGER,
    page_offsets JSONB,              -- Array of {page, startChar, endChar}
    text_positions JSONB,            -- Array of {char, page, x, y, width, height}
    
    -- Classification
    document_type TEXT,              -- death_report, autopsy, legal_filing, news_article
    source_url TEXT,
    
    -- Linkage
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE SET NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    extraction_model TEXT,           -- Which LLM version processed this
    processing_error TEXT,
    
    -- Metadata
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_processed ON documents(processed);

-- Extracted quotes table: quotes identified in documents
CREATE TABLE IF NOT EXISTS extracted_quotes (
    id SERIAL PRIMARY KEY,
    
    -- Source reference
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    case_id VARCHAR(255) REFERENCES cases(id) ON DELETE SET NULL,
    
    -- The quote (exact substring of document.full_text)
    quote_text TEXT NOT NULL,
    
    -- Position in source document
    char_start INTEGER NOT NULL,
    char_end INTEGER NOT NULL,
    page_number INTEGER,
    
    -- Bounding boxes for highlighting (JSONB array)
    bounding_boxes JSONB,            -- [{page, x, y, width, height}, ...]
    
    -- Classification
    category TEXT NOT NULL,          -- timeline_event, medical, official_statement, background
    event_date DATE,
    event_date_approximate BOOLEAN DEFAULT FALSE,
    event_time TIME,
    
    -- AI extraction info
    confidence_score DECIMAL(3,2),
    extracted_by TEXT,               -- Model name/version
    extracted_at TIMESTAMP DEFAULT NOW(),
    
    -- Verification
    status TEXT DEFAULT 'pending',   -- pending, verified, rejected, edited
    verified_by INTEGER,
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- If edited
    original_quote TEXT,
    original_char_start INTEGER,
    original_char_end INTEGER,
    edit_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotes_document ON extracted_quotes(document_id);
CREATE INDEX idx_quotes_case ON extracted_quotes(case_id);
CREATE INDEX idx_quotes_status ON extracted_quotes(status);
CREATE INDEX idx_quotes_date ON extracted_quotes(event_date);
CREATE INDEX idx_quotes_category ON extracted_quotes(category);

-- Verification sessions: track human verification work
CREATE TABLE IF NOT EXISTS verification_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    
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

CREATE INDEX idx_sessions_document ON verification_sessions(document_id);

-- Verification feedback: for learning system
CREATE TABLE IF NOT EXISTS verification_feedback (
    id SERIAL PRIMARY KEY,
    
    -- What was verified
    quote_id INTEGER REFERENCES extracted_quotes(id) ON DELETE CASCADE,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    
    -- AI's prediction
    ai_category TEXT,
    ai_date TEXT,
    ai_confidence DECIMAL(3,2),
    
    -- Human's decision
    human_action TEXT,               -- accepted, rejected, edited
    rejection_reason TEXT,
    
    -- If edited
    edit_category_changed BOOLEAN DEFAULT FALSE,
    edit_date_changed BOOLEAN DEFAULT FALSE,
    edit_quote_expanded BOOLEAN DEFAULT FALSE,
    edit_quote_trimmed BOOLEAN DEFAULT FALSE,
    
    -- Context for learning
    quote_text TEXT,
    surrounding_context TEXT,        -- 500 chars before/after
    
    -- Metadata
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_action ON verification_feedback(human_action);
CREATE INDEX idx_feedback_category ON verification_feedback(ai_category);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for extracted_quotes
DROP TRIGGER IF EXISTS update_quotes_updated_at ON extracted_quotes;
CREATE TRIGGER update_quotes_updated_at
    BEFORE UPDATE ON extracted_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
