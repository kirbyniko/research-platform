// Fix duplicate death fields in death_in_custody records
// death_in_custody should only have custody-specific fields, not all death fields

const { Pool } = require('pg');

async function fixDeathDetails() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Find all incidents with both death and death_in_custody details
    const result = await pool.query(`
      SELECT 
        incident_id,
        COUNT(*) as detail_count,
        array_agg(id) as detail_ids,
        array_agg(detail_type) as detail_types
      FROM incident_details
      WHERE detail_type IN ('death', 'death_in_custody')
      GROUP BY incident_id
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${result.rows.length} incidents with both death and death_in_custody details`);
    
    for (const row of result.rows) {
      console.log(`\n=== Incident ${row.incident_id} ===`);
      console.log('Detail IDs:', row.detail_ids);
      console.log('Types:', row.detail_types);
      
      // Get the full records
      const details = await pool.query(`
        SELECT id, detail_type, details
        FROM incident_details
        WHERE incident_id = $1
        AND detail_type IN ('death', 'death_in_custody')
      `, [row.incident_id]);
      
      let deathRecord = null;
      let deathInCustodyRecord = null;
      
      for (const detail of details.rows) {
        if (detail.detail_type === 'death') {
          deathRecord = detail;
        } else if (detail.detail_type === 'death_in_custody') {
          deathInCustodyRecord = detail;
        }
      }
      
      if (!deathRecord || !deathInCustodyRecord) continue;
      
      console.log('Death fields:', Object.keys(deathRecord.details));
      console.log('Death in custody fields:', Object.keys(deathInCustodyRecord.details));
      
      // Remove duplicate fields from death_in_custody
      // Keep only custody-specific fields
      const custodySpecificFields = ['custody_duration', 'circumstances'];
      const cleanedDetails = {};
      
      for (const field of custodySpecificFields) {
        if (deathInCustodyRecord.details[field] !== undefined) {
          cleanedDetails[field] = deathInCustodyRecord.details[field];
        }
      }
      
      console.log('Cleaned death_in_custody fields:', Object.keys(cleanedDetails));
      
      // Update the death_in_custody record
      await pool.query(`
        UPDATE incident_details
        SET details = $1::jsonb
        WHERE id = $2
      `, [JSON.stringify(cleanedDetails), deathInCustodyRecord.id]);
      
      console.log(`✓ Updated death_in_custody record ${deathInCustodyRecord.id}`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

fixDeathDetails();
