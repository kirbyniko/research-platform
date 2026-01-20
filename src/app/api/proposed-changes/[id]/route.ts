import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';

// GET /api/proposed-changes/[id] - Get a single proposal with original data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: 'Analyst access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const proposalId = parseInt(id);
    
    if (isNaN(proposalId)) {
      return NextResponse.json(
        { error: 'Invalid proposal ID' },
        { status: 400 }
      );
    }
    
    // Get the proposal
    const proposalResult = await pool.query(
      `SELECT * FROM proposed_changes WHERE id = $1`,
      [proposalId]
    );
    
    if (proposalResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }
    
    const proposal = proposalResult.rows[0];
    
    // Get the original record
    let originalQuery: string;
    let quotesQuery: string | null = null;
    let sourcesQuery: string | null = null;
    
    if (proposal.entity_type === 'incident') {
      originalQuery = `SELECT * FROM incidents WHERE id = $1`;
      quotesQuery = `SELECT * FROM incident_quotes WHERE incident_id = $1 ORDER BY id`;
      sourcesQuery = `SELECT * FROM incident_sources WHERE incident_id = $1 ORDER BY id`;
    } else {
      originalQuery = `SELECT * FROM statements WHERE id = $1`;
      quotesQuery = `SELECT * FROM statement_quotes WHERE statement_id = $1 ORDER BY id`;
      sourcesQuery = `SELECT * FROM statement_sources WHERE statement_id = $1 ORDER BY id`;
    }
    
    const originalResult = await pool.query(originalQuery, [proposal.entity_id]);
    
    if (originalResult.rows.length === 0) {
      return NextResponse.json({
        proposal,
        original: null,
        original_deleted: true
      });
    }
    
    const original = originalResult.rows[0];
    
    // Get quotes and sources for the original
    let quotes = [];
    let sources = [];
    
    if (quotesQuery) {
      const quotesResult = await pool.query(quotesQuery, [proposal.entity_id]);
      quotes = quotesResult.rows;
    }
    
    if (sourcesQuery) {
      const sourcesResult = await pool.query(sourcesQuery, [proposal.entity_id]);
      sources = sourcesResult.rows;
    }
    
    return NextResponse.json({
      proposal,
      original: {
        ...original,
        quotes,
        sources
      }
    });
    
  } catch (error) {
    console.error('Error fetching proposed change:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposed change' },
      { status: 500 }
    );
  }
}

