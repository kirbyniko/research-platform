import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';
import { DisplayTemplate, TemplateValidationResult } from '@/types/templates';

// Validate template structure and field references
function validateTemplate(
  template: DisplayTemplate,
  availableFieldSlugs: Set<string>,
  enabledDataTypes: { quotes: boolean; sources: boolean; media: boolean }
): TemplateValidationResult {
  const errors: TemplateValidationResult['errors'] = [];
  const warnings: string[] = [];

  // Check version
  if (template.version !== 1) {
    errors.push({ path: 'version', message: 'Invalid template version', severity: 'error' });
  }

  // Check sections
  if (!template.sections || !Array.isArray(template.sections)) {
    errors.push({ path: 'sections', message: 'Template must have sections array', severity: 'error' });
    return { valid: false, errors, warnings };
  }

  template.sections.forEach((section, sIdx) => {
    if (!section.items || !Array.isArray(section.items)) {
      errors.push({ path: `sections[${sIdx}].items`, message: 'Section must have items array', severity: 'error' });
      return;
    }

    section.items.forEach((item, iIdx) => {
      const path = `sections[${sIdx}].items[${iIdx}]`;

      // Must have either fieldSlug or dataType
      if (!item.fieldSlug && !item.dataType) {
        errors.push({ path, message: 'Item must reference a field or data type', severity: 'error' });
        return;
      }

      // Validate field reference
      if (item.fieldSlug && !availableFieldSlugs.has(item.fieldSlug)) {
        errors.push({ path: `${path}.fieldSlug`, message: `Unknown field: ${item.fieldSlug}`, severity: 'error' });
      }

      // Validate data type reference
      if (item.dataType) {
        if (item.dataType === 'quotes' && !enabledDataTypes.quotes) {
          errors.push({ path: `${path}.dataType`, message: 'Quotes not enabled for this record type', severity: 'error' });
        }
        if (item.dataType === 'sources' && !enabledDataTypes.sources) {
          errors.push({ path: `${path}.dataType`, message: 'Sources not enabled for this record type', severity: 'error' });
        }
        if (item.dataType === 'media' && !enabledDataTypes.media) {
          errors.push({ path: `${path}.dataType`, message: 'Media not enabled for this record type', severity: 'error' });
        }
      }

      // Warn about unused fields
      if (item.hideIfEmpty === undefined) {
        warnings.push(`${path}: Consider setting hideIfEmpty for cleaner display`);
      }
    });
  });

  return { valid: errors.length === 0, errors, warnings };
}

// GET /api/projects/[slug]/record-types/[type]/templates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; type: string }> }
) {
  try {
    const { slug, type } = await params;

    // Get project and record type
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1',
      [slug]
    );
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectId = projectResult.rows[0].id;

    const recordTypeResult = await pool.query(
      'SELECT id FROM record_types WHERE project_id = $1 AND slug = $2',
      [projectId, type]
    );
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    const recordTypeId = recordTypeResult.rows[0].id;

    // Get all templates for this record type
    const templatesResult = await pool.query(
      `SELECT dt.*, u.name as created_by_name
       FROM display_templates dt
       LEFT JOIN users u ON dt.created_by = u.id
       WHERE dt.record_type_id = $1
       ORDER BY dt.is_default DESC, dt.created_at DESC`,
      [recordTypeId]
    );

    return NextResponse.json({ templates: templatesResult.rows });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/projects/[slug]/record-types/[type]/templates
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; type: string }> }
) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const userId = authResult.user.id;

    const { slug, type } = await params;
    const body = await request.json();

    // Get project
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1',
      [slug]
    );
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectId = projectResult.rows[0].id;

    // Check permission
    const memberResult = await pool.query(
      `SELECT role, can_manage_appearances FROM project_members 
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a member of this project' }, { status: 403 });
    }
    const member = memberResult.rows[0];
    if (!member.can_manage_appearances && member.role !== 'admin' && member.role !== 'owner') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get record type
    const recordTypeResult = await pool.query(
      `SELECT id, settings FROM record_types WHERE project_id = $1 AND slug = $2`,
      [projectId, type]
    );
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    const recordType = recordTypeResult.rows[0];
    const settings = recordType.settings || {};

    // Get available fields
    const fieldsResult = await pool.query(
      'SELECT slug FROM field_definitions WHERE record_type_id = $1',
      [recordType.id]
    );
    const fieldSlugs = new Set<string>(fieldsResult.rows.map((r: { slug: string }) => r.slug));

    // Validate template
    const validation = validateTemplate(
      body.template,
      fieldSlugs,
      {
        quotes: settings.enable_quotes !== false,
        sources: settings.enable_sources !== false,
        media: settings.enable_media !== false,
      }
    );

    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid template', validation }, { status: 400 });
    }

    // If setting as default, unset any existing default
    if (body.is_default) {
      await pool.query(
        `UPDATE display_templates SET is_default = false 
         WHERE record_type_id = $1 AND is_default = true`,
        [recordType.id]
      );
    }

    // Create template
    const result = await pool.query(
      `INSERT INTO display_templates 
       (project_id, record_type_id, name, description, template, is_default, ai_prompt, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        projectId,
        recordType.id,
        body.name,
        body.description || null,
        JSON.stringify(body.template),
        body.is_default || false,
        body.ai_prompt || null,
        userId,
      ]
    );

    return NextResponse.json({ 
      template: result.rows[0],
      validation 
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
