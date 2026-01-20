/**
 * SEED ICE DEATHS TEMPLATE
 * 
 * This script creates the ICE Deaths project structure with all the
 * field definitions from the existing working system.
 * 
 * Run: node scripts/seed-ice-deaths-template.js
 */

require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ============================================
// FIELD TYPE OPTIONS (from ICE Deaths)
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

const INCIDENT_TYPE_OPTIONS = [
  { value: 'death_in_custody', label: 'Death in Custody' },
  { value: 'death_during_operation', label: 'Death During Operation' },
  { value: 'death_at_protest', label: 'Death at Protest' },
  { value: 'shooting', label: 'Shooting' },
  { value: 'excessive_force', label: 'Excessive Force' },
  { value: 'injury', label: 'Injury' },
  { value: 'medical_neglect', label: 'Medical Neglect' },
  { value: 'arrest', label: 'Arrest/Detention' },
  { value: 'deportation', label: 'Deportation' },
  { value: 'family_separation', label: 'Family Separation' },
  { value: 'rights_violation', label: 'Rights Violation' },
  { value: 'workplace_raid', label: 'Workplace Raid' },
  { value: 'other', label: 'Other' },
];

const CUSTODY_STATUS_OPTIONS = [
  { value: 'ice_detention', label: 'ICE Detention' },
  { value: 'cbp_custody', label: 'CBP Custody' },
  { value: 'ice_contracted', label: 'ICE Contracted Facility' },
  { value: 'county_jail', label: 'County Jail (ICE hold)' },
  { value: 'during_transfer', label: 'During Transfer' },
  { value: 'during_operation', label: 'During Operation' },
  { value: 'not_in_custody', label: 'Not in Custody' },
];

const STATE_OPTIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
].map(s => ({ value: s, label: s }));

