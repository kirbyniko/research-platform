import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string; quoteId: string }>;
}

interface UpdateQuoteRequest {
  quote_text?: string;
  source?: string;
  source_url?: string;
  source_date?: string;
  source_type?: string;
  linked_fields?: string[];
}

// GET /api/projects/[slug]/records/[recordId]/quotes/[quoteId]
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, quoteId } = await params;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Get quote
    const quoteResult = await pool.query(
      `SELECT rq.*, u.name as created_by_name
       FROM record_quotes rq
       LEFT JOIN users u ON rq.created_by = u.id
       WHERE rq.id = $1 AND rq.record_id = $2 AND rq.project_id = $3`,
      [parseInt(quoteId), parseInt(recordId), project.id]
    );
    
    if (quoteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    return NextResponse.json({ quote: quoteResult.rows[0] });
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/records/[recordId]/quotes/[quoteId]
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, quoteId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify quote exists
    const quoteResult = await pool.query(
      'SELECT * FROM record_quotes WHERE id = $1 AND record_id = $2 AND project_id = $3',
      [parseInt(quoteId), parseInt(recordId), project.id]
    );
    
    if (quoteResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    const body: UpdateQuoteRequest = await request.json();
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (body.quote_text !== undefined) {
      updates.push(`quote_text = $${paramIndex++}`);
      values.push(body.quote_text.trim());
    }
    
    if (body.source !== undefined) {
      updates.push(`source = $${paramIndex++}`);
      values.push(body.source);
    }
    
    if (body.source_url !== undefined) {
      updates.push(`source_url = $${paramIndex++}`);
      values.push(body.source_url);
    }
    
    if (body.source_date !== undefined) {
      updates.push(`source_date = $${paramIndex++}`);
      values.push(body.source_date);
    }
    
    if (body.source_type !== undefined) {
      updates.push(`source_type = $${paramIndex++}`);
      values.push(body.source_type);
    }
    
    if (body.linked_fields !== undefined) {
      updates.push(`linked_fields = $${paramIndex++}`);
      values.push(body.linked_fields);
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(parseInt(quoteId));
    
    const result = await pool.query(
      `UPDATE record_quotes 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({ quote: result.rows[0] });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[slug]/records/[recordId]/quotes/[quoteId]
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId, quoteId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Delete quote
    const result = await pool.query(
      'DELETE FROM record_quotes WHERE id = $1 AND record_id = $2 AND project_id = $3 RETURNING id',
      [parseInt(quoteId), parseInt(recordId), project.id]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}
