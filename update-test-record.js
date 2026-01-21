// Update test record #8 with additional field data
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const additionalData = {
  agencies_involved: ['ice', 'ice_ere', 'local_police', 'private_contractor'],
  legal_violations: ['8th_amendment', 'medical_neglect', 'civil_rights'],
  legal_action_status: 'lawsuit_pending',
  settlement_amount: 'Lawsuit seeking $5 million in damages',
  criminal_charges: 'No criminal charges filed against facility staff or ICE officials as of January 2025',
  internal_investigation: 'ICE Office of Professional Responsibility opened investigation in September 2024. Status: Ongoing',
  policy_changes: 'Family has called for mandatory 24-hour medical check protocols for detainees with chronic conditions',
  years_in_us: 12,
  family_in_us: 'Wife and two adult children (ages 28 and 25) residing in Los Angeles, CA',
  occupation: 'Construction worker',
  date_precision: 'exact',
  address: 'Adelanto ICE Processing Center, 11905 Highway 395, Adelanto, CA 92301',
  latitude: 34.5481,
  longitude: -117.4328,
  first_verification_notes: 'Verified through ICE press release, coroner report, and FOIA medical records',
  second_verification_notes: 'Cross-referenced with family attorney statements and media reports. All dates and facts corroborated across multiple independent sources'
};

async function updateRecord() {
  try {
    console.log('📝 Updating record #8 with additional field data...\n');
    
    // Get existing record data
    const result = await pool.query('SELECT data FROM records WHERE id = 8');
    if (result.rows.length === 0) {
      console.log('❌ Record #8 not found');
      process.exit(1);
    }
    
    const currentData = result.rows[0].data;
    const updatedData = { ...currentData, ...additionalData };
    
    // Update record
    await pool.query(
      'UPDATE records SET data = $1, updated_at = NOW() WHERE id = 8',
      [JSON.stringify(updatedData)]
    );
    
    console.log('✅ Record #8 updated with additional data:');
    Object.keys(additionalData).forEach(key => {
      console.log(`   • ${key}: ${JSON.stringify(additionalData[key]).substring(0, 60)}...`);
    });
    
    console.log('\n🎉 Update complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

updateRecord();
