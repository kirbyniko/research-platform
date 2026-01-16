/**
 * TYPE-SPECIFIC FIELD DEFINITIONS
 * 
 * This file defines which fields appear for each incident type.
 * Both the website and extension use these definitions.
 * 
 * SINGLE SOURCE OF TRUTH for form field layouts.
 */

export interface FieldDefinition {
  key: string;          // Canonical field name (snake_case)
  label: string;        // Display label
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'multiselect';
  options?: { value: string; label: string }[];  // For select/multiselect
  placeholder?: string;
  quotable?: boolean;   // Can this field be linked to quotes?
  verifiable?: boolean; // Can this field be verified?
}

export interface TypeSection {
  title: string;
  types: string[];  // Which incident types trigger this section
  fields: FieldDefinition[];
}

// ============================================
// FIELD OPTIONS (shared between extension & web)
// ============================================

export const WEAPON_TYPE_OPTIONS = [
  { value: 'handgun', label: 'Handgun' },
  { value: 'rifle', label: 'Rifle' },
  { value: 'taser', label: 'Taser' },
  { value: 'less_lethal', label: 'Less-lethal' },
  { value: 'other', label: 'Other' },
];

export const MANNER_OF_DEATH_OPTIONS = [
  { value: 'natural', label: 'Natural' },
  { value: 'accident', label: 'Accident' },
  { value: 'suicide', label: 'Suicide' },
  { value: 'homicide', label: 'Homicide' },
  { value: 'undetermined', label: 'Undetermined' },
  { value: 'pending', label: 'Pending Investigation' },
];

export const INJURY_SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'life_threatening', label: 'Life Threatening' },
];

export const DISPERSAL_METHOD_OPTIONS = [
  { value: 'tear_gas', label: 'Tear Gas' },
  { value: 'pepper_spray', label: 'Pepper Spray' },
  { value: 'rubber_bullets', label: 'Rubber Bullets' },
  { value: 'batons', label: 'Batons' },
  { value: 'sound_cannons', label: 'Sound Cannons (LRAD)' },
  { value: 'mass_arrest', label: 'Mass Arrest' },
  { value: 'other', label: 'Other' },
];

export const FORCE_TYPE_OPTIONS = [
  { value: 'physical', label: 'Physical' },
  { value: 'taser', label: 'Taser' },
  { value: 'pepper_spray', label: 'Pepper Spray' },
  { value: 'baton', label: 'Baton' },
  { value: 'rubber_bullets', label: 'Rubber Bullets' },
  { value: 'chokehold', label: 'Chokehold' },
  { value: 'knee_on_neck', label: 'Knee on Neck' },
  { value: 'firearm', label: 'Firearm' },
];

// ============================================
// TYPE-SPECIFIC SECTIONS
// ============================================

