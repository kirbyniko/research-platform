import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import { getProjectCreditsAndUsage } from '@/lib/ai-rate-limit';
import pool from '@/lib/db';

// GET /api/ai/usage - Get project's credits and usage stats
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const userId = authResult.user.id;

    // Get projectId from query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify user has access to the project
    const projectCheck = await pool.query(
      `SELECT p.id FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE p.id = $1 AND pm.user_id = $2 AND p.deleted_at IS NULL`,
      [projectId, userId]
    );

    if (projectCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }
    
    const stats = await getProjectCreditsAndUsage(userId, parseInt(projectId));
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch usage'
    }, { status: 500 });
  }
}
