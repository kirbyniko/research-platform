/**
 * FIELD REGISTRY - Single Source of Truth (Extension Version)
 * 
 * This is a JavaScript port of src/lib/field-registry.ts
 * Keep these files in sync!
 * 
 * Usage:
 *   const value = getFieldValue(data, 'arrest_reason');  // Checks all aliases
 *   const normalized = normalizeFieldNames(apiResponse);  // Normalize all keys
 */

const FIELD_REGISTRY = [
  // ============================================
  // CORE FIELDS
  // ============================================
  { canonical: 'incident_type', aliases: ['incidentType', 'type'] },
  { canonical: 'incident_types', aliases: ['incidentTypes', 'types'] },
  { canonical: 'victim_name', aliases: ['victimName', 'name'] },
  { canonical: 'subject_name', aliases: ['subjectName'] },
  { canonical: 'incident_date', aliases: ['incidentDate', 'date', 'dateOfDeath'] },
  { canonical: 'subject_age', aliases: ['subjectAge', 'age'] },
  { canonical: 'subject_gender', aliases: ['subjectGender', 'gender'] },
  { canonical: 'subject_nationality', aliases: ['subjectNationality', 'nationality', 'country'] },
  { canonical: 'subject_immigration_status', aliases: ['subjectImmigrationStatus', 'immigration_status', 'immigrationStatus'] },
  { canonical: 'city', aliases: [] },
  { canonical: 'state', aliases: [] },
  { canonical: 'facility', aliases: ['facilityName'] },
  { canonical: 'summary', aliases: ['description'] },
  { canonical: 'tags', aliases: [] },

  // ============================================
  // DEATH FIELDS
  // ============================================
  { canonical: 'cause_of_death', aliases: ['causeOfDeath', 'deathCause'] },
  { canonical: 'official_cause', aliases: ['officialCause', 'official_cause_of_death'] },
  { canonical: 'manner_of_death', aliases: ['mannerOfDeath', 'deathManner'] },
  { canonical: 'custody_duration', aliases: ['custodyDuration', 'deathCustodyDuration'] },
  { canonical: 'circumstances', aliases: ['death_circumstances', 'deathCircumstances'] },
  { canonical: 'autopsy_available', aliases: ['autopsyAvailable', 'autopsy_performed', 'autopsyPerformed'] },
  { canonical: 'medical_requests_denied', aliases: ['medicalRequestsDenied', 'deathMedicalDenied', 'medical_care_denied'] },
  { canonical: 'medical_neglect_alleged', aliases: ['medicalNeglectAlleged'] },

  // ============================================
  // SHOOTING FIELDS
  // ============================================
  { canonical: 'shooting_fatal', aliases: ['shootingFatal', 'fatal'] },
  { canonical: 'shots_fired', aliases: ['shotsFired'] },
  { canonical: 'weapon_type', aliases: ['weaponType'] },
  { canonical: 'bodycam_available', aliases: ['bodycamAvailable'] },
  { canonical: 'victim_armed', aliases: ['victimArmed'] },
  { canonical: 'warning_given', aliases: ['warningGiven'] },
  { canonical: 'shooting_context', aliases: ['shootingContext', 'context'] },

  // ============================================
  // EXCESSIVE FORCE FIELDS
  // ============================================
  { canonical: 'force_types', aliases: ['forceTypes', 'force_type'] },
  { canonical: 'victim_restrained', aliases: ['victimRestrained'] },
  { canonical: 'victim_complying', aliases: ['victimComplying'] },
  { canonical: 'video_evidence', aliases: ['videoEvidence'] },
  { canonical: 'injuries_sustained', aliases: ['injuriesSustained'] },
  { canonical: 'hospitalization_required', aliases: ['hospitalizationRequired'] },

  // ============================================
  // INJURY FIELDS
  // ============================================
  { canonical: 'injury_type', aliases: ['injuryType'] },
  { canonical: 'injury_severity', aliases: ['injurySeverity', 'severity'] },
  { canonical: 'injury_weapon', aliases: ['injuryWeapon', 'weapon_used'] },
  { canonical: 'injury_cause', aliases: ['injuryCause', 'cause'] },

  // ============================================
  // ARREST FIELDS
  // ============================================
  { canonical: 'arrest_reason', aliases: ['arrestReason', 'stated_reason'] },
  { canonical: 'arrest_context', aliases: ['arrestContext', 'actual_context'] },
  { canonical: 'arrest_charges', aliases: ['arrestCharges', 'charges'] },
  { canonical: 'timing_suspicious', aliases: ['timingSuspicious', 'arrestTimingSuspicious', 'arrest_timing_suspicious'] },
  { canonical: 'pretext_arrest', aliases: ['pretextArrest', 'arrestPretext', 'arrest_pretext'] },
  { canonical: 'selective_enforcement', aliases: ['selectiveEnforcement', 'arrestSelective', 'arrest_selective'] },

  // ============================================
  // MEDICAL NEGLECT FIELDS
  // ============================================
  { canonical: 'medical_condition', aliases: ['medicalCondition'] },
  { canonical: 'treatment_denied', aliases: ['treatmentDenied'] },
  { canonical: 'requests_documented', aliases: ['requestsDocumented'] },
  { canonical: 'resulted_in_death', aliases: ['resultedInDeath'] },

  // ============================================
  // PROTEST FIELDS
  // ============================================
  { canonical: 'protest_topic', aliases: ['protestTopic'] },
  { canonical: 'protest_size', aliases: ['protestSize'] },
  { canonical: 'permitted', aliases: ['protestPermitted', 'protest_permitted'] },
  { canonical: 'dispersal_method', aliases: ['dispersalMethod'] },
  { canonical: 'arrests_made', aliases: ['arrestsMade'] },

  // ============================================
  // VIOLATION FIELDS
  // ============================================
  { canonical: 'violation_journalism', aliases: ['violationJournalism', 'journalism_related'] },
  { canonical: 'violation_protest', aliases: ['violationProtest', 'protest_related'] },
  { canonical: 'violation_activism', aliases: ['violationActivism', 'activism_related'] },
  { canonical: 'violation_speech', aliases: ['violationSpeech', 'speech_content'] },
  { canonical: 'violation_ruling', aliases: ['violationRuling', 'court_ruling'] },
];

