-- Add Guardian sources to all cases with timeline events that don't have one
-- Then link timeline events to those sources

BEGIN;

-- Tien Xuan Phan (2025-07-19)
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-07-19-phan',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Tien Xuan Phan, 55, died at the Methodist hospital north-east in Live Oak, Texas. Phan was detained earlier in June for failing to leave the US after a removal order, and held at the Karnes county immigration processing center in Karnes City. He was transferred to a hospital for evaluation after experiencing seizures and vomiting, and becoming unresponsive, according to ICE. His cause of death remains under investigation.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-07-19-phan' AND publisher = 'The Guardian');

-- Ismael Ayala-Uribe (2025-09-22)
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-09-22-ayala-uribe',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Ismael Ayala-Uribe, 39, died after falling ill at the Adelanto detention center in California. Uribe had been protected from deportation under the Daca program, but he was denied renewal because he had been convicted of driving under the influence. He was apprehended in August during an immigration raid at the Fountain Valley Auto Wash, where he had worked for about 15 years, and was transferred to Adelanto. There, he fell ill – first with a cough and fever, and then other medical complications, according to his family. He was transferred to a hospital, where he died.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-09-22-ayala-uribe' AND publisher = 'The Guardian');

-- Huabing Xie (2025-09-29)
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-09-29-xie',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Huabing Xie, of China, died at El Centro regional medical center in Calexico, California. The border patrol had apprehended Xie on 12 September in Indio, California, and transferred him to the Imperial regional detention facility. In 2023, he had been placed under removal proceedings. The agency said that Xie experienced "what appeared to be a seizure and became unresponsive" and medical personnel at the detention center tried to administer life-saving measures, before emergency medical services arrived and took him to the hospital, where he died.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-09-29-xie' AND publisher = 'The Guardian');

-- Jean Wilson Brutus (2025-12-01)
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-12-01-brutus',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Jean Wilson Brutus, a 41-year-old man from Haiti, died at the Delaney Hall detention facility in Newark, New Jersey, one day after he was taken into custody. ICE said Brutus died of "suspected natural causes". Brutus came to the US in 2023 as an asylum seeker. The conditions at Delaney Hall, where Brutus was held, have come under scrutiny from lawmakers and advocates. Andy Kim, a Democratic senator from New Jersey, toured Delaney Hall the day after Brutus''s death and spoke to about 80 detainees, who he said described receiving poor medical care and "disgusting" meals that included raw meat. He called for the facility to be closed.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-12-01-brutus' AND publisher = 'The Guardian');

-- Francisco Gaspar-Andres (2025-12-03)
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-12-03-gaspar-andres',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Francisco Gaspar-Andrés, a 48-year-old man from Guatemala, died at an El Paso hospital due to suspected kidney and liver failure, according to ICE. According to an interview Pedro Juan gave to the El Paso Times, the couple had gone on a grocery run during the Labor Day holiday when they were pulled over by a highway patrol officer who asked to see their identification papers, and then turned them over to ICE. Gaspar-Andrés ended up at Camp East Montana, a detention facility at the Texas military base known as Fort Bliss. The American Civil Liberties Union has called the facility a "human and civil rights catastrophe" following several reports of injuries, illnesses and abuses.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-12-03-gaspar-andres' AND publisher = 'The Guardian');

-- Dalvin Francisco Rodriguez (2025-12-14)
INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
SELECT '2025-12-14-rodriguez',
  '2025 was ICE''s deadliest year in two decades. Here are the 32 people who died in custody',
  'The Guardian',
  '2026-01-04',
  'https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record',
  'Delvin Francisco Rodriguez, 39, of Nicaragua died after months of detention at the Adams county correctional center in New Orleans. He had been arrested in late September, in Colorado, and was transferred to New Orleans. He was due to be deported to Nicaragua on 13 December. On 4 December, according to ICE, emergency medical responders were called to the detention facility and Rodriguez was found to not have a pulse. He was transferred to the hospital, where he later died. He failed a "test to determine brain function", according to ICE, and was removed from a ventilator in accordance with the wishes of his family.',
  'The Guardian, Jan 4 2026'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE case_id = '2025-12-14-rodriguez' AND publisher = 'The Guardian');

-- Now link all timeline events to Guardian sources
UPDATE timeline_events t
SET source_id = (
  SELECT s.id FROM sources s 
  WHERE s.case_id = t.case_id 
  AND s.publisher = 'The Guardian'
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM sources s 
  WHERE s.case_id = t.case_id 
  AND s.publisher = 'The Guardian'
);

COMMIT;

-- Summary
SELECT 
  t.case_id,
  COUNT(*) as events,
  COUNT(t.source_id) as sourced
FROM timeline_events t
GROUP BY t.case_id
ORDER BY t.case_id;
