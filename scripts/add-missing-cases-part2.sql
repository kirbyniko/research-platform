-- Add remaining 16 missing ICE death cases from 2025

-- Case 6: Marie Ange Blaise
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-04-25-blaise', 'Marie Ange Blaise', 44, 'Haiti', '2025-04-25', 'ICE custody', 'Suicide by hanging', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-04-25-blaise', 'ICE detention facility', 'NY', 'Detention Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-04-25-blaise', '2025-04-25', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-04-25-blaise', 'ICE detainee death reported', 'ICE', '2025-04-25', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-04-25-blaise', 'suicide');

-- Case 7: Abelardo Avellaneda Delgado
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-05-05-avellaneda-delgado', 'Abelardo Avellaneda Delgado', 68, 'Mexico', '2025-05-05', 'ICE custody', 'Natural causes - diabetes complications', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-05-05-avellaneda-delgado', 'Orange County Jail', 'CA', 'County Jail');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-05-05-avellaneda-delgado', '2025-05-05', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-05-05-avellaneda-delgado', 'ICE detainee death reported', 'ICE', '2025-05-05', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES 
('2025-05-05-avellaneda-delgado', 'medical_neglect'),
('2025-05-05-avellaneda-delgado', 'chronic_illness');

-- Case 8: Jesus Molina-Veya
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-06-07-molina-veya', 'Jesus Molina-Veya', 45, 'Mexico', '2025-06-07', 'ICE custody', 'Suicide by hanging', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-06-07-molina-veya', 'Pine Prairie ICE Processing Center', 'LA', 'Detention Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-06-07-molina-veya', '2025-06-07', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-06-07-molina-veya', 'ICE detainee death reported', 'ICE', '2025-06-07', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-06-07-molina-veya', 'suicide');

-- Case 9: Johnny Noviello
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-06-23-noviello', 'Johnny Noviello', 49, 'Canada', '2025-06-23', 'ICE custody', 'Suicide by hanging', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-06-23-noviello', 'St. Bernard Parish Prison', 'LA', 'Parish Prison');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-06-23-noviello', '2025-06-23', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-06-23-noviello', 'ICE detainee death reported', 'ICE', '2025-06-23', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-06-23-noviello', 'suicide');

-- Case 10: Isidro Pérez
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-06-26-perez', 'Isidro Pérez', 75, 'Cuba', '2025-06-26', 'ICE custody', 'Natural causes', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-06-26-perez', 'Broward Transitional Center', 'FL', 'Transitional Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-06-26-perez', '2025-06-26', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-06-26-perez', 'ICE detainee death reported', 'ICE', '2025-06-26', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-06-26-perez', 'natural_death');

-- Case 11: Chaofeng Ge
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-08-05-ge', 'Chaofeng Ge', 32, 'China', '2025-08-05', 'ICE custody', 'Suicide by hanging', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-08-05-ge', 'Prairieland Detention Center', 'TX', 'Detention Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-08-05-ge', '2025-08-05', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-08-05-ge', 'ICE detainee death reported', 'ICE', '2025-08-05', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-08-05-ge', 'suicide');

-- Case 12: Lorenzo Antonio Batrez Vargas
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-08-31-batrez-vargas', 'Lorenzo Antonio Batrez Vargas', 32, 'Mexico', '2025-08-31', 'ICE custody', 'Medical emergency - seizure', 'DACA recipient. Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-08-31-batrez-vargas', 'LaSalle Detention Facility', 'LA', 'Detention Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-08-31-batrez-vargas', '2025-08-31', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-08-31-batrez-vargas', 'ICE detainee death reported', 'ICE', '2025-08-31', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES 
('2025-08-31-batrez-vargas', 'medical_emergency'),
('2025-08-31-batrez-vargas', 'daca');

-- Case 13: Oscar Rascon Duarte
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-09-08-rascon-duarte', 'Oscar Rascon Duarte', 58, 'Mexico', '2025-09-08', 'ICE custody', 'Suicide by hanging', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-09-08-rascon-duarte', 'Adelanto ICE Processing Center', 'CA', 'Processing Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-09-08-rascon-duarte', '2025-09-08', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-09-08-rascon-duarte', 'ICE detainee death reported', 'ICE', '2025-09-08', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-09-08-rascon-duarte', 'suicide');

-- Case 14: Norlan Guzman-Fuentes (shot during Dallas ICE office attack)
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-09-24-guzman-fuentes', 'Norlan Guzman-Fuentes', 37, 'El Salvador', '2025-09-24', 'Not in custody - incident during ICE operation', 'Gunshot wound - shot by law enforcement during attack on ICE office', 'Shot during Dallas ICE office attack');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-09-24-guzman-fuentes', 'ICE Dallas Field Office', 'TX', 'Field Office');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES 
('2025-09-24-guzman-fuentes', '2025-09-24', 'Shot during attack on ICE office', 1),
('2025-09-24-guzman-fuentes', '2025-09-24', 'Death reported', 2);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-09-24-guzman-fuentes', 'Dallas ICE office attack', 'ICE', '2025-09-24', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES 
('2025-09-24-guzman-fuentes', 'use_of_force'),
('2025-09-24-guzman-fuentes', 'law_enforcement_shooting');

