-- Add sources to timeline events for Minneapolis shooting
-- Each timeline event gets a source with article excerpt

BEGIN;

-- Get the Star Tribune source ID
WITH star_trib AS (
  SELECT id FROM sources 
  WHERE case_id = '2026-01-07-minneapolis-shooting' 
  AND publisher = 'Star Tribune'
  LIMIT 1
)
-- Update timeline events with source
UPDATE timeline_events SET source_id = (SELECT id FROM star_trib)
WHERE case_id = '2026-01-07-minneapolis-shooting';

-- If Star Tribune source doesn't exist, create timeline sources
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT 
  '2026-01-07-minneapolis-shooting',
  'Timeline of fatal ICE shooting in Minneapolis',
  'Star Tribune',
  '2026-01-08',
  'https://www.startribune.com/ice-shooting-minneapolis-timeline-witnesses',
  'Witnesses reported that around 9:30 AM on January 7, community members began blowing whistles to alert the neighborhood of ICE''s presence. Multiple witnesses told investigators the woman''s Honda Pilot was blocked by federal agents. When an ICE agent attempted to open the driver''s door, the woman put the vehicle in reverse, then drive. The agent fired at least 2-3 shots, striking the woman in the head. The vehicle traveled several feet before crashing. She was transported to Hennepin Healthcare and pronounced dead.',
  'Star Tribune reconstruction based on witness accounts and video footage'
WHERE NOT EXISTS (
  SELECT 1 FROM sources 
  WHERE case_id = '2026-01-07-minneapolis-shooting' 
  AND publisher = 'Star Tribune'
);

-- Update timeline events with the new source
UPDATE timeline_events 
SET source_id = (
  SELECT id FROM sources 
  WHERE case_id = '2026-01-07-minneapolis-shooting' 
  AND publisher = 'Star Tribune'
  LIMIT 1
)
WHERE case_id = '2026-01-07-minneapolis-shooting';

COMMIT;

-- Verify
SELECT 
  t.date,
  LEFT(t.event, 50) as event,
  s.publisher as source
FROM timeline_events t
LEFT JOIN sources s ON t.source_id = s.id
WHERE t.case_id = '2026-01-07-minneapolis-shooting'
ORDER BY t.sort_order;
