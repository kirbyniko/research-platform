import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug } from '@/lib/project-permissions';
import { ROLE_PERMISSIONS, ProjectRole, Permission } from '@/types/platform';

// Helper to check role-based permission
function hasRolePermission(role: ProjectRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

// GET /api/projects/[slug]/infographics/[id]/data - Get data for visualization
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, id } = await params;
    const infographicId = parseInt(id);
    
    if (isNaN(infographicId)) {
      return NextResponse.json({ error: 'Invalid infographic ID' }, { status: 400 });
    }
    
    // Try to get auth (optional for public infographics)
    let userId: number | undefined;
    try {
      const authResult = await requireServerAuth(request);
      if (!('error' in authResult)) {
        userId = authResult.user.id;
      }
    } catch {
      // No auth, continue for public infographics
    }
    
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project, role } = result;
    
    // Fetch infographic
    const infographicResult = await pool.query(
      `SELECT * FROM infographics WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL`,
      [infographicId, project.id]
    );
    
    if (infographicResult.rows.length === 0) {
      return NextResponse.json({ error: 'Infographic not found' }, { status: 404 });
    }
    
    const infographic = infographicResult.rows[0];
    
    // Check if user can view this infographic
    const isPublished = infographic.status === 'published' && infographic.is_public;
    if (!isPublished && (!userId || !hasRolePermission(role, 'view_infographics'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Fetch data based on scope
    let data: unknown;
    
    switch (infographic.scope_type) {
      case 'record':
        data = await getRecordData(infographic.record_id);
        break;
      case 'record_type':
        data = await getRecordTypeData(infographic.record_type_id, infographic.config);
        break;
      case 'project':
        data = await getProjectData(project.id, infographic.config);
        break;
      default:
        return NextResponse.json({ error: 'Invalid scope type' }, { status: 400 });
    }
    
    return NextResponse.json({
      data,
      infographic: {
        id: infographic.id,
        name: infographic.name,
        component_type: infographic.component_type,
        config: infographic.config,
        narrative_content: infographic.narrative_content
      }
    });
  } catch (error) {
    console.error('Error fetching infographic data:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Failed to fetch infographic data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get single record data
async function getRecordData(recordId: number) {
  const result = await pool.query(
    `SELECT r.*, rt.name as record_type_name, rt.slug as record_type_slug
     FROM records r
     JOIN record_types rt ON r.record_type_id = rt.id
     WHERE r.id = $1 AND r.deleted_at IS NULL`,
    [recordId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return {
    record: result.rows[0],
    count: 1
  };
}

// Get aggregated data for a record type
async function getRecordTypeData(recordTypeId: number, config: Record<string, unknown>) {
  // Get all records for this type
  const recordsResult = await pool.query(
    `SELECT r.id, r.data, r.created_at, r.status
     FROM records r
     WHERE r.record_type_id = $1 
     AND r.deleted_at IS NULL
     AND r.status IN ('published', 'verified')
     ORDER BY r.created_at`,
    [recordTypeId]
  );
  
  const records = recordsResult.rows;
  const totalCount = records.length;
  
  // Extract field names from actual data (no field_definitions table in this schema)
  const fields: { slug: string; name: string; type: string }[] = [];
  if (records.length > 0) {
    const sampleData = records[0].data;
    for (const [key, value] of Object.entries(sampleData as Record<string, unknown>)) {
      let type = 'text';
      if (typeof value === 'number') type = 'number';
      else if (typeof value === 'boolean') type = 'boolean';
      else if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) type = 'date';
      
      fields.push({
        slug: key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type
      });
    }
  }
  
  // Compute aggregations if groupBy is specified
  const groupBy = config.groupBy as string | undefined;
  const colorBy = config.colorBy as string | undefined;
  
  let groupedData: Record<string, { count: number; records: unknown[] }> = {};
  let colorGroups: Record<string, { count: number; color?: string }> = {};
  
  if (groupBy) {
    for (const record of records) {
      const groupValue = String(record.data[groupBy] || 'Unknown');
      if (!groupedData[groupValue]) {
        groupedData[groupValue] = { count: 0, records: [] };
      }
      groupedData[groupValue].count++;
      groupedData[groupValue].records.push(record);
    }
  }
  
  if (colorBy) {
    for (const record of records) {
      const colorValue = String(record.data[colorBy] || 'Unknown');
      if (!colorGroups[colorValue]) {
        colorGroups[colorValue] = { count: 0 };
      }
      colorGroups[colorValue].count++;
    }
    
    // Apply color scale if provided
    const colorScale = config.colorScale as Record<string, string> | undefined;
    if (colorScale) {
      for (const key of Object.keys(colorGroups)) {
        colorGroups[key].color = colorScale[key] || '#6b7280';
      }
    }
  }
  
  // Extract specific field values for visualization
  const extractedData = records.map(r => ({
    id: r.id,
    ...r.data,
    _created_at: r.created_at,
    _status: r.status
  }));
  
  return {
    records: extractedData,
    count: totalCount,
    groupedData: Object.keys(groupedData).length > 0 ? groupedData : undefined,
    colorGroups: Object.keys(colorGroups).length > 0 ? colorGroups : undefined,
    fields
  };
}

// Get aggregated data for entire project (across all record types)
async function getProjectData(projectId: number, config: Record<string, unknown>) {
  // Get all record types for this project
  const typesResult = await pool.query(
    `SELECT id, slug, name, color FROM record_types WHERE project_id = $1`,
    [projectId]
  );
  const types = typesResult.rows;
  
  // Get count for each record type
  const countResult = await pool.query(
    `SELECT rt.id, rt.slug, rt.name, rt.color, COUNT(r.id) as count
     FROM record_types rt
     LEFT JOIN records r ON r.record_type_id = rt.id 
       AND r.deleted_at IS NULL 
       AND r.status IN ('published', 'verified')
     WHERE rt.project_id = $1
     GROUP BY rt.id, rt.slug, rt.name, rt.color
     ORDER BY count DESC`,
    [projectId]
  );
  
  const byRecordType = countResult.rows.map(row => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    color: row.color,
    count: parseInt(row.count)
  }));
  
  // Get total count
  const totalResult = await pool.query(
    `SELECT COUNT(*) as total FROM records r
     JOIN record_types rt ON r.record_type_id = rt.id
     WHERE rt.project_id = $1 
     AND r.deleted_at IS NULL
     AND r.status IN ('published', 'verified')`,
    [projectId]
  );
  const totalCount = parseInt(totalResult.rows[0].total);
  
  // Get actual records for AI analysis
  const recordsResult = await pool.query(
    `SELECT r.id, r.data, r.created_at, r.status, rt.name as record_type_name, rt.slug as record_type_slug
     FROM records r
     JOIN record_types rt ON r.record_type_id = rt.id
     WHERE rt.project_id = $1
     AND r.deleted_at IS NULL
     AND r.status IN ('published', 'verified')
     ORDER BY r.created_at DESC
     LIMIT 1000`,
    [projectId]
  );
  
  const records = recordsResult.rows.map(r => ({
    id: r.id,
    ...r.data,
    _created_at: r.created_at,
    _status: r.status,
    _record_type: r.record_type_name
  }));
  
  // Get date-based aggregation if needed
  const groupBy = config.groupBy as string | undefined;
  let timelineData: Record<string, number> = {};
  
  if (groupBy === 'year' || groupBy === 'month') {
    const dateFormat = groupBy === 'year' ? 'YYYY' : 'YYYY-MM';
    const timelineResult = await pool.query(
      `SELECT TO_CHAR(r.created_at, $2) as period, COUNT(*) as count
       FROM records r
       JOIN record_types rt ON r.record_type_id = rt.id
       WHERE rt.project_id = $1 
       AND r.deleted_at IS NULL
       AND r.status IN ('published', 'verified')
       GROUP BY period
       ORDER BY period`,
      [projectId, dateFormat]
    );
    
    for (const row of timelineResult.rows) {
      timelineData[row.period] = parseInt(row.count);
    }
  }
  
  return {
    records,
    recordTypes: types,
    byRecordType,
    count: totalCount,
    timelineData: Object.keys(timelineData).length > 0 ? timelineData : undefined
  };
}
