const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function verifyChanges() {
  try {
    // Get a specific publication by title that the user mentioned
    const pubResult = await pool.query(`
      SELECT r.id, r.data 
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Publications'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
      AND r.data->>'title' LIKE '%Asylum Seekers%35%'
      LIMIT 1
    `);
    
    console.log('=== CHECKING SPECIFIC RECORD USER MENTIONED ===');
    if (pubResult.rows.length > 0) {
      console.log('Found record ID:', pubResult.rows[0].id);
      console.log('All fields in data:', Object.keys(pubResult.rows[0].data));
      console.log('\nFull data:');
      console.log(JSON.stringify(pubResult.rows[0].data, null, 2));
      
      // Check for new fields
      const newFields = ['region', 'primary_topic', 'sentiment', 'impact_level', 'target_audience', 'citations', 'shares'];
      console.log('\n=== NEW FIELDS CHECK ===');
      newFields.forEach(field => {
        const hasField = field in pubResult.rows[0].data;
        console.log(`${field}: ${hasField ? '✓ EXISTS' : '✗ MISSING'}`);
        if (hasField) {
          console.log(`  Value: ${pubResult.rows[0].data[field]}`);
        }
      });
    } else {
      console.log('Could not find that specific record. Let me check any publication:');
      const anyPubResult = await pool.query(`
        SELECT r.id, r.data 
        FROM records r
        JOIN record_types rt ON r.record_type_id = rt.id
        WHERE rt.name = 'Publications'
        AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
        LIMIT 1
      `);
      if (anyPubResult.rows.length > 0) {
        console.log('Found record ID:', anyPubResult.rows[0].id);
        console.log('All fields:', Object.keys(anyPubResult.rows[0].data));
        console.log('\nFull data:');
        console.log(JSON.stringify(anyPubResult.rows[0].data, null, 2));
      }
    }
    
    // Count how many records have the new fields
    const countResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE r.data ? 'region') as has_region,
        COUNT(*) FILTER (WHERE r.data ? 'primary_topic') as has_primary_topic,
        COUNT(*) FILTER (WHERE r.data ? 'sentiment') as has_sentiment,
        COUNT(*) FILTER (WHERE r.data ? 'citations') as has_citations,
        COUNT(*) as total
      FROM records r
      JOIN record_types rt ON r.record_type_id = rt.id
      WHERE rt.name = 'Publications'
      AND rt.project_id = (SELECT id FROM projects WHERE slug = 'infographic-test-data')
    `);
    
    console.log('\n=== FIELD COVERAGE ===');
    console.log(`Total publications: ${countResult.rows[0].total}`);
    console.log(`With region: ${countResult.rows[0].has_region}`);
    console.log(`With primary_topic: ${countResult.rows[0].has_primary_topic}`);
    console.log(`With sentiment: ${countResult.rows[0].has_sentiment}`);
    console.log(`With citations: ${countResult.rows[0].has_citations}`);
    
    // Check database connection string that the frontend uses
    console.log('\n=== DATABASE CONNECTION INFO ===');
    console.log('Script connected to:', pool.options.connectionString.replace(/:[^:@]+@/, ':***@'));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

verifyChanges();
