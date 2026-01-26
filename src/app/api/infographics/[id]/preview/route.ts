import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/lib/next-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/infographics/[id]/preview - Authenticated preview of draft infographics
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const infographicId = parseInt(id);

    if (isNaN(infographicId)) {
      return NextResponse.json(
        { error: 'Invalid infographic ID' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required for preview' },
        { status: 401 }
      );
    }

    // Get user ID from email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    const userId = userResult.rows[0].id;

    // Fetch infographic (no public restrictions)
    const infographicResult = await pool.query(
      `SELECT 
        i.*,
        p.slug as project_slug,
        p.name as project_name,
        p.id as project_id,
        rt.slug as record_type_slug,
        rt.name as record_type_name,
        u.name as creator_name
       FROM infographics i
       JOIN projects p ON i.project_id = p.id
       LEFT JOIN record_types rt ON i.record_type_id = rt.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = $1 AND i.deleted_at IS NULL`,
      [infographicId]
    );

    if (infographicResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Infographic not found' },
        { status: 404 }
      );
    }

    const row = infographicResult.rows[0];

    // Check if user has access to this project
    const accessResult = await pool.query(
      `SELECT role FROM project_members 
       WHERE project_id = $1 AND user_id = $2`,
      [row.project_id, userId]
    );

    if (accessResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Access denied - you are not a member of this project' },
        { status: 403 }
      );
    }

    // Fetch data based on scope
    let data: unknown;

    switch (row.scope_type) {
      case 'record':
        data = await getRecordData(row.record_id);
        break;
      case 'record_type':
        data = await getRecordTypeData(row.record_type_id, row.config);
        break;
      case 'project':
      default:
        data = await getProjectData(row.project_id, row.config);
        break;
    }

    const infographic = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      scope_type: row.scope_type,
      component_type: row.component_type,
      config: row.config,
      narrative_content: row.narrative_content || [],
      status: row.status,
      is_public: row.is_public,
      verification_status: row.verification_status,
      verified_at: row.verified_at,
      published_at: row.published_at,
      project: {
        slug: row.project_slug,
        name: row.project_name
      },
      record_type: row.record_type_id ? {
        slug: row.record_type_slug,
        name: row.record_type_name
      } : undefined,
      creator: {
        name: row.creator_name
      }
    };

    return NextResponse.json({
      infographic,
      data,
      preview: true
    });

  } catch (error) {
    console.error('Error fetching infographic preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function getRecordData(recordId: number) {
  const result = await pool.query(
    `SELECT r.id, r.data, r.created_at
     FROM records r
     WHERE r.id = $1 AND r.deleted_at IS NULL`,
    [recordId]
  );

  if (result.rows.length === 0) return null;

  return {
    record: { id: result.rows[0].id, data: result.rows[0].data },
    count: 1
  };
}

async function getRecordTypeData(recordTypeId: number, config: unknown) {
  const result = await pool.query(
    `SELECT r.id, r.data, rt.name
     FROM records r
     JOIN record_types rt ON r.record_type_id = rt.id
     WHERE r.record_type_id = $1 AND r.deleted_at IS NULL
     LIMIT 1000`,
    [recordTypeId]
  );

  if (result.rows.length === 0) return { count: 0, records: [] };

  const recordTypeName = result.rows[0].name;
  const records = result.rows.map(row => row.data);

  return {
    count: result.rows.length,
    records,
    recordType: {
      name: recordTypeName,
      recordCount: result.rows.length
    }
  };
}

async function getProjectData(projectId: number, config: unknown) {
  const result = await pool.query(
    `SELECT r.id, r.data, r.record_type_id, rt.name as record_type_name
     FROM records r
     JOIN record_types rt ON r.record_type_id = rt.id
     WHERE r.project_id = $1 AND r.deleted_at IS NULL
     LIMIT 1000`,
    [projectId]
  );

  if (result.rows.length === 0) return { count: 0, records: [] };

  const records = result.rows.map(row => row.data);
  const recordsByType = result.rows.reduce((acc: Record<string, unknown[]>, row) => {
    const typeName = row.record_type_name;
    if (!acc[typeName]) acc[typeName] = [];
    acc[typeName].push(row.data);
    return acc;
  }, {});

  return {
    count: result.rows.length,
    records,
    byRecordType: recordsByType,
    recordTypes: Object.entries(recordsByType).map(([name, records]) => ({
      name,
      recordCount: (records as unknown[]).length
    }))
  };
}
