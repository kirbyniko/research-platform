-- Add quote and source fields to edit_suggestions table
-- This allows users to provide supporting evidence when suggesting edits

ALTER TABLE edit_suggestions 
ADD COLUMN IF NOT EXISTS supporting_quote TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_title TEXT;

COMMENT ON COLUMN edit_suggestions.supporting_quote IS 'Quote text that supports the suggested edit';
COMMENT ON COLUMN edit_suggestions.source_url IS 'URL of the source document';
COMMENT ON COLUMN edit_suggestions.source_title IS 'Title/description of the source';
