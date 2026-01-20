# Generalized Research Platform - Architecture Plan

## Vision
Transform the ICE Deaths codebase into a **multi-project research platform** where researchers can:
1. Create custom projects (e.g., "ICE Deaths", "Epstein Investigation", "Police Misconduct Tracker")
2. Define custom form types per project (replacing hardcoded "incidents" and "statements")
3. Configure fields per form type (data types, validation rules, quote requirements)
4. Maintain the Guest → Review → Validation pipeline for each form type
5. Use the browser extension to work across any project they have access to

---

## Core Concepts

### Terminology Mapping
| Current (Hardcoded) | Generalized Platform |
|---------------------|----------------------|
| ICE Deaths site | A "Project" |
| Incident | A "Record Type" within a project |
| Statement | Another "Record Type" within a project |
| Incident fields | "Field Definitions" for a record type |
| Guest submission | "Guest Record" (simplified version of a record type) |
| Reviewed incident | "Full Record" (complete version) |
| Validated incident | "Verified Record" |

### Hierarchy
```
Platform
└── Project (e.g., "ICE Deaths Investigation")
    ├── Settings (name, description, public/private, theme)
    ├── Team Members (user roles per project)
    ├── Record Types (e.g., "Incident", "Statement")
    │   ├── Field Definitions (the schema)
    │   ├── Guest Form Config (which fields shown to guests)
    │   ├── Review Form Config (full field set)
    │   └── Validation Config (which fields require quotes)
    ├── Records (actual data entries)
    ├── Quotes (linked to records and fields)
    ├── Sources (linked to quotes)
    └── Proposed Changes (same workflow, per record)
```

---

## Database Schema Changes

### New Core Tables

```sql
-- Projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "ice-deaths", "epstein-files"
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',  -- theme colors, custom branding
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record Types (replaces hardcoded "incidents", "statements")
CREATE TABLE record_types (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,  -- e.g., "incident", "statement", "document"
  name VARCHAR(255) NOT NULL,  -- e.g., "Death Incident", "Official Statement"
  name_plural VARCHAR(255),    -- e.g., "Death Incidents", "Official Statements"
  icon VARCHAR(50),            -- emoji or icon name
  description TEXT,
  
  -- Form relationships
  guest_form_enabled BOOLEAN DEFAULT true,
  requires_review BOOLEAN DEFAULT true,
  requires_validation BOOLEAN DEFAULT true,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, slug)
);

-- Field Definitions (the schema for each record type)
CREATE TABLE field_definitions (
  id SERIAL PRIMARY KEY,
  record_type_id INTEGER REFERENCES record_types(id) ON DELETE CASCADE,
  
  -- Field identity
  slug VARCHAR(100) NOT NULL,      -- e.g., "subject_name", "incident_date"
  name VARCHAR(255) NOT NULL,      -- e.g., "Subject Name", "Incident Date"
  description TEXT,                -- Help text shown to users
  
  -- Field type
  field_type VARCHAR(50) NOT NULL, -- See Field Types below
  
  -- Type-specific config
  config JSONB DEFAULT '{}',       -- options for dropdowns, min/max for numbers, etc.
  
  -- Validation
  is_required BOOLEAN DEFAULT false,
  requires_quote BOOLEAN DEFAULT false,  -- Must have supporting quote to verify
  validation_rules JSONB DEFAULT '{}',   -- regex patterns, custom validators
  
  -- Form visibility
  show_in_guest_form BOOLEAN DEFAULT false,
  show_in_review_form BOOLEAN DEFAULT true,
  show_in_validation_form BOOLEAN DEFAULT true,
  show_in_public_view BOOLEAN DEFAULT true,
  
  -- Grouping & ordering
  field_group VARCHAR(100),        -- e.g., "basic_info", "incident_details"
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(record_type_id, slug)
);

-- Field Groups (for organizing fields in forms)
CREATE TABLE field_groups (
  id SERIAL PRIMARY KEY,
  record_type_id INTEGER REFERENCES record_types(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  collapsed_by_default BOOLEAN DEFAULT false,
  
  UNIQUE(record_type_id, slug)
);

-- Generic Records (replaces incidents, statements tables)
CREATE TABLE records (
  id SERIAL PRIMARY KEY,
  record_type_id INTEGER REFERENCES record_types(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Dynamic field data
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Workflow status
  status VARCHAR(50) DEFAULT 'pending_review',
  -- pending_review, pending_validation, verified, rejected, archived
  
  -- Verification tracking
  verified_fields JSONB DEFAULT '{}',  -- {field_slug: {verified: true, by: user_id, at: timestamp}}
  
  -- Metadata
  submitted_by INTEGER REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id),
  validated_by INTEGER REFERENCES users(id),
  
  -- Guest submission tracking
  is_guest_submission BOOLEAN DEFAULT false,
  guest_email VARCHAR(255),
  guest_name VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES users(id)
);

-- Record Quotes (generic version of incident_quotes)
CREATE TABLE record_quotes (
  id SERIAL PRIMARY KEY,
  record_id INTEGER REFERENCES records(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  
  quote_text TEXT NOT NULL,
  source VARCHAR(500),
  source_url VARCHAR(1000),
  source_date DATE,
  source_type VARCHAR(100),  -- "news", "court_document", "official_statement", etc.
  
  -- Which fields this quote supports
  linked_fields TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record Sources (generic version of incident_sources)
CREATE TABLE record_sources (
  id SERIAL PRIMARY KEY,
  record_id INTEGER REFERENCES records(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  
  url VARCHAR(1000) NOT NULL,
  title VARCHAR(500),
  source_type VARCHAR(100),
  accessed_date DATE,
  archived_url VARCHAR(1000),
  notes TEXT,
  
  linked_fields TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project-level proposed changes
CREATE TABLE record_proposed_changes (
  id SERIAL PRIMARY KEY,
  record_id INTEGER REFERENCES records(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  record_type_id INTEGER REFERENCES record_types(id),
  
  proposed_data JSONB NOT NULL,
  changed_fields TEXT[] DEFAULT '{}',
  
  status VARCHAR(50) DEFAULT 'pending_review',
  
  submitted_by INTEGER REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id),
  
  review_notes TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);

-- Project team membership
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  role VARCHAR(50) NOT NULL,  -- 'owner', 'admin', 'reviewer', 'validator', 'analyst', 'viewer'
  
  -- Granular permissions (override role defaults)
  permissions JSONB DEFAULT '{}',
  
  invited_by INTEGER REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(project_id, user_id)
);
```

