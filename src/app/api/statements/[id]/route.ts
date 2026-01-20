import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/statements/[id] - Get single statement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statementId = parseInt(id);
    
    if (isNaN(statementId)) {
      return NextResponse.json(
        { error: 'Invalid statement ID' },
        { status: 400 }
      );
    }
    
    const result = await pool.query(`
      SELECT 
        s.id,
        s.statement_type,
        s.statement_date,
        s.headline,
        s.key_quote,
        s.speaker_name,
        s.speaker_title,
        s.speaker_organization,
        s.speaker_type,
        s.political_affiliation,
        s.speaker_credentials,
        s.speaker_wikipedia_url,
        s.platform,
        s.platform_url,
        s.full_text,
        s.context,
        s.impact_level,
        s.media_coverage,
        s.engagement_likes,
        s.engagement_shares,
        s.engagement_views,
        s.previously_supported,
        s.party_typically_supports,
        s.breaking_ranks,
        s.ice_response,
        s.notable_responses,
        s.verification_status,
        s.is_guest_submission,
        s.field_quote_map,
        s.tags,
        s.created_at,
        s.updated_at,
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
      WHERE s.id = $1
      GROUP BY s.id, s.statement_type, s.statement_date, s.headline, s.key_quote,
               s.speaker_name, s.speaker_title, s.speaker_organization, s.speaker_type,
               s.political_affiliation, s.speaker_credentials, s.speaker_wikipedia_url,
               s.platform, s.platform_url, s.full_text, s.context, s.impact_level,
               s.media_coverage, s.engagement_likes, s.engagement_shares, s.engagement_views,
               s.previously_supported, s.party_typically_supports, s.breaking_ranks,
               s.ice_response, s.notable_responses, s.verification_status, s.is_guest_submission,
               s.field_quote_map, s.tags, s.created_at, s.updated_at
    `, [statementId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Statement not found' },
        { status: 404 }
      );
    }
    
    const statement = result.rows[0];
    
    // Ensure tags is an array
    if (!Array.isArray(statement.tags)) {
      if (statement.tags) {
        // If it's a string representation, parse it
        statement.tags = typeof statement.tags === 'string' ? 
          statement.tags.replace(/^{|}$/g, '').split(',').map((t: string) => t.trim()).filter((t: string) => t) :
          [];
      } else {
        statement.tags = [];
      }
    }
    
    // Check if statement is verified or if user has analyst access
    if (statement.verification_status !== 'verified') {
      const authResult = await requireServerAuth(request, 'analyst');
      if ('error' in authResult) {
        return NextResponse.json(
          { error: 'Statement not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(statement);
  } catch (error) {
    console.error('Error fetching statement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statement' },
      { status: 500 }
    );
  }
}

// PATCH /api/statements/[id] - Update statement (analyst only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { id } = await params;
    const statementId = parseInt(id);
    
    if (isNaN(statementId)) {
      return NextResponse.json(
        { error: 'Invalid statement ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    console.log('[PATCH /api/statements] Received body:', {
      statementId,
      tags: body.tags,
      tagsType: typeof body.tags,
      tagsIsArray: Array.isArray(body.tags),
      field_quote_map: body.field_quote_map,
      hasFieldQuoteMap: !!body.field_quote_map
    });
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'statement_type', 'statement_date', 'headline', 'key_quote',
      'speaker_name', 'speaker_title', 'speaker_organization', 'speaker_type',
      'political_affiliation', 'speaker_credentials', 'speaker_wikipedia_url',
      'platform', 'platform_url', 'full_text', 'context',
      'impact_level', 'media_coverage',
      'engagement_likes', 'engagement_shares', 'engagement_views',
      'previously_supported', 'party_typically_supports', 'breaking_ranks',
      'ice_response', 'notable_responses',
      'verification_status', 'verification_notes', 'tags', 'field_quote_map'
    ];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'tags') {
          // Tags should be stored as text[] in PostgreSQL
          updateFields.push(`${field} = $${paramIndex++}::text[]`);
          values.push(body[field]);
        } else if (field === 'field_quote_map') {
          // field_quote_map should be stored as JSONB in PostgreSQL
          updateFields.push(`${field} = $${paramIndex++}::jsonb`);
          values.push(JSON.stringify(body[field]));
        } else {
          updateFields.push(`${field} = $${paramIndex++}`);
          values.push(body[field]);
        }
      }
    }
    
    // Handle nested speaker object
    if (body.speaker) {
      const speakerFieldMap: Record<string, string> = {
        name: 'speaker_name',
        title: 'speaker_title',
        organization: 'speaker_organization',
        speaker_type: 'speaker_type',
        political_affiliation: 'political_affiliation',
        credentials: 'speaker_credentials',
        wikipedia_url: 'speaker_wikipedia_url',
      };
      
      for (const [key, dbField] of Object.entries(speakerFieldMap)) {
        if (body.speaker[key] !== undefined) {
          updateFields.push(`${dbField} = $${paramIndex++}`);
          values.push(body.speaker[key]);
        }
      }
    }
    
    // Handle engagement metrics
    if (body.engagement) {
      if (body.engagement.likes !== undefined) {
        updateFields.push(`engagement_likes = $${paramIndex++}`);
        values.push(body.engagement.likes);
      }
      if (body.engagement.shares !== undefined) {
        updateFields.push(`engagement_shares = $${paramIndex++}`);
        values.push(body.engagement.shares);
      }
      if (body.engagement.views !== undefined) {
        updateFields.push(`engagement_views = $${paramIndex++}`);
        values.push(body.engagement.views);
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Add updated_at
    updateFields.push(`updated_at = NOW()`);
    
    // Add statement ID
    values.push(statementId);
    
    const query = `
      UPDATE statements 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Statement not found' },
        { status: 404 }
      );
    }
    
    const updated = result.rows[0];
    console.log('[PATCH /api/statements] Updated statement:', {
      id: updated.id,
      tags: updated.tags,
      tagsType: typeof updated.tags,
      tagsIsArray: Array.isArray(updated.tags)
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating statement:', error);
    return NextResponse.json(
      { error: 'Failed to update statement' },
      { status: 500 }
    );
  }
}

// DELETE /api/statements/[id] - Delete statement (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'admin');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { id } = await params;
    const statementId = parseInt(id);
    
    if (isNaN(statementId)) {
      return NextResponse.json(
        { error: 'Invalid statement ID' },
        { status: 400 }
      );
    }
    
    // Delete in transaction (cascading deletes should handle related records)
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete related quotes
      await client.query('DELETE FROM statement_quotes WHERE statement_id = $1', [statementId]);
      
      // Delete related sources
      await client.query('DELETE FROM statement_sources WHERE statement_id = $1', [statementId]);
      
      // Delete statement
      const result = await client.query(
        'DELETE FROM statements WHERE id = $1 RETURNING id',
        [statementId]
      );
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Statement not found' },
          { status: 404 }
        );
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({ success: true, id: statementId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting statement:', error);
    return NextResponse.json(
      { error: 'Failed to delete statement' },
      { status: 500 }
    );
  }
}
