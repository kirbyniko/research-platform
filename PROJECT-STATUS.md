# Research Platform - Project Overview & Current State

**Date:** January 20, 2026  
**Production URL:** https://research-platform-beige.vercel.app  
**Repository:** https://github.com/kirbyniko/research-platform

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
- `/projects/[slug]/record-types/[type]` - Record type detail view
- `/projects/[slug]/records` - List records
- `/projects/[slug]/records/new` - Create record form
- `/projects/[slug]/records/[recordId]` - View record
- `/projects/[slug]/records/[recordId]/review` - Review submission
- `/projects/[slug]/records/[recordId]/validate` - Validate record
- `/admin` - Admin dashboard (for admin/editor roles)

### Placeholder (Need Implementation) ⚠️
- `/projects/[slug]/settings` - Project settings
- `/projects/[slug]/team` - Team management
- `/projects/[slug]/dashboard/review` - Review queue
- `/projects/[slug]/dashboard/validation` - Validation queue
- `/projects/[slug]/record-types/[type]/fields` - Field configuration UI

---

## API ENDPOINTS STATUS

### Working ✅
- `GET /api/auth/me` - Get current user
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/[slug]` - Get project details
- `GET /api/projects/[slug]/record-types` - List record types
- `POST /api/projects/[slug]/record-types` - Create record type
- `GET /api/projects/[slug]/record-types/[type]/fields` - List fields
- `POST /api/projects/[slug]/record-types/[type]/fields` - Create field
- `GET /api/projects/[slug]/records` - List records
- `POST /api/projects/[slug]/records` - Create record
- `GET /api/admin/users` - List users (admin only)

### Missing ❌
- `GET /api/projects/[slug]/record-types/[type]` - Get single record type (causing 500 error)

---

## KNOWN ISSUES

### 1. Missing API Route ❌
**Error:** `GET /api/projects/project-a/record-types/test-form` returns 500  
**Cause:** No route file at `src/app/api/projects/[slug]/record-types/[type]/route.ts`  
**Fix:** Need to create this API endpoint

### 2. Field Configuration UI Not Built ⚠️
**Path:** `/projects/[slug]/record-types/[type]/fields`  
**Status:** Page exists but shows empty/minimal UI  
**Needs:** Full field builder interface with:
  - Add/edit/delete fields
  - Field types (text, number, date, select, etc.)
  - Validation rules
  - Display order

### 3. Record Creation May Not Work ⚠️
**Path:** `/projects/[slug]/records/new`  
**Status:** Uses DynamicForm but needs field definitions  
**Needs:** Fetch field definitions from API and render form dynamically

### 4. No Favicon ⚠️
**Error:** 404 on `/favicon.svg`  
**Impact:** Cosmetic only, doesn't affect functionality

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

1. **Create missing API route:** `/api/projects/[slug]/record-types/[type]`
2. **Build Field Configuration UI:** Full field builder interface
3. **Test Record Creation:** Ensure DynamicForm works with custom fields
4. **Implement Review Queue:** Show pending guest submissions
5. **Implement Validation Queue:** Show records pending validation

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
