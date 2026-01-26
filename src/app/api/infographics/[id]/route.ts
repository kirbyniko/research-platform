import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/infographics/[id] - Public endpoint for viewing published infographics
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const infographicId = parseInt(id);
    
    if (isNaN(infographicId)) {
      return NextResponse.json({ error: 'Invalid infographic ID' }, { status: 400 });
    }
    
    // Check for embed mode
    const { searchParams } = new URL(request.url);
    const isEmbed = searchParams.get('embed') === 'true';
    
    // Fetch infographic (must be published and public)
    const infographicResult = await pool.query(
      `SELECT 
        i.*,
        p.slug as project_slug,
        p.name as project_name,
        rt.slug as record_type_slug,
        rt.name as record_type_name,
        u.name as creator_name,
        v.name as verifier_name
       FROM infographics i
       JOIN projects p ON i.project_id = p.id
       LEFT JOIN record_types rt ON i.record_type_id = rt.id
       LEFT JOIN users u ON i.created_by = u.id
       LEFT JOIN users v ON i.verified_by = v.id
       WHERE i.id = $1 
       AND i.deleted_at IS NULL
       AND i.status = 'published'
       AND i.is_public = true`,
      [infographicId]
    );
    
    if (infographicResult.rows.length === 0) {
      return NextResponse.json({ error: 'Infographic not found or not public' }, { status: 404 });
    }
    
    const row = infographicResult.rows[0];
    
    // Check embed permissions if in embed mode
    if (isEmbed && !row.allow_embed) {
      return NextResponse.json({ error: 'Embedding not allowed for this infographic' }, { status: 403 });
    }
    
    // Check embed domain whitelist
    if (isEmbed && row.embed_domains && row.embed_domains.length > 0) {
      const referer = request.headers.get('referer');
      if (referer) {
        const refererUrl = new URL(referer);
        const allowed = row.embed_domains.some((domain: string) => 
          refererUrl.hostname === domain || refererUrl.hostname.endsWith('.' + domain)
        );
        if (!allowed) {
          return NextResponse.json({ error: 'Embedding not allowed from this domain' }, { status: 403 });
        }
      }
    }
    
    // Fetch data for visualization
    let data: unknown;
    
    switch (row.scope_type) {
      case 'record':
        data = await getPublicRecordData(row.record_id);
        break;
      case 'record_type':
        data = await getPublicRecordTypeData(row.record_type_id, row.config);
        break;
      case 'project':
        data = await getPublicProjectData(row.project_id, row.config);
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
      verification_status: row.verification_status,
      verified_at: row.verified_at,
      published_at: row.published_at,
      allow_embed: row.allow_embed,
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
      },
      verifier: row.verified_by ? {
        name: row.verifier_name
      } : undefined
    };
    
    // Set cache headers for public content
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    // CORS headers for embeds
    if (isEmbed) {
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET');
    }
    
    return NextResponse.json({ infographic, data }, { headers });
  } catch (error) {
    console.error('Error fetching public infographic:', error);
    return NextResponse.json(
      { error: 'Failed to fetch infographic' },
      { status: 500 }
    );
  }
}

// Helper functions (simplified versions for public access - no sensitive data)
async function getPublicRecordData(recordId: number) {
  const result = await pool.query(
    `SELECT r.id, r.data, r.created_at
     FROM records r
     WHERE r.id = $1 AND r.deleted_at IS NULL AND r.status = 'verified'`,
    [recordId]
  );
  
  if (result.rows.length === 0) return null;
  
  return {
    record: { id: result.rows[0].id, data: result.rows[0].data },
    count: 1
  };
}

async function getPublicRecordTypeData(recordTypeId: number, config: Record<string, unknown>) {
  const recordsResult = await pool.query(
    `SELECT r.id, r.data, r.created_at
     FROM records r
     WHERE r.record_type_id = $1 
     AND r.deleted_at IS NULL
     AND r.status = 'verified'
     ORDER BY r.created_at`,
    [recordTypeId]
  );
  
  const records = recordsResult.rows;
  const totalCount = records.length;
  
  const groupBy = config.groupBy as string | undefined;
  const colorBy = config.colorBy as string | undefined;
  
  let groupedData: Record<string, { count: number }> = {};
  let colorGroups: Record<string, { count: number; color?: string }> = {};
  
  if (groupBy) {
    for (const record of records) {
      const groupValue = String(record.data[groupBy] || 'Unknown');
      if (!groupedData[groupValue]) {
        groupedData[groupValue] = { count: 0 };
      }
      groupedData[groupValue].count++;
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
    
    const colorScale = config.colorScale as Record<string, string> | undefined;
    if (colorScale) {
      for (const key of Object.keys(colorGroups)) {
        colorGroups[key].color = colorScale[key] || '#6b7280';
      }
    }
  }
  
  return {
    records: records.map(r => ({ id: r.id, ...r.data })),
    count: totalCount,
    groupedData: Object.keys(groupedData).length > 0 ? groupedData : undefined,
    colorGroups: Object.keys(colorGroups).length > 0 ? colorGroups : undefined
  };
}

async function getPublicProjectData(projectId: number, config: Record<string, unknown>) {
  const countResult = await pool.query(
    `SELECT rt.slug, rt.name, rt.color, COUNT(r.id) as count
     FROM record_types rt
     LEFT JOIN records r ON r.record_type_id = rt.id 
       AND r.deleted_at IS NULL 
       AND r.status = 'verified'
     WHERE rt.project_id = $1 AND rt.deleted_at IS NULL
     GROUP BY rt.slug, rt.name, rt.color
     ORDER BY count DESC`,
    [projectId]
  );
  
  const byRecordType = countResult.rows.map(row => ({
    slug: row.slug,
    name: row.name,
    color: row.color,
    count: parseInt(row.count)
  }));
  
  const totalCount = byRecordType.reduce((sum, rt) => sum + rt.count, 0);
  
  return {
    byRecordType,
    count: totalCount
  };
}
