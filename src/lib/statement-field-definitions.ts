/**
 * STATEMENT FIELD DEFINITIONS
 * 
 * Defines which fields appear for each statement type.
 * Mirrors the structure of type-field-definitions.ts for incidents.
 * 
 * SYNC: Keep in sync with extension/statement-field-definitions.js
 */

import type { FieldDefinition } from './field-registry';

export interface StatementFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'multiselect' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
  quotable?: boolean;     // Can this field be linked to quotes?
  verifiable?: boolean;   // Can this field be verified?
  required?: boolean;
}

export interface StatementSection {
  title: string;
  types: string[];  // Which statement types trigger this section
  fields: StatementFieldDefinition[];
}

// ============================================
// FIELD OPTIONS
// ============================================

export const STATEMENT_TYPE_OPTIONS = [
  { value: 'denunciation', label: 'Denunciation' },
  { value: 'support', label: 'Statement of Support' },
  { value: 'legal_analysis', label: 'Legal Analysis' },
  { value: 'official_response', label: 'Official Response' },
];

export const SPEAKER_TYPE_OPTIONS = [
  { value: 'politician', label: 'Politician' },
  { value: 'celebrity', label: 'Celebrity/Public Figure' },
  { value: 'journalist', label: 'Journalist' },
  { value: 'legal_expert', label: 'Legal Expert' },
  { value: 'medical_expert', label: 'Medical Professional' },
  { value: 'religious_leader', label: 'Religious Leader' },
  { value: 'business_leader', label: 'Business Leader' },
  { value: 'activist', label: 'Activist' },
  { value: 'academic', label: 'Academic/Researcher' },
  { value: 'law_enforcement', label: 'Law Enforcement' },
  { value: 'military', label: 'Military Official' },
  { value: 'former_official', label: 'Former Government Official' },
  { value: 'victim', label: 'Victim' },
  { value: 'family_member', label: 'Family Member' },
  { value: 'witness', label: 'Witness' },
  { value: 'other', label: 'Other' },
];

export const POLITICAL_AFFILIATION_OPTIONS = [
  { value: 'democrat', label: 'Democrat' },
  { value: 'republican', label: 'Republican' },
  { value: 'independent', label: 'Independent' },
  { value: 'libertarian', label: 'Libertarian' },
  { value: 'green', label: 'Green Party' },
  { value: 'nonpartisan', label: 'Non-partisan' },
  { value: 'unknown', label: 'Unknown' },
];

export const PLATFORM_OPTIONS = [
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'interview', label: 'Interview' },
  { value: 'press_conference', label: 'Press Conference' },
  { value: 'speech', label: 'Speech' },
  { value: 'op_ed', label: 'Op-Ed' },
  { value: 'testimony', label: 'Congressional Testimony' },
  { value: 'other', label: 'Other' },
];

export const MEDIA_COVERAGE_OPTIONS = [
  { value: 'viral', label: 'Viral (millions of views)' },
  { value: 'national', label: 'National Coverage' },
  { value: 'regional', label: 'Regional Coverage' },
  { value: 'local', label: 'Local Coverage' },
  { value: 'minimal', label: 'Minimal Coverage' },
];

export const IMPACT_LEVEL_OPTIONS = [
  { value: 'high', label: 'High Impact' },
  { value: 'medium', label: 'Medium Impact' },
  { value: 'low', label: 'Local Impact' },
];

// ============================================
// CORE STATEMENT FIELDS (always shown)
// ============================================

export const STATEMENT_CORE_FIELDS: StatementFieldDefinition[] = [
  { key: 'statement_type', label: 'Statement Type', type: 'select', options: STATEMENT_TYPE_OPTIONS, required: true, verifiable: true },
  { key: 'statement_date', label: 'Date of Statement', type: 'date', required: true, verifiable: true },
  { key: 'headline', label: 'Headline/Summary', type: 'text', required: true, placeholder: 'Brief summary for listings', quotable: true },
  { key: 'key_quote', label: 'Key Quote', type: 'textarea', required: true, placeholder: 'Most impactful quote (required)', quotable: true, verifiable: true },
];

