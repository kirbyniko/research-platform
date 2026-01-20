import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ice-deaths-media';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional: for public bucket access

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}

/**
 * Validate file type and size
 */
export function validateFile(mimeType: string, fileSize: number): { valid: boolean; error?: string; mediaType?: 'image' | 'video' } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);
  
  if (!isImage && !isVideo) {
    return { 
      valid: false, 
      error: `File type not allowed. Allowed types: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}` 
    };
  }
  
  if (isImage && fileSize > MAX_IMAGE_SIZE) {
    return { valid: false, error: `Image too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` };
  }
  
  if (isVideo && fileSize > MAX_VIDEO_SIZE) {
    return { valid: false, error: `Video too large. Maximum size: ${MAX_VIDEO_SIZE / 1024 / 1024}MB` };
  }
  
  return { valid: true, mediaType: isImage ? 'image' : 'video' };
}

/**
 * Generate a unique key for R2 storage
 */
export function generateR2Key(incidentId: number, mediaType: 'image' | 'video', originalFilename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const extension = originalFilename.split('.').pop() || 'bin';
  const sanitizedName = originalFilename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize
    .substring(0, 50); // Limit length
  
  return `incidents/${incidentId}/${mediaType}s/${timestamp}-${randomId}-${sanitizedName}.${extension}`;
}

/**
 * Upload a file to R2
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  mimeType: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return { success: false, error: 'R2 credentials not configured' };
  }
  
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: metadata,
    });
    
    await s3Client.send(command);
    
    // Generate URL
    const url = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${key}`
      : await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }), { expiresIn: 86400 * 7 }); // 7 days
    
    return { success: true, key, url };
  } catch (error) {
    console.error('R2 upload error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<{ success: boolean; error?: string }> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return { success: false, error: 'R2 credentials not configured' };
  }
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    
    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('R2 delete error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
}

/**
 * Get a signed URL for accessing a file
 */
export async function getSignedR2Url(key: string, expiresIn: number = 3600): Promise<string | null> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }
  
  // If public URL is configured, use that instead
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('R2 signed URL error:', error);
    return null;
  }
}

/**
 * Generate a presigned URL for direct upload from client
 */
export async function getPresignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }
  
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: mimeType,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('R2 presigned URL error:', error);
    return null;
  }
}
