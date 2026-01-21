# Research Platform - Project Overview & Current State

**Last Updated:** January 21, 2026  
**Production URL:** https://research-platform-beige.vercel.app  
**Repository:** https://github.com/kirbyniko/research-platform  
**Latest Status:** Browser extension Phase 1 complete - multi-project infrastructure in place

---

## 🧪 HOW TO TEST (START HERE)

### Quick Test Flow

1. **Sign In**
   - Go to: https://research-platform-beige.vercel.app
   - Click "Sign In" → Use Google OAuth
   - You should land on the projects dashboard

2. **View Existing Project**
   - Go to: https://research-platform-beige.vercel.app/projects/project-a
   - You should see "Project A" dashboard with the "Test Form" record type

3. **View Record Type**
   - Click on "Test Form" or go to: https://research-platform-beige.vercel.app/projects/project-a/record-types/test-form
   - Should show record type details, stats, and action buttons

4. **Configure Fields** (IMPORTANT - do this first!)
   - Click "Configure Fields" button
   - Goes to: `/projects/project-a/record-types/test-form/fields`
   - Add at least one field (e.g., "Name" as text field, "Description" as textarea)
   - Save fields before trying to create records

5. **Create a Record**
   - Go back to record type page
   - Click "Create New Record"
   - Fill out the form with the fields you defined
   - Submit

6. **Check Review Queue** (if guest submissions enabled)
   - Go to: https://research-platform-beige.vercel.app/projects/project-a/dashboard/review
   - Should show any records with status "pending_review"

7. **Check Validation Queue**
   - Go to: https://research-platform-beige.vercel.app/projects/project-a/dashboard/validation
   - Should show any records with status "pending_validation"

### What Should Work ✅

- Sign in with Google OAuth
- View projects dashboard
- View individual project
- View record type details
- Configure fields for record types
- Create new records
- View review queue
- View validation queue

### What Might Not Work Yet ⚠️

- Project settings page (placeholder)
- Team management page (placeholder)
- Guest form submissions (not fully tested)
- Source/quote linking in records

---

## PROJECT MISSION

A flexible research documentation platform where users can:
1. Create custom research projects on any topic
2. Define custom record types (forms) with any field structure  
3. Enable public guest submissions with review/validation workflows
4. Build structured databases of verified research records
5. Link quotes and sources to specific fields for full traceability

**Real-world use case:** Documenting ICE-related deaths with verifiable sources, but the platform works for ANY research topic.

---

## TECH STACK

- **Framework:** Next.js 15.5.9 (App Router)
- **Database:** PostgreSQL on Neon (shared with ice-deaths project)
- **Authentication:** NextAuth.js v5 with Google OAuth
- **Deployment:** Vercel
- **Styling:** Tailwind CSS

---

## CRITICAL ENVIRONMENT VARIABLES

**Production (Vercel):**
- `DATABASE_URL`: postgresql://neondb_owner:npg_7ZR9eIDHyoga@ep-patient-silence-ah693hyk-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
- `NEXTAUTH_URL`: https://research-platform-beige.vercel.app (BASE URL ONLY!)
- `AUTH_SECRET`: 2nKaBOvkCh10Z79UPkTpdLA3BaLtIeW4T5Z59uGVcvk=
- `GOOGLE_CLIENT_ID`: 480103076204-k6qtj4f0b3nd0gbht74v3v0gi1spsisr.apps.googleusercontent.com
- `GOOGLE_CLIENT_SECRET`: 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

**CRITICAL:** DATABASE_URL MUST start with `postgresql://` not `tgresql://` (this was causing all auth failures)

---

## DATABASE SCHEMA

**Core Tables:**
- `users` - Authentication (Google OAuth)
- `projects` - Top-level research projects
- `project_members` - User permissions per project (owner, admin, reviewer, viewer)
- `record_types` - Custom form definitions (like "Death Record", "Police Statement", etc.)
- `field_definitions` - Custom fields for each record type
- `field_groups` - Organize fields into collapsible sections
- `records` - Actual data records
- `record_quotes` - Quotes linked to specific fields
- `record_sources` - Source documents

**Schema Migration:** `scripts/migrations/001-platform-schema.sql` (345 lines)

