-- Link ALL timeline events to their Guardian sources with article excerpts
-- Each case's timeline events link to the Guardian article that documents them

BEGIN;

-- 2025-01-23 Genry Ruiz Guillén - link to Guardian source
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-01-23-ruiz-guillen'
AND s.case_id = '2025-01-23-ruiz-guillen'
AND s.publisher = 'The Guardian';

-- 2025-01-29 Serawit Gezahegn Dejene
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-01-29-dejene'
AND s.case_id = '2025-01-29-dejene'
AND s.publisher = 'The Guardian';

-- 2025-02-20 Maksym Chernyak
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-02-20-chernyak'
AND s.case_id = '2025-02-20-chernyak'
AND s.publisher = 'The Guardian';

-- 2025-04-08 Brayan Garzón-Rayo
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-04-08-garzon-rayo'
AND s.case_id = '2025-04-08-garzon-rayo'
AND s.publisher = 'The Guardian';

-- 2025-04-16 Nhon Ngoc Nguyen
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-04-16-nguyen'
AND s.case_id = '2025-04-16-nguyen'
AND s.publisher = 'The Guardian';

-- 2025-04-25 Marie Ange Blaise
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-04-25-blaise'
AND s.case_id = '2025-04-25-blaise'
AND s.publisher = 'The Guardian';

-- 2025-05-05 Abelardo Avellaneda Delgado
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-05-05-avellaneda-delgado'
AND s.case_id = '2025-05-05-avellaneda-delgado'
AND s.publisher = 'The Guardian';

-- 2025-06-07 Jesus Molina-Veya
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-06-07-molina-veya'
AND s.case_id = '2025-06-07-molina-veya'
AND s.publisher = 'The Guardian';

-- 2025-06-23 Johnny Noviello
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-06-23-noviello'
AND s.case_id = '2025-06-23-noviello'
AND s.publisher = 'The Guardian';

-- 2025-06-26 Isidro Pérez
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-06-26-perez'
AND s.case_id = '2025-06-26-perez'
AND s.publisher = 'The Guardian';

-- 2025-07-19 Tien Xuan Phan
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-07-19-phan'
AND s.case_id = '2025-07-19-phan'
AND s.publisher = 'The Guardian';

-- 2025-08-05 Chaofeng Ge
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-08-05-ge'
AND s.case_id = '2025-08-05-ge'
AND s.publisher = 'The Guardian';

-- 2025-08-31 Lorenzo Antonio Batrez Vargas
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-08-31-batrez-vargas'
AND s.case_id = '2025-08-31-batrez-vargas'
AND s.publisher = 'The Guardian';

-- 2025-09-08 Oscar Rascon Duarte
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-09-08-rascon-duarte'
AND s.case_id = '2025-09-08-rascon-duarte'
AND s.publisher = 'The Guardian';

-- 2025-09-18 Santos Banegas Reyes
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-09-18-banegas-reyes'
AND s.case_id = '2025-09-18-banegas-reyes'
AND s.publisher = 'The Guardian';

-- 2025-09-22 Ismael Ayala-Uribe
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-09-22-ayala-uribe'
AND s.case_id = '2025-09-22-ayala-uribe'
AND s.publisher = 'The Guardian';

-- 2025-09-24 Norlan Guzman-Fuentes (check both possible IDs)
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id LIKE '%guzman-fuentes%'
AND s.case_id LIKE '%guzman-fuentes%'
AND s.publisher = 'The Guardian';

-- 2025-09-29 Miguel Ángel García Medina / Garcia-Hernandez
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id LIKE '%garcia%'
AND s.case_id LIKE '%garcia%'
AND s.publisher = 'The Guardian';

-- 2025-09-29 Huabing Xie
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-09-29-xie'
AND s.case_id = '2025-09-29-xie'
AND s.publisher = 'The Guardian';

-- 2025-10-04 Leo Cruz-Silva
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-10-04-cruz-silva'
AND s.case_id = '2025-10-04-cruz-silva'
AND s.publisher = 'The Guardian';

-- 2025-10-11 Hasan Ali Moh'D Saleh
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-10-11-saleh'
AND s.case_id = '2025-10-11-saleh'
AND s.publisher = 'The Guardian';

-- 2025-10-23 Jose Castro-Rivera
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id LIKE '%castro-rivera%'
AND s.case_id LIKE '%castro-rivera%'
AND s.publisher = 'The Guardian';

-- 2025-10-23 Gabriel Garcia Aviles
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-10-23-garcia-aviles'
AND s.case_id = '2025-10-23-garcia-aviles'
AND s.publisher = 'The Guardian';

-- 2025-10-25 Kai Yin Wong
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-10-25-wong'
AND s.case_id = '2025-10-25-wong'
AND s.publisher = 'The Guardian';

-- 2025-12-03 Francisco Gaspar-Andres
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-12-03-gaspar-andres'
AND s.case_id = '2025-12-03-gaspar-andres'
AND s.publisher = 'The Guardian';

-- 2025-12-05 Pete Sumalo Montejo
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-12-05-montejo'
AND s.case_id = '2025-12-05-montejo'
AND s.publisher = 'The Guardian';

-- 2025-12-06 Shiraz Fatehali Sachwani
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-12-06-sachwani'
AND s.case_id = '2025-12-06-sachwani'
AND s.publisher = 'The Guardian';

-- 2025-12-01/12 Jean Wilson Brutus
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-12-01-brutus'
AND s.case_id = '2025-12-01-brutus'
AND s.publisher = 'The Guardian';

-- 2025-12-05 Fouad Saeed Abdulkadir
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-12-05-abdulkadir'
AND s.case_id = '2025-12-05-abdulkadir'
AND s.publisher = 'The Guardian';

-- 2025-12-14 Delvin Francisco Rodriguez
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-12-14-rodriguez'
AND s.case_id = '2025-12-14-rodriguez'
AND s.publisher = 'The Guardian';

-- 2025-12-15 Nenko Stanev Gantchev
UPDATE timeline_events t
SET source_id = s.id
FROM sources s
WHERE t.case_id = '2025-12-15-gantchev'
AND s.case_id = '2025-12-15-gantchev'
AND s.publisher = 'The Guardian';

COMMIT;

-- Show cases with timeline events and their source status
SELECT 
  t.case_id,
  COUNT(*) as timeline_events,
  COUNT(t.source_id) as with_sources
FROM timeline_events t
GROUP BY t.case_id
ORDER BY t.case_id;
