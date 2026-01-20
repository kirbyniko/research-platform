/**
 * STATEMENT FIELD DEFINITIONS (Extension Version)
 * 
 * JavaScript port of src/lib/statement-field-definitions.ts
 * Keep these files in sync!
 * 
 * Defines which fields appear for each statement type.
 */

// ============================================
// FIELD OPTIONS
// ============================================

const STATEMENT_TYPE_OPTIONS = [
  { value: 'denunciation', label: 'Denunciation' },
  { value: 'support', label: 'Statement of Support' },
  { value: 'legal_analysis', label: 'Legal Analysis' },
  { value: 'official_response', label: 'Official Response' },
];

const SPEAKER_TYPE_OPTIONS = [
  { value: 'politician', label: 'Politician' },
  { value: 'celebrity', label: 'Celebrity/Public Figure' },
  { value: 'journalist', label: 'Journalist' },
  { value: 'legal_expert', label: 'Legal Expert' },
  { value: 'activist', label: 'Activist' },
  { value: 'academic', label: 'Academic/Researcher' },
  { value: 'former_official', label: 'Former Government Official' },
  { value: 'other', label: 'Other' },
];

const POLITICAL_AFFILIATION_OPTIONS = [
  { value: 'democrat', label: 'Democrat' },
  { value: 'republican', label: 'Republican' },
  { value: 'independent', label: 'Independent' },
  { value: 'libertarian', label: 'Libertarian' },
  { value: 'green', label: 'Green Party' },
  { value: 'nonpartisan', label: 'Non-partisan' },
  { value: 'unknown', label: 'Unknown' },
];

