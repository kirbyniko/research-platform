/**
 * Create test project with comprehensive data for infographic testing
 * Run with: node create-infographic-test-data.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test data configurations
const RECORD_COUNTS = {
  incidents: 150,
  organizations: 45,
  publications: 80
};

// Sample data pools
const FIRST_NAMES = ['Maria', 'Jose', 'Carlos', 'Ana', 'Luis', 'Rosa', 'Miguel', 'Carmen', 'Juan', 'Elena', 'Pedro', 'Sofia', 'Antonio', 'Isabel', 'Francisco', 'Lucia', 'Manuel', 'Patricia', 'David', 'Laura'];
const LAST_NAMES = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Reyes', 'Morales', 'Cruz', 'Ortiz', 'Gutierrez', 'Chavez'];
const CITIES = ['Houston', 'Los Angeles', 'Phoenix', 'San Antonio', 'San Diego', 'Dallas', 'Chicago', 'Miami', 'New York', 'Denver', 'Seattle', 'Atlanta', 'Boston', 'Detroit', 'Minneapolis'];
const STATES = ['TX', 'CA', 'AZ', 'TX', 'CA', 'TX', 'IL', 'FL', 'NY', 'CO', 'WA', 'GA', 'MA', 'MI', 'MN'];
const FACILITIES = ['Detention Center', 'Processing Center', 'County Jail', 'Federal Facility', 'Private Prison', 'Transit Facility'];
const INCIDENT_TYPES = ['Medical Neglect', 'Use of Force', 'Solitary Confinement', 'Due Process Violation', 'Family Separation', 'Deportation Without Hearing', 'Denial of Legal Access', 'Inadequate Food/Water', 'Temperature Extremes', 'Overcrowding'];
const STATUSES = ['Documented', 'Under Investigation', 'Verified', 'Disputed', 'Resolved'];
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const COUNTRIES = ['Mexico', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Venezuela', 'Cuba', 'Haiti', 'Brazil', 'Colombia'];
const ORG_TYPES = ['Legal Aid', 'Advocacy', 'Medical', 'Religious', 'Government', 'Media', 'Academic', 'International'];
const PUB_TYPES = ['News Article', 'Report', 'Academic Paper', 'Legal Filing', 'Government Document', 'Press Release', 'Documentary', 'Investigation'];

// Helper functions
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

function generateEmail(name) {
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'proton.me'];
  return `${name.toLowerCase().replace(/\s/g, '.')}@${randomElement(domains)}`;
}

function generatePhone() {
  return `+1-${randomInt(200, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
}

function generateURL(type) {
  const domains = ['nytimes.com', 'washingtonpost.com', 'propublica.org', 'aclu.org', 'ice.gov', 'dhs.gov', 'reuters.com', 'apnews.com'];
  return `https://www.${randomElement(domains)}/article/${type}-${randomInt(10000, 99999)}`;
}

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating test project for infographic testing...\n');
    
    // Get or create test user
    let userId;
    const userResult = await client.query(
      `SELECT id FROM users WHERE email = 'test@infographics.dev' LIMIT 1`
    );
    
    if (userResult.rows.length === 0) {
      const newUser = await client.query(
        `INSERT INTO users (email, name, created_at) VALUES ($1, $2, NOW()) RETURNING id`,
        ['test@infographics.dev', 'Infographic Tester']
      );
      userId = newUser.rows[0].id;
      console.log('✅ Created test user');
    } else {
      userId = userResult.rows[0].id;
      console.log('✅ Using existing test user');
    }
    
    // Check if project already exists
    const existingProject = await client.query(
      `SELECT id FROM projects WHERE slug = 'infographic-test-data'`
    );
    
    if (existingProject.rows.length > 0) {
      console.log('⚠️  Project already exists. Deleting and recreating...');
      const projectId = existingProject.rows[0].id;
      // Delete in correct order
      await client.query(`DELETE FROM record_media WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM record_sources WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM record_quotes WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM records WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM record_types WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM project_members WHERE project_id = $1`, [projectId]);
      await client.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    }
    
    // Create project
    const projectResult = await client.query(`
      INSERT INTO projects (name, slug, description, created_by, is_public, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [
      'Infographic Test Dataset',
      'infographic-test-data',
      'Comprehensive test data for infographic feature testing. Contains incidents, organizations, and publications with all field types.',
      userId,
      true
    ]);
    
    const projectId = projectResult.rows[0].id;
    console.log(`✅ Created project (ID: ${projectId})`);
    
    // Add user as owner
    await client.query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'owner')
    `, [projectId, userId]);
    
    // =========================================================================
    // RECORD TYPE 1: Incidents
    // =========================================================================
    console.log('\n📋 Creating Incidents record type...');
    
    const incidentsType = await client.query(`
      INSERT INTO record_types (project_id, name, slug, description, use_quotes, use_sources, use_media, created_at)
      VALUES ($1, $2, $3, $4, true, true, true, NOW())
      RETURNING id
    `, [projectId, 'Incidents', 'incidents', 'Documented incidents at detention facilities']);
    
    const incidentsTypeId = incidentsType.rows[0].id;
    
    // Create incident records with JSONB data
    const incidentRecordIds = [];
    for (let i = 0; i < RECORD_COUNTS.incidents; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const cityIdx = randomInt(0, CITIES.length - 1);
      const age = randomInt(18, 65);
      const isMinor = age < 18;
      
      const incidentData = {
        victim_name: `${firstName} ${lastName}`,
        incident_date: randomDate(2018, 2025),
        facility_name: `${CITIES[cityIdx]} ${randomElement(FACILITIES)}`,
        city: CITIES[cityIdx],
        state: STATES[cityIdx],
        incident_type: randomElement(INCIDENT_TYPES),
        severity: randomElement(SEVERITIES),
        status: randomElement(STATUSES),
        country_origin: randomElement(COUNTRIES),
        age: age,
        is_minor: isMinor,
        description: `Documented incident involving ${firstName} ${lastName} at ${CITIES[cityIdx]} facility. ${randomElement(INCIDENT_TYPES)} reported.`,
        legal_case: randomBool(0.3) ? `CASE-${randomInt(10000, 99999)}` : null,
        reported_by: randomElement(['ACLU', 'Human Rights Watch', 'ProPublica', 'Local Advocate', 'Family Member', 'Attorney']),
        report_url: randomBool(0.6) ? generateURL('incident') : null
      };
      
      const recordResult = await client.query(`
        INSERT INTO records (record_type_id, project_id, data, status, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `, [incidentsTypeId, projectId, JSON.stringify(incidentData), randomElement(['draft', 'published', 'published', 'published'])]);
      
      incidentRecordIds.push(recordResult.rows[0].id);
    }
    
    console.log(`  ✅ Created ${RECORD_COUNTS.incidents} incident records`);
    
    // =========================================================================
    // RECORD TYPE 2: Organizations
    // =========================================================================
    console.log('\n🏢 Creating Organizations record type...');
    
    const orgsType = await client.query(`
      INSERT INTO record_types (project_id, name, slug, description, use_quotes, use_sources, use_media, created_at)
      VALUES ($1, $2, $3, $4, true, true, true, NOW())
      RETURNING id
    `, [projectId, 'Organizations', 'organizations', 'Organizations involved in immigration issues']);
    
    const orgsTypeId = orgsType.rows[0].id;
    
    const orgNames = [
      'American Civil Liberties Union', 'Human Rights Watch', 'Families Belong Together',
      'RAICES', 'Florence Project', 'Immigration Legal Services', 'Border Angels',
      'Catholic Charities Immigration', 'National Immigration Law Center', 'Immigrant Defense Project',
      'Texas Civil Rights Project', 'Southern Poverty Law Center', 'National Immigrant Justice Center',
      'Detention Watch Network', 'Freedom for Immigrants', 'Al Otro Lado', 'Kids in Need of Defense',
      'Asylum Seeker Advocacy Project', 'Immigration Advocates Network', 'National Immigration Forum'
    ];
    
    const orgRecordIds = [];
    for (let i = 0; i < RECORD_COUNTS.organizations; i++) {
      const orgName = i < orgNames.length ? orgNames[i] : `Immigration Support Org ${i + 1}`;
      const orgType = randomElement(ORG_TYPES);
      
      const orgData = {
        org_name: orgName,
        org_type: orgType,
        founded: randomInt(1970, 2020),
        hq_city: randomElement(CITIES),
        website: `https://www.${orgName.toLowerCase().replace(/\s+/g, '')}.org`,
        email: generateEmail(orgName.split(' ')[0]),
        phone: generatePhone(),
        staff_count: randomInt(5, 500),
        budget: randomInt(100, 50000) * 1000,
        is_active: randomBool(0.9),
        description: `${orgName} is a ${orgType.toLowerCase()} organization focused on immigration rights and support services.`
      };
      
      const recordResult = await client.query(`
        INSERT INTO records (record_type_id, project_id, data, status, created_at)
        VALUES ($1, $2, $3, 'published', NOW())
        RETURNING id
      `, [orgsTypeId, projectId, JSON.stringify(orgData)]);
      
      orgRecordIds.push(recordResult.rows[0].id);
    }
    
    console.log(`  ✅ Created ${RECORD_COUNTS.organizations} organization records`);
    
    // =========================================================================
    // RECORD TYPE 3: Publications
    // =========================================================================
    console.log('\n📰 Creating Publications record type...');
    
    const pubsType = await client.query(`
      INSERT INTO record_types (project_id, name, slug, description, use_quotes, use_sources, use_media, created_at)
      VALUES ($1, $2, $3, $4, true, true, true, NOW())
      RETURNING id
    `, [projectId, 'Publications', 'publications', 'Media coverage and reports on immigration detention']);
    
    const pubsTypeId = pubsType.rows[0].id;
    
    const publishers = ['New York Times', 'Washington Post', 'ProPublica', 'The Guardian', 'Reuters', 'AP News', 'NPR', 'The Atlantic', 'Politico', 'Texas Tribune', 'LA Times', 'Miami Herald'];
    const titles = [
      'Investigation Reveals Conditions Inside Detention Centers',
      'Families Separated at Border: One Year Later',
      'The Human Cost of Immigration Enforcement',
      'Inside the Private Prison Industry',
      'Medical Care Failures in ICE Custody',
      'Deportation Without Due Process',
      'Children in Detention: A Growing Crisis',
      'The Business of Immigrant Detention',
      'Asylum Seekers Face Unprecedented Wait Times',
      'Immigration Courts Backlog Reaches Record High'
    ];
    
    const pubRecordIds = [];
    for (let i = 0; i < RECORD_COUNTS.publications; i++) {
      const pubType = randomElement(PUB_TYPES);
      const publisher = randomElement(publishers);
      const title = `${randomElement(titles)} (${i + 1})`;
      
      const pubData = {
        title: title,
        pub_type: pubType,
        publisher: publisher,
        pub_date: randomDate(2018, 2025),
        author: `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`,
        url: generateURL('article'),
        is_paywalled: randomBool(0.3),
        word_count: randomInt(500, 5000),
        summary: `${pubType} from ${publisher} covering immigration detention issues.`
      };
      
      const recordResult = await client.query(`
        INSERT INTO records (record_type_id, project_id, data, status, created_at)
        VALUES ($1, $2, $3, 'published', NOW())
        RETURNING id
      `, [pubsTypeId, projectId, JSON.stringify(pubData)]);
      
      pubRecordIds.push(recordResult.rows[0].id);
    }
    
    console.log(`  ✅ Created ${RECORD_COUNTS.publications} publication records`);
    
    // =========================================================================
    // ADD QUOTES
    // =========================================================================
    console.log('\n💬 Adding quotes to records...');
    
    const quoteTexts = [
      "The conditions I witnessed were inhumane. People were sleeping on concrete floors.",
      "We were given no information about our legal rights or when we might be released.",
      "I haven't seen my children in three months. No one will tell me where they are.",
      "The medical care was non-existent. People were visibly ill and received no treatment.",
      "We were treated like criminals, not asylum seekers fleeing violence.",
      "The food was insufficient. Many people were constantly hungry.",
      "There was no access to legal counsel. We didn't understand the process.",
      "The guards used excessive force regularly. I witnessed several beatings.",
      "We were held in overcrowded cells with no ventilation.",
      "I came seeking safety and found only more suffering.",
      "My daughter cried for her mother every night. They wouldn't let me hold her.",
      "They took everything from us - our documents, our dignity, our hope.",
      "Nobody should have to endure what we went through in there.",
      "I still have nightmares about the time I spent in detention.",
      "The temperature was so cold that people got sick constantly."
    ];
    
    const sourceTypes = ['testimony', 'interview', 'court_filing', 'report', 'news_article'];
    
    let quotesAdded = 0;
    for (const recordId of incidentRecordIds.slice(0, 100)) {
      const numQuotes = randomInt(1, 3);
      for (let q = 0; q < numQuotes; q++) {
        await client.query(`
          INSERT INTO record_quotes (record_id, project_id, quote_text, source, source_url, source_date, source_type, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
          recordId,
          projectId,
          randomElement(quoteTexts),
          `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}, ${randomElement(['Detainee', 'Family Member', 'Attorney', 'Advocate', 'Former Guard', 'Medical Professional'])}`,
          randomBool(0.7) ? generateURL('testimony') : null,
          randomDate(2018, 2025),
          randomElement(sourceTypes)
        ]);
        quotesAdded++;
      }
    }
    
    // Add quotes to some publications too
    for (const recordId of pubRecordIds.slice(0, 40)) {
      await client.query(`
        INSERT INTO record_quotes (record_id, project_id, quote_text, source, source_url, source_date, source_type, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        recordId,
        projectId,
        randomElement(quoteTexts),
        `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}, ${randomElement(['Journalist', 'Researcher', 'Official', 'Spokesperson'])}`,
        generateURL('quote'),
        randomDate(2018, 2025),
        'interview'
      ]);
      quotesAdded++;
    }
    
    console.log(`  ✅ Added ${quotesAdded} quotes`);
    
    // =========================================================================
    // ADD SOURCES
    // =========================================================================
    console.log('\n📎 Adding sources to records...');
    
    const sourceCategories = ['primary', 'secondary', 'official', 'media', 'academic'];
    const sourceTypeClass = ['official_document', 'news_report', 'academic_study', 'legal_filing', 'ngo_report', 'testimony'];
    
    let sourcesAdded = 0;
    for (const recordId of [...incidentRecordIds, ...pubRecordIds].slice(0, 180)) {
      const numSources = randomInt(1, 4);
      for (let s = 0; s < numSources; s++) {
        await client.query(`
          INSERT INTO record_sources (record_id, project_id, url, title, source_type, source_type_classification, source_category, publication, author, publication_date, is_verified, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `, [
          recordId,
          projectId,
          generateURL('source'),
          `Source Document: ${randomElement(['Report', 'Filing', 'Article', 'Statement', 'Testimony'])} #${randomInt(1000, 9999)}`,
          randomElement(['document', 'article', 'report', 'legal', 'video']),
          randomElement(sourceTypeClass),
          randomElement(sourceCategories),
          randomElement(publishers),
          `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`,
          randomDate(2018, 2025),
          randomBool(0.6)
        ]);
        sourcesAdded++;
      }
    }
    
    console.log(`  ✅ Added ${sourcesAdded} sources`);
    
    // =========================================================================
    // ADD MEDIA
    // =========================================================================
    console.log('\n🖼️  Adding media references to records...');
    
    const mediaTypes = ['image', 'document', 'video', 'audio'];
    const providers = ['local', 'youtube', 'vimeo', 'external'];
    
    let mediaAdded = 0;
    for (const recordId of incidentRecordIds.slice(0, 75)) {
      const numMedia = randomInt(1, 3);
      for (let m = 0; m < numMedia; m++) {
        const mediaType = randomElement(mediaTypes);
        const mimeTypes = {
          image: 'image/jpeg',
          document: 'application/pdf',
          video: 'video/mp4',
          audio: 'audio/mp3'
        };
        
        await client.query(`
          INSERT INTO record_media (record_id, project_id, media_type, url, title, description, provider, file_size_bytes, mime_type, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `, [
          recordId,
          projectId,
          mediaType,
          `https://storage.example.com/media/${recordId}/${m}.${mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'mp3' : 'pdf'}`,
          `Evidence ${mediaType} ${m + 1}`,
          `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} evidence documentation`,
          randomElement(providers),
          randomInt(10000, 5000000),
          mimeTypes[mediaType]
        ]);
        mediaAdded++;
      }
    }
    
    console.log(`  ✅ Added ${mediaAdded} media references`);
    
    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✨ TEST DATA CREATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`
📊 Project: Infographic Test Dataset
   Slug: infographic-test-data
   ID: ${projectId}

📋 Record Types Created:
   1. Incidents: ${RECORD_COUNTS.incidents} records
      - Fields: victim_name, incident_date, facility_name, city, state,
                incident_type, severity, status, country_origin, age,
                is_minor, description, legal_case, reported_by, report_url
   
   2. Organizations: ${RECORD_COUNTS.organizations} records
      - Fields: org_name, org_type, founded, hq_city, website,
                email, phone, staff_count, budget, is_active, description
   
   3. Publications: ${RECORD_COUNTS.publications} records
      - Fields: title, pub_type, publisher, pub_date, author,
                url, is_paywalled, word_count, summary

📎 Additional Data:
   - Quotes: ${quotesAdded}
   - Sources: ${sourcesAdded}
   - Media: ${mediaAdded}

🔗 Access at: /projects/infographic-test-data

Field types demonstrated:
   ✓ Text (names, titles, descriptions)
   ✓ Numbers (age, staff_count, budget, word_count)
   ✓ Dates (incident_date, pub_date, founded)
   ✓ Booleans (is_minor, is_active, is_paywalled)
   ✓ Select/Categories (incident_type, severity, status, org_type, pub_type)
   ✓ URLs (report_url, website, url)
   ✓ Emails (email)
   ✓ Long text (description, summary)

📈 Good for testing:
   - Timeline visualizations (by date)
   - Category breakdowns (by type, severity, status)
   - Geographic distributions (by city, state, country)
   - Numeric comparisons (age, budget, word_count)
   - Relationship visualizations (quotes, sources, media counts)
`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
