import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET - List all unverified items
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request, 'editor');
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    console.log('[verify API] Auth successful, user:', authResult.user?.email);

    const client = await pool.connect();
    try {
      // Get unverified incidents
      const incidentsResult = await client.query(`
        SELECT id, incident_id, victim_name, incident_date, verification_status
        FROM incidents
        ORDER BY verification_status ASC, incident_date DESC
      `);

      // Get unverified timeline events
      const timelineResult = await client.query(`
        SELECT t.id, t.incident_id, t.date, t.description, i.victim_name as incident_name
        FROM incident_timeline t
        JOIN incidents i ON t.incident_id = i.id
        ORDER BY t.date DESC
      `);

      // Get unverified sources
      const sourcesResult = await client.query(`
        SELECT s.id, s.incident_id, s.title, s.publication, s.url, s.source_type, i.victim_name as incident_name
        FROM incident_sources s
        JOIN incidents i ON s.incident_id = i.id
        ORDER BY s.date_published DESC NULLS LAST
      `);

      // Get unverified quotes
      const quotesResult = await client.query(`
        SELECT q.id, q.incident_id, q.quote_text, q.category, q.verified, i.victim_name as incident_name
        FROM incident_quotes q
        JOIN incidents i ON q.incident_id = i.id
        ORDER BY q.verified ASC, q.created_at DESC
      `);

      // Summary counts
      const summary = {
        incidents: {
          total: incidentsResult.rows.length,
          verified: incidentsResult.rows.filter((r: any) => r.verification_status === 'verified').length,
          unverified: incidentsResult.rows.filter((r: any) => r.verification_status !== 'verified').length,
        },
        timeline: {
          total: timelineResult.rows.length,
        },
        sources: {
          total: sourcesResult.rows.length,
        },
        quotes: {
          total: quotesResult.rows.length,
          verified: quotesResult.rows.filter((r: any) => r.verified).length,
          unverified: quotesResult.rows.filter((r: any) => !r.verified).length,
        },
      };

      return NextResponse.json({
        summary,
        incidents: incidentsResult.rows,
        timeline: timelineResult.rows,
        sources: sourcesResult.rows,
        quotes: quotesResult.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching verification data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification data' },
      { status: 500 }
    );
  }
}

// POST - Verify an item
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request, 'editor');
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { type, id, verified } = await request.json();
    const user = authResult.user;

    if (!type || id === undefined) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      let query = '';
      const verifiedValue = verified !== false;

      switch (type) {
        case 'case':
          query = `
            UPDATE cases 
            SET verified = $1, verified_by = $2, verified_at = NOW()
            WHERE id = $3
            RETURNING id, name, verified
          `;
          break;
        case 'timeline':
          query = `
            UPDATE timeline_events 
            SET verified = $1
            WHERE id = $2
            RETURNING id, event, verified
          `;
          break;
        case 'source':
          query = `
            UPDATE sources 
            SET verified = $1
            WHERE id = $2
            RETURNING id, title, verified
          `;
          break;
        case 'discrepancy':
          query = `
            UPDATE discrepancies 
            SET verified = $1
            WHERE id = $2
            RETURNING id, ice_claim, verified
          `;
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid type' },
            { status: 400 }
          );
      }

      const params = type === 'case' 
        ? [verifiedValue, user.email, id]
        : [verifiedValue, id];

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Item not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        item: result.rows[0],
        verifiedBy: user.email,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error verifying item:', error);
    return NextResponse.json(
      { error: 'Failed to verify item' },
      { status: 500 }
    );
  }
}