const PLATFORM_OPTIONS = [
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

const MEDIA_COVERAGE_OPTIONS = [
  { value: 'viral', label: 'Viral (millions of views)' },
  { value: 'national', label: 'National Coverage' },
  { value: 'regional', label: 'Regional Coverage' },
  { value: 'local', label: 'Local Coverage' },
  { value: 'minimal', label: 'Minimal Coverage' },
];

const IMPACT_LEVEL_OPTIONS = [
  { value: 'high', label: 'High Impact' },
  { value: 'medium', label: 'Medium Impact' },
  { value: 'low', label: 'Local Impact' },
];

// ============================================
// CORE STATEMENT FIELDS (always shown)
// ============================================

const STATEMENT_CORE_FIELDS = [
  { key: 'statement_type', label: 'Statement Type', type: 'select', options: STATEMENT_TYPE_OPTIONS, required: true, verifiable: true },
  { key: 'statement_date', label: 'Date of Statement', type: 'date', required: true, verifiable: true },
  { key: 'headline', label: 'Headline/Summary', type: 'text', required: true, placeholder: 'Brief summary for listings', quotable: true },
  { key: 'key_quote', label: 'Key Quote', type: 'textarea', required: true, placeholder: 'Most impactful quote (required)', quotable: true, verifiable: true },
];

// ============================================
// STATEMENT SECTIONS
// ============================================

const STATEMENT_SECTIONS = [
  {
    title: 'Speaker Information',
    types: ['*'],  // Show for all statement types
    fields: [
      { key: 'speaker_name', label: 'Speaker Name', type: 'text', required: true, quotable: true, verifiable: true },
      { key: 'speaker_title', label: 'Title/Role', type: 'text', placeholder: 'e.g., Senator, Actor, Immigration Attorney', quotable: true, verifiable: true },
      { key: 'speaker_organization', label: 'Organization', type: 'text', placeholder: 'e.g., ACLU, NBC News', quotable: true },
      { key: 'speaker_type', label: 'Speaker Type', type: 'select', options: SPEAKER_TYPE_OPTIONS, required: true },
      { key: 'political_affiliation', label: 'Political Affiliation', type: 'select', options: POLITICAL_AFFILIATION_OPTIONS },
      { key: 'wikipedia_url', label: 'Wikipedia URL', type: 'text', placeholder: 'For verification of identity' },
    ],
  },
  {
    title: 'Statement Context',
    types: ['*'],
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: PLATFORM_OPTIONS, verifiable: true },
      { key: 'platform_url', label: 'Direct Link', type: 'text', placeholder: 'Link to original statement', verifiable: true },
      { key: 'context', label: 'What Prompted This?', type: 'textarea', placeholder: 'What event or situation led to this statement?', quotable: true },
      { key: 'impact_level', label: 'Impact Level', type: 'select', options: IMPACT_LEVEL_OPTIONS },
      { key: 'media_coverage', label: 'Media Coverage', type: 'select', options: MEDIA_COVERAGE_OPTIONS },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all sections that should be shown for a given statement type
 */
function getStatementSectionsForType(statementType) {
  return STATEMENT_SECTIONS.filter(section => 
    section.types.includes('*') || section.types.includes(statementType)
  );
}

/**
 * Get all field keys for a statement type
 */
function getStatementFieldKeysForType(statementType) {
  const sections = getStatementSectionsForType(statementType);
  const keys = [];
  
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
function getQuotableStatementFields(statementType) {
  const sections = getStatementSectionsForType(statementType);
  const quotableFields = [];
  
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

/**
 * Generate HTML for a statement field with quote picker
 */
function renderStatementField(field, value, isReviewMode) {
  const fieldId = `field-${field.key}`;
  const quoteBtnId = `quote-btn-${field.key}`;
  let html = '';
  
  if (field.type === 'select') {
    html = `
      <div class="field-group" data-field="${field.key}">
        <label for="${fieldId}">${field.label}${field.required ? ' *' : ''}</label>
        <div class="field-with-actions">
          ${isReviewMode ? `<input type="checkbox" class="field-verify-checkbox" data-field="${field.key}">` : ''}
          <select id="${fieldId}" name="${field.key}" class="form-select" ${field.required ? 'required' : ''}>
            <option value="">Select...</option>
            ${field.options.map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
          </select>
          ${field.quotable ? `<button type="button" class="quote-link-btn" id="${quoteBtnId}" data-field="${field.key}">[src]</button>` : ''}
        </div>
      </div>
    `;
  } else if (field.type === 'checkbox') {
    html = `
      <div class="checkbox-item" data-field="${field.key}">
        ${isReviewMode ? `<input type="checkbox" class="field-verify-checkbox" data-field="${field.key}">` : ''}
        <input type="checkbox" id="${fieldId}" name="${field.key}" ${value ? 'checked' : ''}>
        <label for="${fieldId}">${field.label}</label>
        ${field.quotable ? `<button type="button" class="quote-link-btn small" id="${quoteBtnId}" data-field="${field.key}">[src]</button>` : ''}
      </div>
    `;
  } else if (field.type === 'textarea') {
    html = `
      <div class="field-group" data-field="${field.key}">
        <label for="${fieldId}">${field.label}${field.required ? ' *' : ''}</label>
        <div class="field-with-actions">
          ${isReviewMode ? `<input type="checkbox" class="field-verify-checkbox" data-field="${field.key}">` : ''}
          <textarea id="${fieldId}" name="${field.key}" class="form-textarea" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">${value || ''}</textarea>
          ${field.quotable ? `<button type="button" class="quote-link-btn" id="${quoteBtnId}" data-field="${field.key}">[src]</button>` : ''}
        </div>
      </div>
    `;
  } else if (field.type === 'date') {
    html = `
      <div class="field-group" data-field="${field.key}">
        <label for="${fieldId}">${field.label}${field.required ? ' *' : ''}</label>
        <div class="field-with-actions">
          ${isReviewMode ? `<input type="checkbox" class="field-verify-checkbox" data-field="${field.key}">` : ''}
          <input type="date" id="${fieldId}" name="${field.key}" class="form-input" ${field.required ? 'required' : ''} value="${value || ''}">
          ${field.quotable ? `<button type="button" class="quote-link-btn" id="${quoteBtnId}" data-field="${field.key}">[src]</button>` : ''}
        </div>
      </div>
    `;
  } else if (field.type === 'number') {
    html = `
      <div class="field-group" data-field="${field.key}">
        <label for="${fieldId}">${field.label}</label>
        <div class="field-with-actions">
          ${isReviewMode ? `<input type="checkbox" class="field-verify-checkbox" data-field="${field.key}">` : ''}
          <input type="number" id="${fieldId}" name="${field.key}" class="form-input" placeholder="${field.placeholder || ''}" value="${value || ''}">
          ${field.quotable ? `<button type="button" class="quote-link-btn" id="${quoteBtnId}" data-field="${field.key}">[src]</button>` : ''}
        </div>
      </div>
    `;
  } else {
    // Default text input
    html = `
      <div class="field-group" data-field="${field.key}">
        <label for="${fieldId}">${field.label}${field.required ? ' *' : ''}</label>
        <div class="field-with-actions">
          ${isReviewMode ? `<input type="checkbox" class="field-verify-checkbox" data-field="${field.key}">` : ''}
          <input type="text" id="${fieldId}" name="${field.key}" class="form-input" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" value="${value || ''}">
          ${field.quotable ? `<button type="button" class="quote-link-btn" id="${quoteBtnId}" data-field="${field.key}">[src]</button>` : ''}
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * Generate HTML for a statement section
 */
function renderStatementSection(section, values, isReviewMode) {
  const fieldsHtml = section.fields.map(field => 
    renderStatementField(field, values[field.key], isReviewMode)
  ).join('');
  
  return `
    <div class="form-section" data-section="${section.title}">
      <h3 class="section-title">${section.title}</h3>
      <div class="section-fields">
        ${fieldsHtml}
      </div>
    </div>
  `;
}

// ============================================
// EXPORT FOR EXTENSION
// ============================================

if (typeof window !== 'undefined') {
  window.StatementFields = {
    STATEMENT_TYPE_OPTIONS,
    SPEAKER_TYPE_OPTIONS,
    POLITICAL_AFFILIATION_OPTIONS,
    PLATFORM_OPTIONS,
    MEDIA_COVERAGE_OPTIONS,
    IMPACT_LEVEL_OPTIONS,
    STATEMENT_CORE_FIELDS,
    STATEMENT_SECTIONS,
    getStatementSectionsForType,
    getStatementFieldKeysForType,
    getQuotableStatementFields,
    renderStatementField,
    renderStatementSection,
  };
}
