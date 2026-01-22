# Settings Hierarchy & 3rd Party Verification System

## Implementation Status (Updated: 2026-01-22)

### ✅ COMPLETED

#### Database Layer (Migration 015 + 016)
- [x] Project workflow settings columns
- [x] Role verification permissions columns
- [x] Record type source/quote requirements columns
- [x] Field definition source requirements columns
- [x] Record verification tracking columns
- [x] `verification_requests` table
- [x] `verification_results` table
- [x] `verification_history` table
- [x] Triggers for invalidation on record changes
- [x] **NEW: `is_verifier` flag on users table (016)**
- [x] **NEW: `verifier_stats` table for workload tracking (016)**
- [x] **NEW: Verifier assignment and capacity management (016)**

#### API Endpoints - Project/Record Level
- [x] `POST /api/projects/[slug]/records/[recordId]/request-verification` - Request 3rd party verification
- [x] `GET /api/admin/verification-queue` - Admin queue of verification requests
- [x] `GET /api/admin/verification-requests/[requestId]` - Get request details
- [x] `POST /api/admin/verification-requests/[requestId]/assign` - Assign to verifier
- [x] `POST /api/admin/verification-requests/[requestId]/complete` - Complete verification
- [x] `POST /api/admin/verification-requests/[requestId]/reject` - Reject request

#### API Endpoints - Verifier Management (NEW)
- [x] `GET /api/admin/verifiers` - List all verifiers with stats
- [x] `POST /api/admin/verifiers` - Add a user as verifier
- [x] `PATCH /api/admin/verifiers/[verifierId]` - Update verifier settings
- [x] `DELETE /api/admin/verifiers/[verifierId]` - Remove verifier access

#### API Endpoints - Verifier Portal (NEW)
- [x] `GET /api/verifier/dashboard` - Verifier's dashboard data
- [x] `POST /api/verifier/requests/[requestId]/claim` - Claim a request
- [x] `GET /api/verifier/requests/[requestId]` - Get request details for verifier
- [x] `POST /api/verifier/requests/[requestId]/complete` - Complete verification
- [x] `POST /api/verifier/requests/[requestId]/reject` - Reject request

#### Admin UI
- [x] Verification tab in admin dashboard (`/admin`)
- [x] Verification queue with status counts
- [x] Priority, scope, and status badges
- [x] Verification request detail page (`/admin/verification/[requestId]`)
- [x] Assign, Complete, and Reject actions
- [x] Record data display in verification context
- [x] Verifier notes and issues tracking
- [x] **NEW: Link to Verifier Management**
- [x] **NEW: Verifier Management Page (`/admin/verifiers`)**
- [x] **NEW: Add/Edit/Remove verifiers**
- [x] **NEW: Verifier specialty tags**
- [x] **NEW: Workload capacity management**

#### Verifier Portal (NEW)
- [x] Verifier dashboard (`/verify`)
- [x] My assigned requests view
- [x] Available queue view
- [x] Claim request functionality
- [x] Verification work page (`/verify/[requestId]`)
- [x] **Data-level verification UI** with per-item checkboxes
- [x] **Record-level verification UI** with blanket checkbox
- [x] Per-item notes for flagged items
- [x] Global issues tracking
- [x] Complete (passed/partial/failed) actions
- [x] Reject with reason

#### User-Facing UI
- [x] "Request 3rd Party Verification" button on record detail page
- [x] Verification scope selection modal (record vs data)
- [x] Priority selection (low/normal/high)
- [x] Verification level badge on record display
- [x] "Independently Verified" badge for level 3

### 🔜 PLANNED (Future Phases)

#### Project Settings UI
- [ ] Workflow settings tab (require_validation, require_different_validator, etc.)
- [ ] Verification quota display and management
- [ ] Trust score display with breakdown

#### Role Management UI
- [ ] Per-member verification permissions toggle
- [ ] Verification quota override per member

#### Record Type Settings UI
- [ ] Source requirements section
- [ ] Quote requirements section

#### Enhanced Sources
- [ ] Color-coded footnotes by source type
- [ ] Archive URL auto-wayback support

#### Trust Scoring
- [ ] Trust score calculation
- [ ] Public trust badges

---

