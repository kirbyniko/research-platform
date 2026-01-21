# Tags System & File Upload Feature Plan

**Created:** January 21, 2026  
**Last Updated:** January 21, 2026  
**Status:** In Progress  

---

## Implementation Progress

### ✅ COMPLETED: Tags System
- [x] Database schema (project_tags, record_tags tables)
- [x] API endpoints (CRUD for project tags, record tags)
- [x] TagSelector component (dropdown + chips UI)
- [x] TagManager component (CRUD interface in settings)
- [x] Updated dynamic-form.tsx to use TagSelector
- [x] Project settings page with Tags tab
- [x] Deployed to production

### ✅ COMPLETED: Upload Infrastructure  
- [x] Database schema (storage_plans, project_subscriptions, storage_usage, bandwidth_usage, project_files)
- [x] Storage plans seeded (Free/Starter/Pro/Enterprise tiers)
- [x] Storage API endpoint (/api/projects/[slug]/storage)
- [x] Files API endpoints (list, upload, get, update, delete)
- [x] Subscription API endpoint (GET/POST/DELETE)
- [x] Member upload permission columns (can_upload, upload_quota_bytes)
- [x] Member API updated for upload permissions
- [x] FileUpload, FileList, StorageUsageBar UI components
- [x] Storage tab in project settings (view plan, usage, upgrade)

### 🔄 PENDING: R2 Integration
- [ ] Configure R2 environment variables
- [ ] Generate presigned URLs for direct upload
- [ ] Upload confirmation and CDN URL generation
- [ ] Test actual file upload flow

### 🔄 PENDING: Billing Integration (Future)
- [ ] Stripe integration
- [ ] Self-service subscription management
- [ ] Payment processing

---

## Part 1: Project Tags System

### Current State

**Extension (sidepanel.html):**
- ✅ Has proper tags UI with dropdown + tag chips
- ✅ Hard-coded tag options grouped by category
- ✅ "Add" button adds selected tag as a chip
- ✅ Click chip to remove

**Web App (dynamic-form.tsx):**
- ⚠️ Tags field is `multi_select` type with options in DB
- ⚠️ Renders as native HTML `<select multiple>` - not user-friendly
- ⚠️ No tag chip UI, no categories visible

**Database:**
- `field_definitions.config.options` stores tag options (currently 29 tags in 6 categories)
- Tags are per-record-type, not per-project

### Proposed Solution

#### 1. Database Schema Changes

```sql
-- New table for project-level tags
CREATE TABLE project_tags (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  category VARCHAR(100),           -- Optional grouping
  color VARCHAR(7),                -- Hex color for display (e.g., "#3b82f6")
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  UNIQUE(project_id, slug)
);

-- Junction table for tags on records
CREATE TABLE record_tags (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES project_tags(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  added_by INTEGER REFERENCES users(id),
  UNIQUE(record_id, tag_id)
);

-- Add tags_enabled setting to projects
ALTER TABLE projects ADD COLUMN tags_enabled BOOLEAN DEFAULT true;

-- Index for fast lookups
CREATE INDEX idx_record_tags_record ON record_tags(record_id);
CREATE INDEX idx_record_tags_tag ON record_tags(tag_id);
CREATE INDEX idx_project_tags_project ON project_tags(project_id);
```

#### 2. API Endpoints

```
# Project Tags CRUD
GET    /api/projects/[slug]/tags              - List all tags for project
POST   /api/projects/[slug]/tags              - Create new tag
GET    /api/projects/[slug]/tags/[tagId]      - Get single tag
PATCH  /api/projects/[slug]/tags/[tagId]      - Update tag
DELETE /api/projects/[slug]/tags/[tagId]      - Delete tag

# Record Tag Assignment
GET    /api/projects/[slug]/records/[id]/tags - Get tags on record
POST   /api/projects/[slug]/records/[id]/tags - Add tag to record
DELETE /api/projects/[slug]/records/[id]/tags/[tagId] - Remove tag from record

# Bulk operations
POST   /api/projects/[slug]/records/[id]/tags/bulk - Add/remove multiple tags
```

#### 3. UI Components Needed

**TagSelector Component** (`src/components/tags/tag-selector.tsx`)
- Dropdown with search/filter
- Tag chips display with remove button  
- Category grouping in dropdown
- Color badges

**TagManager Component** (`src/components/tags/tag-manager.tsx`)
- Full CRUD for project admins
- Drag-to-reorder
- Color picker
- Category management

