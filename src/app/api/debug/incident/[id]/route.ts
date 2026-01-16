import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin role
    const authResult = await requireServerAuth(request, 'admin');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const results: any = {};

    // Get main incident data
    const incident = await pool.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
    if (incident.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    
    results.incident = {
      id: incident.rows[0].id,
      type: incident.rows[0].incident_type,
      name: incident.rows[0].victim_name || incident.rows[0].subject_name,
      status: incident.rows[0].verification_status,
      summary: incident.rows[0].summary?.substring(0, 100)
    };
    
    // Check sources
    const sources = await pool.query('SELECT * FROM incident_sources WHERE incident_id = $1', [incidentId]);
    results.sources = {
      count: sources.rows.length,
      items: sources.rows.map(s => ({ id: s.id, title: s.title, url: s.url }))
    };
    
    // Check quotes
    const quotes = await pool.query(`
      SELECT q.id, q.quote_text, q.source_id, s.title as source_title 
      FROM incident_quotes q 
      LEFT JOIN incident_sources s ON q.source_id = s.id 
      WHERE q.incident_id = $1
    `, [incidentId]);
    results.quotes = {
      count: quotes.rows.length,
      items: quotes.rows.map(q => ({
        id: q.id,
        text: q.quote_text.substring(0, 60) + '...',
        source_id: q.source_id,
        source_title: q.source_title
      }))
    };
    
    // Check quote-field links
    const links = await pool.query(`
      SELECT qfl.field_name, qfl.quote_id, q.quote_text, s.title as source_title
      FROM quote_field_links qfl
      LEFT JOIN incident_quotes q ON qfl.quote_id = q.id
      LEFT JOIN incident_sources s ON q.source_id = s.id
      WHERE qfl.incident_id = $1
    `, [incidentId]);
    results.quoteFieldLinks = {
      count: links.rows.length,
      items: links.rows.map(l => ({
        field: l.field_name,
        quote_id: l.quote_id,
        quote_preview: l.quote_text?.substring(0, 40),
        source: l.source_title
      }))
    };
    
    // Check agencies
    const agencies = await pool.query('SELECT * FROM incident_agencies WHERE incident_id = $1', [incidentId]);
    results.agencies = {
      count: agencies.rows.length,
      items: agencies.rows.map(a => a.agency)
    };
    
    // Check violations
    const violations = await pool.query('SELECT * FROM incident_violations WHERE incident_id = $1', [incidentId]);
    results.violations = {
      count: violations.rows.length,
      items: violations.rows.map(v => v.violation_type)
    };
    
    // Check incident_details (for case law)
    const details = await pool.query('SELECT * FROM incident_details WHERE incident_id = $1', [incidentId]);
    results.incidentDetails = {
      count: details.rows.length,
      items: details.rows.map(d => ({
        type: d.detail_type,
        hasData: !!d.details,
        preview: d.detail_type === 'violation_legal_basis' ? JSON.stringify(d.details).substring(0, 100) : null
      }))
    };
    
    // Check timeline
    const timeline = await pool.query('SELECT * FROM incident_timeline WHERE incident_id = $1', [incidentId]);
    results.timeline = {
      count: timeline.rows.length,
      items: timeline.rows.map(t => ({
        id: t.id,
        date: t.event_date,
        description: t.description?.substring(0, 60)
      }))
    };
    
    // Check media
    const media = await pool.query('SELECT * FROM incident_media WHERE incident_id = $1', [incidentId]);
    results.media = {
      count: media.rows.length
    };

    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve debug info',
      details: error.message
    }, { status: 500 });
  }
}
