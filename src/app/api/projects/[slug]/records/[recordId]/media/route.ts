import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { hasProjectPermission } from '@/lib/project-permissions';

interface RouteParams {
  params: Promise<{ slug: string; recordId: string }>;
}

interface CreateMediaRequest {
  media_type: 'video' | 'image' | 'audio' | 'document' | 'embed';
  url: string;
  embed_url?: string;
  title?: string;
  description?: string;
  provider?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  mime_type?: string;
  linked_fields?: string[];
}

// Helper function to detect media provider and generate embed URL
function getMediaEmbedInfo(url: string): { provider: string; embed_url: string; media_type: string } | null {
  // YouTube
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return {
      provider: 'youtube',
      embed_url: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
      media_type: 'video'
    };
  }

  // Vimeo
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return {
      provider: 'vimeo',
      embed_url: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      media_type: 'video'
    };
  }

  // Twitter/X
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return {
      provider: 'twitter',
      embed_url: url,
      media_type: 'embed'
    };
  }

  // Image URLs
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
    return {
      provider: 'direct',
      embed_url: url,
      media_type: 'image'
    };
  }

  // Audio URLs
  if (/\.(mp3|wav|ogg|m4a)$/i.test(url)) {
    return {
      provider: 'direct',
      embed_url: url,
      media_type: 'audio'
    };
  }

  // Video URLs
  if (/\.(mp4|webm|ogv)$/i.test(url)) {
    return {
      provider: 'direct',
      embed_url: url,
      media_type: 'video'
    };
  }

  return null;
}

// GET /api/projects/[slug]/records/[recordId]/media - List media
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Verify record exists
    const recordResult = await pool.query(
      'SELECT id FROM records WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL',
      [parseInt(recordId), project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    // Get media
    const mediaResult = await pool.query(
      `SELECT * FROM record_media
       WHERE record_id = $1
       ORDER BY created_at`,
      [parseInt(recordId)]
    );
    
    return NextResponse.json({ media: mediaResult.rows });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/records/[recordId]/media - Create media
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug, recordId } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    
    // Get project
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE slug = $1 AND deleted_at IS NULL',
      [slug]
    );
    
    if (projectResult.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projectResult.rows[0];
    
    // Check permission
    if (!(await hasProjectPermission(userId, project.id, 'manage_records'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Verify record exists
    const recordResult = await pool.query(
      'SELECT id FROM records WHERE id = $1 AND project_id = $2 AND deleted_at IS NULL',
      [parseInt(recordId), project.id]
    );
    
    if (recordResult.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    
    const body: CreateMediaRequest = await request.json();
    
    if (!body.url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Auto-detect provider and embed URL if not provided
    let { provider, embed_url, media_type } = body.embed_url 
      ? { provider: body.provider || 'custom', embed_url: body.embed_url, media_type: body.media_type }
      : getMediaEmbedInfo(body.url) || { provider: 'custom', embed_url: body.url, media_type: body.media_type };
    
    // Insert media
    const result = await pool.query(
      `INSERT INTO record_media (
        record_id, project_id, media_type, url, embed_url, title, description,
        provider, thumbnail_url, duration_seconds, file_size_bytes, mime_type, linked_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        parseInt(recordId),
        project.id,
        media_type,
        body.url,
        embed_url,
        body.title || null,
        body.description || null,
        provider,
        body.thumbnail_url || null,
        body.duration_seconds || null,
        body.file_size_bytes || null,
        body.mime_type || null,
        body.linked_fields || []
      ]
    );
    
    // Update record's updated_at
    await pool.query(
      'UPDATE records SET updated_at = NOW() WHERE id = $1',
      [parseInt(recordId)]
    );
    
    return NextResponse.json({ media: result.rows[0] });
  } catch (error) {
    console.error('Error creating media:', error);
    return NextResponse.json(
      { error: 'Failed to create media' },
      { status: 500 }
    );
  }
}
