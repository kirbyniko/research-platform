# Record Display Templates System

## Status: ✅ Phase 5 Complete - Permissions UI Done, AI Phase Remaining

## Overview
A system allowing users to create custom visual layouts/templates for how record data is displayed. Templates define arrangement, sizing, fonts, and colors of existing fields without modifying actual data.

## Core Principles
1. **Data Integrity** - Templates CANNOT add, remove, or modify actual field values
2. **Separation of Content and Presentation** - Data stays in fields; templates only control display
3. **Template Hierarchy** - Record-type templates can be overridden by record-specific templates
4. **AI-Assisted Creation** - WebGPU-based AI helps users create layouts via prompts
5. **Permission-Gated** - New permission controls who can create/edit templates

---

## Phase 1: Foundation (Current)

### 1.1 Media as Field Type
**Status:** 🔴 Not Started

Currently media is only a "default data type" (quotes, sources, media). We need media to also be a field type so users can create specific media fields like "Headshot", "Mugshot", "Evidence Photo" etc.

**Tasks:**
- [ ] Add 'media' to FieldType enum
- [ ] Create field config options for media type (allowed file types, max size, single/multiple)
- [ ] Update DynamicForm to render media upload for media field type
- [ ] Update field display to show media appropriately
- [ ] Handle media field in record data storage

**Schema Changes:**
```typescript
// Add to FieldType
type FieldType = ... | 'media';

// Field config for media type
interface MediaFieldConfig {
  accept?: string[];        // ['image/*', 'video/*', 'application/pdf']
  maxFiles?: number;        // 1 for single, more for gallery
  maxSizeBytes?: number;    // Per-file limit
  displayMode?: 'thumbnail' | 'card' | 'gallery' | 'hero';
}
```

### 1.2 Template Data Model
**Status:** 🔴 Not Started

**Database Schema:**
```sql
-- Display templates for record types and individual records
CREATE TABLE display_templates (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  record_type_id INTEGER REFERENCES record_types(id) ON DELETE CASCADE,
  record_id INTEGER REFERENCES records(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- The template definition (layout, styles, field arrangements)
  template JSONB NOT NULL,
  
  -- Is this the default template for the record type?
  is_default BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: Either record_type_id OR record_id, not both
  CONSTRAINT template_scope CHECK (
    (record_type_id IS NOT NULL AND record_id IS NULL) OR
    (record_type_id IS NULL AND record_id IS NOT NULL)
  )
);

-- Index for quick lookup
CREATE INDEX idx_display_templates_record_type ON display_templates(record_type_id) WHERE record_type_id IS NOT NULL;
CREATE INDEX idx_display_templates_record ON display_templates(record_id) WHERE record_id IS NOT NULL;

-- Only one default per record type
CREATE UNIQUE INDEX idx_display_templates_default ON display_templates(record_type_id) WHERE is_default = true;
```

### 1.3 Template JSON Structure
**Status:** 🔴 Not Started

Templates define layout using a grid-based system with explicit field references:

```typescript
interface DisplayTemplate {
  version: 1;
  
  // Page-level settings
  page: {
    maxWidth?: string;          // '1200px', '100%'
    padding?: string;           // '2rem'
    backgroundColor?: string;   // '#ffffff'
    fontFamily?: string;        // 'Inter, sans-serif'
  };
  
  // Layout sections (rendered top to bottom)
  sections: TemplateSection[];
  
  // Global field styles (can be overridden per-field)
  fieldDefaults?: FieldStyleDefaults;
}

interface TemplateSection {
  id: string;
  type: 'grid' | 'hero' | 'sidebar-left' | 'sidebar-right' | 'full-width';
  
  // Grid settings (for type: 'grid')
  columns?: number;           // 1-12 column grid
  gap?: string;               // '1rem'
  
  // Background/styling
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  
  // Items in this section
  items: TemplateSectionItem[];
}

interface TemplateSectionItem {
  // Reference to actual field
  fieldSlug: string;          // Must match existing field slug
  
  // OR reference to default data types
  dataType?: 'quotes' | 'sources' | 'media';
  
  // Grid positioning
  colSpan?: number;           // 1-12
  rowSpan?: number;
  
  // Display options
  style?: FieldStyle;
  
  // Hide label?
  hideLabel?: boolean;
  
  // Custom label (but NOT custom value - that's forbidden)
  labelOverride?: string;
}

interface FieldStyle {
  // Typography
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  
  // Spacing
  padding?: string;
  margin?: string;
  
  // Visual
  backgroundColor?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  
  // Media-specific
  objectFit?: 'cover' | 'contain' | 'fill';
  aspectRatio?: string;       // '16/9', '1/1', '4/3'
  maxHeight?: string;
}

interface FieldStyleDefaults {
  label?: Partial<FieldStyle>;
  value?: Partial<FieldStyle>;
  container?: Partial<FieldStyle>;
}
```

---

## Phase 2: Template Editor UI

### 2.1 Visual Template Builder
**Status:** 🔴 Not Started

