-- Bug Reports Table
-- Run this SQL to create the bug reports table for storing extension bug reports

CREATE TABLE IF NOT EXISTS bug_reports (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    steps TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    page_url TEXT,
    user_agent TEXT,
    extension_version VARCHAR(20),
    case_context JSONB,
    console_errors JSONB,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'open',
    notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reported_at ON bug_reports(reported_at DESC);

-- Add comment
COMMENT ON TABLE bug_reports IS 'Stores bug reports from the browser extension';
