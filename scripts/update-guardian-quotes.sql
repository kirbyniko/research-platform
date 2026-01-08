-- Update Guardian sources with actual article excerpts (not personal quotes)
-- These are passages written by the journalists, describing the cases

BEGIN;

-- Genry Ruiz Guillén
UPDATE sources SET 
  quote = 'In October 2024, he was apprehended by local law enforcement, and then transferred to the Krome immigrant detention center in South Florida. His mother told Univision that in December, Guillén called her from detention and told her he wasn''t feeling well, and that he was experiencing fainting spells. It was the last time she spoke with him, she said. According to ICE, Guillén "had difficulty breathing, prompting a medical emergency" before he died.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-01-23-ruiz-guillen' AND publisher = 'The Guardian';

-- Serawit Gezahegn Dejene
UPDATE sources SET
  quote = 'He had come to the US in August 2024, and was apprehended by the border patrol, which transferred him to the Eloy detention center. He had cleared the initial steps to apply for asylum according to ICE. In December 2024, he reported to staff at the detention center that he had an elevated heart rate and fatigue, and was seen by healthcare providers who said he had a possible lymphoma diagnosis, according to ICE.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-01-29-dejene' AND publisher = 'The Guardian';

-- Maksym Chernyak
UPDATE sources SET
  quote = 'Chernyak, 44, fled Kyiv with his long term-partner during the Russia-Ukraine war and came to the US on humanitarian parole. While in custody, he experienced "vomiting and seizure activity", according to ICE. Chernyak was then transferred to a hospital on 18 February, where staff "established a stroke alert due to unresponsive state". An investigation by the Miami Herald said that medical experts who reviewed his case have raised concerns about whether Chernyak received adequate care due to the length of time that elapsed before Krome staff called 911.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-02-20-chernyak' AND publisher = 'The Guardian';

-- Brayan Garzón-Rayo
UPDATE sources SET
  quote = 'Garzón-Rayo''s mother, Lucy Garzón, told St Louis Public Radio that she and her family came to the US in November 2023, fleeing growing threats of violence and harassment from law enforcement in Bogotá. In March Garzón-Rayo was charged with a misdemeanor for credit card fraud, and then transferred to ICE custody. He spoke to his mother a few days before he died and complained about stomach pains and the poor quality of the jail''s food. Lucy Garzón told SLPR that officials told her that her son appeared to have died by suicide. ICE has not confirmed an official cause of death.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-04-08-garzon-rayo' AND publisher = 'The Guardian';

-- Nhon Ngoc Nguyen  
UPDATE sources SET
  quote = 'Nhon Ngoc had been showing early signs of dementia and possible side effects from a head injury prior to his detention. Shortly after his detention, he began experiencing health complications. ICE eventually offered to release him, so long as his family was able to provide him with round-the-clock acute care – but he didn''t have health insurance and his family was unable to pay for such care. In the meantime, Nhon Ngoc''s condition began rapidly worsening. He died of acute pneumonia, according to ICE.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-04-16-nguyen' AND publisher = 'The Guardian';

-- Marie Ange Blaise
UPDATE sources SET
  quote = 'According to reporting by WLRN Public Media on the medical examiner''s report about her death, Blaise spoke to her son hours before she died. "She complained of having chest pains and abdominal cramps, and when she asked the detention staff to see a physician, they refused her," her son told investigators. According to the outlet, ICE offered a conflicting account, saying that Blaise did not take blood pressure medication she was offered.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-04-25-blaise' AND publisher = 'The Guardian';

-- Abelardo Avellaneda Delgado
UPDATE sources SET
  quote = 'Abelardo Avellaneda Delgado, 68, died while in transit from a local jail to a federal detention center, the first detainee to die in this manner in at least a decade. His family told the Guardian they grew alarmed by his deterioration in jail, and worried about the medications he was being given. Eventually, Delgado was transferred from the jail to Georgia''s Stewart detention center. But he never made it. Instead, he became "unresponsive" in the transport van with highly elevated blood pressure; the driver called 911, but Delgado died on the scene.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-05-05-avellaneda-delgado' AND publisher = 'The Guardian';

