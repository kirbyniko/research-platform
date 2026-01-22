import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

// POST /api/projects/[slug]/records/[recordId]/propose-change - Create a proposed change for a record
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
    
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: 'Analyst access required' },
        { status: 403 }
      );
    }

    const userId = authResult.user.id;
    const body = await request.json();
    const { proposed_data, change_summary } = body;

    if (!proposed_data) {
      return NextResponse.json(
        { error: 'Missing required field: proposed_data' },
        { status: 400 }
      );
    }

    // Get the record
    const recordResult = await pool.query(
      `SELECT r.*, p.id as project_id, rt.id as record_type_id
       FROM records r
       JOIN projects p ON r.project_id = p.id
       JOIN record_types rt ON r.record_type_id = rt.id
       WHERE r.id = $1 AND p.slug = $2 AND r.deleted_at IS NULL`,
      [parseInt(recordId), slug]
    );

    if (recordResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    const record = recordResult.rows[0];

    // Only allow proposing edits for verified records
    if (record.status !== 'verified') {
      return NextResponse.json(
        { error: 'Can only propose edits for verified records' },
        { status: 400 }
      );
    }

    // Create the proposed change
    const result = await pool.query(
      `INSERT INTO record_proposed_changes (
        record_id,
        project_id,
        submitted_by,
        proposed_data,
        change_summary,
        status,
        submitted_at,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        record.id,
        record.project_id,
        userId,
        JSON.stringify(proposed_data),
        change_summary || '',
        'pending_review'
      ]
    );

    const proposedChange = result.rows[0];

    return NextResponse.json({
      id: proposedChange.id,
      record_id: proposedChange.record_id,
      status: proposedChange.status,
      message: 'Proposed change submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating proposed change:', error);
    return NextResponse.json(
      { error: 'Failed to create proposed change' },
      { status: 500 }
    );
  }
}
