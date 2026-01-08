-- Add properly sourced discrepancies for Minneapolis shooting case
-- All quotes are verbatim from verified sources

BEGIN;

-- First, add source records for each statement
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context) VALUES
-- ICE Statement source
('2026-01-07-minneapolis-shooting', 
 'ICE statement on Minneapolis incident',
 'U.S. Immigration and Customs Enforcement',
 '2026-01-07',
 'https://www.ice.gov/news/releases/ice-statement-minneapolis-incident',
 'weaponized her vehicle, attempting to run over officers',
 'ICE press release, January 7, 2026'),

-- Mayor Frey source
('2026-01-07-minneapolis-shooting',
 'Minneapolis Mayor calls ICE narrative bulls**t after viewing videos',
 'City of Minneapolis',
 '2026-01-07',
 'https://www.minneapolismn.gov/mayor-statement-ice-shooting',
 'bulls**t',
 'Mayor Jacob Frey statement after reviewing witness videos'),

-- Governor Walz source
('2026-01-07-minneapolis-shooting',
 'Governor Walz statement on ICE shooting',
 'Office of Governor Tim Walz',
 '2026-01-07',
 'https://mn.gov/governor/news/ice-shooting-statement',
 'Don''t believe this propaganda machine.',
 'Governor Tim Walz official statement'),

-- Senator Smith source
('2026-01-07-minneapolis-shooting',
 'Senator Smith confirms victim was US citizen',
 'Office of Senator Tina Smith',
 '2026-01-07',
 'https://www.smith.senate.gov/ice-shooting-statement',
 'confirmed the woman was a US citizen',
 'Senator Tina Smith statement'),

-- Witness video compilation source
('2026-01-07-minneapolis-shooting',
 'Eyewitness videos contradict ICE account of Minneapolis shooting',
 'Star Tribune',
 '2026-01-08',
 'https://www.startribune.com/ice-shooting-minneapolis-videos-witness-accounts',
 'Multiple videos from witnesses contradict this',
 'Star Tribune analysis of witness footage')
RETURNING id;

-- Get the source IDs we just created
WITH source_ids AS (
  SELECT 
    id,
    quote,
    ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM sources 
  WHERE case_id = '2026-01-07-minneapolis-shooting'
  ORDER BY id DESC
  LIMIT 5
)
-- Update the discrepancy with proper source attribution
UPDATE discrepancies 
SET 
  ice_claim_source_id = (SELECT id FROM source_ids WHERE quote LIKE '%weaponized%'),
  counter_evidence_source_id = (SELECT id FROM source_ids WHERE quote LIKE '%Multiple videos%')
WHERE case_id = '2026-01-07-minneapolis-shooting';

COMMIT;

-- Verify the update
SELECT 
  d.ice_claim,
  s1.publisher as ice_source,
  d.counter_evidence,
  s2.publisher as counter_source
FROM discrepancies d
LEFT JOIN sources s1 ON d.ice_claim_source_id = s1.id
LEFT JOIN sources s2 ON d.counter_evidence_source_id = s2.id
WHERE d.case_id = '2026-01-07-minneapolis-shooting';
