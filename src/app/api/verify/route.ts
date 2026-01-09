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
      // Get unverified cases
      const casesResult = await client.query(`
        SELECT id, name, date_of_death, verified, verified_by, verified_at
        FROM cases
        ORDER BY verified ASC, date_of_death DESC
      `);

      // Get unverified timeline events
      const timelineResult = await client.query(`
        SELECT t.id, t.case_id, t.date, t.event, t.verified, c.name as case_name
        FROM timeline_events t
        JOIN cases c ON t.case_id = c.id
        ORDER BY t.verified ASC, t.date DESC
      `);

      // Get unverified sources
      const sourcesResult = await client.query(`
        SELECT s.id, s.case_id, s.title, s.publisher, s.url, s.verified, c.name as case_name
        FROM sources s
        JOIN cases c ON s.case_id = c.id
        ORDER BY s.verified ASC, s.date DESC
      `);

      // Get unverified discrepancies
      const discrepanciesResult = await client.query(`
        SELECT d.id, d.case_id, d.ice_claim, d.counter_evidence, d.verified, c.name as case_name
        FROM discrepancies d
        JOIN cases c ON d.case_id = c.id
        ORDER BY d.verified ASC
      `);

      // Summary counts
      const summary = {
        cases: {
          total: casesResult.rows.length,
          verified: casesResult.rows.filter((r: any) => r.verified).length,
          unverified: casesResult.rows.filter((r: any) => !r.verified).length,
        },
        timeline: {
          total: timelineResult.rows.length,
          verified: timelineResult.rows.filter((r: any) => r.verified).length,
          unverified: timelineResult.rows.filter((r: any) => !r.verified).length,
        },
        sources: {
          total: sourcesResult.rows.length,
          verified: sourcesResult.rows.filter((r: any) => r.verified).length,
          unverified: sourcesResult.rows.filter((r: any) => !r.verified).length,
        },
        discrepancies: {
          total: discrepanciesResult.rows.length,
          verified: discrepanciesResult.rows.filter((r: any) => r.verified).length,
          unverified: discrepanciesResult.rows.filter((r: any) => !r.verified).length,
        },
      };

      return NextResponse.json({
        summary,
        cases: casesResult.rows,
        timeline: timelineResult.rows,
        sources: sourcesResult.rows,
        discrepancies: discrepanciesResult.rows,
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
