/**
 * STATEMENT TAGS - Preset categories for organizing public statements
 * 
 * These tags help categorize and filter statements by topic, 
 * speaker background, and statement characteristics.
 */

export const STATEMENT_TAGS = [
  // Topic/Subject Tags
  { id: 'family-separation', label: 'Family Separation', category: 'topic' },
  { id: 'detention-conditions', label: 'Detention Conditions', category: 'topic' },
  { id: 'deportation', label: 'Deportation', category: 'topic' },
  { id: 'border-enforcement', label: 'Border Enforcement', category: 'topic' },
  { id: 'workplace-raids', label: 'Workplace Raids', category: 'topic' },
  { id: 'racial-profiling', label: 'Racial Profiling', category: 'topic' },
  { id: 'legal-rights', label: 'Legal Rights', category: 'topic' },
  { id: 'medical-care', label: 'Medical Care Issues', category: 'topic' },
  { id: 'mental-health', label: 'Mental Health', category: 'topic' },
  
  // Speaker Background Tags
  { id: 'politician', label: 'Politician', category: 'speaker' },
  { id: 'religious-leader', label: 'Religious Leader', category: 'speaker' },
  { id: 'medical-professional', label: 'Medical Professional', category: 'speaker' },
  { id: 'legal-expert', label: 'Legal Expert', category: 'speaker' },
  { id: 'law-enforcement', label: 'Law Enforcement', category: 'speaker' },
  { id: 'immigrant-advocate', label: 'Immigrant Advocate', category: 'speaker' },
  { id: 'civil-rights-leader', label: 'Civil Rights Leader', category: 'speaker' },
  { id: 'business-leader', label: 'Business Leader', category: 'speaker' },
  { id: 'affected-person', label: 'Directly Affected Person', category: 'speaker' },
  
  // Statement Characteristic Tags
  { id: 'breaking-ranks', label: 'Breaking Ranks', category: 'characteristic' },
  { id: 'cross-party', label: 'Cross-Party Support', category: 'characteristic' },
  { id: 'first-hand-account', label: 'First-Hand Account', category: 'characteristic' },
  { id: 'emergency-response', label: 'Emergency Response', category: 'characteristic' },
  { id: 'viral', label: 'Viral/High-Impact', category: 'characteristic' },
  
  // Moral/Values Tags
  { id: 'humanitarian', label: 'Humanitarian Concern', category: 'values' },
  { id: 'religious-moral', label: 'Religious/Moral Argument', category: 'values' },
  { id: 'economic', label: 'Economic Impact', category: 'values' },
  { id: 'constitutional', label: 'Constitutional Rights', category: 'values' },
  { id: 'human-dignity', label: 'Human Dignity', category: 'values' },
] as const;

export type StatementTag = typeof STATEMENT_TAGS[number]['id'];

export const STATEMENT_TAG_LABELS: Record<StatementTag, string> = STATEMENT_TAGS.reduce(
  (acc, tag) => ({ ...acc, [tag.id]: tag.label }),
  {} as Record<StatementTag, string>
);

export function getTagsByCategory(category: string) {
  return STATEMENT_TAGS.filter(tag => tag.category === category);
}

export function getTagLabel(tagId: string): string {
  return STATEMENT_TAG_LABELS[tagId as StatementTag] || tagId;
}
