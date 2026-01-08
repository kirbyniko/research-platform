# Incident Tracking Expansion Plan

## Overview

Expanding the documentation system from ICE deaths only to a comprehensive incident tracker covering:

1. **Deaths** - Fatalities in ICE custody (existing)
2. **Injuries** - Physical harm during ICE operations
3. **Rights Violations** - Constitutional/civil rights abuses
4. **Controversial Arrests** - Questionable detentions (ICE or adjacent)
5. **Policy Incidents** - Deportations, family separations, etc.

## Core Principles (Unchanged)

- ✅ Zero AI fabrication - AI classifies, never generates
- ✅ Human validation required - Every quote approved by researcher
- ✅ Exact quotes only - Text from source documents
- ✅ Source attribution - Every fact linked to URL/document
- ✅ Chronological accuracy - Dates verified from sources

---

## Data Model

### Incident Types

```typescript
type IncidentType = 
  | 'death'              // Fatality in custody
  | 'injury'             // Physical harm
  | 'medical_neglect'    // Denial of care
  | 'arrest'             // Questionable detention
  | 'deportation'        // Removal action
  | 'family_separation'  // Parent/child split
  | 'rights_violation'   // Constitutional issues
  | 'workplace_raid'     // ICE raid on business
  | 'other';

type ViolationType =
  | 'first_amendment'    // Speech, press, assembly
  | 'fourth_amendment'   // Search & seizure
  | 'fifth_amendment'    // Due process
  | 'eighth_amendment'   // Cruel & unusual
  | 'civil_rights'       // Discrimination
  | 'asylum_violation'   // Refugee law
  | 'other';

type AgencyInvolved =
  | 'ice'                // Immigration & Customs
  | 'cbp'                // Customs & Border Protection
  | 'ice_ere'            // Enforcement & Removal Ops
  | 'ice_hsi'            // Homeland Security Investigations
  | 'local_police'       // Local law enforcement
  | 'federal_marshals'   // US Marshals
  | 'dhs'                // Dept Homeland Security
  | 'other';
```

### Base Incident Schema

```typescript
interface Incident {
  // Identity
  id: string;                    // YYYY-MM-DD-lastname or YYYY-MM-DD-type-location
  incident_type: IncidentType;
  
  // When & Where
  date: string;                  // YYYY-MM-DD
  date_precision: 'exact' | 'month' | 'year' | 'approximate';
  location: {
    city?: string;
    state?: string;
    country: string;
    facility?: string;           // If in custody
    address?: string;            // Specific location
    coordinates?: [number, number];
  };
  
  // Who
  subject: {
    name?: string;               // May be anonymous
    name_public: boolean;        // Is name publicly reported?
    age?: number;
    gender?: string;
    nationality?: string;
    immigration_status?: string;
    occupation?: string;         // e.g., "journalist", "farmworker"
  };
  
  // What
  summary: string;               // Brief factual description
  agencies_involved: AgencyInvolved[];
  violations_alleged?: ViolationType[];
  
  // Outcome
  outcome?: {
    status: 'ongoing' | 'resolved' | 'unknown';
    legal_action?: string;
    settlement?: string;
    policy_change?: string;
  };
  
  // Metadata
  verified: boolean;
  verification_notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
```

### Death-Specific Fields (extends Incident)

```typescript
interface DeathIncident extends Incident {
  incident_type: 'death';
  
  death_details: {
    cause_of_death: string;
    cause_source: 'official' | 'family' | 'autopsy' | 'unknown';
    manner_of_death?: 'natural' | 'accident' | 'suicide' | 'homicide' | 'undetermined';
    custody_duration?: string;   // How long detained before death
    medical_care_timeline?: string;
  };
}
```

### Injury-Specific Fields

```typescript
interface InjuryIncident extends Incident {
  incident_type: 'injury';
  
  injury_details: {
    injury_type: string;         // "broken arm", "taser burns", etc.
    severity: 'minor' | 'moderate' | 'severe' | 'life_threatening';
    cause: string;               // "during arrest", "in custody", etc.
    medical_treatment?: string;
    permanent_damage?: boolean;
  };
}
```

