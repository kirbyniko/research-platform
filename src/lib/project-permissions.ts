import pool from './db';
import { ProjectRole, Permission, ROLE_PERMISSIONS } from '@/types/platform';

/**
 * Check if a user has a specific permission for a project
 */
export async function hasProjectPermission(
  userId: number,
  projectId: number,
  permission: Permission
): Promise<boolean> {
  // Check if user is owner
  const ownerCheck = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL',
    [projectId, userId]
  );
  
  if (ownerCheck.rows.length > 0) {
    return true; // Owner has all permissions
  }
  
  // Get member role
  const memberCheck = await pool.query(
    'SELECT role, permissions FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return false; // Not a member
  }
  
  const { role, permissions: customPerms } = memberCheck.rows[0];
  
  // Check custom permission override first
  if (customPerms && typeof customPerms[permission] === 'boolean') {
    return customPerms[permission];
  }
  
  // Fall back to role-based permission
  const rolePerms = ROLE_PERMISSIONS[role as ProjectRole];
  return rolePerms?.includes(permission) ?? false;
}

/**
 * Get user's role in a project
 */
export async function getUserProjectRole(
  userId: number,
  projectId: number
): Promise<ProjectRole | null> {
  // Check if owner
  const ownerCheck = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL',
    [projectId, userId]
  );
  
  if (ownerCheck.rows.length > 0) {
    return 'owner';
  }
  
  // Get member role
  const memberCheck = await pool.query(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  
  if (memberCheck.rows.length === 0) {
    return null;
  }
  
  return memberCheck.rows[0].role as ProjectRole;
}

/**
 * Get project by slug with permission check
 */
export async function getProjectBySlug(
  slug: string,
  userId?: number
): Promise<{ project: any; role: ProjectRole | null } | null> {
  const result = await pool.query(
    'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
    [slug]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const project = result.rows[0];
  
  // If public and no user, allow view access
  if (project.is_public && !userId) {
    return { project, role: null };
  }
  
  // If no user and not public, deny
  if (!userId) {
    return null;
  }
  
  const role = await getUserProjectRole(userId, project.id);
  
  // If not a member and not public, deny
  if (!role && !project.is_public) {
    return null;
  }
  
  return { project, role };
}

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId: number): Promise<Array<{
  project: any;
  role: ProjectRole;
}>> {
  const result = await pool.query(`
    SELECT 
      p.*,
      CASE 
        WHEN p.created_by = $1 THEN 'owner'
        ELSE pm.role
      END as role
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
    WHERE p.deleted_at IS NULL
      AND (p.created_by = $1 OR pm.user_id = $1)
    ORDER BY p.updated_at DESC
  `, [userId]);
  
  return result.rows.map(row => ({
    project: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      is_public: row.is_public,
      settings: row.settings,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    role: row.role as ProjectRole,
  }));
}

/**
 * Validate project slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 3 && slug.length <= 100;
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM projects WHERE slug = $1',
    [slug]
  );
  return result.rows.length === 0;
}
