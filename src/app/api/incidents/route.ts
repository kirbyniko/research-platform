import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import {
  createIncident,
  getIncidents,
  getIncidentStats,
} from '@/lib/incidents-db';
import type { Incident, IncidentFilters } from '@/types/incident';

// GET /api/incidents - List incidents with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if requesting stats
    if (searchParams.get('stats') === 'true') {
      const stats = await getIncidentStats();
      return NextResponse.json(stats);
    }

    // Build filters from query params
    const filters: IncidentFilters = {};
    
    const type = searchParams.get('type');
    if (type) filters.type = type as IncidentFilters['type'];
    
    const types = searchParams.get('types');
    if (types) filters.types = types.split(',') as IncidentFilters['types'];
    
    const agency = searchParams.get('agency');
    if (agency) filters.agency = agency as IncidentFilters['agency'];
    
    const agencies = searchParams.get('agencies');
    if (agencies) filters.agencies = agencies.split(',') as IncidentFilters['agencies'];
    
    const violation = searchParams.get('violation');
    if (violation) filters.violation = violation as IncidentFilters['violation'];
    
    const violations = searchParams.get('violations');
    if (violations) filters.violations = violations.split(',') as IncidentFilters['violations'];
    
    const state = searchParams.get('state');
    if (state) filters.state = state;
    
    const city = searchParams.get('city');
    if (city) filters.city = city;
    
    const year = searchParams.get('year');
    if (year) filters.year = parseInt(year);
    
    const yearStart = searchParams.get('year_start');
    if (yearStart) filters.year_start = parseInt(yearStart);
    
    const yearEnd = searchParams.get('year_end');
    if (yearEnd) filters.year_end = parseInt(yearEnd);
    
    const verified = searchParams.get('verified');
    if (verified !== null) filters.verified = verified === 'true';
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const limit = searchParams.get('limit');
    if (limit) filters.limit = parseInt(limit);
    
    const offset = searchParams.get('offset');
    if (offset) filters.offset = parseInt(offset);
    
    const sortBy = searchParams.get('sort_by');
    if (sortBy) filters.sort_by = sortBy as IncidentFilters['sort_by'];
    
    const sortOrder = searchParams.get('sort_order');
    if (sortOrder) filters.sort_order = sortOrder as IncidentFilters['sort_order'];

    const incidents = await getIncidents(filters);
    return NextResponse.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incidents' },
      { status: 500 }
    );
  }
}

// POST /api/incidents - Create new incident
export async function POST(request: NextRequest) {
  try {
    // Require editor role minimum
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const user = authResult.user;

    const body = await request.json();
    const incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'> = body;

    // Validate required fields
    if (!incident.incident_id) {
      return NextResponse.json(
        { error: 'incident_id is required' },
        { status: 400 }
      );
    }
    if (!incident.incident_type) {
      return NextResponse.json(
        { error: 'incident_type is required' },
        { status: 400 }
      );
    }

    const id = await createIncident(incident);
    
    // If submitter is an analyst, auto-record their submission and mark fields as first-verified
    const isAnalyst = user.role === 'analyst' || user.role === 'admin';
    
    if (isAnalyst) {
      try {
        // Update incident with submitter info and auto first-verification
        await pool.query(`
          UPDATE incidents SET 
            submitted_by = $1,
            submitted_at = NOW(),
            submitter_role = $2,
            first_verified_by = $1,
            first_verified_at = NOW(),
            verification_status = 'first_review',
            victim_name = COALESCE(victim_name, subject_name)
          WHERE id = $3
        `, [user.id, user.role, id]);
        
        // Create field-level verification records for all fields with values
        const fieldsToVerify = [
          { key: 'victim_name', value: incident.subject?.name },
          { key: 'incident_date', value: incident.date },
          { key: 'incident_type', value: incident.incident_type },
          { key: 'city', value: incident.location?.city },
          { key: 'state', value: incident.location?.state },
          { key: 'facility', value: incident.location?.facility },
          { key: 'summary', value: incident.summary },
        ].filter(f => f.value); // Only create verifications for fields with values
        
        for (const field of fieldsToVerify) {
          await pool.query(`
            INSERT INTO incident_field_verifications 
              (incident_id, field_name, field_value, first_verified_by, first_verified_at, verification_status)
            VALUES ($1, $2, $3, $4, NOW(), 'first_review')
            ON CONFLICT (incident_id, field_name) DO NOTHING
          `, [id, field.key, String(field.value), user.id]);
        }
      } catch (verifyError) {
        console.error('Error auto-verifying analyst submission:', verifyError);
        // Don't fail the whole request if verification fails
      }
    } else {
      // Non-analyst submission - just record who submitted
      await pool.query(`
        UPDATE incidents SET 
          submitted_by = $1,
          submitted_at = NOW(),
          submitter_role = $2,
          verification_status = 'pending',
          victim_name = COALESCE(victim_name, subject_name)
        WHERE id = $3
      `, [user.id, user.role, id]);
    }
    
    return NextResponse.json({ 
      success: true, 
      id, 
      incident_id: incident.incident_id,
      auto_verified: isAnalyst,
      message: isAnalyst 
        ? 'Incident created and auto-verified as first review (analyst submission)'
        : 'Incident created and pending first review'
    });
  } catch (error) {
    console.error('Error creating incident:', error);
    
    // Check for duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'An incident with this ID already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create incident' },
      { status: 500 }
    );
  }
}