**Project Settings Integration:**
- Toggle to enable/disable tags for project
- Link to tag manager

#### 4. RBAC Permissions

Add new permission: `manage_tags`
- Owner: ✅
- Admin: ✅
- Editor: ❌ (can use tags, not manage them)
- Reviewer: ❌ (can use tags, not manage them)
- Viewer: ❌

Tag assignment permissions:
- Anyone with `manage_records` can add/remove tags on records
- Reviewers can add tags during review
- Validators can add tags during validation

#### 5. Migration Strategy

1. Create new tables
2. Migrate existing `field_definitions.config.options` tags to `project_tags` table
3. Migrate existing record data from `records.data.tags[]` to `record_tags` table
4. Keep `tags` field_definition but mark as deprecated or convert to use project_tags

#### 6. Implementation Priority

1. **Phase 1:** Database schema + API endpoints
2. **Phase 2:** TagSelector component for dynamic-form
3. **Phase 3:** TagManager for project settings
4. **Phase 4:** Update extension to use API for tag list

---

## Part 2: File Upload System

### Business Requirements

1. **Paid Feature** - Only projects with storage subscription can upload
2. **Storage Tracking** - Track bytes stored per project
3. **Usage Limits** - Enforce storage quotas per subscription tier
4. **RBAC** - Per-project permissions for who can upload
5. **User Quotas** - Optional per-user upload limits within projects
6. **Guest Uploads** - Optional, with separate quota

### Proposed Architecture

#### 1. Subscription & Billing Database

```sql
-- Subscription plans/tiers
CREATE TABLE storage_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- "Free", "Basic", "Pro", "Enterprise"
  storage_limit_bytes BIGINT NOT NULL,  -- Max storage in bytes
  bandwidth_limit_bytes BIGINT,         -- Monthly bandwidth limit (optional)
  max_file_size_bytes BIGINT,           -- Max single file size
  price_cents INTEGER,                  -- Monthly price in cents (0 for free)
  features JSONB DEFAULT '{}',          -- Additional features
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project subscriptions
CREATE TABLE project_subscriptions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES storage_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, expired, past_due
  storage_limit_override_bytes BIGINT,          -- Custom limit if negotiated
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  stripe_subscription_id VARCHAR(255),          -- External billing reference
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id)
);

-- Storage usage tracking
CREATE TABLE project_storage_usage (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bytes_used BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id)
);

-- Monthly bandwidth tracking
CREATE TABLE project_bandwidth_usage (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  bytes_uploaded BIGINT NOT NULL DEFAULT 0,
  bytes_downloaded BIGINT NOT NULL DEFAULT 0,
  UNIQUE(project_id, period_start)
);
```

#### 2. File Storage Database

```sql
-- Files metadata
CREATE TABLE project_files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_id INTEGER REFERENCES records(id) ON DELETE SET NULL,  -- Optional link to record
  field_slug VARCHAR(255),                    -- Which field this file belongs to
  
  -- File info
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  
  -- Storage location (Cloudflare R2)
  storage_key VARCHAR(1000) NOT NULL,         -- R2 object key
  storage_bucket VARCHAR(255) NOT NULL,
  cdn_url VARCHAR(2000),                      -- Public CDN URL if applicable
  
  -- Metadata
  width INTEGER,                              -- For images
  height INTEGER,                             -- For images
  duration_seconds NUMERIC,                   -- For video/audio
  checksum VARCHAR(64),                       -- SHA-256 hash
  
  -- Upload info
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_guest_upload BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',        -- active, deleted, quarantined
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_record ON project_files(record_id);
```

#### 3. Upload Permissions (RBAC Extension)

```sql
-- Add upload permission columns to project_members
ALTER TABLE project_members ADD COLUMN can_upload BOOLEAN DEFAULT false;
ALTER TABLE project_members ADD COLUMN upload_quota_bytes BIGINT;  -- NULL = unlimited (within project quota)

-- Add guest upload settings to record_types or projects
ALTER TABLE projects ADD COLUMN guest_upload_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN guest_upload_quota_bytes BIGINT DEFAULT 10485760; -- 10MB default
ALTER TABLE projects ADD COLUMN guest_upload_max_file_size BIGINT DEFAULT 5242880; -- 5MB default
```

#### 4. API Endpoints