### Rights Violation Fields

```typescript
interface RightsViolationIncident extends Incident {
  incident_type: 'rights_violation';
  
  violation_details: {
    violation_types: ViolationType[];
    constitutional_basis?: string;
    legal_precedent?: string;
    
    // For press/speech cases
    journalism_related?: boolean;
    speech_content?: string;     // What was said (quoted)
    
    // Legal response
    charges_filed?: string[];
    charges_dropped?: boolean;
    lawsuit_filed?: boolean;
    court_ruling?: string;
  };
}
```

### Arrest/Detention Fields

```typescript
interface ArrestIncident extends Incident {
  incident_type: 'arrest';
  
  arrest_details: {
    stated_reason: string;       // Official justification
    actual_context?: string;     // What really happened
    charges: string[];
    bail_amount?: string;
    detention_location?: string;
    release_date?: string;
    
    // Red flags
    timing_suspicious?: boolean; // e.g., right after criticism
    pretext_arrest?: boolean;    // Arrested for minor thing after other activity
    selective_enforcement?: boolean;
  };
}
```

---

## Database Schema

```sql
-- Main incidents table
CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  incident_id VARCHAR(100) UNIQUE NOT NULL,  -- YYYY-MM-DD-identifier
  incident_type VARCHAR(50) NOT NULL,
  
  -- Basic info
  incident_date DATE,
  date_precision VARCHAR(20) DEFAULT 'exact',
  
  -- Location
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'USA',
  facility VARCHAR(200),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Subject (person affected)
  subject_name VARCHAR(200),
  subject_name_public BOOLEAN DEFAULT false,
  subject_age INTEGER,
  subject_gender VARCHAR(50),
  subject_nationality VARCHAR(100),
  subject_immigration_status VARCHAR(100),
  subject_occupation VARCHAR(200),
  
  -- Description
  summary TEXT,
  
  -- Outcome
  outcome_status VARCHAR(50),
  legal_action TEXT,
  settlement TEXT,
  policy_change TEXT,
  
  -- Metadata
  verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- Agencies involved (many-to-many)
CREATE TABLE incident_agencies (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  agency VARCHAR(100) NOT NULL,
  role TEXT  -- "arresting agency", "custody", etc.
);

-- Violations alleged (many-to-many)
CREATE TABLE incident_violations (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  violation_type VARCHAR(100) NOT NULL,
  description TEXT,
  constitutional_basis TEXT
);

-- Type-specific details (JSON for flexibility)
CREATE TABLE incident_details (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  detail_type VARCHAR(50) NOT NULL,  -- 'death', 'injury', 'arrest', etc.
  details JSONB NOT NULL
);

-- Quotes (reuse existing structure)
CREATE TABLE incident_quotes (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  quote_text TEXT NOT NULL,
  category VARCHAR(50),  -- timeline, official, medical, legal, context
  source_id INTEGER REFERENCES incident_sources(id),
  page_number INTEGER,
  confidence DECIMAL(3,2),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sources
CREATE TABLE incident_sources (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  publication VARCHAR(200),
  author TEXT,
  published_date DATE,
  accessed_at TIMESTAMP DEFAULT NOW(),
  archived_url TEXT,  -- Wayback machine link
  source_type VARCHAR(50)  -- 'news', 'court_doc', 'official', 'social_media'
);

-- Timeline events
CREATE TABLE incident_timeline (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  event_date DATE,
  event_time TIME,
  description TEXT NOT NULL,
  source_id INTEGER REFERENCES incident_sources(id),
  quote_id INTEGER REFERENCES incident_quotes(id),
  sequence_order INTEGER
);

-- Index for fast searches
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_date ON incidents(incident_date);
CREATE INDEX idx_incidents_location ON incidents(state, city);
CREATE INDEX idx_incidents_subject ON incidents(subject_name);
```

