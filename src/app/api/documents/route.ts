import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { extractPdfWithPositions } from '@/lib/pdf-processor';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// POST: Upload new document
export async function POST(request: NextRequest) {
  try {
    console.log('[documents] Upload request received');
    
    // Auth check
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const userId = authResult.user?.id || null;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const documentType = formData.get('documentType') as string || 'death_report';
    const sourceUrl = formData.get('sourceUrl') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    console.log('[documents] Processing file:', file.name, 'size:', file.size);

    // Convert to buffer and extract
    const buffer = Buffer.from(await file.arrayBuffer());
    const extraction = await extractPdfWithPositions(buffer);

    console.log('[documents] Extracted:', extraction.pageCount, 'pages,', extraction.fullText.length, 'chars');

    // Check for duplicate
    const existingDoc = await pool.query(
      'SELECT id FROM documents WHERE file_hash = $1',
      [extraction.fileHash]
    );

    if (existingDoc.rows.length > 0) {
      return NextResponse.json({
        error: 'Document already exists',
        existingDocumentId: existingDoc.rows[0].id
      }, { status: 409 });
    }

    // Save file to disk
    await ensureUploadDir();
    const filename = `${extraction.fileHash}.pdf`;
    const storagePath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(storagePath, buffer);

    // Save to database
    const result = await pool.query(`
      INSERT INTO documents (
        filename, original_filename, file_type, file_size, file_hash,
        storage_path, full_text, page_count, page_offsets, text_positions,
        document_type, source_url, case_id, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, filename, page_count, case_id, document_type, created_at
    `, [
      filename,
      file.name,
      'pdf',
      file.size,
      extraction.fileHash,
      storagePath,
      extraction.fullText,
      extraction.pageCount,
      JSON.stringify(extraction.pageOffsets),
      JSON.stringify(extraction.textItems),
      documentType,
      sourceUrl,
      caseId || null,
      userId
    ]);

    const doc = result.rows[0];
    console.log('[documents] Document created:', doc.id);

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        filename: doc.filename,
        originalFilename: file.name,
        pageCount: extraction.pageCount,
        textLength: extraction.fullText.length,
        caseId: doc.case_id,
        documentType: doc.document_type,
        createdAt: doc.created_at
      }
    });

  } catch (error) {
    console.error('[documents] Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET: List documents or get single document
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const caseId = searchParams.get('caseId');
    const includeText = searchParams.get('includeText') === 'true';

    if (documentId) {
      // Get single document
      const textColumns = includeText ? ', full_text, page_offsets, text_positions' : '';
      const result = await pool.query(`
        SELECT id, filename, original_filename, file_type, file_size, 
               page_count, document_type, source_url, case_id, 
               processed, processed_at, extraction_model,
               uploaded_at, created_at ${textColumns}
        FROM documents WHERE id = $1
      `, [documentId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      const doc = result.rows[0];
      
      // Get quotes for this document
      const quotesResult = await pool.query(`
        SELECT * FROM extracted_quotes WHERE document_id = $1 ORDER BY char_start
      `, [documentId]);

      return NextResponse.json({
        success: true,
        document: {
          ...doc,
          quotes: quotesResult.rows
        }
      });

    } else {
      // List documents
      let query = `
        SELECT d.id, d.filename, d.original_filename, d.page_count, 
               d.document_type, d.case_id, d.processed, d.uploaded_at,
               c.name as case_name,
               (SELECT COUNT(*) FROM extracted_quotes eq WHERE eq.document_id = d.id) as quote_count,
               (SELECT COUNT(*) FROM extracted_quotes eq WHERE eq.document_id = d.id AND eq.status = 'pending') as pending_quotes
        FROM documents d
        LEFT JOIN cases c ON d.case_id = c.id
      `;
      
      const params: (string | number)[] = [];
      
      if (caseId) {
        query += ' WHERE d.case_id = $1';
        params.push(caseId);
      }
      
      query += ' ORDER BY d.uploaded_at DESC';
      
      const result = await pool.query(query, params);

      return NextResponse.json({
        success: true,
        documents: result.rows
      });
    }

  } catch (error) {
    console.error('[documents] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get documents' },
      { status: 500 }
    );
  }
}

// DELETE: Remove document
export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get document to find file path
    const doc = await pool.query('SELECT storage_path FROM documents WHERE id = $1', [documentId]);
    
    if (doc.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from disk
    try {
      await fs.unlink(doc.rows[0].storage_path);
    } catch (e) {
      console.warn('[documents] Could not delete file:', e);
    }

    // Delete from database (cascades to quotes)
    await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[documents] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
