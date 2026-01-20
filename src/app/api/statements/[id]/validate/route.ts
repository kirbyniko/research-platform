import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

/**
 * GET /api/statements/[id]/validate
 * Get statement data for validation (read-only view)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statementId = parseInt(id);
    
    console.log('[statement validate GET] Starting for statement:', statementId);
    
    if (isNaN(statementId)) {
      return NextResponse.json({ error: 'Invalid statement ID' }, { status: 400 });
    }
    
    // Require analyst or admin role
    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      console.log('[statement validate GET] Auth failed:', authCheck.error);
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    const user = authCheck.user;
    console.log('[statement validate GET] Auth passed, user:', user.email);
    
    const result = await pool.query(`
      SELECT s.* FROM statements s WHERE s.id = $1
    `, [statementId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }
    
    const statement = result.rows[0];
    
    // Ensure tags is an array
    if (!Array.isArray(statement.tags)) {
      statement.tags = Array.isArray(statement.tags) ? statement.tags : [];
    }
    
    // Get quotes
    const quotesResult = await pool.query(`
      SELECT * FROM statement_quotes
      WHERE statement_id = $1
      ORDER BY created_at
    `, [statementId]);
    
    // Get sources
    const sourcesResult = await pool.query(`
      SELECT * FROM statement_sources
      WHERE statement_id = $1
      ORDER BY id
    `, [statementId]);
    
    return NextResponse.json({
      statement,
      quotes: quotesResult.rows,
      sources: sourcesResult.rows,
      first_reviewer: 'Unknown',
      can_validate: true
    });
    
  } catch (error) {
    console.error('[statement validate GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statement for validation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/statements/[id]/validate
 * Submit validation (approve/reject)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statementId = parseInt(id);
    
    if (isNaN(statementId)) {
      return NextResponse.json({ error: 'Invalid statement ID' }, { status: 400 });
    }
    
    // Require analyst or admin role
    const authCheck = await requireServerAuth(request, 'analyst');
    if ('error' in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    
    const user = authCheck.user;
    const body = await request.json();
    const { action, notes } = body;
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject.' }, { status: 400 });
    }
    
    // Get current statement
    const result = await pool.query(`
      SELECT * FROM statements WHERE id = $1
    `, [statementId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }
    
    const statement = result.rows[0];
    
    // Check status - must be first_review to validate
    if (statement.verification_status !== 'first_review') {
      return NextResponse.json(
        { error: `Statement is not ready for validation. Current status: ${statement.verification_status}` },
        { status: 400 }
      );
    }
    
    let newStatus: string;
    let updateQuery: string;
    let updateParams: any[];
    
    if (action === 'approve') {
      newStatus = 'verified';
      updateQuery = `
        UPDATE statements 
        SET verification_status = $1,
            verified_by_user_id = $2,
            verified_at = NOW(),
            verification_notes = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      updateParams = [newStatus, user.id, notes || null, statementId];
    } else {
      newStatus = 'rejected';
      updateQuery = `
        UPDATE statements 
        SET verification_status = $1,
            verified_by_user_id = $2,
            verified_at = NOW(),
            verification_notes = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      updateParams = [newStatus, user.id, notes || 'Rejected during validation', statementId];
    }
    
    const updateResult = await pool.query(updateQuery, updateParams);
    
    console.log(`[statement validate POST] Statement ${statementId} ${action}d by ${user.email}`);
    
    return NextResponse.json({
      success: true,
      action,
      statement: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('[statement validate POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to validate statement' },
      { status: 500 }
    );
  }
}
