// Update show_when configurations for all conditional fields
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query('BEGIN');
    
    // Fix show_when for shooting fields
    console.log('Updating shooting fields show_when...');
    await pool.query(`
      UPDATE field_definitions 
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb, 
        '{show_when}', 
        '{"field": "incident_types", "operator": "contains", "value": "shooting"}'::jsonb
      )
      WHERE record_type_id = 6 AND slug LIKE 'shooting_%'
    `);
    
    // Fix show_when for death fields
    console.log('Updating death fields show_when...');
    await pool.query(`
      UPDATE field_definitions 
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb, 
        '{show_when}', 
        '{"field": "incident_types", "operator": "contains_any", "value": ["death_in_custody", "death_during_operation", "death_at_protest"]}'::jsonb
      )
      WHERE record_type_id = 6 AND slug LIKE 'death_%'
    `);
    
    // Fix show_when for arrest fields
    console.log('Updating arrest fields show_when...');
    await pool.query(`
      UPDATE field_definitions 
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb, 
        '{show_when}', 
        '{"field": "incident_types", "operator": "contains", "value": "arrest_detention"}'::jsonb
      )
      WHERE record_type_id = 6 AND slug LIKE 'arrest_%'
    `);
    
    // Fix show_when for force fields
    console.log('Updating force fields show_when...');
    await pool.query(`
      UPDATE field_definitions 
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb, 
        '{show_when}', 
        '{"field": "incident_types", "operator": "contains_any", "value": ["excessive_force", "injury"]}'::jsonb
      )
      WHERE record_type_id = 6 AND slug LIKE 'force_%'
    `);
    
    // Fix show_when for neglect fields
    console.log('Updating neglect fields show_when...');
    await pool.query(`
      UPDATE field_definitions 
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb, 
        '{show_when}', 
        '{"field": "incident_types", "operator": "contains", "value": "medical_neglect_incident"}'::jsonb
      )
      WHERE record_type_id = 6 AND slug LIKE 'neglect_%'
    `);
    
    // Fix show_when for protest fields
    console.log('Updating protest fields show_when...');
    await pool.query(`
      UPDATE field_definitions 
      SET config = jsonb_set(
        COALESCE(config, '{}')::jsonb, 
        '{show_when}', 
        '{"field": "incident_types", "operator": "contains", "value": "protest_suppression"}'::jsonb
      )
      WHERE record_type_id = 6 AND slug LIKE 'protest_%'
    `);
    
    await pool.query('COMMIT');
    
    // Verify
    const result = await pool.query(`
      SELECT slug, config->>'show_when' as show_when 
      FROM field_definitions 
      WHERE record_type_id = 6 AND config->>'show_when' IS NOT NULL
      ORDER BY sort_order
    `);
    
    console.log('\n=== Fields with show_when configured ===');
    result.rows.forEach(r => {
      console.log(`${r.slug}: ${r.show_when}`);
    });
    
    console.log('\nDone!');
    
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
