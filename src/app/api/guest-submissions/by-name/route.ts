import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const currentIncidentId = searchParams.get('excludeIncidentId');
    
    if (!name) {
      return NextResponse.json({ error: 'Name parameter required' }, { status: 400 });
    }
    
    // Normalize the name for matching
    const normalizedName = name.toLowerCase().trim();
    
    // Skip if generic name
    const genericNames = ['unknown', 'unnamed', 'n/a', 'na', 'none', 'anonymous'];
    if (genericNames.includes(normalizedName) || normalizedName.length < 3) {
      return NextResponse.json({ submissions: [], message: 'Generic name - no related reports' });
    }
    
    // Search for guest submissions with similar names
    // Using ILIKE for case-insensitive matching
    // Exclude soft-deleted submissions
    const query = `
      SELECT 
        gs.id,
        gs.submission_data->>'victimName' as subject_name,
        gs.submission_data->>'incidentType' as incident_type,
        gs.submission_data->>'dateOfDeath' as date_of_incident,
        gs.submission_data->>'location' as facility_location,
        gs.submission_data->>'description' as description,
        gs.submission_data->'sourceUrls' as source_urls,
        gs.status as transfer_status,
        gs.email as submitter_email,
        gs.created_at,
        gs.notes
      FROM guest_submissions gs
      WHERE 
        gs.deleted_at IS NULL
        AND (
          gs.submission_data->>'victimName' ILIKE $1
          OR gs.submission_data->>'victimName' ILIKE $2
        )
        ${currentIncidentId ? 'AND gs.id != $3' : ''}
      ORDER BY 
        CASE WHEN LOWER(gs.submission_data->>'victimName') = $4 THEN 0 ELSE 1 END,
        gs.created_at DESC
      LIMIT 50
    `;
    
    const params = [
      `%${normalizedName}%`,  // $1: Contains full name
      `${normalizedName.split(' ')[0]}%`,  // $2: Starts with first name
    ];
    
    if (currentIncidentId) {
      params.push(currentIncidentId);  // $3: Exclude current incident
    }
    
    params.push(normalizedName);  // $4: Exact match priority
    
    const result = await pool.query(query, params);
    
    // Also count how many are transferred vs pending
    const transferred = result.rows.filter(r => r.transfer_status === 'accepted').length;
    const pending = result.rows.filter(r => r.transfer_status === 'pending').length;
    
    return NextResponse.json({
      submissions: result.rows,
      summary: {
        total: result.rows.length,
        transferred,
        pending,
        searchedName: name
      }
    });
    
  } catch (error) {
    console.error('Error fetching related guest submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related submissions' },
      { status: 500 }
    );
  }
}