// Build lookup maps
const nameToCanonical = new Map();
const canonicalToDefinition = new Map();

for (const field of FIELD_REGISTRY) {
  canonicalToDefinition.set(field.canonical, field);
  nameToCanonical.set(field.canonical, field.canonical);
  for (const alias of field.aliases) {
    nameToCanonical.set(alias, field.canonical);
  }
}

/**
 * Get the canonical name for any field name
 */
function getCanonicalName(name) {
  return nameToCanonical.get(name) || name;
}

/**
 * Get field definition by any name
 */
function getFieldDefinition(name) {
  const canonical = getCanonicalName(name);
  return canonicalToDefinition.get(canonical);
}

/**
 * Get a value from an object, checking canonical name AND all aliases
 * This is THE key function for reading data reliably
 * 
 * @param {Object} obj - The object to read from
 * @param {string} fieldName - Any known name for the field
 * @param {*} defaultValue - Value to return if not found
 * @returns {*} The field value or default
 */
function getFieldValue(obj, fieldName, defaultValue = undefined) {
  if (!obj) return defaultValue;
  
  const definition = getFieldDefinition(fieldName);
  if (!definition) {
    // Unknown field, just try direct access
    return obj[fieldName] !== undefined ? obj[fieldName] : defaultValue;
  }
  
  // Check canonical name first
  if (obj[definition.canonical] !== undefined && obj[definition.canonical] !== null && obj[definition.canonical] !== '') {
    return obj[definition.canonical];
  }
  
  // Check all aliases
  for (const alias of definition.aliases) {
    if (obj[alias] !== undefined && obj[alias] !== null && obj[alias] !== '') {
      return obj[alias];
    }
  }
  
  return defaultValue;
}

/**
 * Normalize an object's keys to canonical names
 * Use when receiving data from API or database
 */
function normalizeFieldNames(obj) {
  if (!obj) return {};
  
  const result = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const canonicalKey = getCanonicalName(key);
    
    // Don't overwrite existing canonical key with empty value
    if (canonicalKey in result && (value === null || value === undefined || value === '')) {
      continue;
    }
    
    result[canonicalKey] = value;
  }
  
  return result;
}

/**
 * Convert snake_case keys to camelCase
 */
function toCamelCase(obj) {
  if (!obj) return {};
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const canonical = getCanonicalName(key);
    const camelKey = canonical.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

/**
 * Convert camelCase keys to snake_case (canonical)
 */
function toSnakeCase(obj) {
  if (!obj) return {};
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const canonical = getCanonicalName(key);
    result[canonical] = value;
  }
  return result;
}

// Export for use in sidepanel.js
// In the extension, these will be available as global functions
if (typeof window !== 'undefined') {
  window.FieldRegistry = {
    FIELD_REGISTRY,
    getCanonicalName,
    getFieldDefinition,
    getFieldValue,
    normalizeFieldNames,
    toCamelCase,
    toSnakeCase
  };
}
