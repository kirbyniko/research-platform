# Research Platform Implementation Status

## Quick Start Guide

### How to Run
```bash
cd C:\Users\nikow\research-platform
npm run dev
```
Then open: http://localhost:3000

### Sign In
Yes, sign in is available! The auth system was copied from ICE Deaths:
- Go to http://localhost:3000/login
- Use existing ICE Deaths credentials (same database)
- Or register a new account at http://localhost:3000/register

### Create a Project
1. Sign in
2. Go to http://localhost:3000/projects
3. Click "Create Project"
4. Fill in project details
5. Navigate to your project to add record types and fields

---

## Implementation Progress

### Phase 1: Database Schema ✅ COMPLETE
- [x] Created `scripts/migrations/001-platform-schema.sql`
- [x] Tables created:
  - `projects` - Multi-project support
  - `record_types` - Custom form types per project
  - `field_definitions` - Dynamic field schemas
  - `field_groups` - Field organization
  - `records` - Generic data storage
  - `record_quotes` - Quote linking
  - `record_sources` - Source tracking
  - `record_proposed_changes` - Edit proposals
  - `project_members` - Team roles
  - `project_api_keys` - API access
- [x] Migration executed on database

### Phase 2: TypeScript Types ✅ COMPLETE
- [x] `src/types/platform.ts` - All type definitions:
  - Project, RecordType, FieldDefinition, FieldGroup
  - ProjectRecord, RecordQuote, RecordSource
  - CreateProjectRequest, UpdateProjectRequest
  - CreateRecordTypeRequest, UpdateRecordTypeRequest
  - CreateFieldDefinitionRequest, UpdateFieldDefinitionRequest
  - FieldType, FieldConfig, ValidationRules
  - ProjectRole, ROLE_PERMISSIONS

### Phase 3: Permission System ✅ COMPLETE
- [x] `src/lib/project-permissions.ts`:
  - `hasProjectPermission()` - Check user permissions
  - `getUserProjectRole()` - Get user's role in project
  - `getProjectBySlug()` - Fetch project with role info
  - `getUserProjects()` - List user's accessible projects
  - `isValidSlug()`, `isSlugAvailable()` - Slug validation

### Phase 4: API Routes ✅ COMPLETE
- [x] `/api/projects` - GET (list), POST (create)
- [x] `/api/projects/[slug]` - GET, PATCH, DELETE
- [x] `/api/projects/[slug]/record-types` - GET, POST
- [x] `/api/projects/[slug]/record-types/[type]` - GET, PATCH, DELETE
- [x] `/api/projects/[slug]/record-types/[type]/fields` - GET, POST
- [x] `/api/projects/[slug]/record-types/[type]/fields/[fieldId]` - GET, PATCH, DELETE
- [x] `/api/projects/[slug]/record-types/[type]/fields/reorder` - POST

### Phase 5: UI Pages ✅ BASIC STRUCTURE COMPLETE
- [x] `/projects` - Project list page
- [x] `/projects/new` - Create project page
- [x] `/projects/[slug]` - Project dashboard
- [x] `/projects/[slug]/record-types/new` - Create record type
- [x] `/projects/[slug]/record-types/[type]/fields` - Field editor with modal

---

## What's NOT Built Yet

### High Priority (Core Functionality)

#### 1. Records CRUD APIs ❌
```
GET    /api/projects/[slug]/records            - List records
POST   /api/projects/[slug]/records            - Create record
GET    /api/projects/[slug]/records/[id]       - Get record
PATCH  /api/projects/[slug]/records/[id]       - Update record
DELETE /api/projects/[slug]/records/[id]       - Delete record
```

#### 2. Dynamic Form Renderer ❌
- `<DynamicForm>` component that:
  - Reads field definitions from API
  - Renders correct input types
  - Handles validation rules
  - Supports guest/review/validation modes
  - Quote linking integration

#### 3. Record Management UI ❌
- `/projects/[slug]/records` - List records
- `/projects/[slug]/records/new` - Create record (guest form)
- `/projects/[slug]/records/[id]` - View record
- `/projects/[slug]/records/[id]/edit` - Edit record
- `/projects/[slug]/records/[id]/review` - Review form
- `/projects/[slug]/records/[id]/validate` - Validation form

#### 4. Quote/Source APIs ❌
```
GET/POST/PATCH/DELETE /api/projects/[slug]/records/[id]/quotes
GET/POST/PATCH/DELETE /api/projects/[slug]/records/[id]/sources
```

#### 5. Team Management ❌
- `/projects/[slug]/team` - Manage members
- `/api/projects/[slug]/members` - CRUD APIs

### Medium Priority (Polish)

#### 6. Project Settings ❌
- `/projects/[slug]/settings` - Settings page
- Theme configuration
- Public/private toggle
- Branding options

#### 7. Field Groups UI ❌
- Create/edit/delete field groups
- Drag-and-drop field organization
- Collapsible sections

#### 8. Workflow Configuration ❌
- Configure guest/review/validation pipeline
- Custom status definitions
- Auto-publish rules

### Lower Priority (Extension)

#### 9. Extension Generalization ❌
- Project selector in extension
- Dynamic field registry loading
- Generic form rendering
- Per-project schema caching

#### 10. ICE Deaths Migration ❌
- Script to migrate existing incidents to new records table
- Script to migrate statements
- Generate field definitions from current schema

---

## Testing Checklist

### API Testing (use Postman or curl)
```bash
# After signing in, get your auth cookie and test:

# List projects
GET http://localhost:3000/api/projects

# Create project
POST http://localhost:3000/api/projects
{
  "name": "Test Project",
  "slug": "test-project",
  "description": "A test project"
}

# Create record type
POST http://localhost:3000/api/projects/test-project/record-types
{
  "name": "Test Record",
  "slug": "test-record"
}

# Create field
POST http://localhost:3000/api/projects/test-project/record-types/test-record/fields
{
  "key": "title",
  "name": "Title",
  "field_type": "text",
  "is_required": true
}
```

### UI Testing
1. [ ] Can create a new project
2. [ ] Can view project dashboard
3. [ ] Can create record types
4. [ ] Can add fields to record types
5. [ ] Can edit field properties
6. [ ] Can reorder fields
7. [ ] Can delete fields

---

## Estimated Remaining Work

| Component | Estimated Hours |
|-----------|-----------------|
| Records CRUD APIs | 4 hours |
| Dynamic Form Renderer | 8 hours |
| Record Management UI | 6 hours |
| Quote/Source APIs | 3 hours |
| Team Management | 4 hours |
| Project Settings | 2 hours |
| Field Groups UI | 3 hours |
| Extension Generalization | 12 hours |
| ICE Deaths Migration | 4 hours |
| **TOTAL** | **~46 hours** |

---

## Current Deployment Status

- **Localhost**: Ready to run with `npm run dev`
- **Vercel**: NOT deployed yet (separate project from ICE Deaths)
- **Database**: Using same Neon PostgreSQL as ICE Deaths (new tables added)

---

## Next Steps to Make Usable

1. **Start dev server**: `npm run dev`
2. **Sign in** with existing ICE Deaths account
3. **Create a project** at /projects/new
4. **Add record types** and define fields
5. **Build the Dynamic Form** to actually use the fields (this is the big missing piece)

The form builder (creating projects, record types, fields) works. What's missing is the ability to **actually create records** using those defined fields.