## Overview

A multi-tiered settings system that enables granular control over research workflows, combined with a trust verification framework that allows external validation of research data quality.

---

## Settings Hierarchy

### Level 1: Project Settings
Global settings that affect the entire project.

```
Project Settings
├── Workflow Configuration
│   ├── require_review: boolean (default: true)
│   ├── require_validation: boolean (default: true)
│   ├── require_different_validator: boolean (default: false)
│   └── propose_edits_instant: boolean (default: false)
│       // If true, proposed edits bypass validation and apply immediately
│       // Only relevant when require_validation is false
│
├── Verification Quotas
│   ├── third_party_verification_enabled: boolean
│   ├── monthly_verification_quota: number (free: 5, paid: varies)
│   └── verifications_used_this_month: number
│
├── Trust Indicators
│   ├── public_trust_score: boolean (show trust score publicly)
│   └── require_source_for_all_fields: boolean
│
└── Subscription Tier
    ├── plan: 'free' | 'pro' | 'enterprise'
    └── verification_plan: 'none' | 'basic' | 'unlimited'
```

### Level 2: Role Settings
Per-role permissions within a project.

```
Role Permissions
├── Workflow Permissions
│   ├── can_review: boolean
│   ├── can_validate: boolean
│   ├── can_bypass_different_validator: boolean
│   └── can_propose_edits: boolean
│
├── Verification Permissions
│   ├── can_request_verification: boolean
│   └── monthly_verification_limit: number | null (null = use project quota)
│
└── Data Permissions
    ├── can_edit_verified_records: boolean (dangerous - removes verification)
    └── can_override_source_requirements: boolean
```

### Level 3: Record Type (Form) Settings
Settings specific to each record type/form.

```
Record Type Settings
├── Workflow Settings
│   ├── requires_review: boolean (inherit from project or override)
│   ├── requires_validation: boolean (inherit from project or override)
│   └── guest_submissions_enabled: boolean
│
├── Source Requirements
│   ├── require_at_least_one_source: boolean
│   ├── require_primary_source: boolean
│   ├── minimum_sources: number
│   └── source_types_allowed: ['primary', 'secondary', 'tertiary']
│
├── Quote Requirements
│   ├── require_quotes_for_claims: boolean
│   └── minimum_quotes: number
│
└── Field-Level Requirements
    // Set per field in field_definitions
    ├── requires_quote: boolean
    ├── requires_source: boolean
    └── requires_primary_source: boolean
```

---

## Sources System

### Source Types
```typescript
enum SourceType {
  PRIMARY = 'primary',      // Original documents, direct witnesses, official records
  SECONDARY = 'secondary',  // News articles, analyses, reports citing primaries
  TERTIARY = 'tertiary'     // Wikipedia, encyclopedias, compilations
}

enum SourceCategory {
  OFFICIAL_DOCUMENT = 'official_document',  // Court records, gov docs
  NEWS_ARTICLE = 'news_article',
  PRESS_RELEASE = 'press_release',
  ACADEMIC_PAPER = 'academic_paper',
  WITNESS_STATEMENT = 'witness_statement',
  SOCIAL_MEDIA = 'social_media',
  INTERNAL_RECORD = 'internal_record',      // FOIA, leaked docs
  ARCHIVE = 'archive',
  OTHER = 'other'
}
```

### Source Schema
```sql
CREATE TABLE record_sources (
  id SERIAL PRIMARY KEY,
  record_id INTEGER NOT NULL REFERENCES records(id),
  project_id INTEGER NOT NULL REFERENCES projects(id),
  
  -- Source identification
  url VARCHAR(2000),
  title VARCHAR(500),
  publication VARCHAR(255),
  author VARCHAR(255),
  
  -- Classification
  source_type VARCHAR(20) NOT NULL DEFAULT 'secondary',  -- primary/secondary/tertiary
  source_category VARCHAR(50),
  
  -- Dates
  publication_date DATE,
  access_date DATE DEFAULT CURRENT_DATE,
  
  -- Archival
  archive_url VARCHAR(2000),  -- Wayback machine or similar
  archive_date DATE,
  
  -- Trust metadata
  is_verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Linking
  linked_fields TEXT[],  -- Which fields this source supports
  linked_quote_ids INTEGER[],  -- Which quotes came from this source
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Quote-Source Linking
```sql
-- Link quotes to their sources
ALTER TABLE record_quotes ADD COLUMN source_id INTEGER REFERENCES record_sources(id);

