const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

// Additional fields to make Publications more interesting for infographics
const regions = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West Coast', 'Border Region'];
const topics = ['Detention Conditions', 'Family Separation', 'Legal Rights', 'Medical Care', 'Due Process', 'Deportation'];
const sentiments = ['Critical', 'Neutral', 'Supportive', 'Investigative', 'Urgent'];
const impactLevels = ['National', 'Regional', 'Local', 'International'];
const audiences = ['General Public', 'Policy Makers', 'Legal Professionals', 'Advocacy Groups', 'Academic'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function enhancePublications() {
  try {
    // Get all Publications
    const pubsResult = await pool.query(`
      SELECT r.id, r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Publications'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    console.log(`Enhancing ${pubsResult.rows.length} publications...`);
    
    for (const row of pubsResult.rows) {
      const data = row.data;
      
      // Add new fields
      data.region = randomChoice(regions);
      data.primary_topic = randomChoice(topics);
      data.sentiment = randomChoice(sentiments);
      data.impact_level = randomChoice(impactLevels);
      data.target_audience = randomChoice(audiences);
      data.citations = randomInt(0, 150);
      data.shares = randomInt(100, 50000);
      data.reading_time_mins = Math.ceil(data.word_count / 250);
      data.has_multimedia = Math.random() > 0.6;
      data.featured = Math.random() > 0.85;
      
      // Update the record
      await pool.query(
        'UPDATE records SET data = $1 WHERE id = $2',
        [data, row.id]
      );
    }
    
    console.log('Publications enhanced!');
    
    // Also enhance Incidents with more fields
    const incsResult = await pool.query(`
      SELECT r.id, r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Incidents'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    console.log(`\nEnhancing ${incsResult.rows.length} incidents...`);
    
    const facilities = ['Border Patrol Station', 'ICE Detention Center', 'Private Prison', 'County Jail', 'Processing Center'];
    const reportedBy = ['Detainee', 'Family Member', 'Attorney', 'Advocacy Group', 'Whistleblower', 'Media Investigation'];
    const ageGroups = ['Child (0-12)', 'Teen (13-17)', 'Young Adult (18-25)', 'Adult (26-45)', 'Middle Age (46-60)', 'Senior (60+)'];
    const genders = ['Male', 'Female', 'Non-binary', 'Unknown'];
    const nationalities = ['Mexico', 'Guatemala', 'Honduras', 'El Salvador', 'Haiti', 'Cuba', 'Venezuela', 'Nicaragua', 'Brazil', 'Colombia'];
    
    for (const row of incsResult.rows) {
      const data = row.data;
      
      // Add new fields
      data.facility_type = randomChoice(facilities);
      data.reported_by = randomChoice(reportedBy);
      data.affected_age_group = randomChoice(ageGroups);
      data.affected_gender = randomChoice(genders);
      data.affected_nationality = randomChoice(nationalities);
      data.days_detained = randomInt(1, 365);
      data.legal_representation = Math.random() > 0.7;
      data.media_coverage = Math.random() > 0.4;
      data.resulted_in_lawsuit = Math.random() > 0.8;
      data.number_affected = randomInt(1, 50);
      
      // Update the record
      await pool.query(
        'UPDATE records SET data = $1 WHERE id = $2',
        [data, row.id]
      );
    }
    
    console.log('Incidents enhanced!');
    
    // Also enhance Organizations
    const orgsResult = await pool.query(`
      SELECT r.id, r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Organizations'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    console.log(`\nEnhancing ${orgsResult.rows.length} organizations...`);
    
    const orgTypes = ['Nonprofit', 'Government Agency', 'Legal Aid', 'Advocacy Group', 'Religious Organization', 'Healthcare Provider'];
    const orgFocus = ['Legal Services', 'Family Reunification', 'Medical Care', 'Policy Advocacy', 'Direct Aid', 'Research'];
    const orgSizes = ['Small (<10)', 'Medium (10-50)', 'Large (50-200)', 'Enterprise (200+)'];
    
    for (const row of orgsResult.rows) {
      const data = row.data;
      
      // Add new fields
      data.organization_type = randomChoice(orgTypes);
      data.primary_focus = randomChoice(orgFocus);
      data.organization_size = randomChoice(orgSizes);
      data.founded_year = randomInt(1980, 2023);
      data.annual_budget = randomChoice(['<$100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M+']);
      data.staff_count = randomInt(2, 500);
      data.volunteer_count = randomInt(0, 1000);
      data.cases_handled_yearly = randomInt(10, 5000);
      data.states_served = randomInt(1, 50);
      data.accepts_donations = Math.random() > 0.2;
      
      // Update the record
      await pool.query(
        'UPDATE records SET data = $1 WHERE id = $2',
        [data, row.id]
      );
    }
    
    console.log('Organizations enhanced!');
    console.log('\n✅ All test data enhanced with additional fields for infographic testing!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

enhancePublications();