-- Johnny Noviello
UPDATE sources SET
  quote = 'Noviello moved with family from Quebec to Florida in 1988 and became a lawful permanent resident in 1991. His father, Angelo, told the Guardian that Johnny was diagnosed with epilepsy shortly after he was born. He spent time in prison for selling drugs, including hydrocodone and oxycodone, but was released early on good behavior. He was apprehended by ICE agents on 15 May at the Florida department of corrections probation office. Noviello''s father said the family has not received an autopsy report.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-06-23-noviello' AND publisher = 'The Guardian';

-- Isidro Pérez
UPDATE sources SET
  quote = 'According to the Miami Herald, Pérez was a mechanic and fisher from Cuba, and arrived in the US in 1966 at the age of 16. He was convicted of marijuana possession in the 1980s and served time in prison. His stepdaughter told the Herald that, during his time behind bars, Pérez studied to become a mechanic, and that when he got out of prison, he began rescuing animals. On 5 June, five immigration officers apprehended Pérez at a community center. Three weeks later, Pérez died in ICE custody.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-06-26-perez' AND publisher = 'The Guardian';

-- Chaofeng Ge
UPDATE sources SET
  quote = 'Ge was born in 1992 in Luoyang, Henan province, China, and worked in construction. He arrived in the US via the southern border in 2023, when he was detained for unlawful entry. He was eventually released and settled in Queens, New York, where he worked as a delivery driver. In 2025, he was arrested for possessing several stolen credit card numbers in his cell phone and for unauthorized access to a device, and was eventually detained by ICE. ICE and the Pennsylvania state police said that he died by suicide while detained. His family filed a Freedom of Information Act lawsuit against the Department of Homeland Security.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-08-05-ge' AND publisher = 'The Guardian';

-- Lorenzo Antonio Batrez Vargas
UPDATE sources SET
  quote = 'Known as "Lenchito" by friends and family, Batrez Vargas was a Deferred Action for Childhood Arrivals (Daca) recipient who was brought to the US from Mexico as a five-year-old. He was arrested by police in Flagstaff, Arizona, on 2 August, and charged with possession and use of drug paraphernalia. Immigration enforcement agents said they took Batrez Vargas into custody in Phoenix before transferring him to the detention center in Florence, where his family believes he contracted Covid-19.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-08-31-batrez-vargas' AND publisher = 'The Guardian';

-- Santos Banegas Reyes
UPDATE sources SET
  quote = 'He was a construction worker and a father of two daughters, one of whom lives in the US while the other lives in Honduras. He was apprehended on 17 September by federal immigration agents just hours before he was found "not breathing" in his cell at the Nassau county correctional center. According to ICE, the preliminary cause of death appeared to be liver failure complicated by alcoholism. His family is contesting his cause of death, and have requested an independent autopsy.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-09-18-banegas-reyes' AND publisher = 'The Guardian';

-- Ismael Ayala-Uribe
UPDATE sources SET
  quote = 'Uribe had been protected from deportation under the Daca program, but he was denied renewal because he had been convicted of driving under the influence. He was apprehended in August during an immigration raid at the Fountain Valley Auto Wash, where he had worked for about 15 years, and was transferred to Adelanto. There, he fell ill – first with a cough and fever, and then other medical complications, according to his family. He was transferred to a hospital, where he died.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-09-22-ayala-uribe' AND publisher = 'The Guardian';

-- Huabing Xie
UPDATE sources SET
  quote = 'The border patrol had apprehended Xie on 12 September in Indio, California, and transferred him to the Imperial regional detention facility. In 2023, he had been placed under removal proceedings. The agency said that Xie experienced "what appeared to be a seizure and became unresponsive" and medical personnel at the detention center tried to administer life-saving measures, before emergency medical services arrived and took him to the hospital, where he died.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-09-29-xie' AND publisher = 'The Guardian';

