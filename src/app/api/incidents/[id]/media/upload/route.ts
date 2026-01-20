import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { uploadToR2, validateFile, generateR2Key } from '@/lib/r2';

// POST /api/incidents/[id]/media/upload - Upload a file directly
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require editor role
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    const { id } = await params;
    const incidentId = parseInt(id);
    
    if (isNaN(incidentId)) {
      return NextResponse.json({ error: 'Invalid incident ID' }, { status: 400 });
    }
    
    // Check incident exists
    const incidentCheck = await pool.query('SELECT id FROM incidents WHERE id = $1', [incidentId]);
    if (incidentCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }
    
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = formData.get('caption') as string | null;
    const description = formData.get('description') as string | null;
    const sourceUrl = formData.get('source_url') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file
    const validation = validateFile(file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate R2 key and upload
    const r2Key = generateR2Key(incidentId, validation.mediaType!, file.name);
    const uploadResult = await uploadToR2(r2Key, buffer, file.type, {
      'incident-id': incidentId.toString(),
      'original-filename': file.name,
    });
    
    if (!uploadResult.success) {
      return NextResponse.json({ error: uploadResult.error }, { status: 500 });
    }
    
    // Save to database using existing incident_media table structure
    const insertResult = await pool.query(
      `INSERT INTO incident_media (
        incident_id, media_type, url, caption, description, source_url,
        r2_key, original_filename, file_size, mime_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        incidentId,
        validation.mediaType,
        uploadResult.url,
        caption || null,
        description || null,
        sourceUrl || null,
        r2Key,
        file.name,
        file.size,
        file.type,
        authResult.user.id,
      ]
    );
    
    return NextResponse.json({ 
      success: true, 
      media: { ...insertResult.rows[0], url: uploadResult.url }
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