### Field Types Supported

```typescript
type FieldType = 
  // Basic types
  | 'text'           // Single line text
  | 'textarea'       // Multi-line text
  | 'number'         // Numeric input
  | 'date'           // Date picker
  | 'datetime'       // Date + time picker
  | 'boolean'        // Checkbox (true/false)
  
  // Selection types
  | 'select'         // Dropdown single select
  | 'multi_select'   // Dropdown multi select
  | 'radio'          // Radio button group
  | 'checkbox_group' // Multiple checkboxes
  
  // Special types
  | 'url'            // URL with validation
  | 'email'          // Email with validation
  | 'location'       // City/State/Country structured
  | 'person'         // Name with optional details
  | 'file'           // File upload reference
  | 'rich_text'      // Markdown/HTML content
  
  // Relationship types
  | 'record_link'    // Link to another record in same project
  | 'user_link';     // Link to a user

// Field config examples:
interface FieldConfig {
  // For 'select', 'multi_select', 'radio', 'checkbox_group':
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  allow_custom?: boolean;  // Allow "Other" option
  
  // For 'number':
  min?: number;
  max?: number;
  step?: number;
  unit?: string;  // e.g., "years", "dollars"
  
  // For 'text', 'textarea':
  min_length?: number;
  max_length?: number;
  placeholder?: string;
  pattern?: string;  // regex
  
  // For 'date', 'datetime':
  min_date?: string;
  max_date?: string;
  
  // For 'location':
  require_city?: boolean;
  require_state?: boolean;
  require_country?: boolean;
  country_options?: string[];  // Limit to specific countries
  
  // For 'record_link':
  linked_record_type?: string;  // slug of target record type
  allow_multiple?: boolean;
  
  // Display options
  width?: 'full' | 'half' | 'third';
  prefix?: string;
  suffix?: string;
}
```

