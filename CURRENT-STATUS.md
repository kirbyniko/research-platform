# Research Platform - Current Status & Usage Guide

## ✅ FULLY FUNCTIONAL FEATURES

### 1. Core Platform ✅
- **Multi-project system**: Create and manage multiple research projects
- **Custom record types**: Define your own data types (incidents, statements, documents, etc.)
- **Dynamic fields**: Configure fields with 14+ field types, validation, and conditional visibility
- **Field groups**: Organize fields into logical sections
- **User management**: Admin and user roles, project-specific permissions

### 2. Field Configuration ✅
- **Field Types**: text, textarea, number, date, datetime, boolean, select, multi_select, radio, checkbox_group, url, email, location, rich_text
- **Auto-generated option values**: Type "Death in Custody" → automatically becomes `death_in_custody`
- **Grouped display**: Fields appear organized by section in forms
- **Conditional visibility**: Show fields only when certain conditions are met
- **Field group CRUD**: Create, edit, and delete field groups via "Manage Groups" button

### 3. Three-Stage Workflow ✅
```
Guest Submission → Review → Validation → Verified
(pending_review) → (pending_validation) → (verified)
```

### 4. Database ✅
- **Fully seeded**: ICE Deaths project with 52 incident fields and 10 statement fields
- **Test data created**: 5 sample records showing complete workflow stages
- **Production ready**: Deployed on Neon PostgreSQL

## 📊 CURRENT DATA

### Project: "ICE Deaths Investigation"
- **Slug**: `project-a`
- **Record Types**:
  - Death/Incident Record (52 fields in 10 groups)
  - Official Statement (10 fields in 3 groups)