-- Track which specific fields a quote supports
ALTER TABLE record_quotes ADD COLUMN linked_fields TEXT[];
```

### Footnote Color Coding
```
Primary Source   → Green footnote marker [1]
Secondary Source → Blue footnote marker [2]  
Tertiary Source  → Gray footnote marker [3]
Unverified       → Red outline
3rd Party Verified → Gold star/checkmark
```

---

## 3rd Party Verification System

### Core Concept: Verifying DATA, Not Just Records

The verification system operates at two levels:

1. **Data-Level Verification** - Individual pieces of data (fields, quotes, sources) can be independently verified
2. **Record-Level Verification** - A blanket verification that ALL data in a record has been verified as accurate

**Key Distinction:**
- Data verification = "This specific quote/field/source has been checked and is accurate"
- Record verification = "This entire record has been reviewed and all data is accurate"

**Important Rule:** If ANYTHING changes on a record-verified record, the entire record-level verification is invalidated. The user must re-request verification for the modified record.

### Verification Levels

```
Level 0: Unverified
├── No special validation
└── Default state for all records

Level 1: Self-Verified (Project Team)
├── Reviewed by project team
├── Passed validation workflow
└── Shows "Verified" badge

Level 2: Audit-Ready
├── All required sources provided
├── Sources are archived (wayback links)
├── All claims have supporting quotes
└── Shows "Audit-Ready" badge

Level 3: 3rd Party Verified ⭐
├── Can be DATA-LEVEL or RECORD-LEVEL
│
├── Data-Level Verification:
│   ├── Individual fields verified against sources
│   ├── Individual quotes verified as accurate
│   ├── Individual sources verified as accessible
│   └── Shows verification checkmark on each verified item
│
├── Record-Level Verification:
│   ├── ALL data in record has been reviewed
│   ├── Blanket "Independently Verified" badge
│   └── ANY change invalidates entire verification
│
└── Shows "Independently Verified" badge with date
```

### Verification Types

```typescript
enum VerificationType {
  FIELD = 'field',       // Verify a specific field value
  QUOTE = 'quote',       // Verify a quote is accurate from source
  SOURCE = 'source',     // Verify a source is accessible/accurate
  RECORD = 'record'      // Verify ENTIRE record (blanket verification)
}
```

### Verification Request System

```sql
CREATE TABLE verification_requests (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  record_id INTEGER NOT NULL REFERENCES records(id),
  
  -- Request info
  requested_by INTEGER NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  priority VARCHAR(20) DEFAULT 'normal',  -- normal, urgent
  request_notes TEXT,  -- User's notes about what to verify
  
  -- What to verify
  verification_scope VARCHAR(20) NOT NULL DEFAULT 'record',
  -- 'record' = verify entire record (blanket verification)
  -- 'data' = verify specific items (fields/quotes/sources)
  items_to_verify JSONB,  -- For data-level: list of specific items
  
  -- Assignment
  assigned_to INTEGER REFERENCES users(id),  -- Platform verifier
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  -- pending, in_progress, completed, rejected, needs_revision
  
  -- Results
  completed_at TIMESTAMPTZ,
  verification_result VARCHAR(20),  -- passed, failed, partial
  verifier_notes TEXT,  -- IMPORTANT: Notes from verifier (success or failure)
  rejection_reason TEXT,  -- If rejected, explain why
  issues_found JSONB,  -- List of issues found during verification
  
  -- Billing
  billed BOOLEAN DEFAULT false,
  billing_amount DECIMAL(10,2)
);

