// Add verified cases from The Guardian article
// Source: "2025 was ICE's deadliest year in two decades. Here are the 32 people who died in custody"
// URL: https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record
// Authors: Maanvi Singh, Coral Murphy Marcos and Charlotte Simmonds
// Published: Sun 4 Jan 2026

const { Client } = require('pg');

const GUARDIAN_SOURCE = {
  title: "2025 was ICE's deadliest year in two decades. Here are the 32 people who died in custody",
  publisher: "The Guardian",
  date: "2026-01-04",
  url: "https://www.theguardian.com/us-news/2025/dec/23/ice-custody-deaths-2025-record"
};

// Cases extracted from Guardian article - chronological order
// Format matches our database schema
const guardianCases = [
  {
    id: "2025-01-23-ruiz-guillen",
    name: "Genry Ruiz Guillén",
    age: 29,
    nationality: "Honduras",
    date_of_death: "2025-01-23",
    custody_status: "ICE Detention",
    official_cause_of_death: "Difficulty breathing, medical emergency",
    notes: "Came to US from Honduras in 2023. Worked in construction. Apprehended by local law enforcement in October 2024, transferred to Krome detention center.",
    facility: {
      name: "Krome Service Processing Center",
      city: "Miami",
      state: "FL",
      type: "ICE Processing Center"
    },
    categories: ["Medical Neglect", "Respiratory Illness"],
    quote: "I never thought my son would come to this country to die like this, nor did I ever think I would receive that news.",
    quote_context: "Mother told Univision"
  },
  {
    id: "2025-01-29-dejene",
    name: "Serawit Gezahegn Dejene",
    age: 45,
    nationality: "Ethiopia",
    date_of_death: "2025-01-29",
    custody_status: "ICE Detention",
    official_cause_of_death: "Under investigation (possible lymphoma)",
    notes: "Came to US in August 2024, apprehended by border patrol. Had cleared initial steps to apply for asylum. Reported elevated heart rate and fatigue in December 2024.",
    facility: {
      name: "Eloy Detention Center",
      city: "Eloy",
      state: "AZ",
      type: "Detention Center"
    },
    categories: ["Medical Neglect", "Cancer/Serious Illness", "Asylum Seeker"],
    quote: null,
    quote_context: null
  },
  {
    id: "2025-02-23-tineo-martinez",
    name: "Juan Alexis Tineo-Martinez",
    age: 44,
    nationality: "Dominican Republic",
    date_of_death: "2025-02-23",
    custody_status: "CBP Custody",
    official_cause_of_death: "Under investigation",
    notes: "Taken into custody by CBP air marine operations two days prior to death. Reported leg pain, transferred to hospital for evaluation.",
    facility: {
      name: "Centro Medico Hospital",
      city: "San Juan",
      state: "PR",
      type: "Hospital (in custody)"
    },
    categories: ["Medical Neglect"],
    quote: null,
    quote_context: null
  },
  {
    id: "2025-04-08-garzon-rayo",
    name: "Brayan Garzón-Rayo",
    age: 27,
    nationality: "Colombia",
    date_of_death: "2025-04-08",
    custody_status: "ICE Detention",
    official_cause_of_death: "Apparent suicide (per officials, not confirmed by ICE)",
    notes: "Family came to US in November 2023, fleeing violence in Bogotá. Charged with misdemeanor credit card fraud in March. Complained of stomach pains and poor jail food.",
    facility: {
      name: "Phelps County Jail",
      city: "Rolla",
      state: "MO",
      type: "County Jail"
    },
    categories: ["Suicide", "Mental Health", "Asylum Seeker"],
    quote: null,
    quote_context: null
  },
  {
    id: "2025-04-16-nguyen",
    name: "Nhon Ngoc Nguyen",
    age: 55,
    nationality: "Vietnam",
    date_of_death: "2025-04-16",
    custody_status: "ICE Detention",
    official_cause_of_death: "Acute pneumonia",
    notes: "Came to US in 1983, legal resident under Refugee Act of 1980. Had dementia signs and possible head injury effects. ICE offered release but required acute care family couldn't afford.",
    facility: {
      name: "El Paso Processing Center",
      city: "El Paso",
      state: "TX",
      type: "ICE Processing Center"
    },
    categories: ["Medical Neglect", "Respiratory Illness", "Mental Health"],
    quote: "He was kind.",
    quote_context: "Attorney Tin Nguyen"
  },
  {
    id: "2025-04-25-blaise",
    name: "Marie Ange Blaise",
    age: 44,
    nationality: "Haiti",
    date_of_death: "2025-04-25",
    custody_status: "ICE Detention",
    official_cause_of_death: "Under investigation",
    notes: "Apprehended by CBP on February 12 while attempting to board flight. Spoke to son hours before death, complained of chest pains and abdominal cramps. Family alleges staff refused physician request.",
    facility: {
      name: "Broward Transitional Center",
      city: "Pompano Beach",
      state: "FL",
      type: "Transitional Center"
    },
    categories: ["Medical Neglect", "Cardiac Issues"],
    quote: "She complained of having chest pains and abdominal cramps, and when she asked the detention staff to see a physician, they refused her.",
    quote_context: "Son told investigators, per WLRN Public Media"
  },
  {
    id: "2025-05-05-avellaneda-delgado",
    name: "Abelardo Avellaneda Delgado",
    age: 68,
    nationality: "Mexico",
    date_of_death: "2025-05-05",
    custody_status: "ICE Custody (in transit)",
    official_cause_of_death: "Under investigation",
    notes: "First detainee to die in transit in at least a decade. Originally from El Huariche, Mexico. Nearly 40 years in US, raised large family, worked on tobacco and vegetable farms. Became unresponsive in transport van with highly elevated blood pressure.",
    facility: {
      name: "In Transit (to Stewart Detention Center)",
      city: "Statenville",
      state: "GA",
      type: "Transport"
    },
    categories: ["Medical Neglect", "Cardiac Issues", "In Transit Death"],
    quote: "It bothers me. He was a great-grandfather.",
    quote_context: "Son Junior told Guardian in June"
  },
  {
    id: "2025-06-07-molina-veya",
    name: "Jesus Molina-Veya",
    age: 45,
    nationality: "Mexico",
    date_of_death: "2025-06-07",
    custody_status: "ICE Detention",
    official_cause_of_death: "Apparent suicide",
    notes: "Entered country without authorization multiple times starting 1999. Found unresponsive in cell. Second reported death in Georgia within a month.",
    facility: {
      name: "Stewart Detention Center",
      city: "Lumpkin",
      state: "GA",
      type: "Detention Center"
    },
    categories: ["Suicide", "Mental Health"],
    quote: null,
    quote_context: null
  },
  {
    id: "2025-06-23-noviello",
    name: "Johnny Noviello",
    age: 49,
    nationality: "Canada",
    date_of_death: "2025-06-23",
    custody_status: "ICE Detention",
    official_cause_of_death: "Under investigation",
    notes: "Moved from Quebec to Florida in 1988, lawful permanent resident since 1991. Diagnosed with epilepsy shortly after birth. Worked at Dollar Tree, loved beach and pool. Family has not received autopsy report.",
    facility: {
      name: "Federal Detention Center Miami",
      city: "Miami",
      state: "FL",
      type: "Federal Detention Center (BOP)"
    },
    categories: ["Medical Neglect", "Neurological Condition"],
    quote: "We're in limbo, we don't know what happened. I don't know why they didn't send him to Canada right away.",
    quote_context: "Father Angelo told Guardian"
  },
  {
    id: "2025-06-26-perez",
    name: "Isidro Pérez",
    age: 75,
    nationality: "Cuba",
    date_of_death: "2025-06-26",
    custody_status: "ICE Detention",
    official_cause_of_death: "Undetermined",
    notes: "Arrived in US in 1966 at age 16. Convicted of marijuana possession in 1980s, served time, became mechanic after release and rescued animals. Apprehended June 5 at community center.",
    facility: {
      name: "Krome North Service Processing Center",
      city: "Miami",
      state: "FL",
      type: "ICE Processing Center"
    },
    categories: ["Medical Neglect", "Elderly Detainee"],
    quote: "We're all humans, you know, we make mistakes, but we remake ourselves.",
    quote_context: "Stepdaughter told Miami Herald"
  },
  {
    id: "2025-08-05-ge",
    name: "Chaofeng Ge",
    age: 32,
    nationality: "China",
    date_of_death: "2025-08-05",
    custody_status: "ICE Detention",
    official_cause_of_death: "Suicide (per ICE and PA state police)",
    notes: "Born 1992 in Luoyang, Henan province. Arrived via southern border in 2023. Worked as delivery driver in Queens. Died four days after entering ICE custody. Family filed FOIA lawsuit.",
    facility: {
      name: "ICE Facility",
      city: "Pennsylvania",
      state: "PA",
      type: "ICE Detention"
    },
    categories: ["Suicide", "Mental Health"],
    quote: "I am devastated by the loss of my brother and by the knowledge that he was suffering so greatly in that detention center. He did not deserve to be treated that way. I want justice for my brother, answers as to how this could have happened, and accountability for those responsible for his death.",
    quote_context: "Brother Yaofeng Ge in public statement"
  },
  {
    id: "2025-08-31-batrez-vargas",
    name: "Lorenzo Antonio Batrez Vargas",
    age: 32,
    nationality: "Mexico",
    date_of_death: "2025-08-31",
    custody_status: "ICE Detention",
    official_cause_of_death: "Unknown, under investigation",
    notes: "Known as 'Lenchito'. DACA recipient brought to US from Mexico at age 5. Arrested August 2 for drug paraphernalia possession. Family believes he contracted COVID-19 in detention.",
    facility: {
      name: "Central Arizona Florence Correctional Complex",
      city: "Florence",
      state: "AZ",
      type: "Correctional Complex"
    },
    categories: ["Medical Neglect", "COVID-19", "DACA Recipient"],
    quote: "We want justice. We want this to never happen to anyone else, especially not to undocumented immigrants.",
    quote_context: "Uncle Jaime Vargas told Univision"
  },
  {
    id: "2025-09-08-rascon-duarte",
    name: "Oscar Rascon Duarte",
    age: 58,
    nationality: "Mexico",
    date_of_death: "2025-09-08",
    custody_status: "ICE Detention",
    official_cause_of_death: "Late-stage Alzheimer disease, kidney cancer, hepatitis C",
    notes: "First came to US in 1976, deported 2004, re-entered. Served 20-year sentence. Transferred to Promise Hospital Mesa due to multiple serious medical conditions requiring higher level of care.",
    facility: {
      name: "Promise Hospital",
      city: "Mesa",
      state: "AZ",
      type: "Long-term Medical Facility"
    },
    categories: ["Medical Neglect", "Cancer/Serious Illness", "Mental Health"],
    quote: null,
    quote_context: null
  },
  {
    id: "2025-09-18-banegas-reyes",
    name: "Santos Banegas Reyes",
    age: 42,
    nationality: "Honduras",
    date_of_death: "2025-09-18",
    custody_status: "ICE Detention",
    official_cause_of_death: "Liver failure complicated by alcoholism (preliminary, contested by family)",
    notes: "Construction worker, father of two daughters. Apprehended September 17, found 'not breathing' in cell at Nassau County Correctional Center just hours later. Family requesting independent autopsy.",
    facility: {
      name: "Nassau County Correctional Center",
      city: "Nassau County",
      state: "NY",
      type: "County Jail"
    },
    categories: ["Medical Neglect", "Rapid Deterioration"],
    quote: null,
    quote_context: null
  },
  // Note: Ismael Ayala-Uribe (Sept 22) already in database
  // Note: Norlan Guzman-Fuentes (Sept 24) already in database
  // Note: Miguel Ángel García Medina (Sept 29) already in database - but has wrong date
  // Note: Huabing Xie (Sept 29) already in database
  {
    id: "2025-10-04-cruz-silva",
    name: "Leo Cruz-Silva",
    age: 34,
    nationality: "Mexico",
    date_of_death: "2025-10-04",
    custody_status: "ICE Detention",
    official_cause_of_death: "Apparent suicide",
    notes: "Detained for public intoxication in Festus, Missouri. Likely entered US before 2010 as child, expelled twice after re-entering. About 50 people organized vigil.",
    facility: {
      name: "Ste Genevieve County Jail",
      city: "Ste Genevieve",
      state: "MO",
      type: "County Jail"
    },
    categories: ["Suicide", "Mental Health"],
    quote: "He was a person, he was a brother, he was a son, he was a person. All loss of life, in my opinion, is tragic, and I hate that it happened in our community.",
    quote_context: "Susie Johnson, founder of Abide in Love non-profit, told St Louis Public Radio"
  },
  {
    id: "2025-10-11-saleh",
    name: "Hasan Ali Moh'D Saleh",
    age: 67,
    nationality: "Jordan",
    date_of_death: "2025-10-11",
    custody_status: "ICE Detention",
    official_cause_of_death: "Cardiac arrest (preliminary)",
    notes: "From Jordan, came to US in 1994, lawful permanent resident. Managed convenience store in Fort Lauderdale. Charged in 2017 food stamp scheme. Taken to hospital due to high fever, became unresponsive.",
    facility: {
      name: "Krome Detention Center",
      city: "Miami",
      state: "FL",
      type: "Detention Center"
    },
    categories: ["Medical Neglect", "Cardiac Issues"],
    quote: null,
    quote_context: null
  },
  // Note: Jose Castro-Rivera (Oct 23) already in database with slightly different date
  {
    id: "2025-10-23-garcia-aviles",
    name: "Gabriel Garcia Aviles",
    age: 54,
    nationality: "Mexico",
    date_of_death: "2025-10-23",
    custody_status: "ICE Detention",
    official_cause_of_death: "Natural causes, complications of alcohol withdrawal (disputed by family)",
    notes: "Living in US for 30 years. Father of two, grandfather of three. Grabbed during CBP 'roving patrol' in Costa Mesa on Oct 14. Family couldn't contact him at Adelanto - died about a week after detention.",
    facility: {
      name: "Adelanto Detention Facility",
      city: "Adelanto",
      state: "CA",
      type: "Detention Center"
    },
    categories: ["Medical Neglect", "Rapid Deterioration", "Family Communication Denied"],
    quote: null,
    quote_context: "Daughter Mariel told LA Taco he was 'always happy and loved bikes'"
  },
  {
    id: "2025-10-25-wong",
    name: "Kai Yin Wong",
    age: 63,
    nationality: "China",
    date_of_death: "2025-10-25",
    custody_status: "ICE Detention",
    official_cause_of_death: "Complications from heart valve repair surgery",
    notes: "First came to US in 1970 as permanent resident. Detained at South Texas ICE Processing Center in Pearsall. Transferred multiple times for heart failure and possible pneumonia, eventually died from surgical complications.",
    facility: {
      name: "South Texas ICE Processing Center",
      city: "Pearsall",
      state: "TX",
      type: "ICE Processing Center"
    },
    categories: ["Medical Neglect", "Cardiac Issues"],
    quote: null,
    quote_context: null
  },
  // Note: Francisco Gaspar-Andrés (Dec 3) already in database
  {
    id: "2025-12-05-montejo",
    name: "Pete Sumalo Montejo",
    age: 72,
    nationality: "Philippines",
    date_of_death: "2025-12-05",
    custody_status: "ICE Detention",
    official_cause_of_death: "Complications from pneumonia (shortness of breath, hypoxia, anemia, septic shock)",
    notes: "First came to US from Philippines in 1962, lawful permanent resident. Detained at Montgomery Processing Center in February. Experienced multiple medical complications.",
    facility: {
      name: "Montgomery Processing Center",
      city: "Montgomery",
      state: "AL",
      type: "ICE Processing Center"
    },
    categories: ["Medical Neglect", "Respiratory Illness", "Elderly Detainee"],
    quote: null,
    quote_context: null
  },
  {
    id: "2025-12-06-sachwani",
    name: "Shiraz Fatehali Sachwani",
    age: 48,
    nationality: "Pakistan",
    date_of_death: "2025-12-06",
    custody_status: "ICE Detention",
    official_cause_of_death: "Natural causes",
    notes: "Came to US in 1996 as nonimmigrant visitor, overstayed visa. Arrested 2017, ordered to leave after missing 2019 hearing. Spent over 5 months at Prairieland before death. Had chronic respiratory, liver, kidney issues.",
    facility: {
      name: "Prairieland Detention Center",
      city: "Alvarado",
      state: "TX",
      type: "Detention Center"
    },
    categories: ["Medical Neglect", "Respiratory Illness", "Kidney/Liver Issues"],
    quote: null,
    quote_context: null
  }
  // Note: Jean Wilson Brutus (Dec 12) already in database
  // Note: Fouad Saeed Abdulkadir (Dec 14) already in database
  // Note: Dalvin Francisco Rodriguez (Dec 14) already in database
  // Note: Nenko Stanev Gantchev (Dec 15) already in database
];