---

## Migration Strategy

### Phase 1: Create Parallel Structure (Week 1)
1. Create new database tables (projects, record_types, field_definitions, etc.)
2. Keep existing tables (incidents, statements) intact
3. Build migration script to:
   - Create "ICE Deaths" project
   - Create "Incident" and "Statement" record types
   - Generate field_definitions from current hardcoded schema
   - Copy existing incidents/statements to new records table

### Phase 2: Build Form Builder (Week 2)
1. **Project Management Pages**
   - `/projects` - List user's projects
   - `/projects/new` - Create new project
   - `/projects/[slug]/settings` - Project settings
   
2. **Record Type Builder**
   - `/projects/[slug]/record-types` - List record types
   - `/projects/[slug]/record-types/[type]/fields` - Field editor
   - Drag-and-drop field ordering
   - Field group management
   
3. **Field Definition Editor**
   - Add/edit/delete fields
   - Configure field types and options
   - Set validation rules
   - Configure guest/review/validation visibility

### Phase 3: Generalize Forms (Week 3)
1. **Dynamic Form Renderer**
   - `<DynamicForm recordType={} mode="guest|review|validation" />`
   - Reads field_definitions from API
   - Renders appropriate input components
   - Handles validation based on config
   
2. **Update Existing Pages**
   - Guest submission form → DynamicForm
   - Review form → DynamicForm with quote linking
   - Validation form → DynamicForm with checkboxes
   
3. **Quote/Source Linking**
   - Works with any field slug
   - Field registry becomes dynamic

### Phase 4: Generalize Extension (Week 4)
1. **Project Selector**
   - Extension shows project picker on login
   - Loads record types for selected project
   - Caches field definitions locally
   
2. **Dynamic Field Registry**
   - Replace hardcoded FIELD_REGISTRY
   - Load from API based on project/record type
   - Generate field config dynamically
   
3. **Form Adaptation**
   - Extension forms read field definitions
   - Render inputs based on field type
   - Quote linking works with any field

### Phase 5: Polish & ICE Deaths Migration (Week 5)
1. Migrate ICE Deaths to use generalized system
2. Deprecate old hardcoded tables
3. Ensure all functionality works identically
4. Performance optimization
5. Documentation

---

## API Structure

### Project APIs
```
GET    /api/projects                    - List user's projects
POST   /api/projects                    - Create project
GET    /api/projects/[slug]             - Get project details
PATCH  /api/projects/[slug]             - Update project
DELETE /api/projects/[slug]             - Delete project

GET    /api/projects/[slug]/members     - List team members
POST   /api/projects/[slug]/members     - Invite member
PATCH  /api/projects/[slug]/members/[id] - Update member role
DELETE /api/projects/[slug]/members/[id] - Remove member
```

### Record Type APIs
```
GET    /api/projects/[slug]/record-types              - List record types
POST   /api/projects/[slug]/record-types              - Create record type
GET    /api/projects/[slug]/record-types/[type]       - Get record type
PATCH  /api/projects/[slug]/record-types/[type]       - Update record type
DELETE /api/projects/[slug]/record-types/[type]       - Delete record type
```

### Field Definition APIs
```
GET    /api/projects/[slug]/record-types/[type]/fields     - List fields
POST   /api/projects/[slug]/record-types/[type]/fields     - Create field
PATCH  /api/projects/[slug]/record-types/[type]/fields/[id] - Update field
DELETE /api/projects/[slug]/record-types/[type]/fields/[id] - Delete field
POST   /api/projects/[slug]/record-types/[type]/fields/reorder - Reorder fields
```

### Generic Record APIs
```
GET    /api/projects/[slug]/records                  - List records (filterable by type)
POST   /api/projects/[slug]/records                  - Create record
GET    /api/projects/[slug]/records/[id]             - Get record
PATCH  /api/projects/[slug]/records/[id]             - Update record
DELETE /api/projects/[slug]/records/[id]             - Soft delete record

POST   /api/projects/[slug]/records/[id]/verify-field - Verify a field
POST   /api/projects/[slug]/records/[id]/submit-review - Submit for validation
POST   /api/projects/[slug]/records/[id]/approve     - Approve record
```

