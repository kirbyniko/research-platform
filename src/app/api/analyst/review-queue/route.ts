import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

// GET - Get cases awaiting second verification (for extension)
export async function GET(request: NextRequest) {
  try {
    // Require analyst or admin role
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    const { searchParams } = new URL(request.url);
    const includeOwn = searchParams.get('include_own') === 'true';
    
    // Get cases that are in first_review status and NOT submitted/first-verified by current user
    let query = `
      SELECT 
        i.id,
        i.incident_id,
        i.incident_type,
        COALESCE(i.victim_name, i.subject_name) as victim_name,
        i.incident_date,
        i.city,
        i.state,
        i.facility,
        i.summary,
        i.verification_status,
        i.submitted_by,
        i.submitter_role,
        i.first_verified_by,
        i.first_verified_at,
        i.created_at,
        u1.name as submitter_name,
        u1.email as submitter_email,
        u2.name as first_verifier_name,
        u2.email as first_verifier_email,
        (
          SELECT COUNT(*) 
          FROM incident_field_verifications fv 
          WHERE fv.incident_id = i.id AND fv.verification_status = 'first_review'
        ) as fields_needing_review,
        (
          SELECT COUNT(*) 
          FROM incident_field_verifications fv 
          WHERE fv.incident_id = i.id AND fv.verification_status = 'verified'
        ) as fields_verified
      FROM incidents i
      LEFT JOIN users u1 ON i.submitted_by = u1.id
      LEFT JOIN users u2 ON i.first_verified_by = u2.id
      WHERE i.verification_status = 'first_review'
    `;
    
    const params: (number | string)[] = [];
    
    // Exclude cases where the current user was the submitter or first verifier
    // (unless admin or include_own is true)
    if (!includeOwn && user.role !== 'admin') {
      query += ` AND (i.submitted_by IS NULL OR i.submitted_by != $1)`;
      query += ` AND (i.first_verified_by IS NULL OR i.first_verified_by != $1)`;
      params.push(user.id);
    }
    
    query += ` ORDER BY i.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Also get field-level verification details for each incident
    const incidentsWithFields = await Promise.all(
      result.rows.map(async (incident) => {
        const fieldsResult = await pool.query(`
          SELECT 
            field_name,
            field_value,
            verification_status,
            first_verified_by,
            first_verified_at,
            u.name as first_verifier_name
          FROM incident_field_verifications fv
          LEFT JOIN users u ON fv.first_verified_by = u.id
          WHERE fv.incident_id = $1
          ORDER BY field_name
        `, [incident.id]);
        
        return {
          ...incident,
          field_verifications: fieldsResult.rows
        };
      })
    );
    
    return NextResponse.json({
      incidents: incidentsWithFields,
      total: incidentsWithFields.length,
      user_id: user.id
    });
    
  } catch (error) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 });
  }
}
