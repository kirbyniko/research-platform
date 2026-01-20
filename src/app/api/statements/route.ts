import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth, optionalServerAuth } from '@/lib/server-auth';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import pool from '@/lib/db';
import type { StatementFilters } from '@/types/statement';

// GET /api/statements - List statements with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if user is requesting unverified statements (requires analyst role)
    const includeUnverified = searchParams.get('include_unverified') === 'true';
    
    if (includeUnverified) {
      // SECURITY: Only analysts can see unverified statements
      const authResult = await requireServerAuth(request, 'analyst');
      if ('error' in authResult) {
        return NextResponse.json(
          { error: 'Analyst access required to view unverified statements' },
          { status: 403 }
        );
      }
    }

    // Build query
    let query = `
      SELECT 
        s.*,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', sq.id,
            'text', sq.text,
            'source_url', sq.source_url,
            'source_title', sq.source_title,
            'verified', sq.verified
          )) FILTER (WHERE sq.id IS NOT NULL), 
          '[]'
        ) as quotes,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', ss.id,
            'url', ss.url,
            'title', ss.title,
            'priority', ss.priority
          )) FILTER (WHERE ss.id IS NOT NULL),
          '[]'
        ) as sources
      FROM statements s
      LEFT JOIN statement_quotes sq ON s.id = sq.statement_id
      LEFT JOIN statement_sources ss ON s.id = ss.statement_id
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Filter by verification status
    if (!includeUnverified) {
      conditions.push(`s.verification_status = 'verified'`);
    }
    
    // Statement type filter
    const statementType = searchParams.get('statement_type');
    if (statementType) {
      conditions.push(`s.statement_type = $${paramIndex++}`);
      params.push(statementType);
    }
    
    // Speaker type filter
    const speakerType = searchParams.get('speaker_type');
    if (speakerType) {
      conditions.push(`s.speaker_type = $${paramIndex++}`);
      params.push(speakerType);
    }
    
    // Political affiliation filter
    const politicalAffiliation = searchParams.get('political_affiliation');
    if (politicalAffiliation) {
      conditions.push(`s.political_affiliation = $${paramIndex++}`);
      params.push(politicalAffiliation);
    }
    
    // Impact level filter
    const impactLevel = searchParams.get('impact_level');
    if (impactLevel) {
      conditions.push(`s.impact_level = $${paramIndex++}`);
      params.push(impactLevel);
    }
    
    // Search filter
    const search = searchParams.get('search');
    if (search) {
      conditions.push(`(
        s.speaker_name ILIKE $${paramIndex} OR 
        s.headline ILIKE $${paramIndex} OR 
        s.key_quote ILIKE $${paramIndex} OR
        s.full_text ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add WHERE clause if needed
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Group by
    query += ` GROUP BY s.id`;
    
    // Order by
    const sortBy = searchParams.get('sort_by') || 'statement_date';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const validSortFields = ['statement_date', 'created_at', 'impact_level', 'speaker_name'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'statement_date';
    query += ` ORDER BY s.${sortField} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching statements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statements' },
      { status: 500 }
    );
  }
}

// POST /api/statements - Create new statement (guest or authenticated)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting for guest submissions
    const authResult = await optionalServerAuth(request);
    const isAuthenticated = authResult && !('error' in authResult);
    
    if (!isAuthenticated) {
      // Apply rate limit for guest submissions (5 per hour)
      const rateLimitResult = await rateLimit(request, RateLimitPresets.veryStrict);
      if (rateLimitResult && 'status' in rateLimitResult) {
        return rateLimitResult as NextResponse;
      }
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.statement_type) {
      return NextResponse.json(
        { error: 'statement_type is required' },
        { status: 400 }
      );
    }
    
    if (!body.speaker?.name) {
      return NextResponse.json(
        { error: 'speaker.name is required' },
        { status: 400 }
      );
    }
    
    if (!body.key_quote) {
      return NextResponse.json(
        { error: 'key_quote is required' },
        { status: 400 }
      );
    }
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert statement
      const statementResult = await client.query(`
        INSERT INTO statements (
          statement_type,
          statement_date,
          headline,
          key_quote,
          speaker_name,
          speaker_title,
          speaker_organization,
          speaker_type,
          political_affiliation,
          speaker_credentials,
          speaker_wikipedia_url,
          platform,
          platform_url,
          full_text,
          context,
          impact_level,
          media_coverage,
          engagement_likes,
          engagement_shares,
          engagement_views,
          previously_supported,
          party_typically_supports,
          breaking_ranks,
          ice_response,
          notable_responses,
          verification_status,
          submitted_by_user_id,
          is_guest_submission,
          field_quote_map
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29
        )
        RETURNING id
      `, [
        body.statement_type,
        body.statement_date || null,
        body.headline || null,
        body.key_quote,
        body.speaker?.name,
        body.speaker?.title || null,
        body.speaker?.organization || null,
        body.speaker?.speaker_type || null,
        body.speaker?.political_affiliation || null,
        body.speaker?.credentials || null,
        body.speaker?.wikipedia_url || null,
        body.platform || null,
        body.platform_url || null,
        body.full_text || null,
        body.context || null,
        body.impact_level || null,
        body.media_coverage || null,
        body.engagement?.likes || 0,
        body.engagement?.shares || 0,
        body.engagement?.views || 0,
        body.previously_supported || false,
        body.party_typically_supports || false,
        body.breaking_ranks || false,
        body.ice_response || null,
        body.notable_responses || null,
        isAuthenticated ? 'pending' : 'pending', // All start as pending for review
        isAuthenticated ? (authResult as any).userId : null,
        !isAuthenticated,
        body.field_quote_map ? JSON.stringify(body.field_quote_map) : null
      ]);
      
      const statementId = statementResult.rows[0].id;
      
      // Insert sources
      if (body.sources && Array.isArray(body.sources)) {
        for (const source of body.sources) {
          await client.query(`
            INSERT INTO statement_sources (statement_id, url, title, priority)
            VALUES ($1, $2, $3, $4)
          `, [statementId, source.url, source.title || null, source.priority || 'secondary']);
        }
      }
      
      // Insert quotes
      if (body.quotes && Array.isArray(body.quotes)) {
        for (const quote of body.quotes) {
          await client.query(`
            INSERT INTO statement_quotes (statement_id, text, source_url, source_title, verified)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            statementId, 
            quote.text, 
            quote.sourceUrl || quote.source_url || null, 
            quote.sourceTitle || quote.source_title || null,
            quote.verified || false
          ]);
        }
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        id: statementId,
        message: isAuthenticated 
          ? 'Statement created and pending review'
          : 'Guest submission received and pending review'
      }, { status: 201 });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating statement:', error);
    return NextResponse.json(
      { error: 'Failed to create statement' },
      { status: 500 }
    );
  }
}