const SOURCE_TYPE_OPTIONS = [
  { value: 'official_statement', label: 'Official Statement' },
  { value: 'news_article', label: 'News Article' },
  { value: 'court_document', label: 'Court Document' },
  { value: 'government_report', label: 'Government Report' },
  { value: 'family_statement', label: 'Family Statement' },
  { value: 'advocacy_report', label: 'Advocacy Report' },
  { value: 'autopsy_report', label: 'Autopsy Report' },
  { value: 'other', label: 'Other' },
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

// ============================================
// FIELD GROUPS
// ============================================

const INCIDENT_FIELD_GROUPS = [
  { slug: 'basic_info', name: 'Basic Information', sort_order: 0 },
  { slug: 'location', name: 'Location Details', sort_order: 1 },
  { slug: 'incident_details', name: 'Incident Details', sort_order: 2 },
  { slug: 'death_details', name: 'Death Details', sort_order: 3 },
  { slug: 'custody_info', name: 'Custody Information', sort_order: 4 },
  { slug: 'medical_info', name: 'Medical Information', sort_order: 5 },
  { slug: 'legal_info', name: 'Legal Information', sort_order: 6 },
];

const STATEMENT_FIELD_GROUPS = [
  { slug: 'statement_info', name: 'Statement Information', sort_order: 0 },
  { slug: 'content', name: 'Statement Content', sort_order: 1 },
  { slug: 'source_info', name: 'Source Information', sort_order: 2 },
];

// ============================================
// INCIDENT FIELD DEFINITIONS
// ============================================

const INCIDENT_FIELDS = [
  // Basic Info - Guest visible
  {
    slug: 'subject_name',
    name: 'Subject Name',
    description: 'Full name of the person involved',
    field_type: 'text',
    field_group: 'basic_info',
    is_required: true,
    requires_quote: true,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 0,
    config: { placeholder: 'Full name' }
  },
  {
    slug: 'incident_date',
    name: 'Incident Date',
    description: 'Date the incident occurred',
    field_type: 'date',
    field_group: 'basic_info',
    is_required: true,
    requires_quote: true,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 1,
  },
  {
    slug: 'subject_age',
    name: 'Age',
    description: 'Age at time of incident',
    field_type: 'number',
    field_group: 'basic_info',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 2,
    config: { min: 0, max: 120 }
  },
  {
    slug: 'nationality',
    name: 'Nationality/Country of Origin',
    description: 'Country of origin or nationality',
    field_type: 'text',
    field_group: 'basic_info',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 3,
  },
  {
    slug: 'incident_type',
    name: 'Incident Type',
    description: 'Type of incident (select all that apply)',
    field_type: 'multi_select',
    field_group: 'basic_info',
    is_required: true,
    requires_quote: false,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 4,
    config: { options: INCIDENT_TYPE_OPTIONS }
  },

  // Location - Guest visible
  {
    slug: 'city',
    name: 'City',
    description: 'City where incident occurred',
    field_type: 'text',
    field_group: 'location',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 10,
  },
  {
    slug: 'state',
    name: 'State',
    description: 'State where incident occurred',
    field_type: 'select',
    field_group: 'location',
    is_required: true,
    requires_quote: true,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 11,
    config: { options: STATE_OPTIONS }
  },
  {
    slug: 'facility_name',
    name: 'Facility Name',
    description: 'Name of detention facility or location',
    field_type: 'text',
    field_group: 'location',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 12,
    config: { placeholder: 'e.g., Stewart Detention Center' }
  },

  // Custody Info - Review only
  {
    slug: 'custody_status',
    name: 'Custody Status',
    description: 'Type of custody at time of incident',
    field_type: 'select',
    field_group: 'custody_info',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 20,
    config: { options: CUSTODY_STATUS_OPTIONS }
  },
  {
    slug: 'custody_duration',
    name: 'Custody Duration',
    description: 'How long in custody before incident',
    field_type: 'text',
    field_group: 'custody_info',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 21,
    config: { placeholder: 'e.g., 6 months, 2 weeks' }
  },

  // Death Details - Review only
  {
    slug: 'cause_of_death',
    name: 'Cause of Death',
    description: 'Official or determined cause of death',
    field_type: 'text',
    field_group: 'death_details',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 30,
  },
  {
    slug: 'manner_of_death',
    name: 'Manner of Death',
    description: 'Classification of death',
    field_type: 'select',
    field_group: 'death_details',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 31,
    config: { options: MANNER_OF_DEATH_OPTIONS }
  },
  {
    slug: 'autopsy_available',
    name: 'Autopsy Available',
    description: 'Whether autopsy report is available',
    field_type: 'boolean',
    field_group: 'death_details',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 32,
  },
  {
    slug: 'circumstances',
    name: 'Circumstances',
    description: 'Detailed description of circumstances',
    field_type: 'textarea',
    field_group: 'death_details',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 33,
  },

  // Medical Info - Review only
  {
    slug: 'medical_neglect_alleged',
    name: 'Medical Neglect Alleged',
    description: 'Whether medical neglect is alleged',
    field_type: 'boolean',
    field_group: 'medical_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 40,
  },
  {
    slug: 'medical_requests_denied',
    name: 'Medical Requests Denied',
    description: 'Whether medical requests were denied',
    field_type: 'boolean',
    field_group: 'medical_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 41,
  },
  {
    slug: 'medical_conditions',
    name: 'Known Medical Conditions',
    description: 'Pre-existing medical conditions',
    field_type: 'textarea',
    field_group: 'medical_info',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 42,
  },

  // Legal Info - Review only
  {
    slug: 'charges',
    name: 'Charges/Holds',
    description: 'Immigration or criminal charges',
    field_type: 'text',
    field_group: 'legal_info',
    is_required: false,
    requires_quote: true,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 50,
  },
  {
    slug: 'attorney_involved',
    name: 'Attorney Involved',
    description: 'Whether legal representation was present',
    field_type: 'boolean',
    field_group: 'legal_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 51,
  },

  // Summary - Guest visible
  {
    slug: 'summary',
    name: 'Summary',
    description: 'Brief summary of the incident',
    field_type: 'textarea',
    field_group: 'basic_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 5,
    config: { placeholder: 'Brief description of what happened...' }
  },
];

// ============================================
// STATEMENT FIELD DEFINITIONS
// ============================================

const STATEMENT_FIELDS = [
  {
    slug: 'statement_type',
    name: 'Statement Type',
    description: 'Type of statement',
    field_type: 'select',
    field_group: 'statement_info',
    is_required: true,
    requires_quote: false,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 0,
    config: { options: STATEMENT_TYPE_OPTIONS }
  },
  {
    slug: 'statement_date',
    name: 'Statement Date',
    description: 'Date the statement was made',
    field_type: 'date',
    field_group: 'statement_info',
    is_required: true,
    requires_quote: false,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 1,
  },
  {
    slug: 'speaker_name',
    name: 'Speaker/Attributed To',
    description: 'Name of person or entity making statement',
    field_type: 'text',
    field_group: 'statement_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 2,
    config: { placeholder: 'e.g., ICE Spokesperson, Family Attorney' }
  },
  {
    slug: 'speaker_role',
    name: 'Speaker Role/Title',
    description: 'Role or title of the speaker',
    field_type: 'text',
    field_group: 'statement_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 3,
  },
  {
    slug: 'statement_text',
    name: 'Statement Text',
    description: 'Full text of the statement (verbatim if possible)',
    field_type: 'textarea',
    field_group: 'content',
    is_required: true,
    requires_quote: false,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 10,
    config: { placeholder: 'Enter the full statement text...' }
  },
  {
    slug: 'key_claims',
    name: 'Key Claims',
    description: 'List of key claims made in the statement',
    field_type: 'textarea',
    field_group: 'content',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 11,
    config: { placeholder: 'One claim per line...' }
  },
  {
    slug: 'source_url',
    name: 'Source URL',
    description: 'Link to original source',
    field_type: 'url',
    field_group: 'source_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: true,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 20,
  },
  {
    slug: 'source_type',
    name: 'Source Type',
    description: 'Type of source document',
    field_type: 'select',
    field_group: 'source_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 21,
    config: { options: SOURCE_TYPE_OPTIONS }
  },
  {
    slug: 'source_title',
    name: 'Source Title',
    description: 'Title of source article or document',
    field_type: 'text',
    field_group: 'source_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 22,
  },
  {
    slug: 'related_incident_id',
    name: 'Related Incident',
    description: 'ID of related incident (if applicable)',
    field_type: 'text',
    field_group: 'statement_info',
    is_required: false,
    requires_quote: false,
    show_in_guest_form: false,
    show_in_review_form: true,
    show_in_validation_form: true,
    sort_order: 4,
    config: { placeholder: 'Incident ID or name' }
  },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seedICEDeathsTemplate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Seeding ICE Deaths template...\n');
    
    // 1. Check if project exists, update or create
    const existingProject = await client.query(
      `SELECT id FROM projects WHERE slug = 'project-a'`
    );
    
    let projectId;
    if (existingProject.rows.length > 0) {
      projectId = existingProject.rows[0].id;
      await client.query(`
        UPDATE projects SET 
          name = 'ICE Deaths Investigation',
          description = 'Documentation of deaths in ICE custody - a model project demonstrating the research platform capabilities.'
        WHERE id = $1
      `, [projectId]);
      console.log('✅ Updated existing project to ICE Deaths Investigation');
    } else {
      const projectResult = await client.query(`
        INSERT INTO projects (slug, name, description, is_public, settings)
        VALUES ('project-a', 'ICE Deaths Investigation', 
                'Documentation of deaths in ICE custody - a model project demonstrating the research platform capabilities.',
                true, '{"theme": "neutral"}')
        RETURNING id
      `);
      projectId = projectResult.rows[0].id;
      console.log('✅ Created ICE Deaths Investigation project');
    }
    
    // 2. Clear existing test-form and recreate as "Incident" record type
    await client.query(`DELETE FROM field_definitions WHERE record_type_id IN (SELECT id FROM record_types WHERE project_id = $1)`, [projectId]);
    await client.query(`DELETE FROM field_groups WHERE record_type_id IN (SELECT id FROM record_types WHERE project_id = $1)`, [projectId]);
    await client.query(`DELETE FROM record_types WHERE project_id = $1`, [projectId]);
    console.log('✅ Cleared existing record types');
    
    // 3. Create Incident record type
    const incidentResult = await client.query(`
      INSERT INTO record_types (project_id, slug, name, name_plural, icon, description, guest_form_enabled, requires_review, requires_validation, sort_order)
      VALUES ($1, 'incident', 'Death/Incident Record', 'Death/Incident Records', '💀', 
              'Document deaths and incidents in ICE custody. Guest submissions collect basic info, reviewers add detailed evidence.',
              true, true, true, 0)
      RETURNING id
    `, [projectId]);
    const incidentTypeId = incidentResult.rows[0].id;
    console.log('✅ Created Incident record type');
    
    // 4. Create Statement record type
    const statementResult = await client.query(`
      INSERT INTO record_types (project_id, slug, name, name_plural, icon, description, guest_form_enabled, requires_review, requires_validation, sort_order)
      VALUES ($1, 'statement', 'Official Statement', 'Official Statements', '📝', 
              'Document official statements from ICE, families, attorneys, and other sources.',
              true, true, true, 1)
      RETURNING id
    `, [projectId]);
    const statementTypeId = statementResult.rows[0].id;
    console.log('✅ Created Statement record type');
    
    // 5. Create field groups for Incident
    const incidentGroupMap = {};
    for (const group of INCIDENT_FIELD_GROUPS) {
      const result = await client.query(`
        INSERT INTO field_groups (record_type_id, slug, name, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [incidentTypeId, group.slug, group.name, group.sort_order]);
      incidentGroupMap[group.slug] = result.rows[0].id;
    }
    console.log('✅ Created Incident field groups');
    
    // 6. Create field groups for Statement
    const statementGroupMap = {};
    for (const group of STATEMENT_FIELD_GROUPS) {
      const result = await client.query(`
        INSERT INTO field_groups (record_type_id, slug, name, sort_order)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [statementTypeId, group.slug, group.name, group.sort_order]);
      statementGroupMap[group.slug] = result.rows[0].id;
    }
    console.log('✅ Created Statement field groups');
    
    // 7. Create Incident fields
    for (const field of INCIDENT_FIELDS) {
      const groupId = field.field_group ? incidentGroupMap[field.field_group] : null;
      await client.query(`
        INSERT INTO field_definitions (
          record_type_id, field_group_id, slug, name, description, field_type,
          config, is_required, requires_quote, validation_rules,
          show_in_guest_form, show_in_review_form, show_in_validation_form, show_in_public_view, show_in_list_view,
          sort_order, width
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        incidentTypeId,
        groupId,
        field.slug,
        field.name,
        field.description || null,
        field.field_type,
        JSON.stringify(field.config || {}),
        field.is_required || false,
        field.requires_quote || false,
        JSON.stringify({}),
        field.show_in_guest_form || false,
        field.show_in_review_form || true,
        field.show_in_validation_form || true,
        true,
        field.slug === 'subject_name' || field.slug === 'incident_date' || field.slug === 'state',
        field.sort_order || 0,
        'full'
      ]);
    }
    console.log(`✅ Created ${INCIDENT_FIELDS.length} Incident fields`);
    
    // 8. Create Statement fields
    for (const field of STATEMENT_FIELDS) {
      const groupId = field.field_group ? statementGroupMap[field.field_group] : null;
      await client.query(`
        INSERT INTO field_definitions (
          record_type_id, field_group_id, slug, name, description, field_type,
          config, is_required, requires_quote, validation_rules,
          show_in_guest_form, show_in_review_form, show_in_validation_form, show_in_public_view, show_in_list_view,
          sort_order, width
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, [
        statementTypeId,
        groupId,
        field.slug,
        field.name,
        field.description || null,
        field.field_type,
        JSON.stringify(field.config || {}),
        field.is_required || false,
        field.requires_quote || false,
        JSON.stringify({}),
        field.show_in_guest_form || false,
        field.show_in_review_form || true,
        field.show_in_validation_form || true,
        true,
        field.slug === 'statement_type' || field.slug === 'speaker_name',
        field.sort_order || 0,
        'full'
      ]);
    }
    console.log(`✅ Created ${STATEMENT_FIELDS.length} Statement fields`);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 ICE Deaths template seeded successfully!\n');
    console.log('📋 Created:');
    console.log('   - Project: ICE Deaths Investigation');
    console.log('   - Record Type: incident (Death/Incident Record)');
    console.log(`     - ${INCIDENT_FIELDS.length} fields in ${INCIDENT_FIELD_GROUPS.length} groups`);
    console.log('   - Record Type: statement (Official Statement)');
    console.log(`     - ${STATEMENT_FIELDS.length} fields in ${STATEMENT_FIELD_GROUPS.length} groups`);
    console.log('\n🌐 Visit: https://research-platform-beige.vercel.app/projects/project-a');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding template:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedICEDeathsTemplate();
