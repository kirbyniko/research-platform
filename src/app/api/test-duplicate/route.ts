import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    log('\n=== Diagnostic Test for Duplicate Check ===\n');
    
    // Test 1: Database connection
    log('1. Testing database connection...');
    await pool.query('SELECT 1');
    log('✓ Database connected\n');
    
    // Test 2: Check incidents table columns
    log('2. Checking incidents table columns...');
    const incidentsColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incidents'
      ORDER BY column_name
    `);
    log(`Incidents columns: ${incidentsColumns.rows.map(r => r.column_name).join(', ')}`);
    
    const hasVictimName = incidentsColumns.rows.some(r => r.column_name === 'victim_name');
    const hasSubjectName = incidentsColumns.rows.some(r => r.column_name === 'subject_name');
    const hasVerificationStatus = incidentsColumns.rows.some(r => r.column_name === 'verification_status');
    
    log(`  - victim_name: ${hasVictimName ? '✓' : '✗'}`);
    log(`  - subject_name: ${hasSubjectName ? '✓' : '✗'}`);
    log(`  - verification_status: ${hasVerificationStatus ? '✓' : '✗'}\n`);
    
    // Test 3: Check guest_submissions table columns
    log('3. Checking guest_submissions table columns...');
    const guestColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'guest_submissions'
      ORDER BY column_name
    `);
    log(`Guest submissions columns: ${guestColumns.rows.map(r => r.column_name).join(', ')}`);
    
    const hasDeletedAt = guestColumns.rows.some(r => r.column_name === 'deleted_at');
    log(`  - deleted_at: ${hasDeletedAt ? '✓' : '✗'}\n`);
    
    // Test 4: Try the actual incidents query
    log('4. Testing incidents query with "John Doe"...');
    const nameColumn = hasVictimName ? 'victim_name' : 'subject_name';
    
    const incidentsQuery = `
      SELECT 
        id,
        ${nameColumn} as name,
        incident_type,
        incident_date,
        facility,
        summary,
        ${hasVerificationStatus ? 'verification_status,' : ''}
        created_at
      FROM incidents
      WHERE 
        ${nameColumn} ILIKE $1
        OR ${nameColumn} ILIKE $2
      ORDER BY 
        CASE WHEN LOWER(${nameColumn}) = $3 THEN 0 ELSE 1 END,
        incident_date DESC NULLS LAST
      LIMIT 50
    `;
    
    const normalizedName = 'john doe';
    const params = [
      `%${normalizedName}%`,
      `${normalizedName.split(' ')[0]}%`,
      normalizedName
    ];
    
    log(`Query: ${incidentsQuery.replace(/\s+/g, ' ').trim().substring(0, 200)}...`);
    log(`Params: ${JSON.stringify(params)}`);
    
    const incidentsResult = await pool.query(incidentsQuery, params);
    log(`✓ Found ${incidentsResult.rows.length} incidents`);
    if (incidentsResult.rows.length > 0) {
      log(`First match: ${JSON.stringify({
        id: incidentsResult.rows[0].id,
        name: incidentsResult.rows[0].name,
        type: incidentsResult.rows[0].incident_type
      })}`);
    }
    log('');
    
    // Test 5: Try the actual guest submissions query
    log('5. Testing guest_submissions query with "John Doe"...');
    
    const guestQuery = `
      SELECT 
        id,
        submission_data->>'victimName' as name,
        submission_data->>'incidentType' as incident_type,
        submission_data->>'dateOfDeath' as incident_date,
        submission_data->>'facility' as facility,
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
    
    log(`Query: ${guestQuery.replace(/\s+/g, ' ').trim().substring(0, 200)}...`);
    log(`Params: ${JSON.stringify(params)}`);
    
    const guestResult = await pool.query(guestQuery, params);
    log(`✓ Found ${guestResult.rows.length} guest submissions`);
    if (guestResult.rows.length > 0) {
      log(`First match: ${JSON.stringify({
        id: guestResult.rows[0].id,
        name: guestResult.rows[0].name,
        type: guestResult.rows[0].incident_type
      })}`);
    }
    log('');
    
    // Test 6: Combined results
    log('6. Combined results:');
    const total = incidentsResult.rows.length + guestResult.rows.length;
    log(`Total matches: ${total} (${incidentsResult.rows.length} incidents + ${guestResult.rows.length} guest submissions)`);
    
    log('\n✓ All tests passed!\n');
    
    return NextResponse.json({
      success: true,
      logs,
      results: {
        incidents: incidentsResult.rows.length,
        guestSubmissions: guestResult.rows.length,
        total
      },
      schema: {
        hasVictimName,
        hasSubjectName,
        hasVerificationStatus,
        hasDeletedAt,
        nameColumn
      }
    });
    
  } catch (error: any) {
    log('\n✗ Test failed:');
    log(`Error message: ${error.message}`);
    log(`Error code: ${error.code}`);
    log(`Error detail: ${error.detail}`);
    log(`Error position: ${error.position}`);
    log(`Error stack: ${error.stack}`);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        detail: error.detail,
        position: error.position,
        stack: error.stack
      },
      logs
    }, { status: 500 });
  }
}
