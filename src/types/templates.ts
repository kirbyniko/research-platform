/**
 * Display Templates Type Definitions
 * 
 * Templates define how record data is visually arranged and styled.
 * They can ONLY reference existing fields - no custom text or values allowed.
 */

// =====================================================
// TEMPLATE STRUCTURE
// =====================================================

export interface DisplayTemplate {
  version: 1;
  
  // Page-level settings
  page: PageSettings;
  
  // Layout sections (rendered top to bottom)
  sections: TemplateSection[];
  
  // Global field styles (can be overridden per-field)
  fieldDefaults?: FieldStyleDefaults;
}

export interface PageSettings {
  maxWidth?: string;          // '1200px', '100%', '960px'
  padding?: string;           // '2rem', '24px'
  backgroundColor?: string;   // '#ffffff', 'rgb(255,255,255)'
  fontFamily?: string;        // 'Inter, sans-serif'
  fontSize?: string;          // Base font size
  lineHeight?: string;        // Base line height
}

// =====================================================
// SECTIONS
// =====================================================

export type SectionType = 
  | 'grid'           // Flexible grid layout
  | 'hero'           // Large header with optional image
  | 'sidebar-left'   // Main content with left sidebar
  | 'sidebar-right'  // Main content with right sidebar
  | 'full-width'     // Full-width single column
  | 'cards'          // Card-based layout
  | 'masonry';       // Masonry/Pinterest-style

export interface TemplateSection {
  id: string;
  type: SectionType;
  
  // Section title (optional, uses existing field labels)
  title?: string;
  
  // Grid settings (for type: 'grid')
  columns?: number;           // 1-12 column grid
  gap?: string;               // '1rem', '16px'
  
  // Sidebar settings
  sidebarWidth?: string;      // '300px', '25%'
  
  // Background/styling
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  
  // Items in this section
  items: TemplateSectionItem[];
}

// =====================================================
// SECTION ITEMS
// =====================================================

export interface TemplateSectionItem {
  id: string;
  
  // Reference to actual field (must match existing field slug)
  fieldSlug?: string;
  
  // OR reference to default data types (quotes, sources, media)
  dataType?: 'quotes' | 'sources' | 'media';
  
  // Grid positioning
  colSpan?: number;           // 1-12, how many columns this spans
  rowSpan?: number;           // How many rows this spans
  colStart?: number;          // Starting column (1-based)
  rowStart?: number;          // Starting row (1-based)
  
  // Alignment within grid cell
  alignSelf?: 'start' | 'center' | 'end' | 'stretch';
  justifySelf?: 'start' | 'center' | 'end' | 'stretch';
  
  // Display options
  style?: FieldStyle;
  
  // Label options
  hideLabel?: boolean;
  labelOverride?: string;     // Alternative label text (not custom data)
  labelPosition?: 'above' | 'left' | 'hidden';
  
  // Media-specific options
  aspectRatio?: string;       // '16/9', '1/1', '4/3'
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  
  // Conditional display (within template, not data)
  hideIfEmpty?: boolean;      // Don't show if field has no value
}

// =====================================================
// STYLES
// =====================================================

export interface FieldStyle {
  // Typography
  fontSize?: string;          // '1rem', '14px', '1.5em'
  fontWeight?: string;        // '400', '600', 'bold'
  fontFamily?: string;        // Override page font
  color?: string;             // Text color
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: string;
  lineHeight?: string;
  
  // Spacing
  padding?: string;
  margin?: string;
  
  // Visual
  backgroundColor?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  
  // Sizing
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
}

export interface FieldStyleDefaults {
  label?: Partial<FieldStyle>;
  value?: Partial<FieldStyle>;
  container?: Partial<FieldStyle>;
}

// =====================================================
// DATABASE MODEL
// =====================================================

export interface DisplayTemplateRecord {
  id: number;
  project_id: number;
  record_type_id: number | null;
  record_id: number | null;
  name: string;
  description: string | null;
  template: DisplayTemplate;
  is_default: boolean;
  ai_prompt: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// API TYPES
// =====================================================

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  template: DisplayTemplate;
  is_default?: boolean;
  ai_prompt?: string;
  // Scope
  record_type_id?: number;
  record_id?: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  template?: DisplayTemplate;
  is_default?: boolean;
}

// =====================================================
// VALIDATION
// =====================================================

export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationError[];
  warnings: string[];
}

export interface TemplateValidationError {
  path: string;           // JSON path to error, e.g., 'sections[0].items[2].fieldSlug'
  message: string;
  severity: 'error' | 'warning';
}

// =====================================================
// AI GENERATION
// =====================================================

export interface AITemplateRequest {
  prompt: string;
  availableFields: {
    slug: string;
    name: string;
    type: string;
    description?: string;
  }[];
  enabledDataTypes: {
    quotes: boolean;
    sources: boolean;
    media: boolean;
  };
  existingTemplate?: DisplayTemplate;  // For modifications
}

export interface AITemplateResponse {
  template: DisplayTemplate;
  explanation: string;
  suggestions: string[];
}

// =====================================================
// MEDIA FIELD CONFIG
// =====================================================

export interface MediaFieldConfig {
  // Allowed file types
  accept?: string[];          // ['image/*', 'video/*', 'application/pdf']
  
  // Limits
  maxFiles?: number;          // 1 for single, more for gallery
  maxSizeBytes?: number;      // Per-file limit
  
  // Display mode in forms and templates
  displayMode?: 'thumbnail' | 'card' | 'gallery' | 'hero';
  
  // Template-specific
  defaultAspectRatio?: string;  // '16/9', '1/1'
  
  // Allowed sources
  allowUrl?: boolean;         // Allow pasting URLs
  allowUpload?: boolean;      // Allow file uploads
}

// =====================================================
// PRESET TEMPLATES
// =====================================================

export const PRESET_SECTION_LAYOUTS: Record<string, Partial<TemplateSection>> = {
  'header-hero': {
    type: 'hero',
    padding: '2rem',
    backgroundColor: '#f8fafc',
  },
  'two-column': {
    type: 'grid',
    columns: 2,
    gap: '1.5rem',
  },
  'three-column': {
    type: 'grid',
    columns: 3,
    gap: '1rem',
  },
  'sidebar-right': {
    type: 'sidebar-right',
    sidebarWidth: '300px',
    gap: '2rem',
  },
  'full-width': {
    type: 'full-width',
    padding: '1rem 0',
  },
};

export const PRESET_FIELD_STYLES: Record<string, Partial<FieldStyle>> = {
  'heading-large': {
    fontSize: '2rem',
    fontWeight: '700',
    lineHeight: '1.2',
  },
  'heading-medium': {
    fontSize: '1.5rem',
    fontWeight: '600',
    lineHeight: '1.3',
  },
  'body-text': {
    fontSize: '1rem',
    lineHeight: '1.6',
  },
  'caption': {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  'emphasized': {
    fontWeight: '600',
    color: '#1f2937',
  },
  'card': {
    padding: '1rem',
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};