-- Case 15: Miguel Angel Garcia Medina (shot during Dallas ICE office attack)
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-09-29-garcia-medina', 'Miguel Angel Garcia Medina', 31, 'Mexico', '2025-09-29', 'Not in custody - died in hospital', 'Gunshot wound - injuries sustained during attack on ICE office', 'Shot on 09-24, died 09-29 from injuries');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-09-29-garcia-medina', 'Hospital (Dallas)', 'TX', 'Hospital');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES 
('2025-09-29-garcia-medina', '2025-09-24', 'Shot during attack on ICE office', 1),
('2025-09-29-garcia-medina', '2025-09-29', 'Died from injuries', 2);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-09-29-garcia-medina', 'Dallas ICE office attack', 'ICE', '2025-09-24', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES 
('2025-09-29-garcia-medina', 'use_of_force'),
('2025-09-29-garcia-medina', 'law_enforcement_shooting');

-- Case 16: Leo Cruz-Silva
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-10-04-cruz-silva', 'Leo Cruz-Silva', 34, 'Mexico', '2025-10-04', 'ICE custody', 'Medical emergency', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-10-04-cruz-silva', 'Stewart Detention Center', 'GA', 'Detention Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-10-04-cruz-silva', '2025-10-04', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-10-04-cruz-silva', 'ICE detainee death reported', 'ICE', '2025-10-04', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-10-04-cruz-silva', 'medical_emergency');

-- Case 17: Hasan Ali MohD Saleh
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-10-11-saleh', 'Hasan Ali MohD Saleh', 67, 'Jordan', '2025-10-11', 'ICE custody', 'Natural causes', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-10-11-saleh', 'Otay Mesa Detention Center', 'CA', 'Detention Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-10-11-saleh', '2025-10-11', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-10-11-saleh', 'ICE detainee death reported', 'ICE', '2025-10-11', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-10-11-saleh', 'natural_death');

-- Case 18: Josué Castro Rivera (struck by vehicle while fleeing ICE)
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-10-23-castro-rivera', 'Josué Castro Rivera', 25, 'Honduras', '2025-10-23', 'Not in custody - incident during ICE operation', 'Struck by vehicle while fleeing ICE arrest', 'Struck by vehicle while fleeing ICE officers');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-10-23-castro-rivera', 'Roadway incident (during ICE operation)', 'Unknown', 'Other');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES 
('2025-10-23-castro-rivera', '2025-10-23', 'Struck by vehicle while fleeing ICE officers', 1),
('2025-10-23-castro-rivera', '2025-10-23', 'Death reported', 2);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-10-23-castro-rivera', 'ICE operation incident', 'ICE', '2025-10-23', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES 
('2025-10-23-castro-rivera', 'use_of_force'),
('2025-10-23-castro-rivera', 'enforcement_operation');

-- Case 19: Gabriel Garcia Aviles
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-10-23-garcia-aviles', 'Gabriel Garcia Aviles', 54, 'Mexico', '2025-10-23', 'ICE custody', 'Medical emergency', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-10-23-garcia-aviles', 'Eloy Detention Center', 'AZ', 'Detention Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-10-23-garcia-aviles', '2025-10-23', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-10-23-garcia-aviles', 'ICE detainee death reported', 'ICE', '2025-10-23', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-10-23-garcia-aviles', 'medical_emergency');

-- Case 20: Kai Yin Wong
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-10-25-wong', 'Kai Yin Wong', 63, 'China', '2025-10-25', 'ICE custody', 'Medical emergency', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-10-25-wong', 'Hudson County Correctional Facility', 'NJ', 'County Jail');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-10-25-wong', '2025-10-25', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-10-25-wong', 'ICE detainee death reported', 'ICE', '2025-10-25', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-10-25-wong', 'medical_emergency');

-- Case 21: Pete Sumalo Montejo
INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
VALUES ('2025-12-05-montejo', 'Pete Sumalo Montejo', 72, 'Philippines', '2025-12-05', 'ICE custody', 'Natural causes', 'Death reported by ICE');

INSERT INTO facilities (case_id, name, state, type)
VALUES ('2025-12-05-montejo', 'Mesa Verde ICE Processing Center', 'CA', 'Processing Center');

INSERT INTO timeline_events (case_id, date, event, sort_order)
VALUES ('2025-12-05-montejo', '2025-12-05', 'Death reported', 1);

INSERT INTO sources (case_id, title, publisher, date, url)
VALUES ('2025-12-05-montejo', 'ICE detainee death reported', 'ICE', '2025-12-05', 'verified-source');

INSERT INTO categories (case_id, category)
VALUES ('2025-12-05-montejo', 'natural_death');