async function addGuardianCases() {
  const client = new Client({
    host: 'localhost',
    database: 'ice_deaths',
    user: 'postgres',
    password: 'password',
    port: 5432
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check existing cases to avoid duplicates
    const existingResult = await client.query('SELECT id, name FROM cases');
    const existingIds = new Set(existingResult.rows.map(r => r.id));
    const existingNames = new Set(existingResult.rows.map(r => r.name.toLowerCase()));
    
    console.log(`Found ${existingResult.rows.length} existing cases`);

    let added = 0;
    let skipped = 0;

    for (const caseData of guardianCases) {
      // Check if case already exists
      if (existingIds.has(caseData.id) || existingNames.has(caseData.name.toLowerCase())) {
        console.log(`SKIP: ${caseData.name} (already exists)`);
        skipped++;
        continue;
      }

      // Insert case
      await client.query(`
        INSERT INTO cases (id, name, age, nationality, date_of_death, custody_status, official_cause_of_death, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        caseData.id,
        caseData.name,
        caseData.age,
        caseData.nationality,
        caseData.date_of_death,
        caseData.custody_status,
        caseData.official_cause_of_death,
        caseData.notes
      ]);

      // Insert facility
      if (caseData.facility) {
        await client.query(`
          INSERT INTO facilities (case_id, name, city, state, type)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          caseData.id,
          caseData.facility.name,
          caseData.facility.city,
          caseData.facility.state,
          caseData.facility.type
        ]);
      }

      // Insert categories
      if (caseData.categories && caseData.categories.length > 0) {
        for (const category of caseData.categories) {
          await client.query(`
            INSERT INTO categories (case_id, category)
            VALUES ($1, $2)
          `, [caseData.id, category]);
        }
      }

      // Insert Guardian source with quote
      await client.query(`
        INSERT INTO sources (case_id, title, publisher, date, url, quote, quote_context)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        caseData.id,
        GUARDIAN_SOURCE.title,
        GUARDIAN_SOURCE.publisher,
        GUARDIAN_SOURCE.date,
        GUARDIAN_SOURCE.url,
        caseData.quote,
        caseData.quote_context
      ]);

      console.log(`ADDED: ${caseData.name} (${caseData.date_of_death})`);
      added++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Added: ${added} new cases`);
    console.log(`Skipped: ${skipped} duplicates`);
    console.log(`Total in database: ${existingResult.rows.length + added}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

addGuardianCases();