### Quote/Source APIs
```
GET    /api/projects/[slug]/records/[id]/quotes      - List quotes
POST   /api/projects/[slug]/records/[id]/quotes      - Add quote
PATCH  /api/projects/[slug]/records/[id]/quotes/[qid] - Update quote
DELETE /api/projects/[slug]/records/[id]/quotes/[qid] - Delete quote

# Same pattern for sources
```

---

## Extension Architecture Changes

### Current Structure
```
extension/
├── field-registry.js      # Hardcoded ICE Deaths fields
├── content.js             # Hardcoded form rendering
├── background.js          # API calls to ICE Deaths endpoints
```

### New Structure
```
extension/
├── core/
│   ├── project-manager.js    # Project selection, caching
│   ├── schema-loader.js      # Load field definitions from API
│   ├── form-renderer.js      # Dynamic form generation
│   └── api-client.js         # Generic API client
├── components/
│   ├── field-types/          # One component per field type
│   │   ├── text-field.js
│   │   ├── select-field.js
│   │   ├── date-field.js
│   │   └── ...
│   ├── quote-linker.js       # Generic quote linking
│   └── source-manager.js     # Generic source management
├── ui/
│   ├── project-picker.js     # Project selection UI
│   ├── record-list.js        # Generic record list
│   └── review-panel.js       # Generic review panel
└── config/
    └── projects/             # Cached project schemas
        ├── ice-deaths.json
        └── [other-projects].json
```

### Extension Flow
```
1. User clicks extension icon
2. Check if logged in → if not, show login
3. Check if project selected → if not, show project picker
4. Load project schema (field definitions) from cache or API
5. Show record list for project
6. When editing, render dynamic form based on field definitions
7. Quote/source linking works with dynamic field slugs
```

---

## Form Builder UI Design

### Field Editor Interface
```
┌─────────────────────────────────────────────────────────────┐
│ Project: ICE Deaths Investigation                           │
│ Record Type: Incident                                       │
├─────────────────────────────────────────────────────────────┤
│ Fields                                           [+ Add Field] │
├─────────────────────────────────────────────────────────────┤
│ ▼ Basic Information                                         │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ ≡ subject_name                              [Edit] [×]│ │
│   │   Type: text | Required: Yes | Guest Form: Yes       │ │
│   ├──────────────────────────────────────────────────────┤ │
│   │ ≡ incident_date                             [Edit] [×]│ │
│   │   Type: date | Required: Yes | Guest Form: Yes       │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                             │
│ ▼ Location Details                                          │
│   ┌──────────────────────────────────────────────────────┐ │
│   │ ≡ city                                      [Edit] [×]│ │
│   │   Type: text | Required: No | Requires Quote: Yes    │ │
│   ├──────────────────────────────────────────────────────┤ │
│   │ ≡ state                                     [Edit] [×]│ │
│   │   Type: select | Options: 50 states                  │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                             │
│ ▶ Incident Details (12 fields)                              │
│ ▶ Medical Information (8 fields)                            │
│ ▶ Legal Details (15 fields)                                 │
└─────────────────────────────────────────────────────────────┘
```

