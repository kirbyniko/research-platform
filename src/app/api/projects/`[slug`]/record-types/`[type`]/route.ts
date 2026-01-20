import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; type: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, type } = await params;
    let userId: number | undefined;
    try {
      const authResult = await requireServerAuth(request);
      if (!('error' in authResult)) userId = authResult.user.id;
    } catch {}
    
    const result = await getProjectBySlug(slug, userId);
    if (!result) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    
    const { project } = result;
    const recordTypeResult = await pool.query(
      `SELECT rt.*, 
        (SELECT COUNT(*) FROM records r WHERE r.record_type_id = rt.id AND r.deleted_at IS NULL) as record_count
       FROM record_types rt
       WHERE rt.project_id = $1 AND rt.slug = $2`,
      [project.id, type]
    );
    
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    return NextResponse.json({ recordType: recordTypeResult.rows[0] });
  } catch (error) {
    console.error('Error fetching record type:', error);
    return NextResponse.json({ error: 'Failed to fetch record type' }, { status: 500 });
  }
}
