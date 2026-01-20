/**
 * COMPREHENSIVE ICE DEATHS SEED
 * 
 * Ports ALL fields from the ICE Deaths extension.
 * Run: node scripts/seed-ice-deaths-complete.js
 */

require('dotenv').config({ path: '.env.production', override: true });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ============================================
// OPTIONS (from extension)
// ============================================

const WEAPON_TYPE_OPTIONS = [
  { value: 'handgun', label: 'Handgun' },
  { value: 'rifle', label: 'Rifle' },
  { value: 'taser', label: 'Taser' },
  { value: 'less_lethal', label: 'Less-lethal' },
  { value: 'other', label: 'Other' },
];

const MANNER_OF_DEATH_OPTIONS = [
  { value: 'natural', label: 'Natural' },
  { value: 'accident', label: 'Accident' },
  { value: 'suicide', label: 'Suicide' },
  { value: 'homicide', label: 'Homicide' },
  { value: 'undetermined', label: 'Undetermined' },
  { value: 'pending', label: 'Pending Investigation' },
];

const INJURY_SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'life_threatening', label: 'Life Threatening' },
];

const FORCE_TYPE_OPTIONS = [
  { value: 'physical', label: 'Physical' },
  { value: 'taser', label: 'Taser' },
  { value: 'pepper_spray', label: 'Pepper Spray' },
  { value: 'baton', label: 'Baton' },
  { value: 'rubber_bullets', label: 'Rubber Bullets' },
  { value: 'chokehold', label: 'Chokehold' },
  { value: 'knee_on_neck', label: 'Knee on Neck' },
  { value: 'firearm', label: 'Firearm' },
];

const DISPERSAL_METHOD_OPTIONS = [
  { value: 'tear_gas', label: 'Tear Gas' },
  { value: 'pepper_spray', label: 'Pepper Spray' },
  { value: 'rubber_bullets', label: 'Rubber Bullets' },
  { value: 'batons', label: 'Batons' },
  { value: 'sound_cannons', label: 'Sound Cannons (LRAD)' },
  { value: 'mass_arrest', label: 'Mass Arrest' },
  { value: 'other', label: 'Other' },
];

const INCIDENT_TYPE_OPTIONS = [
  { value: 'death_in_custody', label: 'Death in Custody' },
  { value: 'death_during_operation', label: 'Death During Operation' },
  { value: 'death_at_protest', label: 'Death at Protest' },
  { value: 'shooting', label: 'Shooting' },
  { value: 'excessive_force', label: 'Excessive Force' },
  { value: 'injury', label: 'Injury' },
  { value: 'medical_neglect', label: 'Medical Neglect' },
  { value: 'arrest', label: 'Arrest/Detention' },
  { value: 'protest_suppression', label: 'Protest Suppression' },
  { value: 'other', label: 'Other' },
];

const STATE_OPTIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
].map(s => ({ value: s, label: s }));

// ============================================
// FIELD GROUPS
// ============================================

const INCIDENT_GROUPS = [
  { slug: 'basic_info', name: 'Basic Information', sort_order: 0 },
  { slug: 'location', name: 'Location', sort_order: 1 },
  { slug: 'shooting_details', name: 'Shooting Details', sort_order: 2 },
  { slug: 'death_details', name: 'Death Details', sort_order: 3 },
  { slug: 'arrest_details', name: 'Arrest Details', sort_order: 4 },
  { slug: 'force_details', name: 'Excessive Force / Injury Details', sort_order: 5 },
  { slug: 'injury_specifics', name: 'Injury Specifics', sort_order: 6 },
  { slug: 'medical_neglect', name: 'Medical Neglect Details', sort_order: 7 },
  { slug: 'protest_details', name: 'Protest Suppression Details', sort_order: 8 },
  { slug: 'sources', name: 'Sources & Documentation', sort_order: 9 },
];

// ============================================
// FIELDS - Complete from extension
// ============================================