### Field Configuration Modal
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Field: cause_of_death                          [Save] │
├─────────────────────────────────────────────────────────────┤
│ Basic Settings                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Slug: cause_of_death        Name: Cause of Death       ││
│ │ Description: The official or determined cause of death ││
│ │ Field Group: [Medical Information ▼]                   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Field Type                                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Type: [Select (dropdown) ▼]                            ││
│ │                                                         ││
│ │ Options:                                                ││
│ │ ┌───────────────────────────────────────────┐          ││
│ │ │ medical_emergency  │ Medical Emergency    │ [×]      ││
│ │ │ suicide           │ Suicide              │ [×]      ││
│ │ │ homicide          │ Homicide             │ [×]      ││
│ │ │ accident          │ Accident             │ [×]      ││
│ │ │ unknown           │ Unknown/Pending      │ [×]      ││
│ │ └───────────────────────────────────────────┘          ││
│ │ [+ Add Option]  ☑ Allow custom "Other" option          ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Validation & Requirements                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☐ Required field                                       ││
│ │ ☑ Requires supporting quote to verify                  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Form Visibility                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ ☐ Show in Guest Form (simplified submission)           ││
│ │ ☑ Show in Review Form (full editing)                   ││
│ │ ☑ Show in Validation Form (verification)               ││
│ │ ☑ Show in Public View                                  ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Dynamic Form Components
```typescript
// Core form renderer
interface DynamicFormProps {
  projectSlug: string;
  recordTypeSlug: string;
  recordId?: number;  // For editing existing
  mode: 'guest' | 'review' | 'validation';
  onSubmit: (data: Record<string, any>) => void;
}

// Field renderer (selects correct component based on type)
interface FieldRendererProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  mode: 'guest' | 'review' | 'validation';
  quotes?: Quote[];  // For quote linking in review/validation
  onQuoteLink?: (quoteId: number) => void;
  verified?: boolean;  // For validation mode
  onVerify?: () => void;
}

// Field type components
interface FieldComponentProps {
  field: FieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}
```

### Key Components to Build
```
src/components/forms/
├── DynamicForm.tsx           # Main form renderer
├── FieldRenderer.tsx         # Field type dispatcher
├── FieldGroup.tsx            # Collapsible field group
├── QuoteLinkButton.tsx       # Attach quote to field
├── VerificationCheckbox.tsx  # Validation mode checkbox
│
├── field-types/
│   ├── TextField.tsx
│   ├── TextAreaField.tsx
│   ├── NumberField.tsx
│   ├── DateField.tsx
│   ├── BooleanField.tsx
│   ├── SelectField.tsx
│   ├── MultiSelectField.tsx
│   ├── RadioField.tsx
│   ├── CheckboxGroupField.tsx
│   ├── UrlField.tsx
│   ├── LocationField.tsx
│   └── RichTextField.tsx
│
└── builders/
    ├── ProjectBuilder.tsx     # Create/edit project
    ├── RecordTypeBuilder.tsx  # Create/edit record type
    ├── FieldBuilder.tsx       # Create/edit field
    └── FieldListEditor.tsx    # Drag-drop field ordering
```

---

## ICE Deaths Migration Map

### Current → Generalized Mapping

| Current Table | Generalized Table | Notes |
|--------------|-------------------|-------|
| incidents | records | record_type_id = incident type |
| statements | records | record_type_id = statement type |
| incident_quotes | record_quotes | |
| incident_sources | record_sources | |
| proposed_changes | record_proposed_changes | |
| guest_submissions | records (is_guest=true) | Merged into records |

### Field Definition Generation
```javascript
// Script to generate field_definitions from current schema
const incidentFields = [
  { slug: 'subject_name', name: 'Subject Name', type: 'text', 
    is_required: true, show_in_guest_form: true, field_group: 'basic_info' },
  { slug: 'incident_date', name: 'Incident Date', type: 'date',
    is_required: true, show_in_guest_form: true, field_group: 'basic_info' },
  { slug: 'city', name: 'City', type: 'text',
    requires_quote: true, field_group: 'location' },
  { slug: 'state', name: 'State', type: 'select',
    config: { options: US_STATES }, field_group: 'location' },
  // ... all 80+ fields
];
```

---

## Security Considerations

### Project-Level RBAC
```typescript
type ProjectRole = 'owner' | 'admin' | 'reviewer' | 'validator' | 'analyst' | 'viewer';

const ROLE_PERMISSIONS: Record<ProjectRole, string[]> = {
  owner: ['*'],  // All permissions
  admin: [
    'manage_members', 'manage_record_types', 'manage_fields',
    'review', 'validate', 'analyze', 'delete_records', 'view'
  ],
  reviewer: ['review', 'analyze', 'view'],
  validator: ['validate', 'view'],
  analyst: ['analyze', 'view'],  // Can use extension, view data
  viewer: ['view']  // Read-only
};
```

### API Key Scoping
- API keys are now project-scoped
- Extension requests include project context
- Backend validates user has permission for project + action

---

## File Structure (New Project)

