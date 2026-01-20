/**
 * FIELD REGISTRY - Single Source of Truth
 * 
 * This file defines ALL incident fields with their canonical names and aliases.
 * Both the extension and website MUST use this to ensure consistency.
 * 
 * RULES:
 * 1. The canonical name is snake_case (for database storage)
 * 2. Aliases include camelCase and any historical/alternate names
 * 3. When reading data, normalize to canonical names
 * 4. When displaying, use the label
 */

export interface FieldDefinition {
  canonical: string;           // The one true name (snake_case, used in DB)
  aliases: string[];           // All other names this field has been called
  label: string;               // Human-readable label for UI
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'date' | 'array';
  category: 'core' | 'death' | 'shooting' | 'excessive_force' | 'injury' | 'arrest' | 'violation' | 'protest' | 'deportation' | 'family_separation' | 'workplace_raid' | 'medical_neglect' | 'retaliation';
  options?: string[];          // For select/multiselect fields
  required?: boolean;
}

/**
 * THE MASTER FIELD REGISTRY
 * Add new fields here. NEVER create ad-hoc field names elsewhere.
 */
export const FIELD_REGISTRY: FieldDefinition[] = [
  // ============================================
  // CORE FIELDS (apply to all incident types)
  // ============================================
  {
    canonical: 'incident_type',
    aliases: ['incidentType', 'type'],
    label: 'Incident Type',
    type: 'select',
    category: 'core',
    required: true,
  },
  {
    canonical: 'incident_types',
    aliases: ['incidentTypes', 'types'],
    label: 'Incident Types',
    type: 'multiselect',
    category: 'core',
  },
  {
    canonical: 'victim_name',
    aliases: ['victimName', 'name'],
    label: 'Victim Name (Last, First)',
    type: 'text',
    category: 'core',
  },
  {
    canonical: 'subject_name',
    aliases: ['subjectName'],
    label: 'Subject Name (First Last)',
    type: 'text',
    category: 'core',
  },
  {
    canonical: 'incident_date',
    aliases: ['incidentDate', 'date', 'dateOfDeath'],
    label: 'Incident Date',
    type: 'date',
    category: 'core',
    required: true,
  },
  {
    canonical: 'subject_age',
    aliases: ['subjectAge', 'age'],
    label: 'Age',
    type: 'number',
    category: 'core',
  },
  {
    canonical: 'subject_gender',
    aliases: ['subjectGender', 'gender'],
    label: 'Gender',
    type: 'select',
    category: 'core',
    options: ['male', 'female', 'non_binary', 'unknown'],
  },
  {
    canonical: 'subject_nationality',
    aliases: ['subjectNationality', 'nationality', 'country'],
    label: 'Nationality',
    type: 'text',
    category: 'core',
  },
  {
    canonical: 'subject_immigration_status',
    aliases: ['subjectImmigrationStatus', 'immigration_status', 'immigrationStatus'],
    label: 'Immigration Status',
    type: 'text',
    category: 'core',
  },
  {
    canonical: 'city',
    aliases: [],
    label: 'City',
    type: 'text',
    category: 'core',
  },
  {
    canonical: 'state',
    aliases: [],
    label: 'State',
    type: 'text',
    category: 'core',
  },
  {
    canonical: 'facility',
    aliases: ['facilityName'],
    label: 'Facility',
    type: 'text',
    category: 'core',
  },
  {
    canonical: 'summary',
    aliases: ['description'],
    label: 'Summary',
    type: 'textarea',
    category: 'core',
  },
  {
    canonical: 'tags',
    aliases: [],
    label: 'Tags',
    type: 'array',
    category: 'core',
  },

  // ============================================
  // DEATH FIELDS
  // ============================================
  {
    canonical: 'cause_of_death',
    aliases: ['causeOfDeath', 'deathCause'],
    label: 'Cause of Death',
    type: 'text',
    category: 'death',
  },
  {
    canonical: 'official_cause',
    aliases: ['officialCause', 'official_cause_of_death'],
    label: 'Official Cause of Death',
    type: 'text',
    category: 'death',
  },
  {
    canonical: 'manner_of_death',
    aliases: ['mannerOfDeath', 'deathManner'],
    label: 'Manner of Death',
    type: 'select',
    category: 'death',
    options: ['natural', 'accident', 'suicide', 'homicide', 'undetermined', 'pending'],
  },
  {
    canonical: 'custody_duration',
    aliases: ['custodyDuration', 'deathCustodyDuration'],
    label: 'Custody Duration',
    type: 'text',
    category: 'death',
  },
  {
    canonical: 'circumstances',
    aliases: ['death_circumstances', 'deathCircumstances'],
    label: 'Circumstances',
    type: 'textarea',
    category: 'death',
  },
  {
    canonical: 'autopsy_available',
    aliases: ['autopsyAvailable', 'autopsy_performed', 'autopsyPerformed'],
    label: 'Autopsy Available',
    type: 'boolean',
    category: 'death',
  },
  {
    canonical: 'medical_requests_denied',
    aliases: ['medicalRequestsDenied', 'deathMedicalDenied', 'medical_care_denied'],
    label: 'Medical Requests Denied',
    type: 'boolean',
    category: 'death',
  },
  {
    canonical: 'medical_neglect_alleged',
    aliases: ['medicalNeglectAlleged'],
    label: 'Medical Neglect Alleged',
    type: 'boolean',
    category: 'death',
  },

  // ============================================
  // SHOOTING FIELDS
  // ============================================
  {
    canonical: 'shooting_fatal',
    aliases: ['shootingFatal', 'fatal'],
    label: 'Fatal Shooting',
    type: 'boolean',
    category: 'shooting',
  },
  {
    canonical: 'shots_fired',
    aliases: ['shotsFired'],
    label: 'Shots Fired',
    type: 'number',
    category: 'shooting',
  },
  {
    canonical: 'weapon_type',
    aliases: ['weaponType'],
    label: 'Weapon Type',
    type: 'select',
    category: 'shooting',
    options: ['handgun', 'rifle', 'taser', 'less_lethal', 'other'],
  },
  {
    canonical: 'bodycam_available',
    aliases: ['bodycamAvailable'],
    label: 'Bodycam Available',
    type: 'boolean',
    category: 'shooting',
  },
  {
    canonical: 'victim_armed',
    aliases: ['victimArmed'],
    label: 'Victim Armed',
    type: 'boolean',
    category: 'shooting',
  },
  {
    canonical: 'warning_given',
    aliases: ['warningGiven'],
    label: 'Warning Given',
    type: 'boolean',
    category: 'shooting',
  },
  {
    canonical: 'shooting_context',
    aliases: ['shootingContext', 'context'],
    label: 'Context',
    type: 'textarea',
    category: 'shooting',
  },

  // ============================================
  // EXCESSIVE FORCE FIELDS
  // ============================================
  {
    canonical: 'force_types',
    aliases: ['forceTypes', 'force_type'],
    label: 'Force Types Used',
    type: 'multiselect',
    category: 'excessive_force',
    options: ['physical', 'taser', 'pepper_spray', 'baton', 'rubber_bullets', 'chokehold', 'knee_on_neck', 'firearm'],
  },
  {
    canonical: 'victim_restrained',
    aliases: ['victimRestrained'],
    label: 'Victim Restrained',
    type: 'boolean',
    category: 'excessive_force',
  },
  {
    canonical: 'victim_complying',
    aliases: ['victimComplying'],
    label: 'Victim Complying',
    type: 'boolean',
    category: 'excessive_force',
  },
  {
    canonical: 'video_evidence',
    aliases: ['videoEvidence'],
    label: 'Video Evidence Available',
    type: 'boolean',
    category: 'excessive_force',
  },
  {
    canonical: 'injuries_sustained',
    aliases: ['injuriesSustained'],
    label: 'Injuries Sustained',
    type: 'text',
    category: 'excessive_force',
  },
  {
    canonical: 'hospitalization_required',
    aliases: ['hospitalizationRequired'],
    label: 'Hospitalization Required',
    type: 'boolean',
    category: 'excessive_force',
  },

  // ============================================
  // INJURY FIELDS
  // ============================================
  {
    canonical: 'injury_type',
    aliases: ['injuryType'],
    label: 'Injury Type',
    type: 'text',
    category: 'injury',
  },
  {
    canonical: 'injury_severity',
    aliases: ['injurySeverity', 'severity'],
    label: 'Injury Severity',
    type: 'select',
    category: 'injury',
    options: ['minor', 'moderate', 'severe', 'life_threatening'],
  },
  {
    canonical: 'injury_weapon',
    aliases: ['injuryWeapon', 'weapon_used'],
    label: 'Weapon Used',
    type: 'text',
    category: 'injury',
  },
  {
    canonical: 'injury_cause',
    aliases: ['injuryCause', 'cause'],
    label: 'Cause/Context',
    type: 'text',
    category: 'injury',
  },

  // ============================================
  // ARREST FIELDS
  // ============================================
  {
    canonical: 'arrest_reason',
    aliases: ['arrestReason', 'stated_reason'],
    label: 'Arrest Reason',
    type: 'text',
    category: 'arrest',
  },
  {
    canonical: 'arrest_context',
    aliases: ['arrestContext', 'actual_context'],
    label: 'Arrest Context',
    type: 'textarea',
    category: 'arrest',
  },
  {
    canonical: 'arrest_charges',
    aliases: ['arrestCharges', 'charges'],
    label: 'Charges',
    type: 'text',
    category: 'arrest',
  },
  {
    canonical: 'timing_suspicious',
    aliases: ['timingSuspicious', 'arrestTimingSuspicious', 'arrest_timing_suspicious'],
    label: 'Timing Suspicious',
    type: 'boolean',
    category: 'arrest',
  },
  {
    canonical: 'pretext_arrest',
    aliases: ['pretextArrest', 'arrestPretext', 'arrest_pretext'],
    label: 'Pretext Arrest',
    type: 'boolean',
    category: 'arrest',
  },
  {
    canonical: 'selective_enforcement',
    aliases: ['selectiveEnforcement', 'arrestSelective', 'arrest_selective'],
    label: 'Selective Enforcement',
    type: 'boolean',
    category: 'arrest',
  },

  // ============================================
  // MEDICAL NEGLECT FIELDS
  // ============================================
  {
    canonical: 'medical_condition',
    aliases: ['medicalCondition'],
    label: 'Medical Condition',
    type: 'text',
    category: 'medical_neglect',
  },
  {
    canonical: 'treatment_denied',
    aliases: ['treatmentDenied'],
    label: 'Treatment Denied',
    type: 'textarea',
    category: 'medical_neglect',
  },
  {
    canonical: 'requests_documented',
    aliases: ['requestsDocumented'],
    label: 'Requests Documented',
    type: 'boolean',
    category: 'medical_neglect',
  },
  {
    canonical: 'resulted_in_death',
    aliases: ['resultedInDeath'],
    label: 'Resulted in Death',
    type: 'boolean',
    category: 'medical_neglect',
  },

  // ============================================
  // PROTEST FIELDS
  // ============================================
  {
    canonical: 'protest_topic',
    aliases: ['protestTopic'],
    label: 'Protest Topic',
    type: 'text',
    category: 'protest',
  },
  {
    canonical: 'protest_size',
    aliases: ['protestSize'],
    label: 'Protest Size',
    type: 'text',
    category: 'protest',
  },
  {
    canonical: 'permitted',
    aliases: ['protestPermitted', 'protest_permitted'],
    label: 'Permit Obtained',
    type: 'boolean',
    category: 'protest',
  },
  {
    canonical: 'dispersal_method',
    aliases: ['dispersalMethod'],
    label: 'Dispersal Methods',
    type: 'array',
    category: 'protest',
    options: ['tear_gas', 'pepper_spray', 'rubber_bullets', 'flashbang', 'batons', 'sound_cannons', 'water_cannon', 'mounted_police', 'mass_arrest', 'other'],
  },
  {
    canonical: 'arrests_made',
    aliases: ['arrestsMade'],
    label: 'Arrests Made',
    type: 'number',
    category: 'protest',
  },

  // ============================================
  // VIOLATION FIELDS
  // ============================================
  {
    canonical: 'violation_journalism',
    aliases: ['violationJournalism', 'journalism_related'],
    label: 'Journalism Related',
    type: 'boolean',
    category: 'violation',
  },
  {
    canonical: 'violation_protest',
    aliases: ['violationProtest', 'protest_related'],
    label: 'Protest Related',
    type: 'boolean',
    category: 'violation',
  },
  {
    canonical: 'violation_activism',
    aliases: ['violationActivism', 'activism_related'],
    label: 'Activism Related',
    type: 'boolean',
    category: 'violation',
  },
  {
    canonical: 'violation_speech',
    aliases: ['violationSpeech', 'speech_content'],
    label: 'Speech Content',
    type: 'textarea',
    category: 'violation',
  },
  {
    canonical: 'violation_ruling',
    aliases: ['violationRuling', 'court_ruling'],
    label: 'Court Ruling',
    type: 'text',
    category: 'violation',
  },
];