---

## Extension UI Changes

### Tab Structure Update

```
┌─────────────────────────────────────────────┐
│ 📋 ICE Documentation Research               │
├─────────────────────────────────────────────┤
│ [Incident] [Extract] [Settings]             │
├─────────────────────────────────────────────┤
│                                             │
│  Incident Type: [Deaths ▼]                  │
│    ○ Death                                  │
│    ○ Injury                                 │
│    ○ Rights Violation                       │
│    ○ Arrest/Detention                       │
│    ○ Other                                  │
│                                             │
│  ─────────────────────────────────          │
│                                             │
│  📅 Date: [____-__-__]                      │
│  📍 Location: [City, State]                 │
│                                             │
│  👤 Subject                                 │
│     Name: [____________] ☐ Public           │
│     Age: [__]  Nationality: [______]        │
│                                             │
│  🏢 Agencies Involved                       │
│     ☑ ICE  ☐ CBP  ☐ Local Police           │
│     ☐ Federal Marshals  ☐ Other            │
│                                             │
│  ⚖️ Violations Alleged                      │
│     ☐ 1st Amendment  ☐ 4th Amendment        │
│     ☐ Due Process    ☐ Civil Rights         │
│                                             │
│  [Type-specific fields appear here]         │
│                                             │
├─────────────────────────────────────────────┤
│  💬 Quotes (12)  🔗 Sources (3)             │
├─────────────────────────────────────────────┤
│        [New Incident]  [Save]               │
└─────────────────────────────────────────────┘
```

### Dynamic Form Fields

When incident type changes, show relevant fields:

**Death:**
- Cause of death
- Manner of death
- Custody duration
- Medical care timeline

**Injury:**
- Injury type
- Severity (minor/moderate/severe)
- Cause of injury
- Medical treatment

**Rights Violation:**
- Violation types (checkboxes)
- Context (what they were doing)
- Charges filed
- Case outcome

**Arrest:**
- Stated reason
- Actual context
- Charges
- Pretext indicators

---

## Quote Categories (Expanded)

```typescript
const QUOTE_CATEGORIES = {
  // Existing
  timeline: 'Timeline Event',
  official: 'Official Statement',
  medical: 'Medical Information',
  legal: 'Legal/Immigration',
  context: 'Background Context',
  
  // New
  witness: 'Witness Account',
  victim: 'Victim Statement',
  family: 'Family Statement',
  lawyer: 'Attorney Statement',
  agency: 'Agency Response',
  court: 'Court Document',
  policy: 'Policy/Procedure',
};
```

---

## API Endpoints

```
# Incidents CRUD
POST   /api/incidents              # Create incident
GET    /api/incidents              # List with filters
GET    /api/incidents/:id          # Get single incident
PUT    /api/incidents/:id          # Update incident
DELETE /api/incidents/:id          # Delete incident

# Filtering
GET    /api/incidents?type=death&state=TX&year=2024
GET    /api/incidents?violation=first_amendment
GET    /api/incidents?agency=ice&verified=true

# Quotes
POST   /api/incidents/:id/quotes   # Add quote
GET    /api/incidents/:id/quotes   # List quotes
PUT    /api/incidents/:id/quotes/:qid
DELETE /api/incidents/:id/quotes/:qid

# Sources
POST   /api/incidents/:id/sources
GET    /api/incidents/:id/sources

# Timeline
POST   /api/incidents/:id/timeline
GET    /api/incidents/:id/timeline

# Search
GET    /api/search?q=journalist+arrest
GET    /api/search/advanced  (POST with complex filters)

# Export
GET    /api/incidents/:id/export?format=json
GET    /api/incidents/:id/export?format=md
GET    /api/export/all?type=rights_violation&format=csv
```

---

## Implementation Phases

### Phase 1: Data Model & Database (Week 1)
- [ ] Create new database tables
- [ ] Migration script from old `cases` table
- [ ] TypeScript types for all incident types
- [ ] Basic API routes (CRUD)

