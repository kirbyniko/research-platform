// Incident Types for expanded documentation system

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type IncidentType =
  | 'death_in_custody'       // Fatality while detained
  | 'death_during_operation' // Killed during enforcement action
  | 'death_at_protest'       // Killed at protest/demonstration
  | 'shooting'               // Law enforcement shooting (fatal or non-fatal)
  | 'excessive_force'        // Use of force incident
  | 'injury'                 // Physical harm
  | 'medical_neglect'        // Denial of care
  | 'arrest'                 // Questionable detention
  | 'deportation'            // Removal action
  | 'family_separation'      // Parent/child split
  | 'rights_violation'       // Constitutional issues
  | 'workplace_raid'         // ICE raid on business
  | 'protest_suppression'    // Force used against protesters
  | 'retaliation'            // Retaliation against critics/activists
  | 'other';

// Legacy alias for backwards compatibility
export type LegacyIncidentType = 'death';

export type ViolationType =
  | '1st_amendment'      // Speech, press, assembly
  | '4th_amendment'      // Search & seizure
  | '5th_amendment'      // Due process
  | '6th_amendment'      // Right to counsel
  | '8th_amendment'      // Cruel & unusual
  | '14th_amendment'     // Equal protection
  | 'civil_rights'       // Discrimination
  | 'asylum_violation'   // Refugee law violations
  | 'excessive_force'    // Force beyond necessary
  | 'wrongful_death'     // Death caused by negligence/misconduct
  | 'other';

// Three-tier violation classification
export type ViolationClassification = 'alleged' | 'potential' | 'possible';

export interface ClassifiedViolation {
  type: ViolationType;
  classification: ViolationClassification;
  basis?: ViolationBasis;  // Required for 'potential' and 'possible'
}

export interface ViolationBasis {
  legal_framework?: string;        // e.g., "Tennessee v. Garner (1985)"
  legal_framework_source?: string; // URL to verify the case law
  relevant_facts?: string[];       // Facts that support this classification
  source?: string;                 // Who alleged it (for 'alleged')
  source_date?: string;            // When it was alleged
  note?: string;                   // Additional context
}

export type AgencyType =
  | 'ice'                // Immigration & Customs Enforcement
  | 'ice_ere'            // ICE Enforcement & Removal Operations
  | 'ice_hsi'            // ICE Homeland Security Investigations
  | 'cbp'                // Customs & Border Protection
  | 'border_patrol'      // Border Patrol (CBP subdivision)
  | 'local_police'       // Local law enforcement
  | 'state_police'       // State law enforcement
  | 'federal_marshals'   // US Marshals Service
  | 'dhs'                // Dept of Homeland Security
  | 'fbi'                // Federal Bureau of Investigation
  | 'national_guard'     // National Guard
  | 'private_contractor' // Private security/contractors
  | 'unknown'            // Unknown agency
  | 'other';

export type DatePrecision = 'exact' | 'month' | 'year' | 'approximate';

export type OutcomeStatus = 'ongoing' | 'resolved' | 'unknown';

export type SourceType = 
  | 'news_article'
  | 'court_document'
  | 'government_report'
  | 'official_statement'
  | 'social_media'
  | 'press_release'
  | 'academic_paper'
  | 'video'
  | 'other';

export type QuoteCategory =
  | 'timeline'           // What happened when
  | 'official'           // Government/agency statements
  | 'medical'            // Health/medical information
  | 'legal'              // Legal proceedings/immigration
  | 'context'            // Background information
  | 'witness'            // Eyewitness accounts
  | 'victim'             // Statement from affected person
  | 'family'             // Family member statements
  | 'lawyer'             // Attorney statements
  | 'agency'             // Agency response
  | 'court'              // Court documents/rulings
  | 'policy';            // Policy/procedure citations

// ============================================
// LOCATION
// ============================================

