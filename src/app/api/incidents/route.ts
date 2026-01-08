import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
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
    // Require editor role
    const authResult = await requireAuth('editor')(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

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
    return NextResponse.json({ success: true, id, incident_id: incident.incident_id });
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
