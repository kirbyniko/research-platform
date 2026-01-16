const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testDuplicateCheck() {
  console.log('\n=== Testing Duplicate Check Queries ===\n');
  
  try {
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✓ Database connected\n');
    
    // Test 2: Check incidents table columns
    console.log('2. Checking incidents table columns...');
    const incidentsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incidents'
      ORDER BY column_name
    `);
    console.log('Incidents columns:', incidentsColumns.rows.map(r => r.column_name).join(', '));
    
    const hasVictimName = incidentsColumns.rows.some(r => r.column_name === 'victim_name');
    const hasSubjectName = incidentsColumns.rows.some(r => r.column_name === 'subject_name');
    const hasVerificationStatus = incidentsColumns.rows.some(r => r.column_name === 'verification_status');
    
    console.log(`  - victim_name: ${hasVictimName ? '✓' : '✗'}`);
    console.log(`  - subject_name: ${hasSubjectName ? '✓' : '✗'}`);
    console.log(`  - verification_status: ${hasVerificationStatus ? '✓' : '✗'}\n`);
    
    // Test 3: Check guest_submissions table columns
    console.log('3. Checking guest_submissions table columns...');
    const guestColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guest_submissions'
      ORDER BY column_name
    `);
    console.log('Guest submissions columns:', guestColumns.rows.map(r => r.column_name).join(', '));
    
    const hasDeletedAt = guestColumns.rows.some(r => r.column_name === 'deleted_at');
    console.log(`  - deleted_at: ${hasDeletedAt ? '✓' : '✗'}\n`);
    
    // Test 4: Try the actual incidents query
    console.log('4. Testing incidents query with "John Doe"...');
    const nameColumn = hasVictimName ? 'victim_name' : 'subject_name';
    
    const incidentsQuery = `
      SELECT 
        id,
        ${nameColumn} as name,
        incident_type,
        date_of_incident,
        facility_location,
        description,
        verification_status,
        created_at
      FROM incidents
      WHERE 
        ${nameColumn} ILIKE $1
        OR ${nameColumn} ILIKE $2
      ORDER BY 
        CASE WHEN LOWER(${nameColumn}) = $3 THEN 0 ELSE 1 END,
        date_of_incident DESC NULLS LAST
      LIMIT 50
    `;
    
    const normalizedName = 'john doe';
    const params = [
      `%${normalizedName}%`,
      `${normalizedName.split(' ')[0]}%`,
      normalizedName
    ];
    
    console.log('Query:', incidentsQuery.replace(/\s+/g, ' ').trim());
    console.log('Params:', params);
    
    const incidentsResult = await pool.query(incidentsQuery, params);
    console.log(`✓ Found ${incidentsResult.rows.length} incidents`);
    if (incidentsResult.rows.length > 0) {
      console.log('First match:', {
        id: incidentsResult.rows[0].id,
        name: incidentsResult.rows[0].name,
        type: incidentsResult.rows[0].incident_type
      });
    }
    console.log('');
    
    // Test 5: Try the actual guest submissions query
    console.log('5. Testing guest_submissions query with "John Doe"...');
    
    const guestQuery = `
      SELECT 
        id,
        submission_data->>'victimName' as name,
        submission_data->>'incidentType' as incident_type,
        submission_data->>'dateOfDeath' as date_of_incident,
        submission_data->>'location' as facility_location,
        status,
        created_at
      FROM guest_submissions
      WHERE 
        ${hasDeletedAt ? 'deleted_at IS NULL AND ' : ''}(
          submission_data->>'victimName' ILIKE $1
          OR submission_data->>'victimName' ILIKE $2
        )
      ORDER BY 
        CASE WHEN LOWER(submission_data->>'victimName') = $3 THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 50
    `;
    
    console.log('Query:', guestQuery.replace(/\s+/g, ' ').trim());
    console.log('Params:', params);
    
    const guestResult = await pool.query(guestQuery, params);
    console.log(`✓ Found ${guestResult.rows.length} guest submissions`);
    if (guestResult.rows.length > 0) {
      console.log('First match:', {
        id: guestResult.rows[0].id,
        name: guestResult.rows[0].name,
        type: guestResult.rows[0].incident_type
      });
    }
    console.log('');
    
    // Test 6: Combined results
    console.log('6. Combined results:');
    const total = incidentsResult.rows.length + guestResult.rows.length;
    console.log(`Total matches: ${total} (${incidentsResult.rows.length} incidents + ${guestResult.rows.length} guest submissions)`);
    
    console.log('\n✓ All tests passed!\n');
    
  } catch (error) {
    console.error('\n✗ Test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error position:', error.position);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

testDuplicateCheck();