### Phase 2: Extension Form Overhaul (Week 2)
- [ ] Dynamic incident type selector
- [ ] Conditional field rendering
- [ ] Agency/violation checkboxes
- [ ] Update save logic for new schema

### Phase 3: Enhanced Classification (Week 3)
- [ ] Expand Ollama prompt for new categories
- [ ] Add violation detection heuristics
- [ ] "Pretext indicator" detection
- [ ] Timeline extraction improvements

### Phase 4: Search & Browse (Week 4)
- [ ] Advanced search filters
- [ ] Browse by incident type
- [ ] Map visualization (optional)
- [ ] Export improvements

---

## Example Incidents

### Death (Existing Type)
```json
{
  "incident_id": "2024-03-07-daniel",
  "incident_type": "death",
  "incident_date": "2024-03-07",
  "subject": {
    "name": "Daniel, [First Name]",
    "age": 45,
    "nationality": "Guatemala"
  },
  "location": {
    "facility": "Stewart Detention Center",
    "city": "Lumpkin",
    "state": "Georgia"
  },
  "agencies_involved": ["ice"],
  "death_details": {
    "cause_of_death": "Cardiac arrest",
    "custody_duration": "6 months"
  }
}
```

### Rights Violation (New Type)
```json
{
  "incident_id": "2025-01-08-journalist-roadway",
  "incident_type": "rights_violation",
  "incident_date": "2025-01-08",
  "subject": {
    "name": "[Reporter Name]",
    "name_public": true,
    "occupation": "Journalist"
  },
  "location": {
    "city": "[City]",
    "state": "[State]"
  },
  "agencies_involved": ["local_police"],
  "violations_alleged": ["first_amendment"],
  "violation_details": {
    "violation_types": ["first_amendment"],
    "journalism_related": true,
    "speech_content": "Criticism of administration policy",
    "charges_filed": ["Blocking roadway"],
    "timing_suspicious": true,
    "pretext_arrest": true
  },
  "summary": "Reporter arrested for 'blocking roadway' seconds after criticizing policy on air"
}
```

### ICE Injury (New Type)
```json
{
  "incident_id": "2025-01-05-raid-injury-chicago",
  "incident_type": "injury",
  "incident_date": "2025-01-05",
  "subject": {
    "name_public": false,
    "age": 34,
    "nationality": "Mexico"
  },
  "location": {
    "city": "Chicago",
    "state": "Illinois",
    "address": "[Workplace Address]"
  },
  "agencies_involved": ["ice_ere"],
  "injury_details": {
    "injury_type": "Broken wrist",
    "severity": "moderate",
    "cause": "Forced to ground during workplace raid",
    "medical_treatment": "Treated at hospital, released"
  }
}
```

---

## Naming Conventions

### Incident IDs

Format: `YYYY-MM-DD-identifier`

- Deaths: `2024-03-07-lastname`
- Injuries: `2025-01-05-injury-city`
- Arrests: `2025-01-08-arrest-occupation-city`
- Violations: `2025-01-08-violation-type-city`

### File Storage

```
/data/
  incidents/
    deaths/
      2024-03-07-daniel.json
    injuries/
      2025-01-05-injury-chicago.json
    violations/
      2025-01-08-journalist-arrest.json
    arrests/
      ...
```

---

## Open Questions

1. **Scope creep**: Where do we draw the line? ICE-adjacent only or broader civil rights?
2. **Verification levels**: Different standards for deaths vs. other incidents?
3. **Anonymous subjects**: How to handle when name isn't public?
4. **Non-US incidents**: CBP actions at border in Mexico?
5. **Historical incidents**: How far back do we go?

---

## Success Metrics

- Time to document new incident: < 10 minutes with extension
- Source coverage: Every claim linked to source
- Quote accuracy: 100% verbatim from sources
- Verification rate: Target 80% of incidents verified
- Data completeness: Core fields filled for 90% of incidents
