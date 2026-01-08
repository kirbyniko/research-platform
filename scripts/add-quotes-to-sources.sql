-- Add quotes from verified sources to the sources table

-- Francisco Gaspar-Andres - Widow Lucía Pedro Juan quote from El Paso Times
UPDATE sources SET 
  quote = 'immigration officers didn''t allow her to see him before she was deported to Guatemala. The couple had lived together in Florida for nearly two decades',
  quote_context = 'Widow Lucía Pedro Juan told El Paso Times she was not allowed to see her husband before being deported. She only found out he had been taken to a local hospital from their daughter.'
WHERE case_id = '2025-12-03-gaspar-andres' 
  AND title = 'ICE Detention Deaths Tracker';

-- Nenko Gantchev - Congressional statement from Reps Ramirez and Tlaib
UPDATE sources SET 
  quote = 'there have been numerous complaints from family members and advocates about inhumane conditions and inadequate medical care at North Lake',
  quote_context = 'Congresswomen Delia Ramirez and Rashida Tlaib demanded a transparent investigation into reports that Gantchev had asked for medical assistance and did not receive it in time to save his life.'
WHERE case_id = '2025-12-15-gantchev'
  AND title = 'ICE Detention Deaths Tracker';

-- Jean Wilson Brutus - Congressional oversight visit
UPDATE sources SET 
  quote_context = 'Democratic Rep. LaMonica McIver of New Jersey visited Delaney Hall detention facility for oversight after the death of Jean Wilson Brutus.'
WHERE case_id = '2025-12-01-brutus'
  AND title = 'ICE Detention Deaths Tracker';

-- Minneapolis shooting - Mayor Frey quote
UPDATE sources SET 
  quote = 'get the f*** out of Minneapolis',
  quote_context = 'Mayor Jacob Frey disputed ICE self-defense claim, calling their narrative "bulls***" and warning ICE officers to leave Minneapolis.'
WHERE case_id = '2026-01-07-minneapolis-shooting'
  AND title = 'ICE Shoots Woman in Minneapolis';

-- Minneapolis shooting - DHS Secretary Noem and Governor Walz
UPDATE sources SET 
  quote = 'act of domestic terrorism',
  quote_context = 'DHS Secretary Kristi Noem called the woman actions an "act of domestic terrorism" while Governor Tim Walz disputed the self-defense claim and issued a warning order to prepare the Minnesota National Guard.'
WHERE case_id = '2026-01-07-minneapolis-shooting'
  AND title = 'Minneapolis Officials Contradict ICE Account';

-- Verify quotes were added
SELECT 
  c.name,
  s.title,
  LEFT(s.quote, 100) as quote_preview,
  LEFT(s.quote_context, 100) as context_preview
FROM sources s
JOIN cases c ON c.id = s.case_id
WHERE s.quote IS NOT NULL OR s.quote_context IS NOT NULL
ORDER BY c.date_of_death DESC;
