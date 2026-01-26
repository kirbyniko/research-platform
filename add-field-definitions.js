const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function addFieldDefinitions() {
  try {
    // Get record type IDs
    const rtResult = await pool.query(`
      SELECT id, name 
      FROM record_types 
      WHERE name IN ('Incidents', 'Organizations', 'Publications')
      AND project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    const recordTypes = {};
    rtResult.rows.forEach(rt => {
      recordTypes[rt.name] = rt.id;
    });
    
    console.log('Record Type IDs:', recordTypes);
    
    // Publications fields
    const publicationFields = [
      { name: 'title', label: 'Title', field_type: 'text', is_required: true },
      { name: 'author', label: 'Author', field_type: 'text', is_required: false },
      { name: 'publisher', label: 'Publisher', field_type: 'text', is_required: false },
      { name: 'pub_date', label: 'Publication Date', field_type: 'date', is_required: false },
      { name: 'pub_type', label: 'Publication Type', field_type: 'select', is_required: false, 
        options: ['News Article', 'Report', 'Academic Paper', 'Government Document', 'Press Release', 'Investigation', 'Documentary', 'Legal Filing'] },
      { name: 'url', label: 'URL', field_type: 'url', is_required: false },
      { name: 'summary', label: 'Summary', field_type: 'textarea', is_required: false },
      { name: 'word_count', label: 'Word Count', field_type: 'number', is_required: false },
      { name: 'is_paywalled', label: 'Paywalled', field_type: 'checkbox', is_required: false },
      { name: 'region', label: 'Region', field_type: 'select', is_required: false,
        options: ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West Coast', 'Border Region'] },
      { name: 'primary_topic', label: 'Primary Topic', field_type: 'select', is_required: false,
        options: ['Detention Conditions', 'Family Separation', 'Legal Rights', 'Medical Care', 'Due Process', 'Deportation'] },
      { name: 'sentiment', label: 'Sentiment', field_type: 'select', is_required: false,
        options: ['Critical', 'Neutral', 'Supportive', 'Investigative', 'Urgent'] },
      { name: 'impact_level', label: 'Impact Level', field_type: 'select', is_required: false,
        options: ['National', 'Regional', 'Local', 'International'] },
      { name: 'target_audience', label: 'Target Audience', field_type: 'select', is_required: false,
        options: ['General Public', 'Policy Makers', 'Legal Professionals', 'Advocacy Groups', 'Academic'] },
      { name: 'citations', label: 'Citations', field_type: 'number', is_required: false },
      { name: 'shares', label: 'Social Shares', field_type: 'number', is_required: false },
      { name: 'reading_time_mins', label: 'Reading Time (minutes)', field_type: 'number', is_required: false },
      { name: 'has_multimedia', label: 'Has Multimedia', field_type: 'checkbox', is_required: false },
      { name: 'featured', label: 'Featured', field_type: 'checkbox', is_required: false },
    ];
    
    // Incidents fields
    const incidentFields = [
      { name: 'incident_date', label: 'Incident Date', field_type: 'date', is_required: true },
      { name: 'victim_name', label: 'Victim Name', field_type: 'text', is_required: true },
      { name: 'incident_type', label: 'Incident Type', field_type: 'select', is_required: true,
        options: ['Medical Neglect', 'Use of Force', 'Overcrowding', 'Temperature Extremes', 'Inadequate Food/Water', 'Denial of Legal Access', 'Family Separation', 'Solitary Confinement', 'Due Process Violation', 'Deportation Without Hearing'] },
      { name: 'severity', label: 'Severity', field_type: 'select', is_required: true,
        options: ['Low', 'Medium', 'High', 'Critical'] },
      { name: 'facility_name', label: 'Facility Name', field_type: 'text', is_required: false },
      { name: 'city', label: 'City', field_type: 'text', is_required: false },
      { name: 'state', label: 'State', field_type: 'text', is_required: false },
      { name: 'country_origin', label: 'Country of Origin', field_type: 'text', is_required: false },
      { name: 'age', label: 'Age', field_type: 'number', is_required: false },
      { name: 'is_minor', label: 'Is Minor', field_type: 'checkbox', is_required: false },
      { name: 'description', label: 'Description', field_type: 'textarea', is_required: false },
      { name: 'status', label: 'Status', field_type: 'select', is_required: false,
        options: ['Documented', 'Under Investigation', 'Verified', 'Resolved', 'Disputed'] },
      { name: 'legal_case', label: 'Legal Case Number', field_type: 'text', is_required: false },
      { name: 'report_url', label: 'Report URL', field_type: 'url', is_required: false },
      { name: 'facility_type', label: 'Facility Type', field_type: 'select', is_required: false,
        options: ['Border Patrol Station', 'ICE Detention Center', 'Private Prison', 'County Jail', 'Processing Center'] },
      { name: 'reported_by', label: 'Reported By', field_type: 'select', is_required: false,
        options: ['Detainee', 'Family Member', 'Attorney', 'Advocacy Group', 'Whistleblower', 'Media Investigation'] },
      { name: 'affected_age_group', label: 'Affected Age Group', field_type: 'select', is_required: false,
        options: ['Child (0-12)', 'Teen (13-17)', 'Young Adult (18-25)', 'Adult (26-45)', 'Middle Age (46-60)', 'Senior (60+)'] },
      { name: 'affected_gender', label: 'Affected Gender', field_type: 'select', is_required: false,
        options: ['Male', 'Female', 'Non-binary', 'Unknown'] },
      { name: 'affected_nationality', label: 'Affected Nationality', field_type: 'select', is_required: false,
        options: ['Mexico', 'Guatemala', 'Honduras', 'El Salvador', 'Haiti', 'Cuba', 'Venezuela', 'Nicaragua', 'Brazil', 'Colombia'] },
      { name: 'days_detained', label: 'Days Detained', field_type: 'number', is_required: false },
      { name: 'number_affected', label: 'Number of People Affected', field_type: 'number', is_required: false },
      { name: 'legal_representation', label: 'Had Legal Representation', field_type: 'checkbox', is_required: false },
      { name: 'media_coverage', label: 'Media Coverage', field_type: 'checkbox', is_required: false },
      { name: 'resulted_in_lawsuit', label: 'Resulted in Lawsuit', field_type: 'checkbox', is_required: false },
    ];
    
    // Organizations fields
    const organizationFields = [
      { name: 'name', label: 'Organization Name', field_type: 'text', is_required: true },
      { name: 'website', label: 'Website', field_type: 'url', is_required: false },
      { name: 'description', label: 'Description', field_type: 'textarea', is_required: false },
      { name: 'organization_type', label: 'Organization Type', field_type: 'select', is_required: false,
        options: ['Nonprofit', 'Government Agency', 'Legal Aid', 'Advocacy Group', 'Religious Organization', 'Healthcare Provider'] },
      { name: 'primary_focus', label: 'Primary Focus', field_type: 'select', is_required: false,
        options: ['Legal Services', 'Family Reunification', 'Medical Care', 'Policy Advocacy', 'Direct Aid', 'Research'] },
      { name: 'organization_size', label: 'Organization Size', field_type: 'select', is_required: false,
        options: ['Small (<10)', 'Medium (10-50)', 'Large (50-200)', 'Enterprise (200+)'] },
      { name: 'founded_year', label: 'Founded Year', field_type: 'number', is_required: false },
      { name: 'annual_budget', label: 'Annual Budget', field_type: 'select', is_required: false,
        options: ['<$100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M+'] },
      { name: 'staff_count', label: 'Staff Count', field_type: 'number', is_required: false },
      { name: 'volunteer_count', label: 'Volunteer Count', field_type: 'number', is_required: false },
      { name: 'cases_handled_yearly', label: 'Cases Handled Yearly', field_type: 'number', is_required: false },
      { name: 'states_served', label: 'Number of States Served', field_type: 'number', is_required: false },
      { name: 'accepts_donations', label: 'Accepts Donations', field_type: 'checkbox', is_required: false },
    ];
    
    // Insert field definitions
    console.log('\n=== INSERTING PUBLICATIONS FIELDS ===');
    for (const field of publicationFields) {
      const slug = field.name.replace(/_/g, '-');
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, slug, name, description, field_type, is_required, config)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [recordTypes['Publications'], slug, field.name, field.label, field.field_type, field.is_required, field.options ? JSON.stringify({ options: field.options }) : null]);
      console.log(`✓ Added ${field.name}`);
    }
    
    console.log('\n=== INSERTING INCIDENTS FIELDS ===');
    for (const field of incidentFields) {
      const slug = field.name.replace(/_/g, '-');
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, slug, name, description, field_type, is_required, config)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [recordTypes['Incidents'], slug, field.name, field.label, field.field_type, field.is_required, field.options ? JSON.stringify({ options: field.options }) : null]);
      console.log(`✓ Added ${field.name}`);
    }
    
    console.log('\n=== INSERTING ORGANIZATIONS FIELDS ===');
    for (const field of organizationFields) {
      const slug = field.name.replace(/_/g, '-');
      await pool.query(`
        INSERT INTO field_definitions (record_type_id, slug, name, description, field_type, is_required, config)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [recordTypes['Organizations'], slug, field.name, field.label, field.field_type, field.is_required, field.options ? JSON.stringify({ options: field.options }) : null]);
      console.log(`✓ Added ${field.name}`);
    }
    
    console.log('\n✅ All field definitions created successfully!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

addFieldDefinitions();