export const TYPE_SECTIONS: TypeSection[] = [
  {
    title: 'Shooting Details',
    types: ['shooting'],
    fields: [
      { key: 'shooting_fatal', label: 'Fatal', type: 'checkbox' },
      { key: 'shots_fired', label: 'Shots Fired', type: 'number', quotable: true, verifiable: true },
      { key: 'weapon_type', label: 'Weapon Type', type: 'select', options: WEAPON_TYPE_OPTIONS, quotable: true, verifiable: true },
      { key: 'victim_armed', label: 'Victim Armed', type: 'checkbox' },
      { key: 'warning_given', label: 'Warning Given', type: 'checkbox' },
      { key: 'bodycam_available', label: 'Bodycam Available', type: 'checkbox' },
      { key: 'shooting_context', label: 'Context', type: 'textarea', quotable: true, verifiable: true },
    ],
  },
  {
    title: 'Death Details',
    types: ['death_in_custody', 'death_during_operation', 'death_at_protest', 'death', 'detention_death'],
    fields: [
      { key: 'cause_of_death', label: 'Cause of Death', type: 'text', quotable: true, verifiable: true },
      { key: 'official_cause', label: 'Official Cause', type: 'text', quotable: true, verifiable: true },
      { key: 'autopsy_available', label: 'Autopsy Available', type: 'checkbox' },
      { key: 'medical_neglect_alleged', label: 'Medical Neglect Alleged', type: 'checkbox' },
      { key: 'medical_requests_denied', label: 'Medical Requests Denied', type: 'checkbox' },
      { key: 'manner_of_death', label: 'Manner of Death', type: 'select', options: MANNER_OF_DEATH_OPTIONS },
      { key: 'custody_duration', label: 'Custody Duration', type: 'text', placeholder: 'e.g., 6 months, 2 weeks' },
      { key: 'circumstances', label: 'Circumstances', type: 'textarea', quotable: true, verifiable: true },
    ],
  },
  {
    title: 'Arrest Details',
    types: ['arrest'],
    fields: [
      { key: 'arrest_reason', label: 'Arrest Reason', type: 'text', quotable: true, verifiable: true },
      { key: 'arrest_charges', label: 'Charges', type: 'text', quotable: true, verifiable: true },
      { key: 'warrant_present', label: 'Warrant Present', type: 'checkbox' },
      { key: 'selective_enforcement', label: 'Selective Enforcement', type: 'checkbox' },
      { key: 'timing_suspicious', label: 'Timing Suspicious', type: 'checkbox' },
      { key: 'pretext_arrest', label: 'Pretext Arrest', type: 'checkbox' },
      { key: 'arrest_context', label: 'Context', type: 'textarea', quotable: true, verifiable: true },
    ],
  },
  {
    title: 'Excessive Force / Injury Details',
    types: ['excessive_force', 'injury'],
    fields: [
      { key: 'force_types', label: 'Force Types Used', type: 'multiselect', options: FORCE_TYPE_OPTIONS },
      { key: 'injuries_sustained', label: 'Injuries Sustained', type: 'text', quotable: true, verifiable: true },
      { key: 'victim_restrained', label: 'Victim Restrained', type: 'checkbox' },
      { key: 'victim_complying', label: 'Victim Complying', type: 'checkbox' },
      { key: 'video_evidence', label: 'Video Evidence Available', type: 'checkbox' },
      { key: 'hospitalization_required', label: 'Hospitalization Required', type: 'checkbox' },
    ],
  },
  {
    title: 'Injury Specifics',
    types: ['injury'],
    fields: [
      { key: 'injury_type', label: 'Injury Type', type: 'text', placeholder: 'e.g., Broken wrist, taser burns', quotable: true, verifiable: true },
      { key: 'injury_severity', label: 'Injury Severity', type: 'select', options: INJURY_SEVERITY_OPTIONS, quotable: true, verifiable: true },
      { key: 'injury_weapon', label: 'Weapon Used', type: 'text', placeholder: 'e.g., Taser, baton', quotable: true },
      { key: 'injury_cause', label: 'Cause/Context', type: 'text', placeholder: 'e.g., During arrest', quotable: true },
    ],
  },
  {
    title: 'Medical Neglect Details',
    types: ['medical_neglect'],
    fields: [
      { key: 'medical_condition', label: 'Medical Condition', type: 'text', quotable: true, verifiable: true },
      { key: 'treatment_denied', label: 'Treatment Denied', type: 'textarea', quotable: true, verifiable: true },
      { key: 'requests_documented', label: 'Requests Documented', type: 'checkbox' },
      { key: 'resulted_in_death', label: 'Resulted in Death', type: 'checkbox' },
    ],
  },
  {
    title: 'Protest Suppression Details',
    types: ['protest_suppression'],
    fields: [
      { key: 'protest_topic', label: 'Protest Topic', type: 'text', quotable: true, verifiable: true },
      { key: 'protest_size', label: 'Protest Size', type: 'text', placeholder: 'e.g., 50-100' },
      { key: 'permitted', label: 'Permit Obtained', type: 'checkbox' },
      { key: 'dispersal_method', label: 'Dispersal Method', type: 'select', options: DISPERSAL_METHOD_OPTIONS, quotable: true, verifiable: true },
      { key: 'arrests_made', label: 'Arrests Made', type: 'number' },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all sections that should be shown for given incident types
 */
export function getSectionsForTypes(selectedTypes: string[]): TypeSection[] {
  return TYPE_SECTIONS.filter(section => 
    section.types.some(t => selectedTypes.includes(t))
  );
}

/**
 * Get all field keys for given incident types
 */
export function getFieldKeysForTypes(selectedTypes: string[]): string[] {
  const sections = getSectionsForTypes(selectedTypes);
  const keys: string[] = [];
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
 * Check if a specific section should be shown
 */
export function shouldShowSection(sectionTitle: string, selectedTypes: string[]): boolean {
  const section = TYPE_SECTIONS.find(s => s.title === sectionTitle);
  if (!section) return false;
  return section.types.some(t => selectedTypes.includes(t));
}

/**
 * Get field definition by key
 */
export function getFieldDefinition(key: string): FieldDefinition | undefined {
  for (const section of TYPE_SECTIONS) {
    const field = section.fields.find(f => f.key === key);
    if (field) return field;
  }
  return undefined;
}