const INCIDENT_FIELDS = [
  // Basic Info (Guest-visible)
  { slug: 'subject_name', name: 'Subject Name', group: 'basic_info', field_type: 'text', is_required: true, requires_quote: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, show_in_list_view: true, sort_order: 0 },
  { slug: 'incident_date', name: 'Incident Date', group: 'basic_info', field_type: 'date', is_required: true, requires_quote: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, show_in_list_view: true, sort_order: 1 },
  { slug: 'age', name: 'Age', group: 'basic_info', field_type: 'number', is_required: false, requires_quote: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, config: { min: 0, max: 120 }, sort_order: 2 },
  { slug: 'nationality', name: 'Nationality/Country of Origin', group: 'basic_info', field_type: 'text', requires_quote: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, sort_order: 3 },
  { slug: 'incident_types', name: 'Incident Types', group: 'basic_info', field_type: 'multi_select', is_required: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, config: { options: INCIDENT_TYPE_OPTIONS }, sort_order: 4 },
  { slug: 'summary', name: 'Summary', group: 'basic_info', field_type: 'textarea', show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, placeholder: 'Brief description of what happened...', sort_order: 5 },

  // Location (Guest-visible)
  { slug: 'city', name: 'City', group: 'location', field_type: 'text', requires_quote: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, sort_order: 10 },
  { slug: 'state', name: 'State', group: 'location', field_type: 'select', is_required: true, requires_quote: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, show_in_list_view: true, config: { options: STATE_OPTIONS }, sort_order: 11 },
  { slug: 'facility_name', name: 'Facility Name', group: 'location', field_type: 'text', requires_quote: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, placeholder: 'e.g., Stewart Detention Center', sort_order: 12 },

  // Shooting Details (Review only)
  { slug: 'shooting_fatal', name: 'Fatal', group: 'shooting_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 20 },
  { slug: 'shots_fired', name: 'Shots Fired', group: 'shooting_details', field_type: 'number', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 21 },
  { slug: 'weapon_type', name: 'Weapon Type', group: 'shooting_details', field_type: 'select', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, config: { options: WEAPON_TYPE_OPTIONS }, sort_order: 22 },
  { slug: 'victim_armed', name: 'Victim Armed', group: 'shooting_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 23 },
  { slug: 'warning_given', name: 'Warning Given', group: 'shooting_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 24 },
  { slug: 'bodycam_available', name: 'Bodycam Available', group: 'shooting_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 25 },
  { slug: 'shooting_context', name: 'Shooting Context', group: 'shooting_details', field_type: 'textarea', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 26 },

  // Death Details (Review only)
  { slug: 'cause_of_death', name: 'Cause of Death', group: 'death_details', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 30 },
  { slug: 'official_cause', name: 'Official Cause', group: 'death_details', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 31 },
  { slug: 'autopsy_available', name: 'Autopsy Available', group: 'death_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 32 },
  { slug: 'medical_neglect_alleged', name: 'Medical Neglect Alleged', group: 'death_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 33 },
  { slug: 'medical_requests_denied', name: 'Medical Requests Denied', group: 'death_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 34 },
  { slug: 'manner_of_death', name: 'Manner of Death', group: 'death_details', field_type: 'select', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, config: { options: MANNER_OF_DEATH_OPTIONS }, sort_order: 35 },
  { slug: 'custody_duration', name: 'Custody Duration', group: 'death_details', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, placeholder: 'e.g., 6 months, 2 weeks', sort_order: 36 },
  { slug: 'circumstances', name: 'Circumstances', group: 'death_details', field_type: 'textarea', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 37 },

  // Arrest Details (Review only)
  { slug: 'arrest_reason', name: 'Arrest Reason', group: 'arrest_details', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 40 },
  { slug: 'arrest_charges', name: 'Charges', group: 'arrest_details', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 41 },
  { slug: 'warrant_present', name: 'Warrant Present', group: 'arrest_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 42 },
  { slug: 'selective_enforcement', name: 'Selective Enforcement', group: 'arrest_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 43 },
  { slug: 'timing_suspicious', name: 'Timing Suspicious', group: 'arrest_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 44 },
  { slug: 'pretext_arrest', name: 'Pretext Arrest', group: 'arrest_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 45 },
  { slug: 'arrest_context', name: 'Arrest Context', group: 'arrest_details', field_type: 'textarea', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 46 },

  // Excessive Force / Injury (Review only)
  { slug: 'force_types', name: 'Force Types Used', group: 'force_details', field_type: 'multi_select', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, config: { options: FORCE_TYPE_OPTIONS }, sort_order: 50 },
  { slug: 'injuries_sustained', name: 'Injuries Sustained', group: 'force_details', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 51 },
  { slug: 'victim_restrained', name: 'Victim Restrained', group: 'force_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 52 },
  { slug: 'victim_complying', name: 'Victim Complying', group: 'force_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 53 },
  { slug: 'video_evidence', name: 'Video Evidence Available', group: 'force_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 54 },
  { slug: 'hospitalization_required', name: 'Hospitalization Required', group: 'force_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 55 },

  // Injury Specifics (Review only)
  { slug: 'injury_type', name: 'Injury Type', group: 'injury_specifics', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, placeholder: 'e.g., Broken wrist, taser burns', sort_order: 60 },
  { slug: 'injury_severity', name: 'Injury Severity', group: 'injury_specifics', field_type: 'select', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, config: { options: INJURY_SEVERITY_OPTIONS }, sort_order: 61 },
  { slug: 'injury_weapon', name: 'Weapon Used', group: 'injury_specifics', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, placeholder: 'e.g., Taser, baton', sort_order: 62 },
  { slug: 'injury_cause', name: 'Cause/Context', group: 'injury_specifics', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, placeholder: 'e.g., During arrest', sort_order: 63 },

  // Medical Neglect (Review only)
  { slug: 'medical_condition', name: 'Medical Condition', group: 'medical_neglect', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 70 },
  { slug: 'treatment_denied', name: 'Treatment Denied', group: 'medical_neglect', field_type: 'textarea', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 71 },
  { slug: 'requests_documented', name: 'Requests Documented', group: 'medical_neglect', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 72 },
  { slug: 'resulted_in_death', name: 'Resulted in Death', group: 'medical_neglect', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 73 },

  // Protest Suppression (Review only)
  { slug: 'protest_topic', name: 'Protest Topic', group: 'protest_details', field_type: 'text', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 80 },
  { slug: 'protest_size', name: 'Protest Size', group: 'protest_details', field_type: 'text', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, placeholder: 'e.g., 50-100', sort_order: 81 },
  { slug: 'permitted', name: 'Permit Obtained', group: 'protest_details', field_type: 'boolean', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 82 },
  { slug: 'dispersal_method', name: 'Dispersal Method', group: 'protest_details', field_type: 'select', requires_quote: true, show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, config: { options: DISPERSAL_METHOD_OPTIONS }, sort_order: 83 },
  { slug: 'arrests_made', name: 'Arrests Made', group: 'protest_details', field_type: 'number', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 84 },

  // Sources (Guest + Review)
  { slug: 'source_url', name: 'Source URL', group: 'sources', field_type: 'url', show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, sort_order: 90 },
  { slug: 'source_title', name: 'Source Title', group: 'sources', field_type: 'text', show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, sort_order: 91 },
];

// ============================================
// STATEMENT RECORD TYPE
// ============================================

const STATEMENT_GROUPS = [
  { slug: 'statement_info', name: 'Statement Information', sort_order: 0 },
  { slug: 'content', name: 'Statement Content', sort_order: 1 },
  { slug: 'source_info', name: 'Source Information', sort_order: 2 },
];

const STATEMENT_TYPE_OPTIONS = [
  { value: 'ice_statement', label: 'ICE Official Statement' },
  { value: 'cbp_statement', label: 'CBP Official Statement' },
  { value: 'dhs_statement', label: 'DHS Official Statement' },
  { value: 'family_statement', label: 'Family Statement' },
  { value: 'attorney_statement', label: 'Attorney Statement' },
  { value: 'witness_statement', label: 'Witness Statement' },
  { value: 'advocacy_statement', label: 'Advocacy Group Statement' },
  { value: 'medical_statement', label: 'Medical Professional Statement' },
];

const SOURCE_TYPE_OPTIONS = [
  { value: 'official_statement', label: 'Official Statement' },
  { value: 'news_article', label: 'News Article' },
  { value: 'court_document', label: 'Court Document' },
  { value: 'government_report', label: 'Government Report' },
  { value: 'family_statement', label: 'Family Statement' },
  { value: 'autopsy_report', label: 'Autopsy Report' },
  { value: 'other', label: 'Other' },
];

const STATEMENT_FIELDS = [
  { slug: 'statement_type', name: 'Statement Type', group: 'statement_info', field_type: 'select', is_required: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, show_in_list_view: true, config: { options: STATEMENT_TYPE_OPTIONS }, sort_order: 0 },
  { slug: 'statement_date', name: 'Statement Date', group: 'statement_info', field_type: 'date', is_required: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, show_in_list_view: true, sort_order: 1 },
  { slug: 'speaker_name', name: 'Speaker/Attributed To', group: 'statement_info', field_type: 'text', show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, show_in_list_view: true, placeholder: 'e.g., ICE Spokesperson, Family Attorney', sort_order: 2 },
  { slug: 'speaker_role', name: 'Speaker Role/Title', group: 'statement_info', field_type: 'text', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 3 },
  { slug: 'related_incident', name: 'Related Incident', group: 'statement_info', field_type: 'text', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, placeholder: 'Incident ID or name', sort_order: 4 },
  { slug: 'statement_text', name: 'Statement Text', group: 'content', field_type: 'textarea', is_required: true, show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, placeholder: 'Enter the full statement text (verbatim if possible)...', sort_order: 10 },
  { slug: 'key_claims', name: 'Key Claims', group: 'content', field_type: 'textarea', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, placeholder: 'One claim per line...', sort_order: 11 },
  { slug: 'source_url', name: 'Source URL', group: 'source_info', field_type: 'url', show_in_guest_form: true, show_in_review_form: true, show_in_validation_form: true, sort_order: 20 },
  { slug: 'source_type', name: 'Source Type', group: 'source_info', field_type: 'select', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, config: { options: SOURCE_TYPE_OPTIONS }, sort_order: 21 },
  { slug: 'source_title', name: 'Source Title', group: 'source_info', field_type: 'text', show_in_guest_form: false, show_in_review_form: true, show_in_validation_form: true, sort_order: 22 },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedComplete() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('?? Seeding complete ICE Deaths template...\n');

    // Get or create project
    let projectId;
    const existingProject = await client.query(`SELECT id FROM projects WHERE slug = 'project-a'`);
    
    if (existingProject.rows.length > 0) {
      projectId = existingProject.rows[0].id;
      await client.query(`UPDATE projects SET name = 'ICE Deaths Investigation', description = 'Documentation of deaths and incidents in ICE custody - comprehensive field definitions from the working extension.' WHERE id = $1`, [projectId]);
      console.log('? Updated project');
    } else {
      const r = await client.query(`INSERT INTO projects (slug, name, description, is_public, settings) VALUES ('project-a', 'ICE Deaths Investigation', 'Documentation of deaths and incidents in ICE custody.', true, '{}') RETURNING id`);
      projectId = r.rows[0].id;
      console.log('? Created project');
    }

    // Clear existing data
    await client.query(`DELETE FROM field_definitions WHERE record_type_id IN (SELECT id FROM record_types WHERE project_id = $1)`, [projectId]);
    await client.query(`DELETE FROM field_groups WHERE record_type_id IN (SELECT id FROM record_types WHERE project_id = $1)`, [projectId]);
    await client.query(`DELETE FROM record_types WHERE project_id = $1`, [projectId]);
    console.log('? Cleared existing record types');

    // Create Incident record type
    const incidentResult = await client.query(`
      INSERT INTO record_types (project_id, slug, name, name_plural, icon, description, guest_form_enabled, requires_review, requires_validation, sort_order)
      VALUES ($1, 'incident', 'Death/Incident Record', 'Death/Incident Records', '??', 
              'Document deaths and incidents. Guest form collects basic info; reviewers add detailed evidence using type-specific field groups.',
              true, true, true, 0)
      RETURNING id
    `, [projectId]);
    const incidentTypeId = incidentResult.rows[0].id;
    console.log('? Created Incident record type');

    // Create Statement record type
    const statementResult = await client.query(`
      INSERT INTO record_types (project_id, slug, name, name_plural, icon, description, guest_form_enabled, requires_review, requires_validation, sort_order)
      VALUES ($1, 'statement', 'Official Statement', 'Official Statements', '??', 
              'Document official statements from ICE, families, attorneys, and other sources.',
              true, true, true, 1)
      RETURNING id
    `, [projectId]);
    const statementTypeId = statementResult.rows[0].id;
    console.log('? Created Statement record type');

    // Create Incident field groups
    const incidentGroupMap = {};
    for (const g of INCIDENT_GROUPS) {
      const r = await client.query(`INSERT INTO field_groups (record_type_id, slug, name, sort_order) VALUES ($1, $2, $3, $4) RETURNING id`, [incidentTypeId, g.slug, g.name, g.sort_order]);
      incidentGroupMap[g.slug] = r.rows[0].id;
    }
    console.log(`? Created ${INCIDENT_GROUPS.length} Incident field groups`);

    // Create Statement field groups
    const statementGroupMap = {};
    for (const g of STATEMENT_GROUPS) {
      const r = await client.query(`INSERT INTO field_groups (record_type_id, slug, name, sort_order) VALUES ($1, $2, $3, $4) RETURNING id`, [statementTypeId, g.slug, g.name, g.sort_order]);
      statementGroupMap[g.slug] = r.rows[0].id;
    }
    console.log(`? Created ${STATEMENT_GROUPS.length} Statement field groups`);

    // Create Incident fields
    for (const f of INCIDENT_FIELDS) {
      await client.query(`
        INSERT INTO field_definitions (
          record_type_id, field_group_id, slug, name, description, placeholder, field_type,
          config, is_required, requires_quote, show_in_guest_form, show_in_review_form,
          show_in_validation_form, show_in_public_view, show_in_list_view, sort_order, width
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        incidentTypeId,
        f.group ? incidentGroupMap[f.group] : null,
        f.slug,
        f.name,
        f.description || null,
        f.placeholder || null,
        f.field_type,
        JSON.stringify(f.config || {}),
        f.is_required || false,
        f.requires_quote || false,
        f.show_in_guest_form || false,
        f.show_in_review_form !== false,
        f.show_in_validation_form !== false,
        true,
        f.show_in_list_view || false,
        f.sort_order || 0,
        'full'
      ]);
    }
    console.log(`? Created ${INCIDENT_FIELDS.length} Incident fields`);

    // Create Statement fields
    for (const f of STATEMENT_FIELDS) {
      await client.query(`
        INSERT INTO field_definitions (
          record_type_id, field_group_id, slug, name, description, placeholder, field_type,
          config, is_required, requires_quote, show_in_guest_form, show_in_review_form,
          show_in_validation_form, show_in_public_view, show_in_list_view, sort_order, width
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        statementTypeId,
        f.group ? statementGroupMap[f.group] : null,
        f.slug,
        f.name,
        f.description || null,
        f.placeholder || null,
        f.field_type,
        JSON.stringify(f.config || {}),
        f.is_required || false,
        f.requires_quote || false,
        f.show_in_guest_form || false,
        f.show_in_review_form !== false,
        f.show_in_validation_form !== false,
        true,
        f.show_in_list_view || false,
        f.sort_order || 0,
        'full'
      ]);
    }
    console.log(`? Created ${STATEMENT_FIELDS.length} Statement fields`);

    await client.query('COMMIT');
    
    console.log('\n?? Complete ICE Deaths template seeded!\n');
    console.log('?? Summary:');
    console.log(`   - Incident: ${INCIDENT_FIELDS.length} fields in ${INCIDENT_GROUPS.length} groups`);
    console.log(`   - Statement: ${STATEMENT_FIELDS.length} fields in ${STATEMENT_GROUPS.length} groups`);
    console.log('\n?? Test at: https://research-platform-beige.vercel.app/projects/project-a');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('? Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedComplete();