**Run migration:**
```bash
cd C:\Users\nikow\research-platform
node run-migration.js
```

---

## USER WORKFLOW

### 1. Authentication ✅ WORKING
- User signs in with Google OAuth
- Creates account in `users` table
- Session managed by NextAuth

### 2. Project Creation ✅ WORKING  
- User creates project at `/projects/new`
- POST `/api/projects` → Creates project in database
- User automatically added as 'owner' in `project_members`
- Redirects to `/projects/[slug]`

### 3. Record Type Creation ✅ WORKING
- User clicks "Create Record Type" on project dashboard
- Goes to `/projects/[slug]/record-types/new`
- Fills form (name, slug, description, workflow settings)
- POST `/api/projects/[slug]/record-types` → Creates in database
- Example: Created "test-form" record type (ID: 1, Project ID: 1)

### 4. Field Configuration ⚠️ PAGE EXISTS, NEEDS IMPLEMENTATION
- User clicks "Configure Fields" on record type
- Goes to `/projects/[slug]/record-types/[type]/fields`
- Should show field builder interface
- **CURRENT STATE:** Page exists but UI not built

### 5. Record Creation ⚠️ PAGE EXISTS, NEEDS TESTING
- User clicks "Create New Record"
- Goes to `/projects/[slug]/records/new?type=[type]`
- Should use DynamicForm component to render custom fields
- **CURRENT STATE:** Page exists, DynamicForm may need field definition data

### 6. Guest Submissions (Optional)
- If `guest_form_enabled=true` on record type
- Public can submit via same form
- Submissions go to `/projects/[slug]/dashboard/review`

### 7. Review Workflow ✅ PAGE EXISTS
- Reviewer opens submission at `/projects/[slug]/records/[id]/review`
- Reviews data, approves/rejects
- If approved → moves to validation queue

### 8. Validation Workflow ✅ PAGE EXISTS
- Validator opens at `/projects/[slug]/records/[id]/validate`
- Verifies quotes and sources
- Marks as validated

---

## PAGE ROUTES STATUS

### Working ✅
- `/` - Landing page
- `/auth/login` - Google OAuth login
- `/projects` - List user's projects
- `/projects/new` - Create project form
- `/projects/[slug]` - Project dashboard
- `/projects/[slug]/record-types/new` - Create record type form
- `/projects/[slug]/record-types/[type]` - Record type detail view ✅ FIXED
- `/projects/[slug]/record-types/[type]/fields` - Field configuration UI ✅ EXISTS
- `/projects/[slug]/records` - List records
- `/projects/[slug]/records/new` - Create record form (uses DynamicForm)
- `/projects/[slug]/records/[recordId]` - View record
- `/projects/[slug]/records/[recordId]/review` - Review submission
- `/projects/[slug]/records/[recordId]/validate` - Validate record
- `/projects/[slug]/dashboard/review` - Review queue ✅ IMPLEMENTED
- `/projects/[slug]/dashboard/validation` - Validation queue ✅ IMPLEMENTED
- `/admin` - Admin dashboard

### Placeholder (Need Full Implementation) ⚠️
- `/projects/[slug]/settings` - Project settings (basic placeholder)
- `/projects/[slug]/team` - Team management (basic placeholder)

---

---

## 🔥 BROWSER EXTENSION STATUS

### ✅ Phase 1 Complete (January 21, 2026)
**Goal:** Add multi-project infrastructure to extension

