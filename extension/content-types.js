/**
 * CONTENT TYPE DEFINITIONS (Extension Version)
 * 
 * JavaScript port of src/lib/content-types.ts
 * Keep these files in sync!
 */

// ============================================
// CONTENT TYPES
// ============================================

const CONTENT_TYPES = ['incident', 'statement', 'legal', 'policy'];

const CONTENT_TYPE_LABELS = {
  incident: 'Incident',
  statement: 'Public Statement',
  legal: 'Legal Case',
  policy: 'Policy Document',
};

const CONTENT_TYPE_DESCRIPTIONS = {
  incident: 'Deaths, injuries, arrests, raids, and other enforcement incidents',
  statement: 'Public statements from officials, celebrities, experts denouncing or supporting actions',
  legal: 'Court cases, lawsuits, injunctions, and legal rulings',
  policy: 'Executive orders, agency memos, and policy directives',
};

// ============================================
// STATEMENT TYPES
// ============================================

const STATEMENT_TYPES = [
  'denunciation',
  'support',
  'legal_analysis',
  'official_response',
];

const STATEMENT_TYPE_LABELS = {
  denunciation: 'Denunciation',
  support: 'Statement of Support',
  legal_analysis: 'Legal Analysis',
  official_response: 'Official Response',
};

// ============================================
// SPEAKER TYPES
// ============================================

const SPEAKER_TYPES = [
  'politician',
  'celebrity',
  'journalist',
  'legal_expert',
  'medical_expert',
  'religious_leader',
  'business_leader',
  'activist',
  'academic',
  'law_enforcement',
  'military',
  'former_official',
  'victim',
  'family_member',
  'witness',
  'other',
];

const SPEAKER_TYPE_LABELS = {
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
// POLITICAL AFFILIATIONS
// ============================================

const POLITICAL_AFFILIATIONS = [
  'democrat',
  'republican',
  'independent',
  'libertarian',
  'green',
  'nonpartisan',
  'unknown',
];

const POLITICAL_AFFILIATION_LABELS = {
  democrat: 'Democrat',
  republican: 'Republican',
  independent: 'Independent',
  libertarian: 'Libertarian',
  green: 'Green Party',
  nonpartisan: 'Non-partisan',
  unknown: 'Unknown',
};

// ============================================
// PLATFORMS
// ============================================

const PLATFORMS = [
  'twitter',
  'facebook',
  'instagram',
  'tiktok',
  'interview',
  'press_conference',
  'speech',
  'op_ed',
  'testimony',
  'other',
];

const PLATFORM_LABELS = {
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

// ============================================
// IMPACT & COVERAGE
// ============================================

const IMPACT_LEVELS = ['high', 'medium', 'low'];

const IMPACT_LEVEL_LABELS = {
  high: 'High Impact',
  medium: 'Medium Impact',
  low: 'Local Impact',
};

const MEDIA_COVERAGE_LEVELS = ['viral', 'national', 'regional', 'local', 'minimal'];

const MEDIA_COVERAGE_LABELS = {
  viral: 'Viral (millions of views)',
  national: 'National Coverage',
  regional: 'Regional Coverage',
  local: 'Local Coverage',
  minimal: 'Minimal Coverage',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getContentTypes() {
  return CONTENT_TYPES;
}

function getContentTypeLabel(type) {
  return CONTENT_TYPE_LABELS[type] || type;
}

function isValidContentType(type) {
  return CONTENT_TYPES.includes(type);
}

function getStatementTypes() {
  return STATEMENT_TYPES;
}

function getStatementTypeLabel(type) {
  return STATEMENT_TYPE_LABELS[type] || type;
}

function getSpeakerTypes() {
  return SPEAKER_TYPES;
}

function getSpeakerTypeLabel(type) {
  return SPEAKER_TYPE_LABELS[type] || type;
}

// ============================================
// EXPORT FOR EXTENSION
// ============================================

if (typeof window !== 'undefined') {
  window.ContentTypes = {
    CONTENT_TYPES,
    CONTENT_TYPE_LABELS,
    CONTENT_TYPE_DESCRIPTIONS,
    STATEMENT_TYPES,
    STATEMENT_TYPE_LABELS,
    SPEAKER_TYPES,
    SPEAKER_TYPE_LABELS,
    POLITICAL_AFFILIATIONS,
    POLITICAL_AFFILIATION_LABELS,
    PLATFORMS,
    PLATFORM_LABELS,
    IMPACT_LEVELS,
    IMPACT_LEVEL_LABELS,
    MEDIA_COVERAGE_LEVELS,
    MEDIA_COVERAGE_LABELS,
    getContentTypes,
    getContentTypeLabel,
    isValidContentType,
    getStatementTypes,
    getStatementTypeLabel,
    getSpeakerTypes,
    getSpeakerTypeLabel,
  };
}