-- Norlan Guzman-Fuentes
UPDATE sources SET
  quote = 'Norlan Guzman-Fuentes, 37, of El Salvador, was killed when a gunman opened fire at the ICE field office where he was being held. Guzman-Fuentes was arrested by Dallas police in late August, due to an outstanding warrant for driving under the influence and other charges that were later dropped. He is survived by his partner, Berenice Prieto, and four children. He had worked mowing lawns and trimming trees, and in his free time he liked fishing around the Dallas-Forth Worth area.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id IN (SELECT id FROM cases WHERE name = 'Norlan Guzman-Fuentes') AND publisher = 'The Guardian';

-- Miguel Ángel García Medina
UPDATE sources SET
  quote = 'García Medina was born in San Luis Potosí, a central state in Mexico, and crossed the US border without papers when he was a teenager, settling in Arlington, Texas. He had lived in the Dallas area for nearly two decades, most recently making a living painting and remodeling homes. He ended up in ICE custody early on 24 September, after a short time in jail for a DUI. While he was shackled inside a government van outside the ICE field office, a gunman opened fire. He died five days later of his gunshot wounds.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id IN (SELECT id FROM cases WHERE name = 'Miguel Angel Garcia-Hernandez') AND publisher = 'The Guardian';

-- Francisco Gaspar-Andrés
UPDATE sources SET
  quote = 'According to an interview Pedro Juan gave to the El Paso Times, the couple had gone on a grocery run during the Labor Day holiday when they were pulled over by a highway patrol officer who asked to see their identification papers, and then turned them over to ICE; they were eventually separated by immigration officers. Gaspar-Andrés ended up at Camp East Montana, a detention facility at the Texas military base known as Fort Bliss. The American Civil Liberties Union has called the facility a "human and civil rights catastrophe" following several reports of injuries, illnesses and abuses. He was repeatedly seen by medical staff for symptoms including bleeding gums, sore throat and body aches, fever, jaundice and hypertension.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-12-03-gaspar-andres' AND publisher = 'The Guardian';

-- Jean Wilson Brutus
UPDATE sources SET
  quote = 'Brutus came to the US in 2023 as an asylum seeker. ICE said Brutus died of "suspected natural causes". The conditions at Delaney Hall, where Brutus was held, have come under scrutiny from lawmakers and advocates. Andy Kim, a Democratic senator from New Jersey, toured Delaney Hall the day after Brutus''s death and spoke to about 80 detainees, who he said described receiving poor medical care and "disgusting" meals that included raw meat. He called for the facility to be closed.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-12-01-brutus' AND publisher = 'The Guardian';

-- Fouad Saeed Abdulkadir
UPDATE sources SET
  quote = 'According to court documents obtained by the Daily Voice, Abdulkadir filed for an emergency federal motion for medical relief three days before he died. Abdulkadir had been an imam at the Islamic Center of Northeast Ohio, and had gained a green card in 2018. In 2023, he was charged with wire fraud and misuse of public funds and later sentenced to prison. Supporters wrote to a US district judge requesting leniency, arguing that Abdulkadir may not have fully understood the application process for the benefits programs he was convicted of misusing.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-12-05-abdulkadir' AND publisher = 'The Guardian';

-- Nenko Stanev Gantchev
UPDATE sources SET
  quote = 'Gantchev was "discovered unresponsive on the floor of his cell during routine checks", and his official cause of death is still under investigation, according to ICE. He was apprehended by immigration agents in September as part of the administration''s "Operation Midway Blitz", which sent hundreds of federal agents to Chicago to crack down on unauthorized immigrants. His wife, a US citizen, told the Serbian Times that Gantchev had type 2 diabetes and had complained for months about his deteriorating health.',
  quote_context = 'The Guardian, Jan 4 2026'
WHERE case_id = '2025-12-15-gantchev' AND publisher = 'The Guardian';

COMMIT;

-- Show summary
SELECT 
  case_id,
  LEFT(quote, 100) || '...' as excerpt,
  quote_context
FROM sources 
WHERE publisher = 'The Guardian' 
  AND quote IS NOT NULL
ORDER BY case_id
LIMIT 10;
