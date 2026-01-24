import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

// GET /api/projects/[slug]/team/credits - Get all team member credit balances
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { slug } = await params;
    
    // Get project ID
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectId = projectResult.rows[0].id;
    
    // Check permission
    const hasPermission = await hasProjectPermission(authResult.user.id, projectId, 'manage_members');
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all team members with their credit balances
    const membersResult = await pool.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.name,
        pm.role,
        COALESCE(pmc.balance, 0) as balance,
        COALESCE(
          (SELECT COUNT(*) FROM ai_usage au 
           WHERE au.user_id = u.id 
           AND au.project_id = $1 
           AND au.created_at >= NOW() - INTERVAL '1 hour'),
          0
        ) as usage_hour,
        COALESCE(
          (SELECT COUNT(*) FROM ai_usage au 
           WHERE au.user_id = u.id 
           AND au.project_id = $1 
           AND au.created_at >= NOW() - INTERVAL '1 day'),
          0
        ) as usage_day,
        COALESCE(
          (SELECT COUNT(*) FROM ai_usage au 
           WHERE au.user_id = u.id 
           AND au.project_id = $1),
          0
        ) as usage_total
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      LEFT JOIN project_member_credits pmc ON pmc.project_id = pm.project_id AND pmc.user_id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY pm.role, u.name
    `, [projectId]);

    return NextResponse.json({ members: membersResult.rows });
  } catch (error) {
    console.error('Error fetching team member credits:', error);
    return NextResponse.json({ error: 'Failed to fetch team member credits' }, { status: 500 });
  }
}

// POST /api/projects/[slug]/team/credits - Allocate credits to a team member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { slug } = await params;
    
    // Get project ID
    const projectResult = await pool.query(
      'SELECT id FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );

    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectId = projectResult.rows[0].id;
    const hasPermission = await hasProjectPermission(authResult.user.id, projectId, 'manage_members');
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only owners and admins can allocate credits' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount, reason } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'User ID and positive amount required' }, { status: 400 });
    }

    // Verify user is a member
    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return NextResponse.json({ error: 'User is not a member of this project' }, { status: 400 });
    }

    // Check if allocator has enough project credits
    const projectCreditsResult = await pool.query(
      'SELECT balance FROM user_credits WHERE user_id = $1 AND project_id = $2',
      [authResult.user.id, projectId]
    );

    const projectBalance = projectCreditsResult.rows[0]?.balance || 0;

    if (projectBalance < amount) {
      return NextResponse.json({ 
        error: 'Insufficient project credits',
        details: `You have ${projectBalance} credits available, but tried to allocate ${amount}`
      }, { status: 400 });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Deduct from project pool
      await client.query(
        `UPDATE user_credits 
         SET balance = balance - $1, updated_at = NOW()
         WHERE user_id = $2 AND project_id = $3`,
        [amount, authResult.user.id, projectId]
      );

      // Add to member's balance (insert or update)
      await client.query(
        `INSERT INTO project_member_credits (project_id, user_id, balance, allocated_by, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (project_id, user_id)
         DO UPDATE SET balance = project_member_credits.balance + $3, updated_at = NOW()`,
        [projectId, userId, amount, authResult.user.id]
      );

      // Record allocation transaction
      await client.query(
        `INSERT INTO credit_allocations (project_id, from_user_id, to_user_id, amount, reason, allocated_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, authResult.user.id, userId, amount, reason || null, authResult.user.id]
      );

      await client.query('COMMIT');

      // Get updated balance
      const updatedResult = await client.query(
        'SELECT balance FROM project_member_credits WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );

      return NextResponse.json({ 
        success: true,
        newBalance: updatedResult.rows[0].balance
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error allocating credits:', error);
    return NextResponse.json({ error: 'Failed to allocate credits' }, { status: 500 });
  }
}