export interface Location {
  city?: string;
  state?: string;
  country: string;
  facility?: string;           // Detention facility name
  address?: string;            // Street address
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================
// SUBJECT (PERSON AFFECTED)
// ============================================

export interface Subject {
  name?: string;               // May be anonymous/unknown
  name_public: boolean;        // Is name publicly reported?
  age?: number;
  gender?: string;
  nationality?: string;
  immigration_status?: string; // e.g., "asylum seeker", "undocumented"
  occupation?: string;         // e.g., "journalist", "farmworker"
  years_in_us?: number;        // How long in the country
  family_in_us?: string;       // e.g., "US citizen children"
}

// ============================================
// SOURCES & QUOTES
// ============================================

export interface IncidentSource {
  id?: number;
  url: string;
  title: string;
  publication?: string;
  author?: string;
  published_date?: string;
  accessed_at?: string;
  archived_url?: string;       // Wayback machine
  source_type: SourceType;
}

export interface IncidentQuote {
  id?: number;
  text: string;
  category: QuoteCategory;
  source_id?: number;
  source?: IncidentSource;
  page_number?: number;
  paragraph_number?: number;
  confidence?: number;         // 0-1 AI classification confidence
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  linked_fields?: string[];    // Fields this quote supports (e.g., 'victim_name', 'agency_ice')
}

// ============================================
// TIMELINE
// ============================================

export interface TimelineEntry {
  id?: number;
  date?: string;               // YYYY-MM-DD
  time?: string;               // HH:MM
  description: string;
  source_id?: number;
  source?: IncidentSource;
  quote_id?: number;
  quote?: IncidentQuote;
  sequence_order?: number;
}

// ============================================
// OUTCOME
// ============================================

export interface Outcome {
  status: OutcomeStatus;
  legal_action?: string;       // Lawsuit filed, etc.
  settlement_amount?: string;
  policy_change?: string;      // Any resulting policy changes
  criminal_charges?: string;   // Charges against officials
  internal_investigation?: string;
  media_coverage_level?: 'none' | 'local' | 'national' | 'international';
}

// ============================================
// TYPE-SPECIFIC DETAILS
// ============================================

export interface DeathDetails {
  cause_of_death: string;
  cause_source: 'official' | 'family' | 'autopsy' | 'unknown';
  manner_of_death?: 'natural' | 'accident' | 'suicide' | 'homicide' | 'undetermined' | 'pending';
  death_context?: 'in_custody' | 'during_arrest' | 'during_raid' | 'at_protest' | 'at_border' | 'other';
  custody_duration?: string;   // How long detained before death
  medical_requests_denied?: boolean;
  medical_care_timeline?: string;
  autopsy_performed?: boolean;
  autopsy_independent?: boolean;
}

export interface ShootingDetails {
  fatal: boolean;
  shots_fired?: number;
  shots_hit?: number;
  weapon_type: string;         // "handgun", "rifle", "less-lethal", etc.
  shooter_agency?: AgencyType;
  shooter_identified?: boolean;
  shooter_name?: string;       // If publicly known
  victim_armed?: boolean;
  victim_weapon?: string;      // What they were allegedly armed with
  bodycam_available?: boolean;
  bodycam_released?: boolean;
  witness_count?: number;
  distance?: string;           // How far shooter was from victim
  warning_given?: boolean;
  context: 'protest' | 'arrest' | 'raid' | 'traffic_stop' | 'border' | 'other';
}

export interface ExcessiveForceDetails {
  force_type: string[];        // "taser", "pepper_spray", "baton", "chokehold", etc.
  duration?: string;           // How long force was applied
  injuries_caused?: string[];
  restraint_type?: string;     // "handcuffs", "zip_ties", "hogtie", etc.
  victim_restrained_when_force_used?: boolean;
  victim_complying?: boolean;
  video_evidence?: boolean;
  witness_count?: number;
}

export interface ProtestDetails {
  protest_topic: string;       // What the protest was about
  protest_size?: string;       // Estimated attendance
  protest_type?: 'march' | 'rally' | 'sit_in' | 'vigil' | 'blockade' | 'other';
  permitted?: boolean;
  counter_protesters?: boolean;
  dispersal_ordered?: boolean;
  dispersal_method?: string;   // "tear_gas", "rubber_bullets", etc.
  arrests_made?: number;
  injuries_reported?: number;
}

export interface InjuryDetails {
  injury_type: string;         // "broken arm", "taser burns", etc.
  injury_description?: string;
  severity: 'minor' | 'moderate' | 'severe' | 'life_threatening';
  cause: string;               // "during arrest", "in custody", etc.
  medical_treatment?: string;
  hospitalized?: boolean;
  permanent_damage?: boolean;
  weapon_used?: string;        // "taser", "firearm", "baton", etc.
}

export interface ArrestDetails {
  stated_reason: string;       // Official justification
  actual_context?: string;     // What was really happening
  charges: string[];
  charges_dropped?: boolean;
  charges_dropped_reason?: string;
  bail_amount?: string;
  detention_location?: string;
  detention_duration?: string;
  release_date?: string;
  warrant_type?: 'judicial' | 'administrative' | 'none' | 'unknown';
  
