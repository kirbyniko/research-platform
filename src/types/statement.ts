/**
 * STATEMENT TYPES
 * 
 * Public statements documenting advocacy, denunciations, and support.
 * These capture when notable figures speak out about ICE enforcement.
 * 
 * SYNC: Keep field names in sync with:
 *   - extension/content-types.js
 *   - src/lib/statement-field-definitions.ts
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars`nimport type { 
  IncidentSource, 
  IncidentQuote, 
  SourceType, 
  QuoteCategory 
} from './incident';

// eslint-disable-next-line @typescript-eslint/no-unused-vars`nimport type {
  ContentType,
  StatementType,
  SpeakerType,
  PoliticalAffiliation,
  ImpactLevel,
} from '@/lib/content-types';

// ============================================
// SPEAKER (WHO MADE THE STATEMENT)
// ============================================

export interface Speaker {
  name: string;                           // Full name
  title?: string;                         // Current title/role
  organization?: string;                  // Company, party, outlet
  speaker_type: SpeakerType;
  political_affiliation?: PoliticalAffiliation;
  
  // For verification - why should people trust this person?
  credentials?: string;                   // "Former ICE Director", "Immigration lawyer for 20 years"
  follower_count?: number;                // Social media reach (if relevant)
  wikipedia_url?: string;                 // For verification of identity
  official_website?: string;
  
  // Context for persuasion value
  previously_supported_ice?: boolean;     // Did they previously support enforcement?
  party_typically_supports?: boolean;     // Does their party typically support enforcement?
}

// ============================================
// STATEMENT INTERFACE
// ============================================

export interface Statement {
  // Identity
  id?: number;
  statement_id: string;                   // YYYY-MM-DD-speaker-slug
  content_type: 'statement';              // Always 'statement'
  statement_type: StatementType;
  
  // When
  date: string;                           // YYYY-MM-DD when statement was made
  date_precision: 'exact' | 'month' | 'year' | 'approximate';
  
  // Who
  speaker: Speaker;
  
  // What
  headline: string;                       // Brief summary for listings
  full_text?: string;                     // Complete statement if available
  key_quote: string;                      // Most impactful quote (required)
  context?: string;                       // What prompted this statement
  
  // Where was it said
  platform?: 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'interview' | 'press_conference' | 'speech' | 'op_ed' | 'testimony' | 'other';
  platform_url?: string;                  // Direct link to original
  
  // What is it about
  topics?: string[];                      // ['family_separation', 'deportation', 'detention_conditions']
  related_incident_ids?: string[];        // Links to documented incidents
  
  // Impact
  impact_level?: ImpactLevel;
  media_coverage?: 'viral' | 'national' | 'regional' | 'local' | 'minimal';
  engagement_metrics?: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  };
  
  // Response tracking
  ice_response?: string;                  // Did ICE respond?
  other_responses?: string[];             // Notable responses
  
  // Related data (same as incidents)
  quotes?: IncidentQuote[];               // Verified quotes
  sources?: IncidentSource[];             // Source articles
  field_quote_map?: Record<string, { quote_id: number; quote_text: string; source_id: number; source_title?: string; source_url?: string }[]>;
  
  // Metadata
  verified: boolean;
  verification_status?: 'pending' | 'first_review' | 'first_validation' | 'verified' | 'rejected';
  verification_notes?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================
// LEGAL CASE INTERFACE
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars`nimport type {
  LegalCaseType,
  LegalCaseStatus,
} from '@/lib/content-types';

export interface LegalCase {
  // Identity
  id?: number;
  case_id: string;                        // YYYY-case-name-slug
  content_type: 'legal';
  case_type: LegalCaseType;
  
  // Case Information
  case_name: string;                      // e.g., "Doe v. ICE"
  case_number?: string;                   // Court case number
  court?: string;                         // e.g., "9th Circuit Court of Appeals"
  jurisdiction?: string;                  // Federal/State/District
  
  // Parties
  plaintiffs?: string[];                  // Who filed
  defendants?: string[];                  // Who is being sued
  plaintiff_attorneys?: string[];         // Law firms/lawyers
  defendant_attorneys?: string[];
  amicus_curiae?: string[];               // Friend of court briefs
  
  // Dates
  date_filed: string;
  date_decided?: string;
  date_updated?: string;
  
  // Status
  status: LegalCaseStatus;
  
  // Content
  summary: string;                        // What is this case about
  legal_issues?: string[];                // Constitutional questions
  key_arguments?: string;
  
  // Outcome
  ruling?: string;                        // Court's decision
  ruling_impact?: string;                 // What does this mean
  precedent_set?: string;                 // Legal precedent established
  relief_granted?: string;                // What did plaintiffs get
  
  // Related
  related_cases?: string[];               // Related case_ids
  related_incident_ids?: string[];        // ICE Deaths incidents
  
  // Documents
  complaint_url?: string;                 // Link to original complaint
  ruling_url?: string;                    // Link to ruling
  
  // Related data (same as incidents)
  quotes?: IncidentQuote[];
  sources?: IncidentSource[];
  field_quote_map?: Record<string, { quote_id: number; quote_text: string; source_id: number; source_title?: string; source_url?: string }[]>;
  
  // Metadata
  verified: boolean;
  verification_status?: 'pending' | 'first_review' | 'first_validation' | 'verified' | 'rejected';
  verification_notes?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================
// POLICY INTERFACE
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars`nimport type { PolicyType } from '@/lib/content-types';

export interface Policy {
  // Identity
  id?: number;
  policy_id: string;                      // YYYY-MM-DD-policy-slug
  content_type: 'policy';
  policy_type: PolicyType;
  
  // What
  title: string;                          // Official title
  number?: string;                        // EO number, memo ID
  summary: string;                        // What does this do
  
  // When
  date_issued: string;
  date_effective?: string;
  date_rescinded?: string;
  
  // Who
  issuing_authority?: string;             // President, DHS Secretary, etc.
  issuing_agency?: string;                // ICE, DHS, etc.
  
  // Content
  full_text_url?: string;                 // Link to full document
  key_provisions?: string[];              // Main changes
  
  // Impact
  populations_affected?: string[];        // Who does this affect
  estimated_impact?: string;              // How many people
  
  // Legal status
  legal_challenges?: string[];            // Related legal case IDs
  current_status?: 'active' | 'suspended' | 'rescinded' | 'modified' | 'enjoined';
  
  // Related
  replaces_policy_ids?: string[];         // Policies this replaces
  modified_by_policy_ids?: string[];      // Policies that modified this
  related_incident_ids?: string[];        // Incidents resulting from policy
  
  // Related data (same as incidents)
  quotes?: IncidentQuote[];
  sources?: IncidentSource[];
  field_quote_map?: Record<string, { quote_id: number; quote_text: string; source_id: number; source_title?: string; source_url?: string }[]>;
  
  // Metadata
  verified: boolean;
  verification_status?: 'pending' | 'first_review' | 'first_validation' | 'verified' | 'rejected';
  verification_notes?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================
// FORM LABELS
// ============================================

export const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter/X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  interview: 'Interview',
  press_conference: 'Press Conference',
  speech: 'Speech',
  op_ed: 'Op-Ed',
  testimony: 'Congressional Testimony',
  other: 'Other',
};

export const MEDIA_COVERAGE_LABELS: Record<string, string> = {
  viral: 'Viral (millions of views)',
  national: 'National Coverage',
  regional: 'Regional Coverage',
  local: 'Local Coverage',
  minimal: 'Minimal Coverage',
};

// ============================================
// FILTERS
// ============================================

export interface StatementFilters {
  statement_type?: StatementType;
  speaker_type?: SpeakerType;
  political_affiliation?: PoliticalAffiliation;
  impact_level?: ImpactLevel;
  search?: string;
  includeUnverified?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'statement_date' | 'created_at' | 'impact_level' | 'speaker_name';
  sort_order?: 'asc' | 'desc';
}