```
# Upload Management
POST   /api/projects/[slug]/files/upload      - Get presigned upload URL
POST   /api/projects/[slug]/files/confirm     - Confirm upload completed
GET    /api/projects/[slug]/files             - List project files
GET    /api/projects/[slug]/files/[id]        - Get file metadata
DELETE /api/projects/[slug]/files/[id]        - Soft delete file

# Usage & Quotas
GET    /api/projects/[slug]/storage           - Get storage usage stats
GET    /api/projects/[slug]/storage/quota     - Get quota limits

# Subscription Management (Admin)
GET    /api/projects/[slug]/subscription      - Get subscription status
POST   /api/projects/[slug]/subscription      - Create/update subscription

# Team Upload Permissions
PATCH  /api/projects/[slug]/members/[id]/upload - Update member upload permissions
```

#### 5. Upload Flow

```
1. Client requests presigned URL
   POST /api/projects/[slug]/files/upload
   Body: { filename, mimeType, sizeBytes, recordId?, fieldSlug? }
   
2. Server validates:
   - User has upload permission
   - Project has active storage subscription
   - File size within limits
   - Storage quota not exceeded
   
3. Server returns presigned R2 URL + file ID

4. Client uploads directly to R2

5. Client confirms upload
   POST /api/projects/[slug]/files/confirm
   Body: { fileId }
   
6. Server:
   - Verifies file exists in R2
   - Updates storage usage counter
   - Marks file as active
   - Returns final file metadata with CDN URL
```

#### 6. Storage Tiers (Example)

| Plan | Storage | Max File | Bandwidth | Price |
|------|---------|----------|-----------|-------|
| Free | 0 | N/A | N/A | $0 |
| Starter | 5 GB | 25 MB | 50 GB/mo | $10/mo |
| Pro | 50 GB | 100 MB | 500 GB/mo | $50/mo |
| Enterprise | 500 GB | 500 MB | 5 TB/mo | $200/mo |

#### 7. Implementation Priority

**Phase 1: Foundation (Must have first)** ✅ COMPLETED
- [x] Database schema for subscriptions, files, usage
- [x] Storage plan seeding
- [x] Basic subscription assignment (manual via admin)
- [x] Storage usage tracking

**Phase 2: Upload Flow** 🔄 IN PROGRESS
- [ ] R2 presigned URL generation (needs env vars)
- [ ] Upload confirmation endpoint
- [x] File metadata storage
- [x] Usage counter updates

**Phase 3: RBAC & Quotas** ✅ COMPLETED
- [x] Member upload permissions
- [x] Quota enforcement
- [x] Guest upload settings
- [x] Per-user quotas

**Phase 4: UI** ✅ COMPLETED
- [x] Upload component (FileUpload, StorageUsageBar, FileList)
- [x] Project storage dashboard (Storage tab in settings)
- [x] Admin subscription management (plan selection UI)
- [x] Team upload permission UI (via members API)

**Phase 5: Billing (Future)** ❌ NOT STARTED
- [ ] Stripe integration
- [ ] Self-service subscription management
- [ ] Usage-based billing
- [ ] Overage handling

### Technical Notes

**Cloudflare R2:**
- Already planned (see [R2-MEDIA-SETUP.md](docs/R2-MEDIA-SETUP.md))
- S3-compatible API
- No egress fees (good for read-heavy)
- Need to set up:
  - R2 bucket
  - API tokens with appropriate permissions
  - CORS configuration
  - Optional: Custom domain for CDN

**Security Considerations:**
- Presigned URLs expire (5-15 minutes)
- Validate MIME types server-side after upload
- Virus scanning for enterprise tier?
- Rate limiting on upload requests
- File quarantine for suspicious content

**Storage Key Format:**
```
projects/{projectId}/files/{year}/{month}/{fileId}/{filename}
```

---

## Summary: Recommended Order

1. **Tags System** - Lower complexity, immediate value
   - 1-2 days for core functionality
   - Improves data organization
   
2. **Upload Infrastructure** - Higher complexity, requires subscription system
   - 1 week for basic flow without billing
   - Additional time for billing integration

---

## Questions to Resolve

### Tags
- Should tags be shareable across projects in an organization?
- Should we support tag hierarchies (parent/child)?
- Do we need tag aliases/synonyms?

### Uploads  
- Which payment processor? (Stripe recommended)
- Do we need virus scanning?
- Should deleted files have a retention period before permanent deletion?
- Do we want image/video transcoding?
- CDN caching strategy?