  // Red flags for pretext
  timing_suspicious?: boolean; // Right after criticism/activism
  pretext_arrest?: boolean;    // Minor charge covering real motive
  selective_enforcement?: boolean;
  retaliation_indicators?: string[];
}

export interface RightsViolationDetails {
  violation_types: ViolationType[];
  constitutional_basis?: string;
  legal_precedent?: string;
  
  // For press/speech cases
  journalism_related?: boolean;
  speech_content?: string;     // What was said (quoted)
  protest_related?: boolean;
  activism_related?: boolean;
  
  // Legal response
  charges_filed?: string[];
  charges_dropped?: boolean;
  lawsuit_filed?: boolean;
  lawsuit_outcome?: string;
  court_ruling?: string;
  injunction_issued?: boolean;
}

export interface DeportationDetails {
  deportation_type: 'removal' | 'voluntary_departure' | 'expedited_removal' | 'reinstatement';
  destination_country: string;
  had_pending_case?: boolean;  // Legal case pending
  had_valid_visa?: boolean;
  had_asylum_claim?: boolean;
  separated_from_family?: boolean;
  family_members_affected?: string;
  danger_at_destination?: string; // Known threats in home country
  previous_deportations?: number;
}

export interface FamilySeparationDetails {
  children_affected: number;
  children_ages?: string;
  children_us_citizens?: boolean;
  separation_duration?: string;
  reunification_status?: 'reunified' | 'pending' | 'unknown' | 'denied';
  children_placement?: string;  // Foster care, relatives, etc.
  parent_deported?: boolean;
}

export interface WorkplaceRaidDetails {
  business_name?: string;
  business_type?: string;
  workers_detained: number;
  workers_arrested?: number;
  workers_released?: number;
  children_stranded?: number;  // Kids left at school, etc.
  community_impact?: string;
  advance_notice?: boolean;    // Did employer have notice?
  employer_charged?: boolean;
}

// ============================================
// MAIN INCIDENT INTERFACE
// ============================================

export interface Incident {
  // Identity
  id?: number;
  incident_id: string;           // YYYY-MM-DD-identifier
  incident_type: IncidentType;   // Primary type (backward compatibility)
  incident_types?: IncidentType[]; // Array of all incident types (new multi-type support)
  
  // When
  date: string;                  // YYYY-MM-DD
  date_precision: DatePrecision;
  date_end?: string;             // For ongoing incidents
  
  // Where
  location: Location;
  
  // Who
  subject: Subject;
  victim_name?: string | null;
  
  // What
  summary: string;               // Brief factual description
  image_url?: string;            // Free-use image URL (Wikimedia, Unsplash, etc.)
  agencies_involved: AgencyType[];
  
  // Violation classification (three-tier system)
  violations_alleged?: ViolationType[];      // Formally alleged in lawsuit/complaint
  violations_potential?: ViolationType[];    // Facts match case law, no formal allegation
  violations_possible?: ViolationType[];     // Would be violation if disputed facts are true
  violation_details_map?: Record<string, ViolationBasis>;  // Keyed by "type_classification"

  // Type-specific details
  death_details?: DeathDetails;
  shooting_details?: ShootingDetails;
  excessive_force_details?: ExcessiveForceDetails;
  protest_details?: ProtestDetails;
  injury_details?: InjuryDetails;
  arrest_details?: ArrestDetails;
  violation_details?: RightsViolationDetails;
  deportation_details?: DeportationDetails;
  family_separation_details?: FamilySeparationDetails;
  workplace_raid_details?: WorkplaceRaidDetails;
  
  // Related data
  timeline?: TimelineEntry[];
  quotes?: IncidentQuote[];
  sources?: IncidentSource[];
  field_quote_map?: Record<string, { quote_id: number; quote_text: string; source_id: number; source_title?: string; source_url?: string }[]>;
  
  // Outcome
  outcome?: Outcome;
  
