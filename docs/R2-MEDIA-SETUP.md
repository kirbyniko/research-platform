# Cloudflare R2 Setup for Media Uploads

## Overview

The ICE Deaths project uses Cloudflare R2 for storing uploaded videos and screenshots. R2 is an S3-compatible object storage service with:

- **No egress fees** (huge savings for serving media)
- **$0.015/GB/month** storage cost
- **Free tier**: 10GB storage, 1M Class A operations, 10M Class B operations per month

## Setup Instructions

### 1. Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com) and sign up
2. Navigate to **R2** in the sidebar

### 2. Create R2 Bucket

1. Click "Create bucket"
2. Name it `ice-deaths-media` (or your preferred name)
3. Choose a location (Auto is recommended)

### 3. Create API Token

1. In R2 settings, go to "Manage R2 API Tokens"
2. Click "Create API Token"
3. Configure:
   - Token name: `ice-deaths-api`
   - Permissions: **Object Read & Write**
   - Specify bucket: `ice-deaths-media`
4. Save the Access Key ID and Secret Access Key

### 4. Get Account ID

1. Go to your Cloudflare dashboard
2. Your Account ID is in the URL or in the right sidebar

### 5. (Optional) Enable Public Access

For faster media delivery without signed URLs:

1. Go to bucket settings
2. Enable "Public Access"
3. You'll get a public URL like `https://pub-xxx.r2.dev`

### 6. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=ice-deaths-media
R2_PUBLIC_URL=https://pub-xxx.r2.dev  # Optional, for public buckets
```

For production (Vercel), add these as environment variables in the Vercel dashboard.

### 7. Run Database Migration

Run the SQL migration to add upload columns to the media table:

```bash
# Using psql
psql $DATABASE_URL -f scripts/add-media-upload-columns.sql

# Or in Node.js
node -e "require('./scripts/run-migration').run('add-media-upload-columns.sql')"
```

## File Limits

| Type | Max Size |
|------|----------|
| Images | 10 MB |
| Videos | 100 MB |

### Supported Formats

**Images:** JPEG, PNG, GIF, WebP
**Videos:** MP4, WebM, QuickTime (MOV), AVI

## Usage

### Extension (Review Mode)

1. Open a case in Review Mode
2. Go to the Media section
3. Click "📤 Upload File" to select files
4. Files are uploaded directly to R2
5. Progress bar shows upload status

### API Endpoints

**Upload file:**
```
POST /api/incidents/{id}/media/upload
Content-Type: multipart/form-data

file: <binary>
caption: "Optional caption"
description: "Optional description"
source_url: "Optional source URL"
```

**List media:**
```
GET /api/incidents/{id}/media
```

**Delete media:**
```
DELETE /api/incidents/{id}/media?media_id={mediaId}
```

## Cost Estimation

Based on typical usage:

| Storage | Monthly Cost |
|---------|--------------|
| 1 GB | $0.015 |
| 10 GB | $0.15 |
| 100 GB | $1.50 |
| 1 TB | $15.00 |

**Free tier covers:**
- 10 GB storage
- 1 million write operations/month
- 10 million read operations/month

Most small to medium projects will stay within the free tier.

## Troubleshooting

### "R2 credentials not configured"
Make sure all R2 environment variables are set correctly.

### "File too large"
Images max: 10MB, Videos max: 100MB. Compress before uploading.

### "Upload failed"
Check:
1. API token permissions include write access
2. Bucket name matches exactly
3. Account ID is correct

### CORS issues
If uploading from browser, ensure R2 bucket has CORS configured:
1. Go to bucket settings
2. Add CORS rule for your domain
