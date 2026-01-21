// =====================================================
// RESEARCH PLATFORM TYPES
// =====================================================

export interface Project {
  id: number;
  slug: string;
  name: string;
  description?: string;
  is_public: boolean;
  settings: ProjectSettings;
  created_by?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ProjectSettings {
  theme?: {
    primary_color?: string;
    accent_color?: string;
  };
  branding?: {
    logo_url?: string;
    favicon_url?: string;
  };
  features?: {
    guest_submissions?: boolean;
    public_records?: boolean;
    require_approval?: boolean;
  };
}

export interface RecordType {
  id: number;
  project_id: number;
  slug: string;
  name: string;
  name_plural?: string;
  icon?: string;
  description?: string;
  color?: string;
  guest_form_enabled: boolean;
  requires_review: boolean;
  requires_validation: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FieldGroup {
  id: number;
  record_type_id: number;
  slug: string;
  name: string;
  description?: string;
  sort_order: number;
  collapsed_by_default: boolean;
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'checkbox_group'
  | 'url'
  | 'email'
  | 'location'
  | 'person'
  | 'file'
  | 'rich_text'
  | 'record_link'
  | 'user_link'
  | 'violations'
  | 'incident_types'    // Checkbox group with per-option source linking
  | 'tri_state'         // Yes/No/Unknown dropdown
  | 'media'             // Image/video URLs with preview
  | 'custom_fields';    // User-defined arbitrary fields

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
}

export type FieldOption = SelectOption;

export interface FieldVisibility {
  guest_form?: boolean;
  review_form?: boolean;
  validation_form?: boolean;
  public_view?: boolean;
}


export interface FieldConfig {
  // For select, multi_select, radio, checkbox_group
  options?: SelectOption[];
  allow_custom?: boolean;
  
  // For number
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  
  // For text, textarea
  min_length?: number;
  max_length?: number;
  pattern?: string;
  placeholder?: string;
  rows?: number;
  
  // For date, datetime
  min_date?: string;
  max_date?: string;
  
  // For location
  require_city?: boolean;
  require_state?: boolean;
  require_country?: boolean;
  country_options?: string[];
  
  // For record_link
  linked_record_type_slug?: string;
  allow_multiple?: boolean;
  
  // Display options
  prefix?: string;
  suffix?: string;

  // Conditional visibility
  show_when?: {
    field: string;  // slug of field to check
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
    value?: unknown; // value to compare (not needed for exists/not_exists)
  };
}

export interface ValidationRules {
  pattern?: string;
  pattern_message?: string;
  custom_validator?: string;
  depends_on?: {
    field: string;
    value: unknown;
    operator: 'equals' | 'not_equals' | 'contains' | 'exists';
  };
}

export interface FieldDefinition {
  id: number;
  record_type_id: number;
  field_group_id?: number;
  field_group?: string; // Populated by JOIN
  slug: string;
  name: string;
  description?: string;
  help_text?: string;
  placeholder?: string;
  field_type: FieldType;
  config: FieldConfig;
  default_value?: unknown;
  is_required: boolean;
  requires_quote: boolean;
  validation_rules: ValidationRules;
  visibility?: FieldVisibility;
  show_in_guest_form: boolean;
  show_in_review_form: boolean;
  show_in_validation_form: boolean;
  show_in_public_view: boolean;
  show_in_list_view: boolean;
  sort_order: number;
  width: 'full' | 'half' | 'third';
  created_at: string;
  updated_at: string;
}

export type RecordStatus = 
  | 'pending_review'
  | 'pending_validation'
  | 'verified'
  | 'rejected'
  | 'archived';

export interface VerifiedField {
  verified: boolean;
  by: number;
  at: string;
}

export interface ProjectRecord {
  id: number;
  record_type_id: number;
  project_id: number;
  data: Record<string, unknown>;
  status: RecordStatus;
  verified_fields: Record<string, VerifiedField>;
  submitted_by?: number;
  reviewed_by?: number;
  validated_by?: number;
  is_guest_submission: boolean;
  guest_email?: string;
  guest_name?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  validated_at?: string;
  deleted_at?: string;
  deleted_by?: number;
}

export interface RecordQuote {
  id: number;
  record_id: number;
  project_id: number;
  quote_text: string;
  source?: string;
  source_url?: string;
  source_date?: string;
  source_type?: string;
  linked_fields: string[];
  created_at: string;
  updated_at: string;
}

export interface RecordSource {
  id: number;
  record_id: number;
  project_id: number;
  url: string;
  title?: string;
  source_type?: string;
  accessed_date?: string;
  archived_url?: string;
  notes?: string;
  linked_fields: string[];
  created_at: string;
}

export type ProposedChangeStatus = 
  | 'pending_review'
  | 'pending_validation'
  | 'approved'
  | 'rejected';

export interface RecordProposedChange {
  id: number;
  record_id: number;
  project_id: number;
  record_type_id: number;
  proposed_data: {
    data?: Record<string, unknown>;
    quotes?: RecordQuote[];
    sources?: RecordSource[];
  };
  changed_fields: string[];
  status: ProposedChangeStatus;
  submitted_by?: number;
  reviewed_by?: number;
  review_notes?: string;
  rejection_reason?: string;
  validated_fields: Record<string, boolean>;
  created_at: string;
  reviewed_at?: string;
  applied_at?: string;
}

export type ProjectRole = 
  | 'owner'
  | 'admin'
  | 'reviewer'
  | 'validator'
  | 'analyst'
  | 'viewer';

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: ProjectRole;
  permissions: Record<string, boolean>;
  invited_by?: number;
  invited_at: string;
  accepted_at?: string;
  can_upload?: boolean;
  upload_quota_bytes?: number | null;
  