CREATE TABLE verification_results (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES verification_requests(id),
  
  -- What was verified
  item_type VARCHAR(20) NOT NULL,  -- 'field', 'quote', 'source', 'record'
  item_id INTEGER,  -- ID of quote/source, NULL for field or record-level
  field_slug VARCHAR(100),  -- For field verification
  
  -- Result
  verified BOOLEAN NOT NULL,
  verification_date TIMESTAMPTZ DEFAULT NOW(),
  verified_by INTEGER NOT NULL REFERENCES users(id),
  
  -- Verifier notes (ALWAYS allowed - success or failure)
  notes TEXT,  -- Verifier's notes explaining decision
  caveats TEXT,  -- Any caveats even if verified (e.g., "Source may be paywalled")
  issues TEXT[],  -- Specific issues found
  
  -- This verification is invalidated if the item is edited
  invalidated_at TIMESTAMPTZ,
  invalidated_reason TEXT,
  invalidated_by_change_id INTEGER  -- Reference to what change invalidated it
);
```

### Verification Notes System

Verifiers can ALWAYS leave notes, whether verification succeeds or fails:

**On Success:**
- Notes: General observations about the data
- Caveats: Warnings or conditions (e.g., "Verified as of 2026-01-22, source is behind paywall")

**On Failure/Rejection:**
- Rejection Reason: Why the verification request was rejected
- Issues: Specific problems found
- Notes: Guidance on how to fix before re-requesting
```

### Verification Invalidation Rules

**Record-Level Verification (Strictest):**
If a record has RECORD-LEVEL verification (blanket verification), ANY change invalidates the entire verification:
- Any field value changed
- Any quote added, edited, or removed
- Any source added, edited, or removed
- User must re-request record verification after changes

**Data-Level Verification (Granular):**
Only the specific verified item is invalidated:

1. **Field Value Changed** → Invalidates verification for that field ONLY
2. **Quote Text Changed** → Invalidates verification for that quote AND any fields that cited it
3. **Quote Source Changed** → Invalidates verification for that quote ONLY
4. **Source URL/Details Changed** → Invalidates verification for that source AND all linked quotes
5. **New Quote/Source Added** → Does NOT invalidate existing verifications

**Invalidation Tracking:**
```sql
-- When data changes, record what caused invalidation
UPDATE verification_results 
SET 
  invalidated_at = NOW(),
  invalidated_reason = 'Field value changed',
  invalidated_by_change_id = [change_id]
WHERE ...;
```

### Verification Quota System

```sql
ALTER TABLE projects ADD COLUMN verification_quota_monthly INTEGER DEFAULT 5;
ALTER TABLE projects ADD COLUMN verification_quota_used INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN verification_quota_reset_date DATE;

-- Per-role overrides
ALTER TABLE project_members ADD COLUMN verification_quota_override INTEGER;
-- null = use project quota, 0 = cannot request, N = custom limit
```

---

## Database Schema Changes

### Projects Table Additions
```sql
ALTER TABLE projects ADD COLUMN require_validation BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN require_different_validator BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN propose_edits_instant BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN third_party_verification_enabled BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN verification_quota_monthly INTEGER DEFAULT 5;
ALTER TABLE projects ADD COLUMN verification_quota_used INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN verification_quota_reset_date DATE;
ALTER TABLE projects ADD COLUMN trust_score DECIMAL(3,2);  -- 0.00 to 1.00
```

### Project Members (Role Permissions)
```sql
ALTER TABLE project_members ADD COLUMN can_propose_edits BOOLEAN DEFAULT true;
ALTER TABLE project_members ADD COLUMN can_bypass_different_validator BOOLEAN DEFAULT false;
ALTER TABLE project_members ADD COLUMN can_request_verification BOOLEAN DEFAULT false;
ALTER TABLE project_members ADD COLUMN verification_quota_override INTEGER;
```

### Record Types (Form Settings)
```sql
ALTER TABLE record_types ADD COLUMN require_at_least_one_source BOOLEAN DEFAULT false;
ALTER TABLE record_types ADD COLUMN require_primary_source BOOLEAN DEFAULT false;
ALTER TABLE record_types ADD COLUMN minimum_sources INTEGER DEFAULT 0;
ALTER TABLE record_types ADD COLUMN require_quotes_for_claims BOOLEAN DEFAULT false;
ALTER TABLE record_types ADD COLUMN minimum_quotes INTEGER DEFAULT 0;
```

### Field Definitions Additions
```sql
ALTER TABLE field_definitions ADD COLUMN requires_source BOOLEAN DEFAULT false;
ALTER TABLE field_definitions ADD COLUMN requires_primary_source BOOLEAN DEFAULT false;
```

