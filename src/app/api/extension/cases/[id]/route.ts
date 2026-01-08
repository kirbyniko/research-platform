import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Fetch case by ID (numeric) or case_id (string)
    const caseResult = await pool.query(`
      SELECT 
        c.id,
        c.case_id,
        c.name,
        c.date_of_death,
        c.age,
        c.country_of_origin,
        c.facility,
        c.location,
        c.cause_of_death,
        c.created_at,
        c.updated_at
      FROM cases c
      WHERE c.id = $1 OR c.case_id = $1
      LIMIT 1
    `, [id]);
    
    if (caseResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }
    
    const caseData = caseResult.rows[0];
    
    // Fetch quotes
    const quotesResult = await pool.query(`
      SELECT 
        id,
        quote_text,
        category,
        page_number,
        confidence,
        created_at
      FROM case_quotes
      WHERE case_id = $1
      ORDER BY created_at ASC
    `, [caseData.id]);
    
    // Fetch sources
    const sourcesResult = await pool.query(`
      SELECT 
        id,
        url,
        title,
        author,
        published_date,
        accessed_at
      FROM case_sources
      WHERE case_id = $1
      ORDER BY accessed_at DESC
    `, [caseData.id]);
    
    return NextResponse.json({
      ...caseData,
      quotes: quotesResult.rows,
      sources: sourcesResult.rows
    });
    
  } catch (error) {
    console.error('Get case error:', error);
    return NextResponse.json(
      { error: 'Failed to get case' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete case and related data (cascades if set up)
    await pool.query(`
      DELETE FROM cases WHERE id = $1 OR case_id = $1
    `, [id]);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Delete case error:', error);
    return NextResponse.json(
      { error: 'Failed to delete case' },
      { status: 500 }
    );
  }
}
