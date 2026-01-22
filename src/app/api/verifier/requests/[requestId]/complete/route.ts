import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

interface ItemResult {
  type: 'field' | 'quote' | 'source';
  id?: number;
  field_slug?: string;
  verified: boolean;
  notes: string;
  issues: string[];
}

// POST /api/verifier/requests/[requestId]/complete - Complete verification
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const client = await pool.connect();
  
  try {
    const { requestId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const user = authResult.user;
    
    // Check if user is a verifier
    const verifierCheck = await client.query(
      'SELECT is_verifier FROM users WHERE id = $1',
      [user.id]
    );
    
    if (!verifierCheck.rows[0]?.is_verifier) {
      return NextResponse.json({ error: 'Verifier access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { 
      result,  // 'passed', 'partial', 'failed'
      verifier_notes, 
      issues_found = [], 
      item_results = [],
      record_verified = true
    } = body;
    
    if (!['passed', 'partial', 'failed'].includes(result)) {
      return NextResponse.json({ error: 'Invalid result' }, { status: 400 });
    }
    
    // Get request - must be assigned to this verifier
    const reqResult = await client.query(`
      SELECT vr.*, r.project_id
      FROM verification_requests vr
      JOIN records r ON vr.record_id = r.id
      WHERE vr.id = $1 AND vr.assigned_to = $2 AND vr.status = 'in_progress'
    `, [requestId, user.id]);
    
    if (reqResult.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found or not assigned to you' }, { status: 404 });
    }
    
    const req = reqResult.rows[0];
    
    await client.query('BEGIN');
    
    // Update verification request
    await client.query(`
      UPDATE verification_requests
      SET 
        status = 'completed',
        completed_at = NOW(),
        verification_result = $2,
        verifier_notes = $3,
        issues_found = $4
      WHERE id = $1
    `, [requestId, result, verifier_notes, JSON.stringify(issues_found)]);
    
    // For data-level verification, store individual results
    if (req.verification_scope === 'data' && item_results.length > 0) {
      for (const item of item_results as ItemResult[]) {
        await client.query(`
          INSERT INTO verification_results (
            request_id, item_type, item_id, field_slug, verified, 
            verified_by, notes, issues
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          requestId, 
          item.type, 
          item.id || null, 
          item.field_slug || null, 
          item.verified,
          user.id,
          item.notes || null,
          item.issues?.length ? item.issues : null
        ]);
      }
    }
    
    // Update record verification level if passed
    if (result === 'passed') {
      const newLevel = 3; // Third-party verified
      
      // For record-level, create hash of current data
      let dataHash = null;
      if (req.verification_scope === 'record') {
        const recordData = await client.query(
          'SELECT data FROM records WHERE id = $1',
          [req.record_id]
        );
        // Simple hash - in production use proper crypto
        dataHash = JSON.stringify(recordData.rows[0]?.data || {});
      }
      
      await client.query(`
        UPDATE records
        SET 
          verification_level = $2,
          verification_scope = $3,
          verification_date = NOW(),
          verified_data_hash = $4
        WHERE id = $1
      `, [req.record_id, newLevel, req.verification_scope, dataHash]);
    }
    
    // Log to verification history
    await client.query(`
      INSERT INTO verification_history (request_id, action, performed_by, details)
      VALUES ($1, 'completed', $2, $3)
    `, [requestId, user.id, JSON.stringify({ 
      result, 
      issues_count: issues_found.length,
      items_verified: item_results.filter((i: ItemResult) => i.verified).length,
      items_flagged: item_results.filter((i: ItemResult) => !i.verified).length
    })]);
    
    await client.query('COMMIT');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing verification:', error);
    return NextResponse.json({ error: 'Failed to complete verification' }, { status: 500 });
  } finally {
    client.release();
  }
}
