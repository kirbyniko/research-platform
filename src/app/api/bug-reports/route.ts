import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 per hour to prevent spam
  const rateLimitResponse = rateLimit(request, RateLimitPresets.veryStrict, 'bug-reports');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const bugReport = await request.json();
    
    const {
      description,
      steps,
      timestamp,
      url,
      userAgent,
      extensionVersion,
      currentCase,
      verifiedQuotesCount,
      pendingQuotesCount,
      sourcesCount,
      isConnected,
      apiUrl,
      consoleErrors
    } = bugReport;
    
    // Store in database
    const result = await pool.query(
      `INSERT INTO bug_reports (
        description,
        steps,
        reported_at,
        page_url,
        user_agent,
        extension_version,
        case_context,
        console_errors,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        description,
        steps,
        timestamp || new Date().toISOString(),
        url,
        userAgent,
        extensionVersion,
        currentCase ? JSON.stringify({
          name: currentCase.name,
          incidentType: currentCase.incident_type,
          verifiedQuotesCount,
          pendingQuotesCount,
          sourcesCount
        }) : null,
        consoleErrors ? JSON.stringify(consoleErrors) : null,
        JSON.stringify({
          isConnected,
          apiUrl
        })
      ]
    );
    
    return NextResponse.json({ 
      success: true, 
      id: result.rows[0].id,
      message: 'Bug report submitted successfully' 
    });
    
  } catch (error) {
    console.error('Error saving bug report:', error);
    return NextResponse.json(
      { error: 'Failed to save bug report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require admin to view bug reports
    const authResult = await requireServerAuth(request, 'admin');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status'); // 'open', 'resolved', 'all'
    
    const query = `
      SELECT * FROM bug_reports 
      ${status && status !== 'all' ? 'WHERE status = $2' : ''}
      ORDER BY reported_at DESC 
      LIMIT $1
    `;
    
    const params = status && status !== 'all' ? [limit, status] : [limit];
    const result = await pool.query(query, params);
    
    return NextResponse.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bug reports' },
      { status: 500 }
    );
  }
}
