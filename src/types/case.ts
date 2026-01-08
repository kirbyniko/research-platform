export interface Facility {
  name: string;
  state: string;
  type: 'ICE facility' | 'ICE-contracted jail' | 'Other';
}

export interface TimelineEvent {
  date: string;
  event: string;
  source?: Source;
}

export interface Discrepancy {
  ice_claim: string;
  ice_claim_source?: Source;
  counter_evidence: string;
  counter_evidence_source?: Source;
}

export interface Source {
  id?: number;
  title: string;
  publisher: string;
  date: string;
  url: string;
  quote?: string;
  quote_context?: string;
}

export interface Case {
  id: string;
  name: string;
  age: number;
  nationality: string;
  date_of_death: string;
  facility: Facility;
  custody_status: 'Detained' | 'Released' | 'Other';
  category: string[];
  official_cause_of_death: string;
  timeline: TimelineEvent[];
  discrepancies: Discrepancy[];
  sources: Source[];
  notes?: string;
  image_url?: string;
}

export interface CaseStats {
  totalDeaths: number;
  deathsThisYear: number;
  daysSinceLastDeath: number;
  facilitiesCount: number;
  statesCount: number;
}