**Completed:**
- ✅ Created `extension/project-api.js` - API module for multi-project operations
- ✅ Created `extension/dynamic-form.js` - Form renderer from field definitions  
- ✅ Updated `extension/manifest.json` - Renamed to "Research Platform", version 2.0
- ✅ Updated `extension/sidepanel.html` - Added project/record-type selectors
- ✅ Updated `extension/sidepanel.js` - Added project context functions
- ✅ Updated `extension/background.js` - Dynamic context menu building
- ✅ All files copied to `c:\Users\nikow\research-platform\extension\`

**How Extension Works Now:**
1. User opens extension sidepanel
2. User adds API key in Settings tab
3. Extension fetches available projects from `/api/projects`
4. User selects a project → record types load
5. User selects record type → field definitions load
6. Context menus rebuild dynamically with that type's fields
7. User can right-click selected text → see field groups from selected record type

### 🔄 Phase 2 - Next Steps
**Goal:** Replace hard-coded forms with dynamic rendering

**Priority Tasks:**

#### 1. Dynamic Form Rendering (HIGH)
Currently the form still shows hard-coded ICE Deaths fields. Need to:
- [ ] Replace static form HTML with dynamic container in `sidepanel.html`
- [ ] Call `DynamicForm.render()` when record type is selected
- [ ] Update `updateFormWithDynamicFields()` in `sidepanel.js`
- [ ] Test with multiple field types

**File:** `extension/sidepanel.js` line ~450

#### 2. Update Save Functions (HIGH)
- [ ] Update `saveCase()` to use `POST /api/projects/[slug]/records`
- [ ] Use `DynamicForm.collectValues()` to get form data
- [ ] Update quote operations to use `/api/projects/[slug]/records/[id]/quotes`
- [ ] Update source operations to use `/api/projects/[slug]/records/[id]/sources`

**File:** `extension/sidepanel.js` line ~350

#### 3. Review & Validation Queues (MEDIUM)
- [ ] Update `loadReviewQueue()` to use `/api/projects/[slug]/records?status=pending_review`
- [ ] Update `loadValidationQueue()` to use `/api/projects/[slug]/records?status=pending_validation`
- [ ] Filter by current project
- [ ] Update approve/reject functions

**File:** `extension/sidepanel.js` lines ~500-600

#### 4. Testing (CRITICAL)
- [ ] Load extension in Chrome: `chrome://extensions/` → Load unpacked → Select `c:\Users\nikow\research-platform\extension`
- [ ] Test with ICE Deaths project (if it exists in platform)
- [ ] Test with a new custom project
- [ ] Verify quote capture from web pages
- [ ] Verify PDF analysis
- [ ] Test full workflow: capture → save → review → validate

**Extension Location:** `c:\Users\nikow\research-platform\extension\`

---

## API ENDPOINTS STATUS

### Working ✅
- `GET /api/auth/me` - Get current user
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/[slug]` - Get project details
- `GET /api/projects/[slug]/record-types` - List record types
- `POST /api/projects/[slug]/record-types` - Create record type
- `GET /api/projects/[slug]/record-types/[type]` - Get single record type ✅ FIXED
- `GET /api/projects/[slug]/record-types/[type]/fields` - List fields
- `POST /api/projects/[slug]/record-types/[type]/fields` - Create field
- `GET /api/projects/[slug]/records` - List records
- `POST /api/projects/[slug]/records` - Create record
- `GET /api/admin/users` - List users (admin only)

---

## KNOWN ISSUES (RESOLVED)

### ~~1. Missing API Route~~ ✅ FIXED
**Was:** `GET /api/projects/project-a/record-types/test-form` returns 500  
**Fixed:** Created `src/app/api/projects/[slug]/record-types/[type]/route.ts`

### ~~2. Field Configuration UI Not Built~~ ✅ EXISTS
**Path:** `/projects/[slug]/record-types/[type]/fields`  
**Status:** Page exists with full field builder interface (300+ lines)

### ~~3. Record Creation May Not Work~~ ✅ FIXED
**Path:** `/projects/[slug]/records/new`  
**Fixed:** Created DynamicForm component (`src/components/dynamic-form.tsx`) that handles all field types

### 4. No Favicon ⚠️ (Low Priority)
**Error:** 404 on `/favicon.svg`  
**Impact:** Cosmetic only, doesn't affect functionality

---

## COMPONENTS CREATED

### DynamicForm (`src/components/dynamic-form.tsx`) ✅ NEW
**Purpose:** Renders forms dynamically based on field definitions  
**Supports:**
- Field types: text, textarea, number, date, datetime, email, url, boolean, select, multi_select, radio, checkbox_group, location, rich_text
- Mode-based visibility (guest/review/validation)
- Field groups/collapsible sections
- Validation (required fields)
- Quote field integration

### Review Queue (`src/app/projects/[slug]/dashboard/review/page.tsx`) ✅ NEW
**Purpose:** Shows records with status "pending_review"  
**Features:** Table view with record name, type, submitted date, actions

