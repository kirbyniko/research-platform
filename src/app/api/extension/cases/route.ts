import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireServerAuth } from '@/lib/server-auth';

interface Quote {
  id: string;
  text: string;
  category: string;
  confidence?: number;
}

interface Source {
  url: string;
  title: string;
  date?: string;
  author?: string;
}

interface CaseData {
  name: string;
  dateOfDeath: string;
  age?: string;
  country?: string;
  facility?: string;
  location?: string;
  causeOfDeath?: string;
  quotes: Quote[];
  sources: Source[];
}

export async function POST(request: NextRequest) {
  try {
    // Require user role minimum to submit via extension
    const authResult = await requireServerAuth(request, 'user');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const caseData: CaseData = await request.json();
    
    if (!caseData.name) {
      return NextResponse.json(
        { error: 'Case name is required' },
        { status: 400 }
      );
    }
    
    // Generate a filename-safe ID
    const dateStr = caseData.dateOfDeath || new Date().toISOString().split('T')[0];
    const lastName = caseData.name.split(',')[0]?.trim().toLowerCase().replace(/\s+/g, '-') || 'unknown';
    const caseId = `${dateStr}-${lastName}`;
    
    // Insert or update case in database
    const result = await pool.query(`
      INSERT INTO cases (
        case_id,
        name,
        date_of_death,
        age,
        country_of_origin,
        facility,
        location,
        cause_of_death,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (case_id) DO UPDATE SET
        name = EXCLUDED.name,
        date_of_death = EXCLUDED.date_of_death,
        age = EXCLUDED.age,
        country_of_origin = EXCLUDED.country_of_origin,
        facility = EXCLUDED.facility,
        location = EXCLUDED.location,
        cause_of_death = EXCLUDED.cause_of_death,
        updated_at = NOW()
      RETURNING id, case_id
    `, [
      caseId,
      caseData.name,
      caseData.dateOfDeath || null,
      caseData.age ? parseInt(caseData.age) : null,
      caseData.country || null,
      caseData.facility || null,
      caseData.location || null,
      caseData.causeOfDeath || null
    ]);
    
    const dbCaseId = result.rows[0].id;
    
    // Insert quotes
    if (caseData.quotes && caseData.quotes.length > 0) {
      for (const quote of caseData.quotes) {
        await pool.query(`
          INSERT INTO case_quotes (
            case_id,
            quote_text,
            category,
            confidence,
            created_at
          ) VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT DO NOTHING
        `, [
          dbCaseId,
          quote.text,
          quote.category,
          quote.confidence || 1.0
        ]);
      }
    }
    
    // Insert sources
    if (caseData.sources && caseData.sources.length > 0) {
      for (const source of caseData.sources) {
        await pool.query(`
          INSERT INTO case_sources (
            case_id,
            url,
            title,
            author,
            published_date,
            accessed_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (case_id, url) DO UPDATE SET
            title = EXCLUDED.title,
            accessed_at = NOW()
        `, [
          dbCaseId,
          source.url,
          source.title || null,
          source.author || null,
          source.date || null
        ]);
      }
    }
    
    return NextResponse.json({
      success: true,
      id: caseId,
      dbId: dbCaseId,
      quotesCount: caseData.quotes?.length || 0,
      sourcesCount: caseData.sources?.length || 0
    });
    
  } catch (error) {
    console.error('Save case error:', error);
    return NextResponse.json(
      { error: 'Failed to save case' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    
    let query = `
      SELECT 
        c.id,
        c.case_id,
        c.name,
        c.date_of_death,
        c.facility,
        c.location,
        c.country_of_origin,
        c.cause_of_death,
        c.age,
        COUNT(DISTINCT q.id) as quote_count,
        COUNT(DISTINCT s.id) as source_count
      FROM cases c
      LEFT JOIN case_quotes q ON c.id = q.case_id
      LEFT JOIN case_sources s ON c.id = s.case_id
    `;
    
    const params: string[] = [];
    
    if (search) {
      query += `
        WHERE 
          c.name ILIKE $1 OR 
          c.facility ILIKE $1 OR 
          c.location ILIKE $1 OR
          c.country_of_origin ILIKE $1 OR
          c.case_id ILIKE $1
      `;
      params.push(`%${search}%`);
    }
    
    query += `
      GROUP BY c.id
      ORDER BY c.date_of_death DESC NULLS LAST
      LIMIT 100
    `;
    
    const result = await pool.query(query, params);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Get cases error:', error);
    return NextResponse.json(
      { error: 'Failed to get cases' },
      { status: 500 }
    );
  }
}