// ============================================
// SPEAKER SECTION (always shown)
// ============================================

export const SPEAKER_SECTION: StatementSection = {
  title: 'Speaker Information',
  types: ['*'],  // Show for all statement types
  fields: [
    { key: 'speaker_name', label: 'Speaker Name', type: 'text', required: true, quotable: true, verifiable: true },
    { key: 'speaker_title', label: 'Title/Role', type: 'text', placeholder: 'e.g., Senator, Actor, Immigration Attorney', quotable: true, verifiable: true },
    { key: 'speaker_organization', label: 'Organization', type: 'text', placeholder: 'e.g., ACLU, NBC News', quotable: true },
    { key: 'speaker_type', label: 'Speaker Type', type: 'select', options: SPEAKER_TYPE_OPTIONS, required: true },
    { key: 'political_affiliation', label: 'Political Affiliation', type: 'select', options: POLITICAL_AFFILIATION_OPTIONS },
    { key: 'speaker_credentials', label: 'Credentials', type: 'text', placeholder: 'Why should people trust this person?', quotable: true, verifiable: true },
    { key: 'wikipedia_url', label: 'Wikipedia URL', type: 'text', placeholder: 'For verification of identity' },
  ],
};

// ============================================
// CONTEXT SECTION (always shown)
// ============================================

export const CONTEXT_SECTION: StatementSection = {
  title: 'Statement Context',
  types: ['*'],
  fields: [
    { key: 'platform', label: 'Platform', type: 'select', options: PLATFORM_OPTIONS, verifiable: true },
    { key: 'platform_url', label: 'Direct Link', type: 'text', placeholder: 'Link to original statement', verifiable: true },
    { key: 'full_text', label: 'Full Statement Text', type: 'textarea', placeholder: 'Complete statement if available', quotable: true },
    { key: 'context', label: 'What Prompted This?', type: 'textarea', placeholder: 'What event or situation led to this statement?', quotable: true },
  ],
};

// ============================================
// IMPACT SECTION (shown for all types)
// ============================================

export const IMPACT_SECTION: StatementSection = {
  title: 'Impact & Reach',
  types: ['*'],
  fields: [
    { key: 'impact_level', label: 'Impact Level', type: 'select', options: IMPACT_LEVEL_OPTIONS },
    { key: 'media_coverage', label: 'Media Coverage', type: 'select', options: MEDIA_COVERAGE_OPTIONS },
  ],
};

// ============================================
// COMBINE ALL SECTIONS
// ============================================

export const STATEMENT_SECTIONS: StatementSection[] = [
  SPEAKER_SECTION,
  CONTEXT_SECTION,
  IMPACT_SECTION,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all sections that should be shown for a given statement type
 */
export function getStatementSectionsForType(statementType: string): StatementSection[] {
  return STATEMENT_SECTIONS.filter(section => 
    section.types.includes('*') || section.types.includes(statementType)
  );
}

/**
 * Get all field keys for a statement type
 */
export function getStatementFieldKeysForType(statementType: string): string[] {
  const sections = getStatementSectionsForType(statementType);
  const keys: string[] = [];
  
  // Add core fields first
  for (const field of STATEMENT_CORE_FIELDS) {
    if (!keys.includes(field.key)) {
      keys.push(field.key);
    }
  }
  
  // Add section fields
  for (const section of sections) {
    for (const field of section.fields) {
      if (!keys.includes(field.key)) {
        keys.push(field.key);
      }
    }
  }
  
  return keys;
}

/**
 * Get all quotable fields for a statement type
 */
export function getQuotableStatementFields(statementType: string): StatementFieldDefinition[] {
  const sections = getStatementSectionsForType(statementType);
  const quotableFields: StatementFieldDefinition[] = [];
  
  // Check core fields
  for (const field of STATEMENT_CORE_FIELDS) {
    if (field.quotable) {
      quotableFields.push(field);
    }
  }
  
  // Check section fields
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.quotable) {
        quotableFields.push(field);
      }
    }
  }
  
  return quotableFields;
}