// ============================================
// BUILD LOOKUP MAPS FOR FAST ACCESS
// ============================================

// Map from any name (canonical or alias) to canonical name
const nameToCanonical = new Map<string, string>();

// Map from canonical name to field definition
const canonicalToDefinition = new Map<string, FieldDefinition>();

// Initialize the maps
for (const field of FIELD_REGISTRY) {
  canonicalToDefinition.set(field.canonical, field);
  nameToCanonical.set(field.canonical, field.canonical);
  for (const alias of field.aliases) {
    nameToCanonical.set(alias, field.canonical);
  }
}

/**
 * Get the canonical name for any field name (alias or canonical)
 * Returns the input if not found (for unknown fields)
 */
export function getCanonicalName(name: string): string {
  return nameToCanonical.get(name) || name;
}

/**
 * Get field definition by any name
 */
export function getFieldDefinition(name: string): FieldDefinition | undefined {
  const canonical = getCanonicalName(name);
  return canonicalToDefinition.get(canonical);
}

/**
 * Get all fields for a category
 */
export function getFieldsByCategory(category: FieldDefinition['category']): FieldDefinition[] {
  return FIELD_REGISTRY.filter(f => f.category === category);
}

/**
 * Normalize an object's keys to canonical names
 * This is THE KEY FUNCTION - use it when receiving data from any source
 */
