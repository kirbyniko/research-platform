import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';
import { GuestFormMode } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string; type: string }>;
}

interface RecordTypeSettings {
  guest_form_mode?: GuestFormMode;
  analyst_can_skip_guest_form?: boolean;
  require_quotes_for_review?: boolean;
  require_sources_for_quotes?: boolean;
  allow_quote_requirement_bypass?: boolean;
  quote_bypass_roles?: string[];
  require_all_fields_verified?: boolean;
  allow_validation_bypass?: boolean;
  validation_bypass_roles?: string[];
  use_quotes?: boolean;
  use_sources?: boolean;
  use_media?: boolean;
  type_settings?: Record<string, unknown>;
}

// GET /api/projects/[slug]/record-types/[type]/settings
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type } = await params;
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
    
    // Check permission - need at least view access
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Get record type with all settings
    const typeResult = await pool.query(
      `SELECT 
        id, slug, name, name_plural, icon, description, color,
        guest_form_enabled, requires_review, requires_validation, sort_order,
        guest_form_mode, analyst_can_skip_guest_form,
        require_quotes_for_review, require_sources_for_quotes,
        allow_quote_requirement_bypass, quote_bypass_roles,
        require_all_fields_verified, allow_validation_bypass, validation_bypass_roles,
        use_quotes, use_sources, use_media,
        type_settings,
        created_at, updated_at
       FROM record_types 
       WHERE project_id = $1 AND slug = $2`,`,
      [project.id, type]
    );
    
    if (typeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    // Get field definitions with visibility settings
    const fieldsResult = await pool.query(
      `SELECT id, slug, name, field_type, is_required, requires_quote,
              requires_source_for_quote, require_verified_for_publish,
              show_in_guest_form, show_in_review_form, show_in_validation_form,
              show_in_public_view, show_in_list_view, sort_order
       FROM field_definitions 
       WHERE record_type_id = $1
       ORDER BY sort_order, name`,
      [typeResult.rows[0].id]
    );
    
    return NextResponse.json({
      recordType: typeResult.rows[0],
      fields: fieldsResult.rows
    });
    
  } catch (error) {
    console.error('Error fetching record type settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[slug]/record-types/[type]/settings
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    const body: RecordTypeSettings = await request.json();
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission - need admin access for settings
    if (!(await hasProjectPermission(userId, project.id, 'manage_project'))) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Get record type
    const typeResult = await pool.query(
      'SELECT id FROM record_types WHERE project_id = $1 AND slug = $2',
      [project.id, type]
    );
    
    if (typeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    const recordTypeId = typeResult.rows[0].id;
    
    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    const allowedFields: (keyof RecordTypeSettings)[] = [
      'guest_form_mode',
      'analyst_can_skip_guest_form',
      'require_quotes_for_review',
      'require_sources_for_quotes',
      'allow_quote_requirement_bypass',
      'quote_bypass_roles',
      'require_all_fields_verified',
      'allow_validation_bypass',
      'validation_bypass_roles',
      'use_quotes',
      'use_sources',
      'use_media',
      'type_settings'
    ];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(body[field]);
      }
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(recordTypeId);
    
    const updateResult = await pool.query(
      `UPDATE record_types 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    return NextResponse.json({
      recordType: updateResult.rows[0],
      message: 'Settings updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating record type settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