### Validation Queue (`src/app/projects/[slug]/dashboard/validation/page.tsx`) ✅ NEW
**Purpose:** Shows records with status "pending_validation"  
**Features:** Table view with record name, type, reviewed date, actions

---

## RBAC PERMISSIONS

**Role Hierarchy:**
- **Owner** - Full project control (creator)
- **Admin** - All permissions except project deletion
- **Editor** - Manage records and fields
- **Reviewer** - Review guest submissions
- **Viewer** - Read-only access

**Permissions:**
- `view` - See project content
- `analyze` - Access analytics
- `review` - Review guest submissions
- `validate` - Validate records
- `manage_records` - Create/edit records
- `delete_records` - Delete records
- `manage_record_types` - Create/edit record types
- `manage_fields` - Create/edit field definitions
- `manage_members` - Add/remove team members
- `manage_project` - Edit project settings

---

## DEPLOYMENT PROCESS

1. Make changes locally
2. Commit: `git add . && git commit -m "message"`
3. Push: `git push origin main`
4. Vercel auto-deploys (takes ~2 minutes)
5. Check deployment: https://research-platform-beige.vercel.app

**Check deployment status:**
```powershell
$token = Get-Content .vercel-token -Raw
$headers = @{"Authorization" = "Bearer $token"}
$deps = Invoke-RestMethod -Uri "https://api.vercel.com/v6/deployments?projectId=prj_dhcLj76DW8aWbpk55xBsnwyzAjxn&limit=1" -Headers $headers
$dep = $deps.deployments[0]
Write-Host "State: $($dep.state)"
```

---

## TESTING

**Test User:** Your Google account (signed in via OAuth)  
**Test Project:** "Project A" (slug: `project-a`, ID: 1)  
**Test Record Type:** "Test Form" (slug: `test-form`, ID: 1)

**Verify database data:**
```bash
node check-project.js          # Check project membership
node check-test-form.js        # Check record type exists
```

---

## IMMEDIATE NEXT STEPS

### Extension Phase 2 (START HERE) 🔥
1. **Dynamic Form Rendering** - Replace static ICE Deaths form with `DynamicForm.render()`
   - File: `extension/sidepanel.js` function `updateFormWithDynamicFields()`
   - Goal: Form fields should come from API, not hard-coded

2. **Update Save Function** - Use new `/api/projects/[slug]/records` endpoint
   - File: `extension/sidepanel.js` function `saveCase()`
   - Goal: Records save to correct project

3. **Test Extension** - Load in Chrome and verify end-to-end
   - Location: `c:\Users\nikow\research-platform\extension`
   - Test: Project selector → form render → save → review

### Platform Enhancements (LOWER PRIORITY)
1. **Full test of end-to-end workflow** - Create fields, create record, review it
2. **Implement project settings page** - Allow editing project name, description, etc.
3. **Implement team management page** - Add/remove team members
4. **Guest form functionality** - Public submission forms
5. **Source and quote linking** - Attach evidence to field values

---

## DEBUGGING COMMANDS

**Pull production environment:**
```bash
npx vercel env pull .env.production --environment production --yes
```

**Check database tables:**
```bash
node run-migration.js
```

**View production logs:**
```powershell
$token = Get-Content .vercel-token -Raw
npx vercel logs research-platform-beige.vercel.app --token $token
```

---

## CRITICAL LESSONS LEARNED

1. **NEXTAUTH_URL must be base URL only**, not `/api/auth/callback/google`
2. **DATABASE_URL must start with `postgresql://`**, not `tgresql://`
3. **Project creator must be added to `project_members`** with 'owner' role
4. **PowerShell has issues with bracket paths** like `[slug]` - use alternative methods
5. **Return detailed error messages in API** during development for debugging

---

## CONTACT & RESOURCES

**Vercel Project ID:** prj_dhcLj76DW8aWbpk55xBsnwyzAjxn  
**Ice-deaths Project ID:** prj_EHDjfeT98cYJWWnapxoGfYav288d (shares same database)  
**Google OAuth Client:** 480103076204-k6qtj4f0b3nd0gbht74v3v0gi1spsisr  

**Authorized Redirect URIs:**
- https://research-platform-beige.vercel.app/api/auth/callback/google
- https://ice-deaths.vercel.app/api/auth/callback/google
