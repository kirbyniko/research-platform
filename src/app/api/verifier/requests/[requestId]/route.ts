import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

// GET /api/verifier/requests/[requestId] - Get request details for verifier
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    // Check if user is a verifier
    const verifierCheck = await pool.query(
      'SELECT is_verifier FROM users WHERE id = $1',
      [user.id]
    );
    
    if (!verifierCheck.rows[0]?.is_verifier) {
      return NextResponse.json({ error: 'Verifier access required' }, { status: 403 });
    }
    
    // Get request - must be assigned to this verifier
    const result = await pool.query(`
      SELECT 
        vr.*,
        r.data as record_data,
        r.status as record_status,
        r.verified_fields,
        rt.name as record_type_name,
        rt.slug as record_type_slug,
        p.name as project_name,
        p.slug as project_slug,
        u.email as requested_by_email,
        u.name as requested_by_name
      FROM verification_requests vr
      JOIN records r ON vr.record_id = r.id
      JOIN record_types rt ON r.record_type_id = rt.id
      JOIN projects p ON vr.project_id = p.id
      LEFT JOIN users u ON vr.requested_by = u.id
      WHERE vr.id = $1 AND vr.assigned_to = $2
    `, [requestId, user.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found or not assigned to you' }, { status: 404 });
    }
    
    const req = result.rows[0];
    
    // Get field definitions
    const fieldsResult = await pool.query(`
      SELECT fd.id, fd.slug, fd.name, fd.field_type
      FROM field_definitions fd
      JOIN record_types rt ON fd.record_type_id = rt.id
      JOIN records r ON r.record_type_id = rt.id
      WHERE r.id = $1
      ORDER BY fd.sort_order, fd.name
    `, [req.record_id]);
    
    // Get quotes
    const quotesResult = await pool.query(`
      SELECT id, quote_text, source, source_url, linked_fields
      FROM record_quotes
      WHERE record_id = $1
      ORDER BY created_at
    `, [req.record_id]);
    
    // Get sources
    const sourcesResult = await pool.query(`
      SELECT id, url, title, source_type, notes
      FROM record_sources
      WHERE record_id = $1
      ORDER BY created_at
    `, [req.record_id]);
    
    return NextResponse.json({
      request: req,
      fieldDefinitions: fieldsResult.rows,
      quotes: quotesResult.rows,
      sources: sourcesResult.rows
    });
  } catch (error) {
    console.error('Error fetching verification request:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}