  // Metadata
  verified: boolean;
  verification_status?: 'pending' | 'first_review' | 'first_validation' | 'verified' | 'rejected';  // Analyst workflow status (no second_review - goes directly to validation)
  verification_notes?: string;
  related_incident_ids?: string[];  // Link related incidents
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================
// API TYPES
// ============================================

export interface IncidentFilters {
  type?: IncidentType;
  types?: IncidentType[];
  agency?: AgencyType;
  agencies?: AgencyType[];
  violation?: ViolationType;
  violations?: ViolationType[];
  state?: string;
  city?: string;
  year?: number;
  year_start?: number;
  year_end?: number;
  verified?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'date' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  // Internal flag - if true, includes unverified incidents (for analysts)
  includeUnverified?: boolean;
}

export interface IncidentStats {
  total_incidents: number;
  by_type: Record<IncidentType, number>;
  by_agency: Record<AgencyType, number>;
  by_state: Record<string, number>;
  by_year: Record<number, number>;
  verified_count: number;
  unverified_count: number;
}

export interface CreateIncidentRequest {
  incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>;
  sources?: Omit<IncidentSource, 'id'>[];
  quotes?: Omit<IncidentQuote, 'id'>[];
  timeline?: Omit<TimelineEntry, 'id'>[];
}

export interface UpdateIncidentRequest {
  incident?: Partial<Incident>;
  sources_add?: Omit<IncidentSource, 'id'>[];
  sources_remove?: number[];
  quotes_add?: Omit<IncidentQuote, 'id'>[];
  quotes_remove?: number[];
  timeline_add?: Omit<TimelineEntry, 'id'>[];
  timeline_remove?: number[];
}

// ============================================
// FORM HELPERS
// ============================================

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  death_in_custody: 'Death in Custody',
  death_during_operation: 'Death During Operation',
  death_at_protest: 'Death at Protest',
  shooting: 'Shooting',
  excessive_force: 'Excessive Force',
  injury: 'Injury',
  medical_neglect: 'Medical Neglect',
  arrest: 'Arrest/Detention',
  deportation: 'Deportation',
  family_separation: 'Family Separation',
  rights_violation: 'Rights Violation',
  protest_suppression: 'Protest Suppression',
  retaliation: 'Retaliation',
  workplace_raid: 'Workplace Raid',
  other: 'Other',
};

export const VIOLATION_TYPE_LABELS: Record<ViolationType, string> = {
  '1st_amendment': '1st Amendment (Speech/Press)',
  '4th_amendment': '4th Amendment (Search/Seizure)',
  '5th_amendment': '5th Amendment (Due Process)',
  '6th_amendment': '6th Amendment (Right to Counsel)',
  '8th_amendment': '8th Amendment (Cruel/Unusual)',
  '14th_amendment': '14th Amendment (Equal Protection)',
  civil_rights: 'Civil Rights Violation',
  excessive_force: 'Excessive Force',
  wrongful_death: 'Wrongful Death',
  asylum_violation: 'Asylum Law Violation',
  other: 'Other',
};

export const AGENCY_LABELS: Record<AgencyType, string> = {
  ice: 'ICE',
  ice_ere: 'ICE ERO',
  ice_hsi: 'ICE HSI',
  cbp: 'CBP',
  border_patrol: 'Border Patrol',
  local_police: 'Local Police',
  state_police: 'State Police',
  federal_marshals: 'US Marshals',
  national_guard: 'National Guard',
  dhs: 'DHS',
  fbi: 'FBI',
  private_contractor: 'Private Contractor',
  unknown: 'Unknown',
  other: 'Other',
};

export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  timeline: 'Timeline Event',
  official: 'Official Statement',
  medical: 'Medical Information',
  legal: 'Legal/Immigration',
  context: 'Background Context',
  witness: 'Witness Account',
  victim: 'Victim Statement',
  family: 'Family Statement',
  lawyer: 'Attorney Statement',
  agency: 'Agency Response',
  court: 'Court Document',
  policy: 'Policy/Procedure',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  news_article: 'News Article',
  court_document: 'Court Document',
  government_report: 'Government Report',
  official_statement: 'Official Statement',
  social_media: 'Social Media',
  press_release: 'Press Release',
  academic_paper: 'Academic Paper',
  video: 'Video',
  other: 'Other',
};
