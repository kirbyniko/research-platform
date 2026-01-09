import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';

// Ensure Node.js runtime for Buffer and Node libraries
export const runtime = 'nodejs';

import { createRequire } from 'module';

// Extract text using pdf-parse in Node (no worker)
async function extractPdf(buffer: Buffer) {
  const requireCJS = createRequire(import.meta.url);
  const { PDFParse } = requireCJS('pdf-parse');
  const parser = new PDFParse({ data: buffer, disableWorker: true });
  const textResult = await parser.getText();
  return { text: textResult.text, pages: textResult.total, info: {} };
}

export async function POST(request: NextRequest) {
  try {
    console.log('[upload-pdf] Request received');
    
    // Auth check
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      console.log('[upload-pdf] Auth failed:', authResult.error);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    console.log('[upload-pdf] Auth successful, parsing form data');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    console.log('[upload-pdf] File:', file ? `${file.name} (${file.type})` : 'null');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      console.log('[upload-pdf] Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    console.log('[upload-pdf] Converting to buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('[upload-pdf] Buffer size:', buffer.length, 'bytes');
    console.log('[upload-pdf] Parsing PDF with pdfjs...');

    const { text, pages, info } = await extractPdf(buffer);
    console.log('[upload-pdf] PDF parsed successfully:', pages, 'pages,', text.length, 'characters');

    return NextResponse.json({ success: true, text, pages, info });
  } catch (error) {
    console.error('[upload-pdf] Error:', error);
    console.error('[upload-pdf] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[upload-pdf] Error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to parse PDF', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
