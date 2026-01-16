/**
 * Auto-tagging logic for incidents
 * Generates suggested tags based on incident data (type, summary, quotes, etc.)
 * Tags help analysts quickly understand case nature and filter by violation patterns
 */

export interface TagSuggestion {
  tag: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Generate tag suggestions for an incident
 * Returns array of tag suggestions with confidence levels
 */
export function generateTags(incident: {
  incident_type?: string;
  summary?: string;
  quotes?: Array<{ quote_text: string; category?: string }>;
  violations?: Array<{ violation_type: string; description?: string }>;
  agencies?: Array<{ agency: string }>;
  incident_details?: Record<string, any>;
  subject_age?: number;
  facility?: string;
}): string[] {
  const tags = new Set<string>();
  const summary = (incident.summary || '').toLowerCase();
  const allText = summary + ' ' + (incident.quotes || []).map(q => q.quote_text.toLowerCase()).join(' ');

  // Incident type-based tags
  if (incident.incident_type) {
    const typeMap: Record<string, string[]> = {
      'detention_death': ['Death in Custody'],
      'death_in_custody': ['Death in Custody'],
      'death_during_operation': ['Death During Enforcement'],
      'shooting': ['Use of Force', 'Shooting'],
      'excessive_force': ['Use of Force', 'Police Brutality'],
      'injury': ['Physical Harm'],
      'assault': ['Physical Harm', 'Use of Force'],
      'medical_neglect': ['Medical Neglect', 'Healthcare Denial'],
      'wrongful_detention': ['False Imprisonment', 'Due Process Violation'],
      'wrongful_arrest': ['False Imprisonment', 'Due Process Violation'],
      'deportation': ['Deportation'],
      'wrongful_deportation': ['Deportation', 'Due Process Violation'],
      'family_separation': ['Family Separation'],
      'workplace_raid': ['Workplace Enforcement'],
      'rights_violation': ['Constitutional Rights'],
      'protest_suppression': ['First Amendment', 'Protest'],
      'detention_abuse': ['Cruel Treatment', 'Conditions of Confinement'],
      'retaliation': ['Retaliation'],
    };
    
    const typeTags = typeMap[incident.incident_type] || [];
    typeTags.forEach(tag => tags.add(tag));
  }

  // Violation-based tags
  if (incident.violations) {
    const violationMap: Record<string, string> = {
      '4th_amendment': 'Fourth Amendment',
      '5th_amendment_due_process': 'Due Process Violation',
      '8th_amendment': 'Cruel & Unusual Punishment',
      '14th_amendment_equal_protection': 'Equal Protection Violation',
      '1st_amendment': 'First Amendment',
      'medical_neglect': 'Medical Neglect',
      'excessive_force': 'Use of Force',
      'false_imprisonment': 'False Imprisonment',
    };
    
    incident.violations.forEach(v => {
      const tag = violationMap[v.violation_type];
      if (tag) tags.add(tag);
    });
  }

  // Agency-based context
  if (incident.agencies) {
    const hasICE = incident.agencies.some(a => a.agency === 'ice' || a.agency === 'ice_ere');
    const hasCBP = incident.agencies.some(a => a.agency === 'cbp' || a.agency === 'border_patrol');
    const hasLocal = incident.agencies.some(a => a.agency.includes('police'));
    
    if (hasICE && hasLocal) tags.add('Joint Operation');
  }

  // Text-based pattern detection
  const patterns: Record<string, string[]> = {
    // Medical issues
    'Medical Neglect': ['medical neglect', 'denied treatment', 'refused medical', 'no medical care', 'delayed treatment', 'untreated condition'],
    'Mental Health Crisis': ['mental health', 'suicide', 'self-harm', 'psychiatric', 'mental illness', 'psychological'],
    'COVID-19': ['covid', 'coronavirus', 'pandemic'],
    
    // Manner of death/harm
    'Suicide': ['suicide', 'took his own life', 'took her own life', 'self-inflicted'],
    'Shooting': ['shot', 'gunshot', 'fired', 'shooting'],
    'Cardiac Event': ['heart attack', 'cardiac', 'heart failure'],
    'Respiratory Illness': ['pneumonia', 'respiratory', 'breathing', 'asthma', 'lung'],
    
    // Vulnerable populations
    'Asylum Seeker': ['asylum', 'asylum seeker', 'refugee'],
    'DACA Recipient': ['daca', 'dreamer'],
    'Elderly': ['elderly', 'senior'],
    'Minor': ['minor', 'child', 'juvenile', 'teenager'],
    
    // Systemic issues
    'Prolonged Detention': ['years in detention', 'months in detention', 'prolonged detention', 'lengthy detention'],
    'Communication Denied': ['family could not reach', 'denied access to family', 'no communication', 'isolated from family'],
    'Rapid Deterioration': ['rapidly deteriorated', 'sudden decline', 'died within days', 'died within hours'],
    'Delayed Response': ['delayed', 'slow response', 'hours before treatment'],
    
    // Specific circumstances
    'In Transit': ['during transport', 'while being transferred', 'in transit', 'en route'],
    'Bystander Victim': ['bystander', 'not a target', 'innocent', 'community member'],
    'Journalist': ['journalist', 'reporter', 'press'],
    'Legal Observer': ['legal observer', 'documenting'],
    'Protest-Related': ['protest', 'demonstration', 'rally'],
    
    // Facility conditions
    'Overcrowding': ['overcrowded', 'overcrowding'],
    'Solitary Confinement': ['solitary', 'isolation cell'],
    
    // Judge/Court mentions
    'Judicial Finding': ['judge found', 'court ruled', 'unnecessarily cruel', 'unconstitutional conditions'],
  };

  for (const [tag, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => allText.includes(keyword))) {
      tags.add(tag);
    }
  }

