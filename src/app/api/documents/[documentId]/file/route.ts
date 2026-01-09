import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';

// GET: Serve PDF file - requires authentication
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  // SECURITY: Require at least viewer role to access documents
  const authCheck = await requireAuth('viewer')(request);
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { documentId } = await params;
    
    // Validate documentId is numeric
    if (!/^\d+$/.test(documentId)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }
    
    // Get document from database
    const result = await pool.query(
      'SELECT storage_path, original_filename FROM documents WHERE id = $1',
      [documentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = result.rows[0];
    
    // SECURITY: Validate storage path is within allowed directory
    const uploadsDir = path.resolve(process.cwd(), 'uploads', 'documents');
    const resolvedPath = path.resolve(doc.storage_path);
    if (!resolvedPath.startsWith(uploadsDir)) {
      console.error('[documents/file] Path traversal attempt:', doc.storage_path);
      return NextResponse.json({ error: 'Invalid document path' }, { status: 403 });
    }
    
    // Read file
    const fileBuffer = await fs.readFile(resolvedPath);
    
    // Return PDF
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${doc.original_filename || 'document.pdf'}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });

  } catch (error) {
    console.error('[documents/file] Error:', error);
    return NextResponse.json(
      { error: 'Failed to serve document' },
      { status: 500 }
    );
  }
}
