import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - List custom fields for an incident
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const result = await pool.query(
      `SELECT cf.*, 
              array_agg(json_build_object(
                'quote_id', qfl.quote_id,
                'quote_text', q.quote_text,
                'source_title', s.title,
                'source_url', s.url
              )) FILTER (WHERE qfl.quote_id IS NOT NULL) as linked_quotes
       FROM incident_custom_fields cf
       LEFT JOIN quote_field_links qfl ON qfl.incident_id = cf.incident_id 
         AND qfl.field_name = 'custom_' || cf.field_name
       LEFT JOIN quotes q ON q.id = qfl.quote_id
       LEFT JOIN sources s ON s.id = q.source_id
       WHERE cf.incident_id = $1
       GROUP BY cf.id
       ORDER BY cf.created_at DESC`,
      [id]
    );
    
    return NextResponse.json({ 
      custom_fields: result.rows 
    });
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom fields' },
      { status: 500 }
    );
  }
}

// POST - Create a new custom field
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const body = await request.json();
    const { field_name, field_value, quote_id, quote_text, source_url, source_title } = body;
    
    if (!field_name) {
      return NextResponse.json(
        { error: 'Field name is required' },
        { status: 400 }
      );
    }
    
    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert or update custom field
      const fieldResult = await client.query(
        `INSERT INTO incident_custom_fields (incident_id, field_name, field_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (incident_id, field_name) 
         DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
         RETURNING *`,
        [id, field_name, field_value || '']
      );
      
      const customField = fieldResult.rows[0];
      
      // If quote provided, create quote and link it
      if (quote_text) {
        // First, ensure we have the source
        let sourceId = null;
        if (source_url) {
          const sourceResult = await client.query(
            `INSERT INTO sources (incident_id, url, title, source_type)
             VALUES ($1, $2, $3, 'article')
             ON CONFLICT (incident_id, url) DO UPDATE SET title = EXCLUDED.title
             RETURNING id`,
            [id, source_url, source_title || source_url]
          );
          sourceId = sourceResult.rows[0].id;
        }
        
        // Create quote
        const quoteResult = await client.query(
          `INSERT INTO quotes (incident_id, quote_text, category, source_id)
           VALUES ($1, $2, 'custom_field', $3)
           RETURNING id`,
          [id, quote_text, sourceId]
        );
        const newQuoteId = quoteResult.rows[0].id;
        
        // Link quote to custom field (using 'custom_' prefix)
        await client.query(
          `INSERT INTO quote_field_links (incident_id, quote_id, field_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (incident_id, quote_id, field_name) DO NOTHING`,
          [id, newQuoteId, `custom_${field_name}`]
        );
      } else if (quote_id) {
        // Link existing quote to custom field
        await client.query(
          `INSERT INTO quote_field_links (incident_id, quote_id, field_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (incident_id, quote_id, field_name) DO NOTHING`,
          [id, quote_id, `custom_${field_name}`]
        );
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({ 
        success: true, 
        custom_field: customField 
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating custom field:', error);
    return NextResponse.json(
      { error: 'Failed to create custom field' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom field
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const { searchParams } = new URL(request.url);
    const fieldName = searchParams.get('field_name');
    
    if (!fieldName) {
      return NextResponse.json(
        { error: 'Field name is required' },
        { status: 400 }
      );
    }
    
    // Delete quote links first
    await pool.query(
      `DELETE FROM quote_field_links 
       WHERE incident_id = $1 AND field_name = $2`,
      [id, `custom_${fieldName}`]
    );
    
    // Delete custom field
    await pool.query(
      `DELETE FROM incident_custom_fields 
       WHERE incident_id = $1 AND field_name = $2`,
      [id, fieldName]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom field' },
      { status: 500 }
    );
  }
}