```
research-platform/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── projects/
│   │   │   ├── page.tsx                # Project list
│   │   │   ├── new/page.tsx            # Create project
│   │   │   └── [slug]/
│   │   │       ├── page.tsx            # Project dashboard
│   │   │       ├── settings/page.tsx   # Project settings
│   │   │       ├── team/page.tsx       # Team management
│   │   │       ├── record-types/
│   │   │       │   ├── page.tsx        # Record type list
│   │   │       │   ├── new/page.tsx    # Create record type
│   │   │       │   └── [type]/
│   │   │       │       ├── page.tsx    # Record type settings
│   │   │       │       └── fields/page.tsx  # Field editor
│   │   │       ├── records/
│   │   │       │   ├── page.tsx        # Record list
│   │   │       │   ├── [id]/page.tsx   # View record
│   │   │       │   └── [id]/edit/page.tsx  # Edit record
│   │   │       ├── submit/page.tsx     # Guest submission
│   │   │       └── dashboard/
│   │   │           ├── review/         # Review queue
│   │   │           ├── validation/     # Validation queue
│   │   │           └── proposed/       # Proposed changes
│   │   └── api/
│   │       └── projects/
│   │           └── [slug]/
│   │               ├── route.ts
│   │               ├── record-types/
│   │               ├── records/
│   │               └── ...
│   ├── components/
│   │   ├── forms/                      # Dynamic form system
│   │   ├── builders/                   # Form builder UI
│   │   └── shared/                     # Common components
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   └── schema-utils.ts             # Field definition helpers
│   └── types/
│       ├── project.ts
│       ├── record.ts
│       └── field.ts
│
├── extension/
│   ├── core/
│   ├── components/
│   └── ...
│
└── scripts/
    ├── migrate-ice-deaths.ts           # Migration script
    └── generate-field-defs.ts          # Generate from current schema
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create new repo `research-platform` (clone from ice-deaths)
- [ ] Add new database tables (projects, record_types, field_definitions, etc.)
- [ ] Create Project model and basic CRUD APIs
- [ ] Create RecordType model and APIs
- [ ] Create FieldDefinition model and APIs
- [ ] Build project list page
- [ ] Build project creation flow

### Phase 2: Form Builder
- [ ] Build FieldListEditor with drag-drop
- [ ] Build FieldBuilder modal for each field type
- [ ] Build field group management
- [ ] Implement field configuration UI
- [ ] Build preview mode for forms
- [ ] Add field validation rule builder

### Phase 3: Dynamic Forms
- [ ] Build DynamicForm component
- [ ] Build FieldRenderer dispatcher
- [ ] Implement all field type components
- [ ] Integrate quote linking with dynamic fields
- [ ] Build validation mode with dynamic checkboxes
- [ ] Implement guest form generation

### Phase 4: Extension Generalization
- [ ] Build ProjectManager for extension
- [ ] Build SchemaLoader for caching field definitions
- [ ] Refactor form rendering to use dynamic fields
- [ ] Update quote linking for dynamic fields
- [ ] Add project picker UI
- [ ] Test with multiple projects

### Phase 5: Migration & Polish
- [ ] Write ICE Deaths migration script
- [ ] Migrate all existing data
- [ ] Verify feature parity
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deploy

---

## Questions to Resolve

1. **Backward Compatibility**: Should we support the old ICE Deaths URLs? (Redirect?)
2. **Public Projects**: Can anyone view public project data, or only registered users?
3. **Guest Submission Rate Limiting**: Per-project limits?
4. **Media Storage**: Continue with R2? Per-project buckets?
5. **Export Formats**: Should each project define custom export schemas?
6. **Templates**: Pre-built project templates (police misconduct, etc.)?

---

## Success Criteria

1. ✅ ICE Deaths works identically on new platform
2. ✅ Can create new project with custom record types
3. ✅ Can define arbitrary fields with various types
4. ✅ Guest → Review → Validation pipeline works for any project
5. ✅ Extension can switch between projects
6. ✅ Quote linking works with any field
7. ✅ RBAC works per-project
8. ✅ Proposed changes work for any record type

---

*This document serves as the complete implementation guide for the generalized research platform.*