  // Age-based tags
  if (incident.subject_age !== undefined && incident.subject_age !== null) {
    if (incident.subject_age < 18) tags.add('Minor');
    if (incident.subject_age >= 65) tags.add('Elderly');
  }

  // Detail-specific tags (from incident_details)
  if (incident.incident_details) {
    const details = incident.incident_details;
    
    if (details.cause_of_death) {
      const cod = String(details.cause_of_death).toLowerCase();
      if (cod.includes('suicide')) tags.add('Suicide');
      if (cod.includes('heart') || cod.includes('cardiac')) tags.add('Cardiac Event');
      if (cod.includes('pneumonia') || cod.includes('respiratory')) tags.add('Respiratory Illness');
    }
    
    if (details.shots_fired || details.weapon_type) tags.add('Shooting');
  }

  return Array.from(tags).sort();
}

/**
 * Validate tags - ensure they follow naming conventions
 */
export function validateTag(tag: string): boolean {
  // Tags should be title case, alphanumeric + spaces/hyphens/ampersands
  return /^[A-Z][a-zA-Z0-9\s\-&\/]+$/.test(tag);
}

/**
 * Get all predefined tag options for UI
 */
export function getAllPredefinedTags(): string[] {
  return [
    // Incident nature
    'Death in Custody',
    'Death During Enforcement',
    'Use of Force',
    'Shooting',
    'Police Brutality',
    'Physical Harm',
    'False Imprisonment',
    'Deportation',
    'Family Separation',
    'Workplace Enforcement',
    
    // Constitutional violations
    'Constitutional Rights',
    'First Amendment',
    'Fourth Amendment',
    'Due Process Violation',
    'Equal Protection Violation',
    'Cruel & Unusual Punishment',
    
    // Medical issues
    'Medical Neglect',
    'Healthcare Denial',
    'Mental Health Crisis',
    'COVID-19',
    'Suicide',
    'Cardiac Event',
    'Respiratory Illness',
    
    // Vulnerable populations
    'Asylum Seeker',
    'DACA Recipient',
    'Elderly',
    'Minor',
    
    // Systemic issues
    'Prolonged Detention',
    'Communication Denied',
    'Rapid Deterioration',
    'Delayed Response',
    'Cruel Treatment',
    'Conditions of Confinement',
    'Retaliation',
    
    // Specific circumstances
    'In Transit',
    'Bystander Victim',
    'Journalist',
    'Legal Observer',
    'Protest',
    'Protest-Related',
    'Joint Operation',
    
    // Facility conditions
    'Overcrowding',
    'Solitary Confinement',
    
    // Court/Legal
    'Judicial Finding',
  ].sort();
}
