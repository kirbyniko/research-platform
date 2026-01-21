/**
 * Create fully populated test records for testing
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to database\n');
    
    // Get the project
    const project = await client.query("SELECT * FROM projects WHERE slug = 'project-a'");
    if (project.rows.length === 0) {
      console.log('❌ Project not found');
      return;
    }
    const projectId = project.rows[0].id;
    console.log(`✅ Found project: ${project.rows[0].name} (id: ${projectId})\n`);
    
    // Get the record type
    const recordType = await client.query(
      "SELECT * FROM record_types WHERE project_id = $1 LIMIT 1",
      [projectId]
    );
    if (recordType.rows.length === 0) {
      console.log('❌ No record type found');
      return;
    }
    const recordTypeId = recordType.rows[0].id;
    console.log(`✅ Using record type: ${recordType.rows[0].name}\n`);
    
    // Get all fields for this record type
    const fields = await client.query(
      `SELECT * FROM field_definitions 
       WHERE record_type_id = $1 
       ORDER BY sort_order`,
      [recordTypeId]
    );
    
    console.log(`Found ${fields.rows.length} fields\n`);
    
    // Build comprehensive data for each field
    const recordData = {};
    fields.rows.forEach(field => {
      switch (field.field_type) {
        case 'text':
        case 'textarea':
          recordData[field.slug] = `Test data for ${field.name} - comprehensive testing value with all details filled out`;
          break;
        case 'number':
          recordData[field.slug] = 42;
          break;
        case 'date':
          recordData[field.slug] = '2024-01-15';
          break;
        case 'datetime':
          recordData[field.slug] = '2024-01-15T10:30:00';
          break;
        case 'boolean':
          recordData[field.slug] = true;
          break;
        case 'select':
          // Use first option if available
          if (field.options && field.options.length > 0) {
            recordData[field.slug] = field.options[0];
          }
          break;
        case 'multi_select':
        case 'checkbox_group':
          // Use all options if available
          if (field.options && field.options.length > 0) {
            recordData[field.slug] = field.options;
          }
          break;
        case 'email':
          recordData[field.slug] = 'test@example.com';
          break;
        case 'url':
          recordData[field.slug] = 'https://example.com/test';
          break;
        case 'phone':
          recordData[field.slug] = '555-123-4567';
          break;
      }
    });
    
    // Create a maxed out record
    console.log('Creating maxed out test record...');
    const recordResult = await client.query(
      `INSERT INTO records (project_id, record_type_id, data, status, is_guest_submission, guest_name, guest_email)
       VALUES ($1, $2, $3, 'pending_review', true, 'Test Guest User', 'testguest@example.com')
       RETURNING *`,
      [projectId, recordTypeId, JSON.stringify(recordData)]
    );
    
    const recordId = recordResult.rows[0].id;
    console.log(`✅ Created record #${recordId}\n`);
    
    // Add comprehensive quotes
    console.log('Adding test quotes...');
    const quotes = [
      {
        text: 'This is a test quote from a primary source document that provides detailed context about the incident.',
        source: 'Test Source Document 1',
        url: 'https://example.com/source1',
        linked_fields: [fields.rows[0]?.slug].filter(Boolean)
      },
      {
        text: 'Another comprehensive quote that supports the facts presented in the record with additional evidence.',
        source: 'Test Source Document 2',
        url: 'https://example.com/source2',
        linked_fields: [fields.rows[1]?.slug].filter(Boolean)
      },
      {
        text: 'Third detailed quote providing crucial context and verification for multiple fields in this record.',
        source: 'Test Source Document 3',
        url: 'https://example.com/source3',
        linked_fields: [fields.rows[0]?.slug, fields.rows[1]?.slug].filter(Boolean)
      }
    ];
    
    for (const quote of quotes) {
      if (quote.linked_fields.length > 0) {
        await client.query(
          `INSERT INTO record_quotes (project_id, record_id, quote_text, source, source_url, linked_fields)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [projectId, recordId, quote.text, quote.source, quote.url, quote.linked_fields]
        );
      }
    }
    console.log(`✅ Added ${quotes.length} quotes\n`);
    
    // Add comprehensive sources
    console.log('Adding test sources...');
    const sources = [
      {
        title: 'Primary Source Document - Official Report',
        url: 'https://example.com/official-report.pdf',
        source_type: 'Official Document',
        description: 'Comprehensive official report with full details',
        linked_fields: [fields.rows[0]?.slug, fields.rows[1]?.slug].filter(Boolean)
      },
      {
        title: 'News Article - Detailed Coverage',
        url: 'https://example.com/news-article',
        source_type: 'News',
        description: 'In-depth news coverage from credible outlet',
        linked_fields: [fields.rows[2]?.slug].filter(Boolean)
      },
      {
        title: 'Court Filing - Legal Documentation',
        url: 'https://example.com/court-filing.pdf',
        source_type: 'Legal',
        description: 'Official court documents related to case',
        linked_fields: [fields.rows[1]?.slug, fields.rows[2]?.slug].filter(Boolean)
      }
    ];
    
    for (const source of sources) {
      if (source.linked_fields.length > 0) {
        await client.query(
          `INSERT INTO record_sources (project_id, record_id, title, url, source_type, linked_fields)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [projectId, recordId, source.title, source.url, source.source_type, source.linked_fields]
        );
      }
    }
    console.log(`✅ Added ${sources.length} sources\n`);
    
    console.log('✅ Test record creation complete!');
    console.log(`\nView at: https://research-platform-beige.vercel.app/projects/project-a/records/${recordId}/review`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestData();
