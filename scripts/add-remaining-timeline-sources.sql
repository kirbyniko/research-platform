-- Add sources for remaining cases with timeline events

BEGIN;

-- Jose Castro-Rivera (2025-10-23) - Guardian article
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-castro-rivera',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Josué Castro Rivera, a 25-year-old man from Honduras, was killed while trying to flee ICE agents in Virginia. He had been on his way to a gardening job when ICE agents pulled over his vehicle, his brother, Henry Castro, told reporters. When agents tried to detain Castro Rivera and three other passengers, he fled, running into traffic. He was struck while crossing Interstate 264 in Norfolk.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-castro-rivera' AND publisher = 'The Guardian');

-- Norlan Guzman-Fuentes (Dallas shooting) - Guardian article
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-11-dallas-guzman-fuentes',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Norlan Guzman-Fuentes, 37, of El Salvador, was killed when a gunman opened fire at the ICE field office where he was being held. Guzman-Fuentes was arrested by Dallas police in late August, due to an outstanding warrant for driving under the influence and other charges that were later dropped. He is survived by his partner, Berenice Prieto, and four children.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-11-dallas-guzman-fuentes' AND publisher = 'The Guardian');

-- Charles Leo Daniel (2024-03-07) - ACLU source
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2024-03-07-daniel',
  'ICE Detention Deaths 2024',
  'Detention Watch Network',
  '2024-12-15',
  'https://www.detentionwatchnetwork.org/deaths',
  'Charles Leo Daniel, 59, died at the Stewart Detention Center in Lumpkin, Georgia on March 7, 2024. According to ICE, he was found unresponsive in his cell. His family reported he had complained of chest pains in the days leading to his death but did not receive adequate medical attention.',
  'Detention Watch Network death records'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2024-03-07-daniel' AND publisher = 'Detention Watch Network');

-- Jose Manuel Sanchez-Castro (2024-10-27) - Detention Watch source
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2024-10-27-sanchez-castro',
  'ICE Detention Deaths 2024',
  'Detention Watch Network',
  '2024-12-15',
  'https://www.detentionwatchnetwork.org/deaths',
  'Jose Manuel Sanchez-Castro, 64, of Mexico, died at Prairieland Detention Center in Alvarado, Texas on October 27, 2024. ICE reported the cause of death as natural causes. He had been detained since September 2024.',
  'Detention Watch Network death records'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2024-10-27-sanchez-castro' AND publisher = 'Detention Watch Network');

-- Link timeline events to new sources
UPDATE timeline_events t
SET source_id = (
  SELECT s.id FROM sources s 
  WHERE s.case_id = t.case_id 
  ORDER BY 
    CASE WHEN s.publisher = 'The Guardian' THEN 1 
         WHEN s.publisher = 'Detention Watch Network' THEN 2 
         ELSE 3 END
  LIMIT 1
)
WHERE t.source_id IS NULL;

COMMIT;

-- Verify all timeline events have sources
SELECT 
  t.case_id,
  COUNT(*) as events,
  COUNT(t.source_id) as sourced
FROM timeline_events t
GROUP BY t.case_id
ORDER BY t.case_id;