  // Joined fields
  user?: {
    id: number;
    name: string;
    email: string;
    image?: string;
  };
}

export interface ProjectApiKey {
  id: number;
  project_id: number;
  user_id: number;
  key_prefix: string;
  name?: string;
  scopes: string[];
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  revoked_at?: string;
}

// =====================================================
// PERMISSION TYPES
// =====================================================

export type Permission =
  | 'view'
  | 'analyze'
  | 'review'
  | 'validate'
  | 'manage_records'
  | 'delete_records'
  | 'manage_record_types'
  | 'manage_fields'
  | 'manage_members'
  | 'manage_project';

export const ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  owner: [
    'view', 'analyze', 'review', 'validate', 
    'manage_records', 'delete_records',
    'manage_record_types', 'manage_fields', 
    'manage_members', 'manage_project'
  ],
  admin: [
    'view', 'analyze', 'review', 'validate',
    'manage_records', 'delete_records',
    'manage_record_types', 'manage_fields',
    'manage_members'
  ],
  reviewer: ['view', 'analyze', 'review', 'manage_records'],
  validator: ['view', 'validate'],
  analyst: ['view', 'analyze'],
  viewer: ['view']
};

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateProjectRequest {
  slug: string;
  name: string;
  description?: string;
  is_public?: boolean;
  settings?: ProjectSettings;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
  settings?: ProjectSettings;
  tags_enabled?: boolean;
  guest_upload_enabled?: boolean;
  guest_upload_quota_bytes?: number;
  guest_upload_max_file_size?: number;
  require_different_validator?: boolean;
  guest_submissions_public?: boolean;
}

export interface CreateRecordTypeRequest {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  workflow_config?: object;
  display_config?: object;
}
export interface UpdateRecordTypeRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  workflow_config?: object;
  display_config?: object;
  sort_order?: number;
}

export interface CreateFieldDefinitionRequest {
  slug: string;
  name: string;
  description?: string;
  placeholder?: string;
  help_text?: string;
  field_type: FieldType;
  is_required?: boolean;
  is_array?: boolean;
  default_value?: unknown;
  validation_rules?: ValidationRules;
  options?: FieldOption[];
  display_config?: object;
  visibility?: FieldVisibility;
  requires_quote?: boolean;
  group_id?: number;
  sort_order?: number;
}
export interface UpdateFieldDefinitionRequest {
  name?: string;
  description?: string;
  field_type?: FieldType;
  is_required?: boolean;
  is_array?: boolean;
  default_value?: unknown;
  placeholder?: string;
  help_text?: string;
  validation_rules?: ValidationRules;
  options?: FieldOption[];
  display_config?: object;
  visibility?: FieldVisibility;
  requires_quote?: boolean;
  group_id?: number | null;
  sort_order?: number;
}

export interface CreateRecordRequest {
  record_type_slug: string;
  data: Record<string, unknown>;
  is_guest_submission?: boolean;
  guest_email?: string;
  guest_name?: string;
}

export interface UpdateRecordRequest {
  data?: Record<string, unknown>;
  status?: RecordStatus;
}

// =====================================================
// FORM RENDERING TYPES
// =====================================================

export type FormMode = 'guest' | 'review' | 'validation' | 'view';

export interface DynamicFormProps {
  projectSlug: string;
  recordTypeSlug: string;
  recordId?: number;
  mode: FormMode;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

export interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  mode: FormMode;
  error?: string;
  disabled?: boolean;
  quotes?: RecordQuote[];
  linkedQuoteIds?: number[];
  onQuoteLink?: (quoteId: number, linked: boolean) => void;
  verified?: boolean;
  onVerify?: (verified: boolean) => void;
}

// =====================================================
// EXTENSION TYPES
// =====================================================

export interface ExtensionProjectContext {
  project: Project;
  recordTypes: RecordType[];
  fieldDefinitions: Record<string, FieldDefinition[]>; // keyed by record_type_slug
  fieldGroups: Record<string, FieldGroup[]>;
}

export interface ExtensionAuthContext {
  user: {
    id: number;
    email: string;
    name: string;
  };
  projects: Array<{
    project: Project;
    role: ProjectRole;
  }>;
  currentProjectSlug?: string;
}
