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
    // Using ILIKE for case-insensitive matching and similarity for fuzzy matching
    const query = `
      SELECT 
        gs.id,
        gs.subject_name,
        gs.incident_type,
        gs.date_of_incident,
        gs.facility_location,
        gs.description,
        gs.source_urls,
        gs.transfer_status,
        gs.transferred_to_incident_id,
        gs.submitter_email,
        gs.created_at,
        gs.additional_sources,
        gs.notes
      FROM guest_submissions gs
      WHERE 
        (
          LOWER(gs.subject_name) LIKE $1
          OR LOWER(gs.subject_name) LIKE $2
          OR (
            LENGTH(gs.subject_name) > 3 
            AND (
              LOWER($3) LIKE '%' || LOWER(SPLIT_PART(gs.subject_name, ' ', 1)) || '%'
              OR LOWER($3) LIKE '%' || LOWER(SPLIT_PART(gs.subject_name, ' ', 2)) || '%'
            )
          )
        )
        ${currentIncidentId ? 'AND (gs.transferred_to_incident_id IS NULL OR gs.transferred_to_incident_id != $4)' : ''}
      ORDER BY 
        CASE WHEN LOWER(gs.subject_name) = $3 THEN 0 ELSE 1 END,
        gs.created_at DESC
      LIMIT 50
    `;
    
    const params = [
      `%${normalizedName}%`,  // $1: Contains full name
      `${normalizedName.split(' ')[0]}%`,  // $2: Starts with first name
      normalizedName,  // $3: Exact match priority
    ];
    
    if (currentIncidentId) {
      params.push(currentIncidentId);  // $4: Exclude current incident
    }
    
    const result = await pool.query(query, params);
    
    // Also count how many are transferred vs pending
    const transferred = result.rows.filter(r => r.transfer_status === 'transferred').length;
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
