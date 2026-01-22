import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

interface VerifyFieldRequest {
  fieldSlug: string;
  verified: boolean;
}

// POST /api/projects/[slug]/records/[recordId]/verify-field
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
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
    if (!(await hasProjectPermission(userId, project.id, 'validate'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get record
    const recordResult = await pool.query(
      `SELECT * FROM records 
       WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`,
      [parseInt(recordId), project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const record = recordResult.rows[0];
    const body: VerifyFieldRequest = await request.json();
    
    // Validate field exists
    const fieldResult = await pool.query(
      'SELECT * FROM field_definitions WHERE record_type_id = $1 AND slug = $2',
      [record.record_type_id, body.fieldSlug]
    );
    
    if (fieldResult.rows.length === 0) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }
    
    // Update verified_fields
    const verifiedFields = record.verified_fields || {};
    
    if (body.verified) {
      verifiedFields[body.fieldSlug] = {
        verified: true,
        by: userId,
        at: new Date().toISOString()
      };
    } else {
      delete verifiedFields[body.fieldSlug];
    }
    
    const result = await pool.query(
      `UPDATE records 
       SET verified_fields = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(verifiedFields), record.id]
    );
    
    return NextResponse.json({ 
      record: result.rows[0],
      verifiedField: body.fieldSlug,
      verified: body.verified
    });
  } catch (error) {
    console.error('Error verifying field:', error);
    return NextResponse.json(
      { error: 'Failed to verify field' },
      { status: 500 }
    );
  }
}