A drag-and-drop interface for creating templates:

**Features:**
- Field palette showing all available fields for record type
- Canvas area showing template preview
- Drag fields from palette to canvas
- Resize/reposition fields on grid
- Style panel for selected field/section
- Live preview with actual record data
- Save/load templates

**Components Needed:**
- `TemplateEditor` - Main editor component
- `FieldPalette` - Shows available fields to drag
- `TemplateCanvas` - Grid-based layout canvas
- `StylePanel` - Edit styles for selected item
- `TemplatePreview` - Live preview of template
- `SectionToolbar` - Add/remove/configure sections

### 2.2 Template Management Pages
**Status:** 🔴 Not Started

- `/projects/[slug]/record-types/[type]/templates` - List templates for record type
- `/projects/[slug]/record-types/[type]/templates/new` - Create new template
- `/projects/[slug]/record-types/[type]/templates/[templateId]` - Edit template
- `/projects/[slug]/records/[recordId]/template` - Override template for specific record

---

## Phase 3: AI-Assisted Template Creation

### 3.1 WebGPU AI Integration
**Status:** 🔴 Not Started

Using the existing WebLLM infrastructure to help users create templates via natural language:

**User Flow:**
1. User opens template editor
2. Clicks "AI Assistant" button
3. Describes desired layout: "Put the headshot in the top right, name large on the left, details below in two columns"
4. AI generates template JSON
5. User previews and refines
6. AI can only reference existing fields - validation ensures no fabrication

**Implementation:**
- Extend existing WebLLM setup
- Create prompt template that:
  - Lists all available fields with their types
  - Explains the template JSON structure
  - Strictly instructs to only use existing field slugs
  - Provides examples
- Validate AI output before applying:
  - Check all fieldSlugs exist
  - No custom text/values added
  - Valid JSON structure
- Allow iterative refinement

**Prompt Structure:**
```
You are a layout designer assistant. Create a display template for a record type.

AVAILABLE FIELDS (you can ONLY use these field slugs):
- victim_name (text): The victim's full name
- date_of_death (date): Date the person died
- headshot (media): Portrait photo
- incident_summary (textarea): Summary of the incident
...

TEMPLATE RULES:
1. You can ONLY reference fields from the list above using their exact slug
2. You CANNOT add custom text, values, or fields that don't exist
3. You CANNOT modify actual data values
4. You CAN arrange, resize, and style the fields
5. You CAN hide field labels or provide label overrides

USER REQUEST: "{user prompt}"

Generate a valid template JSON following this schema:
{schema}
```

### 3.2 AI Validation Layer
**Status:** 🔴 Not Started

Strict validation to ensure AI doesn't introduce unauthorized content:

```typescript
function validateTemplate(
  template: DisplayTemplate,
  availableFields: FieldDefinition[],
  enabledDataTypes: { quotes: boolean; sources: boolean; media: boolean }
): ValidationResult {
  const errors: string[] = [];
  const fieldSlugs = new Set(availableFields.map(f => f.slug));
  
  for (const section of template.sections) {
    for (const item of section.items) {
      // Check field references
      if (item.fieldSlug && !fieldSlugs.has(item.fieldSlug)) {
        errors.push(`Unknown field: ${item.fieldSlug}`);
      }
      
      // Check data type references
      if (item.dataType) {
        if (item.dataType === 'quotes' && !enabledDataTypes.quotes) {
          errors.push('Quotes not enabled for this record type');
        }
        // ... similar for sources, media
      }
      
      // Ensure no custom text injection
      // (labelOverride is allowed but scrutinized)
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## Phase 4: Template Rendering

### 4.1 Template Renderer Component
**Status:** 🔴 Not Started

A React component that takes record data + template and renders the styled display:

```typescript
interface TemplateRendererProps {
  record: Record;
  fields: FieldDefinition[];
  template: DisplayTemplate;
  quotes?: Quote[];
  sources?: Source[];
  media?: Media[];
}