### Records Table Additions
```sql
ALTER TABLE records ADD COLUMN verification_level INTEGER DEFAULT 0;
-- 0: unverified, 1: self-verified, 2: audit-ready, 3: third-party-verified

ALTER TABLE records ADD COLUMN verification_scope VARCHAR(20);
-- NULL, 'data', or 'record' (type of 3rd party verification)

ALTER TABLE records ADD COLUMN verification_date TIMESTAMPTZ;
ALTER TABLE records ADD COLUMN verification_request_id INTEGER REFERENCES verification_requests(id);

-- For record-level verification: track if ANY change has occurred since verification
ALTER TABLE records ADD COLUMN verified_data_hash TEXT;
-- Hash of all data at time of verification, used to detect ANY change
```

---

## Trust Score Calculation

Projects receive a trust score (0-100) based on:

```
Base Score Components (max 100 points):

Workflow Rigor (25 points)
├── Requires review: +5
├── Requires validation: +10
├── Requires different validator: +10

Source Quality (25 points)
├── Requires sources: +5
├── Requires primary sources: +10
├── Has archived sources: +5
├── Average sources per record: +5 (if > 2)

Data Quality (25 points)
├── Requires quotes for claims: +10
├── All fields have linked quotes: +10
├── Quote-source linking complete: +5

Verification Level (25 points)
├── Self-verified records: +5
├── Audit-ready records: +10
├── 3rd party verified records: +25

Penalties:
├── Unverified edits to verified records: -5 per occurrence
├── Broken source links: -2 per occurrence
└── Missing required sources: -3 per occurrence
```

---

## UI Implementation Plan

### 1. Project Settings Page Updates
- Add "Workflow" tab with validation toggles
- Add "Verification" tab with quota display and upgrade CTA
- Add "Trust Score" display with breakdown

### 2. Role Management Updates
- Add verification permissions to role editor
- Show effective permissions (role + overrides)

### 3. Record Type Settings Updates
- Add source requirements section
- Add quote requirements section
- Preview of how settings affect form

### 4. Record Detail Page Updates
- Show verification level badge
- Color-coded footnotes by source type
- "Request Verification" button (if permitted)
- Verification history section

### 5. Sources Component
- Standardized source entry form
- Source type selector with descriptions
- Archive URL field with auto-wayback option
- Visual indicator of source quality

### 6. Verification Dashboard (Admin)
- Queue of verification requests
- Verification workflow UI
- Issue flagging and communication

---

## Implementation Phases

### Phase 1: Settings Infrastructure
- [ ] Add project-level workflow settings
- [ ] Add role-based permissions
- [ ] Update record type settings
- [ ] UI for all settings

### Phase 2: Enhanced Sources
- [ ] Standardize source schema
- [ ] Source type classification
- [ ] Quote-source linking
- [ ] Color-coded footnotes
- [ ] Archive URL support

### Phase 3: Trust Scoring
- [ ] Trust score calculation
- [ ] Score display UI
- [ ] Public trust badges
- [ ] Score breakdown page

### Phase 4: 3rd Party Verification
- [ ] Verification request system
- [ ] Quota management
- [ ] Verifier dashboard
- [ ] Verification workflow
- [ ] Invalidation triggers
- [ ] Billing integration

---

## API Endpoints Needed

```
# Project Settings
PATCH /api/projects/[slug]/settings/workflow
PATCH /api/projects/[slug]/settings/verification

# Role Permissions
PATCH /api/projects/[slug]/members/[id]/permissions

# Verification
POST /api/projects/[slug]/records/[id]/request-verification
GET /api/projects/[slug]/verification-queue
PATCH /api/verification-requests/[id]
POST /api/verification-requests/[id]/complete

# Trust Score
GET /api/projects/[slug]/trust-score
```

---

## Notes

1. **Backward Compatibility**: All new settings default to current behavior
2. **Granularity**: Settings cascade (Project → Role → Form → Field)
3. **Override Logic**: More specific settings override general ones
4. **Audit Trail**: All verification actions are logged
5. **Immutability**: Verified data changes trigger re-verification requirements
