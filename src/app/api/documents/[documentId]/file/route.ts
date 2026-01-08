import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import fs from 'fs/promises';

export const runtime = 'nodejs';

// GET: Serve PDF file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    
    // Get document from database
    const result = await pool.query(
      'SELECT storage_path, original_filename FROM documents WHERE id = $1',
      [documentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = result.rows[0];
    
    // Read file
    const fileBuffer = await fs.readFile(doc.storage_path);
    
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
