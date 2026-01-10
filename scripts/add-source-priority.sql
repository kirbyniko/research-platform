-- Add source_priority field to incident_sources table
-- Priority: 'primary' (firsthand accounts, official docs), 'secondary' (news reports, analysis), 'tertiary' (compilations, databases)

ALTER TABLE incident_sources 
ADD COLUMN IF NOT EXISTS source_priority VARCHAR(20) DEFAULT 'secondary' CHECK (source_priority IN ('primary', 'secondary', 'tertiary'));

-- Update existing sources to appropriate priority
-- News articles default to secondary
UPDATE incident_sources 
SET source_priority = 'secondary' 
WHERE source_type IN ('news', 'report', 'social_media')
AND source_priority IS NULL;

-- Government documents and legal filings should be primary
UPDATE incident_sources
SET source_priority = 'primary'
WHERE source_type IN ('government', 'court', 'legal')
AND source_priority IS NULL;

-- Add index for filtering by priority
CREATE INDEX IF NOT EXISTS idx_incident_sources_priority ON incident_sources(source_priority);

-- Add comment
COMMENT ON COLUMN incident_sources.source_priority IS 'Source hierarchy: primary (official docs, witness accounts), secondary (news, reports), tertiary (databases, compilations)';
