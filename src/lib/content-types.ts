/**
 * CONTENT TYPE DEFINITIONS - Single Source of Truth
 * 
 * This file defines the top-level content types for the documentation system.
 * The architecture supports:
 *   - Incidents (deaths, arrests, raids, etc.) - existing
 *   - Statements (public advocacy, denunciations) - NEW
 *   - Legal (court cases, rulings) - NEW
 *   - Policy (executive orders, memos) - NEW
 * 
 * Each content type has its own field definitions but shares:
 *   - Quote/source verification system
 *   - Review workflow
 *   - Tags system
 * 
 * SYNC: Keep this in sync with extension/content-types.js
 */

// ============================================
// CONTENT TYPES
// ============================================

export type ContentType = 
  | 'incident'    // Deaths, arrests, raids, force incidents (existing)
  | 'statement'   // Public statements, advocacy, denunciations
  | 'legal'       // Court cases, lawsuits, rulings
  | 'policy';     // Executive orders, memos, directives

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  incident: 'Incident',
  statement: 'Public Statement',
  legal: 'Legal Case',
  policy: 'Policy Document',
};

export const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  incident: 'Deaths, injuries, arrests, raids, and other enforcement incidents',
  statement: 'Public statements from officials, celebrities, experts denouncing or supporting actions',
  legal: 'Court cases, lawsuits, injunctions, and legal rulings',
  policy: 'Executive orders, agency memos, and policy directives',
};

// ============================================
// STATEMENT TYPES (NEW)
// ============================================

export type StatementType =
  | 'denunciation'        // Speaking out against ICE/enforcement
  | 'support'             // Supporting enforcement (for context)
  | 'legal_analysis'      // Legal expert commentary
  | 'official_response';  // ICE/government responses

export const STATEMENT_TYPE_LABELS: Record<StatementType, string> = {
  denunciation: 'Denunciation',
  support: 'Statement of Support',
  legal_analysis: 'Legal Analysis',
  official_response: 'Official Response',
};

// ============================================
// SPEAKER TYPES (for statements)
// ============================================

export type SpeakerType =
  | 'politician'          // Elected officials
  | 'celebrity'           // Actors, musicians, athletes
  | 'journalist'          // Reporters, anchors
  | 'legal_expert'        // Lawyers, law professors
  | 'medical_expert'      // Doctors, nurses
  | 'religious_leader'    // Pastors, rabbis, imams
  | 'business_leader'     // CEOs, executives
  | 'activist'            // Advocacy leaders
  | 'academic'            // Professors, researchers
  | 'law_enforcement'     // Police, former ICE agents
  | 'military'            // Military officials
  | 'former_official'     // Former government officials
  | 'victim'              // Directly affected person
  | 'family_member'       // Family of affected person
  | 'witness'             // Eyewitness
  | 'other';

export const SPEAKER_TYPE_LABELS: Record<SpeakerType, string> = {
  politician: 'Politician',
  celebrity: 'Celebrity/Public Figure',
  journalist: 'Journalist',
  legal_expert: 'Legal Expert',
  medical_expert: 'Medical Professional',
  religious_leader: 'Religious Leader',
  business_leader: 'Business Leader',
  activist: 'Activist',
  academic: 'Academic/Researcher',
  law_enforcement: 'Law Enforcement',
  military: 'Military Official',
  former_official: 'Former Government Official',
  victim: 'Victim',
  family_member: 'Family Member',
  witness: 'Witness',
  other: 'Other',
};

// ============================================
// POLITICAL AFFILIATION (for context)
// ============================================

export type PoliticalAffiliation =
  | 'democrat'
  | 'republican'
  | 'independent'
  | 'libertarian'
  | 'green'
  | 'nonpartisan'
  | 'unknown';

export const POLITICAL_AFFILIATION_LABELS: Record<PoliticalAffiliation, string> = {
  democrat: 'Democrat',
  republican: 'Republican',
  independent: 'Independent',
  libertarian: 'Libertarian',
  green: 'Green Party',
  nonpartisan: 'Non-partisan',
  unknown: 'Unknown',
};

// ============================================
// LEGAL CASE TYPES (NEW)
// ============================================

export type LegalCaseType =
  | 'habeas_corpus'       // Challenging detention
  | 'class_action'        // Class action lawsuit
  | 'individual_lawsuit'  // Individual civil suit
  | 'injunction'          // Seeking court order
  | 'asylum_appeal'       // Asylum case
  | 'deportation_appeal'  // Deportation challenge
  | 'criminal_case'       // Criminal charges
  | 'civil_rights'        // Civil rights violation
  | 'foia_litigation'     // FOIA enforcement
  | 'constitutional';     // Constitutional challenge

export const LEGAL_CASE_TYPE_LABELS: Record<LegalCaseType, string> = {
  habeas_corpus: 'Habeas Corpus',
  class_action: 'Class Action',
  individual_lawsuit: 'Individual Lawsuit',
  injunction: 'Injunction Request',
  asylum_appeal: 'Asylum Appeal',
  deportation_appeal: 'Deportation Appeal',
  criminal_case: 'Criminal Case',
  civil_rights: 'Civil Rights Case',
  foia_litigation: 'FOIA Litigation',
  constitutional: 'Constitutional Challenge',
};

export type LegalCaseStatus =
  | 'filed'
  | 'pending'
  | 'in_discovery'
  | 'at_trial'
  | 'appealed'
  | 'decided'
  | 'settled'
  | 'dismissed'
  | 'withdrawn';

export const LEGAL_CASE_STATUS_LABELS: Record<LegalCaseStatus, string> = {
  filed: 'Filed',
  pending: 'Pending',
  in_discovery: 'In Discovery',
  at_trial: 'At Trial',
  appealed: 'On Appeal',
  decided: 'Decided',
  settled: 'Settled',
  dismissed: 'Dismissed',
  withdrawn: 'Withdrawn',
};

// ============================================
// POLICY TYPES (NEW)
// ============================================

export type PolicyType =
  | 'executive_order'     // Presidential executive orders
  | 'agency_memo'         // ICE/DHS internal memos
  | 'agency_directive'    // Formal agency directives
  | 'budget_allocation'   // Funding changes
  | 'guidance_change'     // Enforcement priority changes
  | 'rule_change'         // Regulatory changes
  | 'interagency_agreement'; // MOUs between agencies

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  executive_order: 'Executive Order',
  agency_memo: 'Agency Memo',
  agency_directive: 'Agency Directive',
  budget_allocation: 'Budget Allocation',
  guidance_change: 'Guidance Change',
  rule_change: 'Rule Change',
  interagency_agreement: 'Interagency Agreement',
};

// ============================================
// IMPACT LEVEL (for persuasion value)
// ============================================

export type ImpactLevel = 
  | 'high'      // National figure, major legal precedent
  | 'medium'    // Regional/industry figure, significant case
  | 'low';      // Local impact

export const IMPACT_LEVEL_LABELS: Record<ImpactLevel, string> = {
  high: 'High Impact',
  medium: 'Medium Impact',
  low: 'Local Impact',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all available content types
 */
export function getContentTypes(): ContentType[] {
  return ['incident', 'statement', 'legal', 'policy'];
}

/**
 * Get the label for a content type
 */
export function getContentTypeLabel(type: ContentType): string {
  return CONTENT_TYPE_LABELS[type] || type;
}

/**
 * Check if a content type is valid
 */
export function isValidContentType(type: string): type is ContentType {
  return ['incident', 'statement', 'legal', 'policy'].includes(type);
}