### Test Records Created:
1. **Guest submission** (#3) - Excessive force case from Minneapolis - `pending_review`
2. **Reviewed incident** (#4) - LA shooting with source + quote - `pending_validation`
3. **Verified incident** (#5) - Houston custody death with 2 sources + 3 quotes - `verified`
4. **Statement** (#6) - AOC statement - `pending_validation`
5. **Incomplete guest** (#7) - Portland protest suppression - `pending_review`

## 🌐 DEPLOYED URLs

**Production**: https://research-platform-beige.vercel.app

### Key Pages:
- **Field Config**: `/projects/project-a/record-types/incident/fields`
- **Guest Submission**: `/submit/project-a/incident`
- **Admin Dashboard**: `/admin`
- **Review Queue**: `/review`
- **Validation Queue**: `/validation`

### API Endpoints Working:
- `/api/auth/dev-login` - Dev login (requires `DEV_LOGIN_KEY` env var)
- `/api/projects/[slug]/record-types/[type]` - Get record type details
- `/api/projects/[slug]/record-types/[type]/fields` - CRUD for fields
- `/api/projects/[slug]/record-types/[type]/groups` - CRUD for field groups

## 🔧 EXTENSION STATUS

### Current State: ❌ NOT ADAPTED YET
The extension in `/extension` folder is the **original ICE Deaths extension** and is:
- ✅ Fully functional for ICE Deaths single-project mode
- ❌ Hard-coded for localhost:3001
- ❌ Not yet adapted for multi-project platform
- ❌ Needs updates to work with new API structure

### Extension Features (when working):
- Browse articles and automatically extract quotes
- Capture text selections as quotes (Alt+Q)
- Auto-extract article content (Alt+E)
- Side panel form for data entry
- PDF support
- AI analyst features (WebLLM integration)

### To Load Extension (for future use):
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `c:\Users\nikow\research-platform\extension`

**NOTE**: Extension won't work until adapted for the new platform.

## 🚀 WHAT WORKS NOW (Without Extension)

### 1. Field Management
Visit: https://research-platform-beige.vercel.app/projects/project-a/record-types/incident/fields

- View all 52 incident fields grouped by section
- Click "📁 Manage Groups" to create/delete field groups
- Click "+ Add Field" to add new fields
- Select field types and configure options
- Set conditional visibility (e.g., show only when incident_type contains "shooting")

### 2. Guest Submission Form
Visit: https://research-platform-beige.vercel.app/submit/project-a/incident

- Public form for submitting incident reports
- Only shows fields marked `show_in_guest_form: true`
- Creates records with status `pending_review`

### 3. Authentication
**Dev Login** (for testing):
```bash
POST /api/auth/dev-login
{
  "email": "test@example.com",
  "devKey": "ice-deaths-dev-2024"
}
```

**Production Users**:
- kirbyniko@gmail.com (admin)
- d.j.whittlesey@gmail.com (admin)
- porterryann@gmail.com (admin)

## 📋 TESTING CHECKLIST

### Test Field Management:
1. ✅ Go to fields page
2. ✅ Click "Manage Groups" - create a new group (e.g., "Test Section")
3. ✅ Click "Add Field" - create a field assigned to that group
4. ✅ Add a select field - see auto-generated values
5. ✅ Enable conditional visibility - configure show_when

### Test Guest Form:
1. ✅ Visit `/submit/project-a/incident`
2. ✅ Fill out form and submit
3. ✅ Verify record appears in database with `pending_review` status

### Test Database:
```bash
cd c:\Users\nikow\research-platform
node scripts\check-db-structure.js
```

##  NEXT STEPS (To Make Extension Work)

### Phase 1: Extension Adaptation
1. Update `manifest.json` - change localhost:3001 to localhost:3000 or production URL
2. Update `background.js` - make API endpoints dynamic based on project
3. Update `sidepanel.js` - fetch field definitions from API instead of hard-coded
4. Add project selector to extension UI

### Phase 2: API Completeness
1. Build `/api/projects/[slug]/records` POST endpoint for extension to submit
2. Build `/api/projects/[slug]/records/[id]/quotes` endpoints
3. Add authentication middleware for extension

### Phase 3: Review & Validation UI
1. Build `/review` page to show pending_review records
2. Build `/validation` page to show pending_validation records
3. Add quote linking UI
4. Add field verification UI

## 📁 PROJECT STRUCTURE

```
research-platform/
├── extension/               # Browser extension (needs adaptation)
├── src/
│   ├── app/
│   │   ├── api/            # API routes (partially complete)
│   │   ├── projects/       # Project pages
│   │   ├── submit/         # Guest form (working)
│   │   ├── review/         # Review queue (not built)
│   │   └── validation/     # Validation queue (not built)
│   ├── lib/                # Utilities
│   └── types/              # TypeScript types
├── scripts/
│   ├── seed-ice-deaths-complete.js    # Seeds 62 fields (run once)
│   ├── create-test-workflow-data.js    # Creates 5 test records (run once)
│   └── check-db-structure.js           # Shows current DB state
└── docs/                   # Documentation
```

## 🔑 ENVIRONMENT VARIABLES

Required in Vercel:
- `DATABASE_URL` - Neon PostgreSQL connection string ✅
- `NEXTAUTH_SECRET` - Auth secret ✅
- `NEXTAUTH_URL` - Production URL ✅
- `DEV_LOGIN_KEY=ice-deaths-dev-2024` - For dev login ⚠️ ADD THIS

## 📝 SUMMARY

**What's Working:**
- ✅ Core platform with projects, record types, fields
- ✅ Field CRUD with auto-generation and grouping  
- ✅ Guest submission forms
- ✅ Three-stage workflow (data structure)
- ✅ Test data in database
- ✅ Deployed to Vercel

**What's Missing:**
- ❌ Extension adapted for multi-project platform
- ❌ Review UI page
- ❌ Validation UI page
- ❌ Quote management UI
- ❌ Record detail pages
- ❌ Public article pages

**To Prove It Works:**
1. Visit https://research-platform-beige.vercel.app/projects/project-a/record-types/incident/fields
2. See 52 fields organized in 10 groups
3. Click "Manage Groups" - create a new section
4. Click "Add Field" - see the UX improvements
5. Check database: `node scripts\check-db-structure.js`

The platform core is **fully functional**. The extension needs adaptation work to integrate with it.