function TemplateRenderer({ record, fields, template, quotes, sources, media }: TemplateRendererProps) {
  // Render template sections
  // For each field reference, look up actual value from record.data
  // Apply styles from template
  // Handle default data types (quotes, sources, media)
}
```

### 4.2 Public Record Display
**Status:** 🔴 Not Started

Update the public record view to:
1. Check if record has specific template override
2. If not, use record type's default template
3. If no default template, use system default display
4. Render using TemplateRenderer

---

## Phase 5: Permissions

### 5.1 New Permission: Manage Appearances
**Status:** ✅ Complete

Added new permission to control who can create/edit display templates:

```sql
-- Add to project_members or create separate permissions table
ALTER TABLE project_members 
ADD COLUMN can_manage_appearances BOOLEAN DEFAULT false;
```

Permission levels:
- **View**: Can see records with applied templates
- **Edit Templates**: Can create/edit templates for record types (requires can_manage_appearances or owner/admin)
- **Override Records**: Can apply template overrides to specific records

**Implemented:**
- `can_manage_appearances` column on project_members table
- Team management UI with checkbox to toggle permission
- `/api/projects/[slug]/members/[memberId]` PATCH accepts can_manage_appearances
- `/api/projects/[slug]/members` GET returns can_manage_appearances
- `/api/projects/[slug]/members/me` returns can_manage_appearances
- Owners and Admins automatically have this permission

---

## Implementation Order

1. **Phase 1.1**: Add media as field type ✅ Complete
2. **Phase 1.2**: Create template database schema ✅ Complete  
3. **Phase 1.3**: Define template JSON structure ✅ Complete
4. **Phase 2.1**: Build basic template editor (no AI yet) ✅ Complete
5. **Phase 4.1**: Build template renderer ✅ Complete
6. **Phase 4.2**: Integrate into public record view ✅ Complete
7. **Phase 2.2**: Template management pages ✅ Complete
8. **Phase 5.1**: Permissions ✅ Complete
9. **Phase 3.1**: AI assistant integration 🔴 Not Started
10. **Phase 3.2**: AI validation layer 🔴 Not Started

---

## Technical Decisions

### Why Grid-Based Layout?
- Predictable and consistent
- Easy to make responsive
- CSS Grid is well-supported
- AI can easily reason about grid positions

### Why JSON Templates?
- Portable and versionable
- Can be validated programmatically
- Easy for AI to generate
- Can be stored in database

### Why WebGPU AI?
- Runs locally, no API costs for users
- Privacy-preserving (data doesn't leave browser)
- Already have WebLLM infrastructure
- Users can iterate quickly without rate limits

---

## Progress Log

### 2026-01-23
- Created initial planning document
- Defined core architecture and phases
- **Phase 1.1 COMPLETED**: Media field type
  - Added 'media' and 'tri_state' to FIELD_TYPES UI array
  - Added media-specific operators (has_image, has_video)
  - MediaField component already existed in codebase
- **Phase 1.2 COMPLETED**: Database schema
  - Created migration 019-display-templates.sql
  - Added display_templates table with proper constraints
  - Added can_manage_appearances permission to project_members
- **Phase 1.3 COMPLETED**: TypeScript types
  - Created src/types/templates.ts with full type definitions
  - Defined DisplayTemplate, TemplateSection, FieldStyle interfaces
  - Added preset layouts and styles
  - Added AI generation types
  - Added DEFAULT_TEMPLATE export

### 2026-01-24 - Phase 2 Implementation
- **Phase 2.1 COMPLETED**: Template Editor UI
  - Created `TemplateEditor.tsx` - Full drag-and-drop editor (700+ lines)
    - Field palette showing available fields and data types
    - Section-based canvas with multiple layout types
    - Properties panel for page, section, and item styling
    - Style presets for quick formatting
  - Created `TemplateRenderer.tsx` - Renders templates with record data
    - Handles all field types (dates, URLs, emails, etc.)
    - Supports quotes, sources, and media data types
    - Proper empty value handling with hideIfEmpty
- **Phase 2.2 COMPLETED**: Template Management Pages
  - Created `/projects/[slug]/record-types/[type]/templates/page.tsx` - List templates
  - Created `/templates/new/page.tsx` - Create new template using editor
  - Created `/templates/[templateId]/page.tsx` - Edit existing template
  - Added link from record type management page
- **API Routes COMPLETED**:
  - Created `GET/POST /api/projects/[slug]/record-types/[type]/templates`
  - Created `GET/PATCH/DELETE /api/projects/[slug]/record-types/[type]/templates/[templateId]`
  - Created `GET /api/projects/[slug]/members/me` for permission checking
  - Template validation ensures only existing fields can be referenced

### Next Steps
- Phase 3: AI-assisted template creation via WebGPU
- Phase 4: Integrate TemplateRenderer into public record view
- Phase 5: Permission management UI for can_manage_appearances

---

## Open Questions

1. Should templates support conditional display? (show field X only if field Y has value)
2. How to handle responsive design? (mobile vs desktop)
3. Should we support template versioning/history?
4. How to handle fields added after template creation?
5. Should templates support custom CSS beyond predefined options?

---

## Files to Create/Modify

### New Files
- [ ] `src/components/templates/TemplateEditor.tsx`
- [ ] `src/components/templates/TemplateRenderer.tsx`
- [ ] `src/components/templates/FieldPalette.tsx`
- [ ] `src/components/templates/StylePanel.tsx`
- [ ] `src/app/projects/[slug]/record-types/[type]/templates/page.tsx`
- [ ] `src/app/api/projects/[slug]/record-types/[type]/templates/route.ts`
- [ ] `src/types/templates.ts`
- [ ] `scripts/migrations/019-display-templates.sql`

### Modify
- [ ] `src/types/platform.ts` - Add 'media' to FieldType
- [ ] `src/components/DynamicForm.tsx` - Handle media field type
- [ ] `src/app/projects/[slug]/records/[recordId]/page.tsx` - Use template renderer
- [ ] `src/app/api/projects/[slug]/record-types/[type]/fields/route.ts` - Handle media field type
