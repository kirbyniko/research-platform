-- Add Minneapolis shooting case (2026-01-07)
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES (
  '2026-01-07-minneapolis-shooting',
  'Unnamed Woman (37 years old)',
  37,
  'United States',
  '2026-01-07',
  'Bystander - Not in custody',
  'Gunshot wounds to the head from ICE officer',
  'US citizen killed by ICE officer. Name not yet publicly released. FBI and Minnesota Bureau of Criminal Apprehension jointly investigating. Woman was NOT a target of enforcement - described as legal observer/community member.'
);

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2026-01-07-minneapolis-shooting', 'Street Incident - East 34th Street and Portland Avenue', 'MN', 'Other');

INSERT INTO timeline_events (case_id, date, event, sort_order) VALUES
('2026-01-07-minneapolis-shooting', '2026-01-07', '~9:30 AM - Whistles sounded to alert neighborhood of ICE presence', 0),
('2026-01-07-minneapolis-shooting', '2026-01-07', 'Woman in Honda Pilot blocked by federal agents', 1),
('2026-01-07-minneapolis-shooting', '2026-01-07', 'ICE agent attempted to open driver door', 2),
('2026-01-07-minneapolis-shooting', '2026-01-07', 'Woman put vehicle in reverse, then drive', 3),
('2026-01-07-minneapolis-shooting', '2026-01-07', 'ICE agent fired at least 2-3 shots, striking woman in head', 4),
('2026-01-07-minneapolis-shooting', '2026-01-07', 'Vehicle traveled several feet before crashing', 5),
('2026-01-07-minneapolis-shooting', '2026-01-07', 'Woman transported to Hennepin Healthcare', 6),
('2026-01-07-minneapolis-shooting', '2026-01-07', 'Pronounced dead at hospital', 7);

INSERT INTO discrepancies (case_id, ice_claim, counter_evidence)
VALUES ('2026-01-07-minneapolis-shooting', 
  'Woman "weaponized her vehicle, attempting to run over officers" - called it "an act of domestic terrorism"',
  'Multiple videos from witnesses contradict this. Mayor Jacob Frey watched videos and called ICE narrative "bulls**t". Governor Tim Walz stated "Don''t believe this propaganda machine." Senator Tina Smith confirmed woman was a US citizen.');

INSERT INTO sources (case_id, title, publisher, date, url) VALUES
('2026-01-07-minneapolis-shooting', 'ICE Shoots Woman in Minneapolis', 'CBS News Minnesota', '2026-01-07', 'https://www.cbsnews.com/minnesota/'),
('2026-01-07-minneapolis-shooting', 'Minneapolis Officials Contradict ICE Account', 'The Guardian', '2026-01-07', 'https://www.theguardian.com');

INSERT INTO categories (case_id, category) VALUES
('2026-01-07-minneapolis-shooting', 'Officer-involved shooting'),
('2026-01-07-minneapolis-shooting', 'Bystander death');
