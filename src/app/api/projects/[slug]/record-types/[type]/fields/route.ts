import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';
import { CreateFieldDefinitionRequest, FieldType } from '@/types/platform';

interface RouteParams {
  params: Promise<{ slug: string; type: string }>;
}

const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'textarea', 'number', 'date', 'datetime', 'boolean',
  'select', 'multi_select', 'radio', 'checkbox_group',
  'url', 'email', 'location', 'person', 'file', 'rich_text',
  'record_link', 'user_link'
];

// GET /api/projects/[slug]/record-types/[type]/fields - List fields
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, type } = await params;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT * FROM record_types WHERE project_id = $1 AND slug = $2',
      [project.id, type]
    );
    
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    const recordType = recordTypeResult.rows[0];
    
    // Get fields with group info
    const fieldsResult = await pool.query(
      `SELECT fd.*, fg.name as group_name, fg.description as group_description
       FROM field_definitions fd
       LEFT JOIN field_groups fg ON fd.group_id = fg.id
       WHERE fd.record_type_id = $1
       ORDER BY fd.sort_order, fd.name`,
      [recordType.id]
    );
    
    // Get field groups
    const groupsResult = await pool.query(
      `SELECT * FROM field_groups 
       WHERE record_type_id = $1 
       ORDER BY sort_order, name`,
      [recordType.id]
    );
    
    return NextResponse.json({
      fields: fieldsResult.rows,
      groups: groupsResult.rows
    });
  } catch (error) {
    console.error('Error fetching fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fields' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/record-types/[type]/fields - Create field
export async function POST(
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
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_record_types'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get record type
    const recordTypeResult = await pool.query(
      'SELECT * FROM record_types WHERE project_id = $1 AND slug = $2',
      [project.id, type]
    );
    
    if (recordTypeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record type not found' }, { status: 404 });
    }
    
    const recordType = recordTypeResult.rows[0];
    const body: CreateFieldDefinitionRequest = await request.json();
    
    // Validate required fields
    if (!body.name || !body.key || !body.field_type) {
      return NextResponse.json(
        { error: 'Name, key, and field_type are required' },
        { status: 400 }
      );
    }
    
    // Validate field type
    if (!VALID_FIELD_TYPES.includes(body.field_type)) {
      return NextResponse.json(
        { error: `Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check key uniqueness within record type
    const existingKey = await pool.query(
      'SELECT id FROM field_definitions WHERE record_type_id = $1 AND key = $2',
      [recordType.id, body.key]
    );
    
    if (existingKey.rows.length > 0) {
      return NextResponse.json(
        { error: 'A field with this key already exists in this record type' },
        { status: 409 }
      );
    }
    
    // Validate key format (lowercase, alphanumeric, underscores)
    if (!/^[a-z][a-z0-9_]*$/.test(body.key)) {
      return NextResponse.json(
        { error: 'Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores' },
        { status: 400 }
      );
    }
    
    // Get next sort order
    const maxSortResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_sort FROM field_definitions WHERE record_type_id = $1',
      [recordType.id]
    );
    const sortOrder = body.sort_order ?? maxSortResult.rows[0].next_sort;
    
    // Create field
    const result = await pool.query(
      `INSERT INTO field_definitions (
        record_type_id, name, key, description, field_type,
        is_required, is_array, default_value, placeholder,
        help_text, validation_rules, options, display_config,
        visibility, requires_quote, group_id, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        recordType.id,
        body.name,
        body.key,
        body.description || null,
        body.field_type,
        body.is_required ?? false,
        body.is_array ?? false,
        body.default_value ?? null,
        body.placeholder || null,
        body.help_text || null,
        body.validation_rules ? JSON.stringify(body.validation_rules) : null,
        body.options ? JSON.stringify(body.options) : null,
        body.display_config ? JSON.stringify(body.display_config) : null,
        body.visibility ? JSON.stringify(body.visibility) : JSON.stringify({
          guest_form: true,
          review_form: true,
          validation_form: true,
          public_view: true
        }),
        body.requires_quote ?? false,
        body.group_id || null,
        sortOrder
      ]
    );
    
    return NextResponse.json({ field: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating field:', error);
    return NextResponse.json(
      { error: 'Failed to create field' },
      { status: 500 }
    );
  }
}