export function normalizeFieldNames<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const canonicalKey = getCanonicalName(key);
    
    // If we already have this canonical key, don't overwrite with empty value
    if (canonicalKey in result && (value === null || value === undefined || value === '')) {
      continue;
    }
    
    result[canonicalKey] = value;
  }
  
  return result;
}

/**
 * Convert object keys to camelCase (for JavaScript code)
 */
export function toCamelCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // First normalize to canonical, then convert to camelCase
    const canonical = getCanonicalName(key);
    const camelKey = canonical.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  
  return result;
}

/**
 * Convert object keys to snake_case (for database)
 */
export function toSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // First normalize to canonical (which is already snake_case)
    const canonical = getCanonicalName(key);
    result[canonical] = value;
  }
  
  return result;
}

/**
 * Get a value from an object, checking all aliases
 * @param obj The object to read from
 * @param fieldName Any known name for the field
 * @param defaultValue Value to return if not found
 */
export function getFieldValue<T>(obj: Record<string, unknown>, fieldName: string, defaultValue?: T): T | undefined {
  const definition = getFieldDefinition(fieldName);
  if (!definition) {
    const val = obj[fieldName];
    return val !== undefined ? val as T : defaultValue;
  }
  
  // Check canonical name first
  if (obj[definition.canonical] !== undefined && obj[definition.canonical] !== null && obj[definition.canonical] !== '') {
    return obj[definition.canonical] as T;
  }
  
  // Check all aliases
  for (const alias of definition.aliases) {
    if (obj[alias] !== undefined && obj[alias] !== null && obj[alias] !== '') {
      return obj[alias] as T;
    }
  }
  
  return defaultValue;
}

/**
 * Generate the Extension's camelCase mapping object
 * Use this to update the extension's field mappings
 */
export function generateExtensionFieldMap(): Record<string, string> {
  const map: Record<string, string> = {};
  
  for (const field of FIELD_REGISTRY) {
    const camelCase = field.canonical.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    map[camelCase] = field.canonical;
    
    // Also add aliases
    for (const alias of field.aliases) {
      map[alias] = field.canonical;
    }
  }
  
  return map;
}

// Export for type checking
export type FieldCategory = FieldDefinition['category'];
export type FieldType = FieldDefinition['type'];
