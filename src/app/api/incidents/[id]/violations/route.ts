import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import {
  getIncidentViolations,
  addIncidentViolation,
  updateIncidentViolation,
  deleteIncidentViolation,
} from '@/lib/incidents-db';

// GET /api/incidents/[id]/violations - Get all violations for an incident
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const violations = await getIncidentViolations(numericId);
    return NextResponse.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    return NextResponse.json({ error: 'Failed to fetch violations' }, { status: 500 });
  }
}

// POST /api/incidents/[id]/violations - Add a violation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const numericId = parseInt(id);
    
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }

    const { violation_type, description, constitutional_basis } = await request.json();
    
    if (!violation_type) {
      return NextResponse.json({ error: 'Violation type is required' }, { status: 400 });
    }

    const violationId = await addIncidentViolation(numericId, violation_type, description, constitutional_basis);
    return NextResponse.json({ success: true, id: violationId });
  } catch (error) {
    console.error('Error adding violation:', error);
    return NextResponse.json({ error: 'Failed to add violation' }, { status: 500 });
  }
}

// PUT /api/incidents/[id]/violations - Update a violation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { violation_id, violation_type, description, constitutional_basis } = await request.json();
    
    if (!violation_id || !violation_type) {
      return NextResponse.json({ error: 'violation_id and violation_type are required' }, { status: 400 });
    }

    await updateIncidentViolation(violation_id, violation_type, description, constitutional_basis);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating violation:', error);
    return NextResponse.json({ error: 'Failed to update violation' }, { status: 500 });
  }
}

// DELETE /api/incidents/[id]/violations - Delete a violation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { violation_id } = await request.json();
    
    if (!violation_id) {
      return NextResponse.json({ error: 'violation_id is required' }, { status: 400 });
    }

    await deleteIncidentViolation(violation_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting violation:', error);
    return NextResponse.json({ error: 'Failed to delete violation' }, { status: 500 });
  }
}
