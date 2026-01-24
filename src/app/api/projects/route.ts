import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { 
  getUserProjects, 
  isValidSlug, 
  isSlugAvailable 
} from '@/lib/project-permissions';
import { CreateProjectRequest } from '@/types/platform';

// GET /api/projects - List user's projects
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const projectsWithRole = await getUserProjects(authResult.user.id);
    
    // Flatten the response to just include projects with id, slug, name
    const projects = projectsWithRole.map(item => ({
      id: item.project.id,
      slug: item.project.slug,
      name: item.project.name,
      description: item.project.description,
      is_public: item.project.is_public,
      role: item.role,
    }));
    
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    const body: CreateProjectRequest = await request.json();
    const { slug, name, description, is_public, settings } = body;
    
    // Validate required fields
    if (!slug || !name) {
      return NextResponse.json(
        { error: 'Slug and name are required' },
        { status: 400 }
      );
    }
    
    // Validate slug format
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Must be 3-100 characters, lowercase, alphanumeric with hyphens.' },
        { status: 400 }
      );
    }
    
    // Check slug availability
    if (!(await isSlugAvailable(slug))) {
      return NextResponse.json(
        { error: 'Slug is already taken' },
        { status: 409 }
      );
    }
    
    // Create the project
    const result = await pool.query(
      `INSERT INTO projects (slug, name, description, is_public, settings, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        slug,
        name,
        description || null,
        is_public ?? false,
        JSON.stringify(settings || {}),
        userId
      ]
    );
    
    const project = result.rows[0];
    
    // Also add creator as owner in project_members for consistency
    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role, accepted_at)
       VALUES ($1, $2, 'owner', NOW())`,
      [project.id, userId]
    );
    
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