// PATCH /api/proposed-changes/[id] - Update proposal status (review/validate/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireServerAuth(request, 'analyst');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: 'Analyst access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const proposalId = parseInt(id);
    
    if (isNaN(proposalId)) {
      return NextResponse.json(
        { error: 'Invalid proposal ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { action, notes, reviewer } = body;
    
    // Get current proposal
    const proposalResult = await pool.query(
      `SELECT * FROM proposed_changes WHERE id = $1`,
      [proposalId]
    );
    
    if (proposalResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }
    
    const proposal = proposalResult.rows[0];
    const reviewerName = reviewer || authResult.user?.email || 'unknown';
    
    let updateQuery: string;
    let updateParams: any[];
    
    switch (action) {
      case 'approve_for_validation':
        // Move from pending_review to pending_validation
        if (proposal.status !== 'pending_review') {
          return NextResponse.json(
            { error: 'Can only approve proposals that are pending review' },
            { status: 400 }
          );
        }
        
        updateQuery = `
          UPDATE proposed_changes 
          SET status = 'pending_validation',
              reviewed_by = $2,
              reviewed_at = NOW(),
              review_notes = $3,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        updateParams = [proposalId, reviewerName, notes || null];
        break;
        
      case 'validate':
        // Validate and apply changes
        if (proposal.status !== 'pending_validation') {
          return NextResponse.json(
            { error: 'Can only validate proposals that are pending validation' },
            { status: 400 }
          );
        }
        
        // Apply changes to the original record
        const applyResult = await applyProposedChanges(proposal);
        if (!applyResult.success) {
          return NextResponse.json(
            { error: applyResult.error },
            { status: 500 }
          );
        }
        
        updateQuery = `
          UPDATE proposed_changes 
          SET status = 'approved',
              validated_by = $2,
              validated_at = NOW(),
              validation_notes = $3,
              applied_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        updateParams = [proposalId, reviewerName, notes || null];
        break;
        
      case 'reject':
        // Reject at any stage
        if (!['pending_review', 'pending_validation'].includes(proposal.status)) {
          return NextResponse.json(
            { error: 'Can only reject proposals that are pending' },
            { status: 400 }
          );
        }
        
        // Update the appropriate rejection field based on current status
        if (proposal.status === 'pending_review') {
          updateQuery = `
            UPDATE proposed_changes 
            SET status = 'rejected',
                reviewed_by = $2,
                reviewed_at = NOW(),
                review_notes = $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `;
        } else {
          updateQuery = `
            UPDATE proposed_changes 
            SET status = 'rejected',
                validated_by = $2,
                validated_at = NOW(),
                validation_notes = $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `;
        }
        updateParams = [proposalId, reviewerName, notes || null];
        break;
        
      case 'reopen':
        // Re-open a rejected proposal for re-review
        if (proposal.status !== 'rejected') {
          return NextResponse.json(
            { error: 'Can only reopen rejected proposals' },
            { status: 400 }
          );
        }
        
        updateQuery = `
          UPDATE proposed_changes 
          SET status = 'pending_review',
              reviewed_by = NULL,
              reviewed_at = NULL,
              review_notes = CONCAT(COALESCE(review_notes, ''), E'\n[Reopened by ', $2::text, ' at ', NOW()::text, '] ', COALESCE($3::text, '')),
              validated_by = NULL,
              validated_at = NULL,
              validation_notes = NULL,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        updateParams = [proposalId, reviewerName, notes || null];
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "approve_for_validation", "validate", "reject", or "reopen"' },
          { status: 400 }
        );
    }
    
    const result = await pool.query(updateQuery, updateParams);
    
    return NextResponse.json({
      message: `Proposal ${action === 'reject' ? 'rejected' : action === 'validate' ? 'validated and applied' : 'approved for validation'}`,
      proposal: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating proposed change:', error);
    return NextResponse.json(
      { error: 'Failed to update proposed change' },
      { status: 500 }
    );
  }
}

// Helper function to apply proposed changes to the original record
async function applyProposedChanges(proposal: any): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const proposedData = proposal.proposed_data;
    const entityType = proposal.entity_type;
    const entityId = proposal.entity_id;
    
    // Build UPDATE query dynamically based on changed fields
    const changedFields = proposal.changed_fields || [];
    
    if (changedFields.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'No changed fields to apply' };
    }
    
    // Fields to skip (system fields and nested objects handled separately)
    const skipFields = ['id', 'created_at', 'quotes', 'sources', 'media', 'timeline', 'agencies', 
                        'violations', 'field_quote_map', 'verified_fields', 'verified_sources',
                        'verified_quotes', 'verified_timeline', 'verified_media', 'incident_details'];
    
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    for (const field of changedFields) {
      if (skipFields.includes(field)) continue;
      
      const value = proposedData[field];
      
      // Handle JSONB fields
      if (['tags', 'victims', 'agencies_involved', 'media_coverage'].includes(field)) {
        setClauses.push(`${field} = $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(value));
      } else if (Array.isArray(value)) {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(value);
      } else {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(value);
      }
    }
    
    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);
    
    if (setClauses.length > 1) { // More than just updated_at
      const tableName = entityType === 'incident' ? 'incidents' : 'statements';
      const updateQuery = `
        UPDATE ${tableName}
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
      `;
      values.push(entityId);
      
      await client.query(updateQuery, values);
    }
    
    // Handle quotes if they were changed - match actual incident_quotes schema
    if (proposedData.quotes && Array.isArray(proposedData.quotes)) {
      const quotesTable = entityType === 'incident' ? 'incident_quotes' : 'statement_quotes';
      const fkColumn = entityType === 'incident' ? 'incident_id' : 'statement_id';
      
      // Don't delete existing quotes - update them or add new ones
      // This preserves existing quote IDs and relationships
      for (const quote of proposedData.quotes) {
        if (quote.id && quote.id > 0) {
          // Update existing quote
          await client.query(
            `UPDATE ${quotesTable} SET 
              quote_text = $2,
              category = $3,
              source_id = $4,
              linked_fields = $5,
              verified = $6
            WHERE id = $1`,
            [quote.id, quote.quote_text, quote.category, quote.source_id, quote.linked_fields || [], quote.verified || false]
          );
        } else if (quote.quote_text) {
          // Insert new quote
          await client.query(
            `INSERT INTO ${quotesTable} (${fkColumn}, quote_text, category, source_id, linked_fields, verified)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [entityId, quote.quote_text, quote.category || null, quote.source_id || null, quote.linked_fields || [], quote.verified || false]
          );
        }
      }
    }
    
    // Handle sources if they were changed - match actual incident_sources schema
    if (proposedData.sources && Array.isArray(proposedData.sources)) {
      const sourcesTable = entityType === 'incident' ? 'incident_sources' : 'statement_sources';
      const fkColumn = entityType === 'incident' ? 'incident_id' : 'statement_id';
      
      for (const source of proposedData.sources) {
        if (source.id && source.id > 0) {
          // Update existing source
          await client.query(
            `UPDATE ${sourcesTable} SET 
              url = $2,
              title = $3,
              publication = $4,
              source_type = $5
            WHERE id = $1`,
            [source.id, source.url, source.title, source.publication, source.source_type || 'news']
          );
        } else if (source.url) {
          // Insert new source
          await client.query(
            `INSERT INTO ${sourcesTable} (${fkColumn}, url, title, publication, source_type)
             VALUES ($1, $2, $3, $4, $5)`,
            [entityId, source.url, source.title || null, source.publication || null, source.source_type || 'news']
          );
        }
      }
    }
    
    await client.query('COMMIT');
    return { success: true };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying proposed changes:', error);
    return { success: false, error: String(error) };
  } finally {
    client.release();
  }
}
