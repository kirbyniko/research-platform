-- Quote-to-Field Links Schema
-- Stores which quotes support/verify which fields
-- This is the core of the evidence chain: field value -> quote -> source

-- ============================================
-- QUOTE FIELD LINKS
-- ============================================

-- Junction table linking quotes to fields
CREATE TABLE IF NOT EXISTS quote_field_links (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  quote_id INTEGER NOT NULL REFERENCES incident_quotes(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,  -- 'victim_name', 'incident_date', 'agency_ice', 'violation_fourth_amendment', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(incident_id, quote_id, field_name)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_quote_field_links_incident ON quote_field_links(incident_id);
CREATE INDEX IF NOT EXISTS idx_quote_field_links_quote ON quote_field_links(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_field_links_field ON quote_field_links(field_name);
CREATE INDEX IF NOT EXISTS idx_quote_field_links_incident_field ON quote_field_links(incident_id, field_name);

-- ============================================
-- HELPFUL VIEWS
-- ============================================

-- View to get quotes with their linked fields
CREATE OR REPLACE VIEW v_quotes_with_fields AS
SELECT 
  q.id as quote_id,
  q.incident_id,
  q.quote_text,
  q.category,
  q.verified,
  q.verified_by,
  q.source_id,
  s.url as source_url,
  s.title as source_title,
  s.publication as source_publication,
  array_agg(DISTINCT qfl.field_name) FILTER (WHERE qfl.field_name IS NOT NULL) as linked_fields
FROM incident_quotes q
LEFT JOIN incident_sources s ON q.source_id = s.id
LEFT JOIN quote_field_links qfl ON q.id = qfl.quote_id
GROUP BY q.id, q.incident_id, q.quote_text, q.category, q.verified, q.verified_by, 
         q.source_id, s.url, s.title, s.publication;

-- View to get fields with their supporting quotes
CREATE OR REPLACE VIEW v_fields_with_quotes AS
SELECT 
  qfl.incident_id,
  qfl.field_name,
  array_agg(json_build_object(
    'quote_id', q.id,
    'quote_text', q.quote_text,
    'category', q.category,
    'verified', q.verified,
    'verified_by', q.verified_by,
    'source_id', q.source_id,
    'source_url', s.url,
    'source_title', s.title,
    'source_publication', s.publication
  )) as quotes
FROM quote_field_links qfl
JOIN incident_quotes q ON qfl.quote_id = q.id
LEFT JOIN incident_sources s ON q.source_id = s.id
GROUP BY qfl.incident_id, qfl.field_name;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to link a quote to a field
CREATE OR REPLACE FUNCTION link_quote_to_field(
  p_incident_id INTEGER,
  p_quote_id INTEGER,
  p_field_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO quote_field_links (incident_id, quote_id, field_name)
  VALUES (p_incident_id, p_quote_id, p_field_name)
  ON CONFLICT (incident_id, quote_id, field_name) DO NOTHING;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to unlink a quote from a field
CREATE OR REPLACE FUNCTION unlink_quote_from_field(
  p_incident_id INTEGER,
  p_quote_id INTEGER,
  p_field_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM quote_field_links 
  WHERE incident_id = p_incident_id 
    AND quote_id = p_quote_id 
    AND field_name = p_field_name;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get all quotes supporting a specific field
CREATE OR REPLACE FUNCTION get_field_quotes(
  p_incident_id INTEGER,
  p_field_name VARCHAR(100)
) RETURNS TABLE (
  quote_id INTEGER,
  quote_text TEXT,
  category VARCHAR(50),
  verified BOOLEAN,
  verified_by VARCHAR(100),
  source_id INTEGER,
  source_url TEXT,
  source_title TEXT,
  source_publication VARCHAR(200)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as quote_id,
    q.quote_text,
    q.category,
    q.verified,
    q.verified_by,
    q.source_id,
    s.url as source_url,
    s.title as source_title,
    s.publication as source_publication
  FROM quote_field_links qfl
  JOIN incident_quotes q ON qfl.quote_id = q.id
  LEFT JOIN incident_sources s ON q.source_id = s.id
  WHERE qfl.incident_id = p_incident_id
    AND qfl.field_name = p_field_name
  ORDER BY q.verified DESC, q.created_at;
END;
$$ LANGUAGE plpgsql;
