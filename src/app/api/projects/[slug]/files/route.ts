import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { getProjectBySlug, hasProjectPermission } from '@/lib/project-permissions';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Initialize R2 client
function getR2Client() {
  return new S3Client({
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    endpoint: process.env.R2_ENDPOINT,
  });
}

// Helper to check if user can upload
async function canUserUpload(userId: number, projectId: number): Promise<{ allowed: boolean; reason?: string }> {
  // Check subscription
  const subResult = await pool.query(
    `SELECT ps.status, sp.storage_limit_bytes, sp.max_file_size_bytes, sp.features,
            ps.storage_limit_override_bytes
     FROM project_subscriptions ps
     JOIN storage_plans sp ON ps.plan_id = sp.id
     WHERE ps.project_id = $1`,
    [projectId]
  );
  
  if (subResult.rows.length === 0) {
    return { allowed: false, reason: 'No storage subscription. Upgrade to enable uploads.' };
  }
  
  const sub = subResult.rows[0];
  
  if (sub.status !== 'active') {
    return { allowed: false, reason: 'Storage subscription is not active.' };
  }
  
  if (!sub.features?.uploads_enabled) {
    return { allowed: false, reason: 'Uploads not enabled on this plan.' };
  }
  
  // Check member permission
  const memberResult = await pool.query(
    `SELECT can_upload FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  
  if (memberResult.rows.length === 0 || !memberResult.rows[0].can_upload) {
    return { allowed: false, reason: 'You do not have upload permission for this project.' };
  }
  
  // Check storage limit
  const usageResult = await pool.query(
    `SELECT bytes_used FROM project_storage_usage WHERE project_id = $1`,
    [projectId]
  );
  
  const bytesUsed = usageResult.rows.length > 0 ? Number(usageResult.rows[0].bytes_used) : 0;
  const limit = sub.storage_limit_override_bytes || sub.storage_limit_bytes;
  
  if (bytesUsed >= limit) {
    return { allowed: false, reason: 'Storage quota exceeded. Delete files or upgrade your plan.' };
  }
  
  return { allowed: true };
}

// GET /api/projects/[slug]/files - List project files
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    if (!(await hasProjectPermission(userId, project.id, 'view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const status = searchParams.get('status') || 'active';
    
    let query = `
      SELECT pf.*, u.name as uploaded_by_name
      FROM project_files pf
      LEFT JOIN users u ON pf.uploaded_by = u.id
      WHERE pf.project_id = $1 AND pf.status = $2
    `;
    const values: (number | string)[] = [project.id, status];
    
    if (recordId) {
      query += ` AND pf.record_id = $3`;
      values.push(parseInt(recordId));
    }
    
    query += ` ORDER BY pf.uploaded_at DESC`;
    
    const filesResult = await pool.query(query, values);
    
    return NextResponse.json({ files: filesResult.rows });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[slug]/files - Request upload (get presigned URL or create file record)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const authResult = await requireServerAuth(request);
    
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const userId = authResult.user.id;
    const result = await getProjectBySlug(slug, userId);
    
    if (!result) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const { project } = result;
    
    // Check upload permission
    const uploadCheck = await canUserUpload(userId, project.id);
    if (!uploadCheck.allowed) {
      return NextResponse.json({ 
        error: uploadCheck.reason,
        upgradeRequired: true 
      }, { status: 403 });
    }
    
    const body = await request.json();
    const { filename, mimeType, sizeBytes, recordId, fieldSlug } = body;
    
    if (!filename || !mimeType || !sizeBytes) {
      return NextResponse.json(
        { error: 'filename, mimeType, and sizeBytes are required' },
        { status: 400 }
      );
    }
    
    // Check file size limit
    const subResult = await pool.query(
      `SELECT sp.max_file_size_bytes
       FROM project_subscriptions ps
       JOIN storage_plans sp ON ps.plan_id = sp.id
       WHERE ps.project_id = $1`,
      [project.id]
    );
    
    if (subResult.rows.length > 0) {
      const maxSize = subResult.rows[0].max_file_size_bytes;
      if (sizeBytes > maxSize) {
        return NextResponse.json({
          error: `File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`,
          maxSize
        }, { status: 413 });
      }
    }
    
    // Generate storage key
    const fileId = uuidv4();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `projects/${project.id}/files/${year}/${month}/${fileId}/${safeFilename}`;
    
    // Create pending file record
    const insertResult = await pool.query(
      `INSERT INTO project_files 
        (project_id, record_id, field_slug, filename, original_filename, mime_type, size_bytes, 
         storage_key, storage_bucket, uploaded_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        project.id,
        recordId || null,
        fieldSlug || null,
        `${fileId}_${safeFilename}`,
        filename,
        mimeType,
        sizeBytes,
        storageKey,
        process.env.R2_BUCKET_NAME || 'research-platform',
        userId
      ]
    );
    
    const file = insertResult.rows[0];
    
    // Generate presigned URL for R2
    try {
      const client = getR2Client();
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || 'research-bucket',
        Key: storageKey,
        ContentType: mimeType,
      });
      
      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour
      
      return NextResponse.json({
        file,
        uploadUrl,
        expires: 3600
      }, { status: 201 });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return NextResponse.json({
        file,
        uploadUrl: null,
        error: 'Could not generate presigned URL'
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating file upload:', error);
    return NextResponse.json(
      { error: 'Failed to initiate upload' },
      { status: 500 }
    );
  }
}
