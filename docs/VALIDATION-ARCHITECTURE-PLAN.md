# Validation Architecture Implementation Plan

## Executive Summary

**Goal**: Separate data editing (Review) from data certification (Validation) to prevent unverified data from entering the system during the "verification" phase.

**Current Flow**: Submit → Review 1 (edit+verify) → Review 2 (edit+verify) → LIVE  
**New Flow**: Submit → Review 1 (edit) → Review 2 (edit) → Validation 1 → Validation 2 → LIVE

## Phase 1: Database Migration

### New Status Values
```
verification_status ENUM:
  'pending'           - Fresh submission, needs first review
  'first_review'      - First reviewer completed, needs second review
  'second_review'     - Second reviewer completed, ready for validation (NEW)
  'first_validation'  - First validator approved, needs second validation (NEW)
  'verified'          - Published/live
  'rejected'          - Validators determined case unpublishable (NEW)
```

### New Database Objects

```sql
-- 1. Add new columns to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS first_validated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS first_validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS second_validated_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS second_validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

-- 2. New table for validation issues (fields not validated with reasons)
CREATE TABLE IF NOT EXISTS validation_issues (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  validation_session_id INTEGER,  -- Groups issues from same validation attempt
  field_type VARCHAR(50) NOT NULL,  -- 'field', 'quote', 'timeline', 'source'
  field_name VARCHAR(100),          -- 'name', 'age', 'timeline_3', 'quote_5', etc.
  issue_reason TEXT NOT NULL,       -- Why it's not validated
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,            -- NULL until fixed in review
  resolved_by INTEGER REFERENCES users(id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_validation_issues_incident ON validation_issues(incident_id);
CREATE INDEX IF NOT EXISTS idx_validation_issues_unresolved ON validation_issues(incident_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_validation_status ON incidents(verification_status) WHERE verification_status IN ('second_review', 'first_validation');
```

### Migration Script: `scripts/validation-architecture-migration.sql`

---

## Phase 2: API Endpoints

### 2.1 Validation Submission Endpoint
**`POST /api/incidents/[id]/validate`**

```typescript
Input: {
  action: 'validate' | 'return_to_review' | 'reject',
  issues?: Array<{
    field_type: 'field' | 'quote' | 'timeline' | 'source',
    field_name: string,
    reason: string
  }>,
  rejection_reason?: string  // Required if action === 'reject'
}

Logic:
  IF action === 'validate':
    - All issues array must be empty (all boxes checked)
    - IF verification_status === 'second_review':
        SET verification_status = 'first_validation'
        SET first_validated_by = user.id
    - ELSE IF verification_status === 'first_validation':
        SET verification_status = 'verified'
        SET verified = true
        SET second_validated_by = user.id
  
  ELSE IF action === 'return_to_review':
    - issues array must have at least 1 item
    - Insert all issues into validation_issues table
    - SET verification_status = 'first_review'
    - Clear validation columns
  
  ELSE IF action === 'reject':
    - rejection_reason required
    - SET verification_status = 'rejected'
    - SET rejection_reason, rejected_by, rejected_at
```

### 2.2 Validation Data Endpoint
**`GET /api/incidents/[id]/validation`**

Returns read-only data for validation UI:
```typescript
Response: {
  incident: { ... },           // All fields (read-only)
  sources: Array<Source>,      // With quotes linked
  quotes: Array<Quote>,        // With source info, linked_fields
  timeline: Array<Timeline>,   // With quote/source info
  previous_issues: Array<ValidationIssue>  // Any unresolved issues from prior returns
}
```

### 2.3 Update Existing Review Endpoints
**`POST /api/incidents/[id]/verify`**

Change behavior:
- When `verification_status === 'first_review'` and second review submitted:
  - SET `verification_status = 'second_review'` (NOT 'verified')
  - Return message: "Second review complete. Case sent to validation queue."

---

## Phase 3: Update Review Flow (Stop at second_review)

### 3.1 Web Review Page Changes
**File: `src/app/dashboard/review/[id]/page.tsx`**

```tsx
// Change button text
incident.verification_status === 'pending' ? 'Submit First Review' :
incident.verification_status === 'first_review' ? 'Submit Second Review' :  // Changed text
'Already Reviewed'

// Success message change
if (result.verification_status === 'second_review') {  // NEW STATUS
  alert('Second review complete. Case has been sent to the validation queue.');
}
```

### 3.2 Extension Review Changes
**File: `extension/sidepanel.js`**

```javascript
// In loadReviewCaseDetails:
// Block if already past second_review (needs validation, not review)
if (['second_review', 'first_validation', 'verified'].includes(incident.verification_status)) {
  alert('This case has completed review and is now in validation.\n\nValidation must be done in the web browser.');
  return;
}
```

---

## Phase 4: Web Validation Page

### 4.1 New Page: `src/app/dashboard/validate/[id]/page.tsx`

Simple read-only UI showing:
- All populated fields with source quote
- All quotes with source
- All timeline entries with quote
- All sources

Each item has:
- Checkbox (checked = validated)
- If unchecked: required text input for reason

Three action buttons:
- ✓ Validate All - Only enabled if all boxes checked
- ↩ Return to Review - Requires at least one unchecked with reason
- ✗ Reject Case - Opens modal for rejection reason

### 4.2 UI Structure
```tsx
<ValidationPage>
  <Header>
    <h1>Validate: {incident.subject_name}</h1>
    <StatusBadge status={incident.verification_status} />
  </Header>

  <Section title="Fields">
    {fields.map(field => (
      <ValidationItem key={field.name}>
        <Checkbox checked={validated[field.name]} />
        <FieldLabel>{field.label}</FieldLabel>
        <FieldValue>{field.value}</FieldValue>
        <LinkedQuote>{field.quote?.text}</LinkedQuote>
        <LinkedSource>{field.quote?.source}</LinkedSource>
        {!validated[field.name] && <ReasonInput required />}
      </ValidationItem>
    ))}
  </Section>

  <Section title="Quotes">
    {quotes.map(quote => (
      <ValidationItem key={quote.id}>
        <Checkbox />
        <QuoteText>{quote.text}</QuoteText>
        <Source>{quote.source}</Source>
        {!validated[`quote_${quote.id}`] && <ReasonInput required />}
      </ValidationItem>
    ))}
  </Section>

  <Section title="Timeline">
    {timeline.map(event => (
      <ValidationItem key={event.id}>
        <Checkbox />
        <EventDate>{event.date}</EventDate>
        <Description>{event.description}</Description>
        <LinkedQuote>{event.quote?.text}</LinkedQuote>
        {!validated[`timeline_${event.id}`] && <ReasonInput required />}
      </ValidationItem>
    ))}
  </Section>

  <Section title="Sources">
    {sources.map(source => (
      <ValidationItem key={source.id}>
        <Checkbox />
        <SourceUrl>{source.url}</SourceUrl>
        <Publication>{source.publication}</Publication>
        {!validated[`source_${source.id}`] && <ReasonInput required />}
      </ValidationItem>
    ))}
  </Section>

  <ActionBar>
    <ValidateButton disabled={!allChecked} />
    <ReturnToReviewButton disabled={noIssues} />
    <RejectButton />
  </ActionBar>
</ValidationPage>
```

---

## Phase 5: Extension Validation Tab

### 5.1 HTML Changes
**File: `extension/sidepanel.html`**

Add new tab:
```html
<div class="tabs">
  <button class="tab-btn" data-tab="browse">Browse</button>
  <button class="tab-btn" data-tab="review">Review</button>
  <button class="tab-btn" data-tab="validate">Validate</button>  <!-- NEW -->
</div>

<div class="tab-content" id="validateTab" style="display: none;">
  <div class="validate-header">
    <h2>Validation Queue</h2>
    <p>Cases awaiting validation (read-only verification)</p>
  </div>
  
  <div class="validate-queue" id="validateQueue"></div>
  
  <div class="validate-case" id="validateCaseView" style="display: none;">
    <div id="validateCaseContent"></div>
    
    <div class="validate-actions">
      <button id="validateAllBtn" class="btn-primary" disabled>✓ Validate</button>
      <button id="returnToReviewBtn" class="btn-secondary">↩ Return to Review</button>
      <button id="rejectCaseBtn" class="btn-danger">✗ Reject</button>
    </div>
  </div>
</div>
```

### 5.2 JavaScript Changes
**File: `extension/sidepanel.js`**

```javascript
// New state
let validateMode = false;
let validateIncidentId = null;
let validationState = {};  // { field_name: { checked: bool, reason: string } }

// Load validation queue
async function loadValidationQueue() {
  const response = await fetch(`${apiUrl}/api/verification-queue?filter=needs_validation`);
  const data = await response.json();
  renderValidationQueue(data.incidents);
}

// Load case for validation (read-only)
async function loadValidationCase(incidentId) {
  const response = await fetch(`${apiUrl}/api/incidents/${incidentId}/validation`);
  const data = await response.json();
  renderValidationCase(data);
}

// Render validation case (simple list with checkboxes)
function renderValidationCase(data) {
  const { incident, sources, quotes, timeline } = data;
  let html = `<h3>${incident.subject_name || incident.victim_name}</h3>`;
  
  // Fields section
  html += '<div class="validation-section"><h4>Fields</h4>';
  for (const [key, value] of Object.entries(incident)) {
    if (value && isDisplayableField(key)) {
      html += renderValidationItem('field', key, formatFieldLabel(key), value, findLinkedQuote(key, quotes));
    }
  }
  html += '</div>';
  
  // Quotes section
  html += '<div class="validation-section"><h4>Quotes</h4>';
  for (const quote of quotes) {
    html += renderValidationItem('quote', `quote_${quote.id}`, 'Quote', quote.quote_text, quote.source);
  }
  html += '</div>';
  
  // Timeline section
  html += '<div class="validation-section"><h4>Timeline</h4>';
  for (const event of timeline) {
    html += renderValidationItem('timeline', `timeline_${event.id}`, event.event_date, event.description, event.quote);
  }
  html += '</div>';
  
  // Sources section
  html += '<div class="validation-section"><h4>Sources</h4>';
  for (const source of sources) {
    html += renderValidationItem('source', `source_${source.id}`, source.title || source.url, source.publication, null);
  }
  html += '</div>';
  
  document.getElementById('validateCaseContent').innerHTML = html;
  attachValidationListeners();
}

function renderValidationItem(type, key, label, value, linkedData) {
  const isChecked = validationState[key]?.checked || false;
  return `
    <div class="validation-item ${isChecked ? 'validated' : 'unvalidated'}">
      <label class="validation-checkbox">
        <input type="checkbox" data-key="${key}" ${isChecked ? 'checked' : ''}>
        <span class="checkmark"></span>
      </label>
      <div class="validation-content">
        <div class="validation-label">${label}</div>
        <div class="validation-value">${escapeHtml(String(value))}</div>
        ${linkedData ? `<div class="validation-linked">${escapeHtml(typeof linkedData === 'string' ? linkedData : linkedData.text || '')}</div>` : ''}
      </div>
      ${!isChecked ? `
        <div class="validation-reason">
          <input type="text" placeholder="Reason not validated..." data-reason-key="${key}" value="${validationState[key]?.reason || ''}">
        </div>
      ` : ''}
    </div>
  `;
}

// Submit validation
async function submitValidation(action) {
  const issues = [];
  
  for (const [key, state] of Object.entries(validationState)) {
    if (!state.checked) {
      if (!state.reason?.trim()) {
        alert(`Please provide a reason for unchecked item: ${key}`);
        return;
      }
      const [type, ...rest] = key.split('_');
      issues.push({
        field_type: type === 'quote' || type === 'timeline' || type === 'source' ? type : 'field',
        field_name: key,
        reason: state.reason
      });
    }
  }
  
  if (action === 'validate' && issues.length > 0) {
    alert('All items must be validated before approving.');
    return;
  }
  
  if (action === 'return_to_review' && issues.length === 0) {
    alert('At least one item must be unchecked with a reason to return to review.');
    return;
  }
  
  let body = { action, issues };
  
  if (action === 'reject') {
    const reason = prompt('Reason for rejection:');
    if (!reason?.trim()) return;
    body.rejection_reason = reason;
  }
  
  const response = await fetch(`${apiUrl}/api/incidents/${validateIncidentId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const result = await response.json();
  if (result.success) {
    alert(result.message);
    loadValidationQueue();
    showValidationQueue();
  } else {
    alert('Error: ' + result.error);
  }
}
```

---

## Phase 6: Dashboard Updates

### 6.1 Queue Filters
**File: `src/app/dashboard/page.tsx`**

Add new filter options:
```tsx
const FILTERS = {
  'needs_review': 'Needs Review',        // pending + first_review
  'needs_validation': 'Needs Validation', // second_review + first_validation  (NEW)
  'pending': 'Pending (1st Review)',
  'first_review': 'Awaiting 2nd Review',
  'second_review': 'Awaiting 1st Validation',  // NEW
  'first_validation': 'Awaiting 2nd Validation', // NEW
  'verified': 'Published',
  'rejected': 'Rejected',  // NEW
  'all': 'All'
};
```

### 6.2 Status Badges
```tsx
function statusBadge(status: string) {
  const badges = {
    'pending': { text: 'Pending', class: 'bg-gray-100 text-gray-800' },
    'first_review': { text: '1st Review Done', class: 'bg-yellow-100 text-yellow-800' },
    'second_review': { text: 'Awaiting Validation', class: 'bg-blue-100 text-blue-800' },  // NEW
    'first_validation': { text: '1st Validation Done', class: 'bg-purple-100 text-purple-800' },  // NEW
    'verified': { text: 'Published', class: 'bg-green-100 text-green-800' },
    'rejected': { text: 'Rejected', class: 'bg-red-100 text-red-800' }  // NEW
  };
  return <span className={`px-2 py-1 text-xs rounded ${badges[status]?.class}`}>{badges[status]?.text}</span>;
}
```

### 6.3 Action Buttons
```tsx
// Show "Review" button for pending/first_review
// Show "Validate" button for second_review/first_validation
{['pending', 'first_review'].includes(incident.verification_status) && (
  <Link href={`/dashboard/review/${incident.id}`}>Review</Link>
)}
{['second_review', 'first_validation'].includes(incident.verification_status) && (
  <Link href={`/dashboard/validate/${incident.id}`}>Validate</Link>
)}
```

---

## Phase 7: API Queue Endpoint Updates

**File: `src/app/api/verification-queue/route.ts`**

```typescript
// Add new filter options
switch (filter) {
  case 'needs_review':
    conditions.push("i.verification_status IN ('pending', 'first_review')");
    break;
  case 'needs_validation':  // NEW
    conditions.push("i.verification_status IN ('second_review', 'first_validation')");
    break;
  case 'second_review':  // NEW
    conditions.push("i.verification_status = 'second_review'");
    break;
  case 'first_validation':  // NEW
    conditions.push("i.verification_status = 'first_validation'");
    break;
  case 'rejected':  // NEW
    conditions.push("i.verification_status = 'rejected'");
    break;
  // ... existing cases
}

// Update stats query
const statsResult = await pool.query(`
  SELECT 
    COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE verification_status = 'first_review') as first_review,
    COUNT(*) FILTER (WHERE verification_status = 'second_review') as second_review,
    COUNT(*) FILTER (WHERE verification_status = 'first_validation') as first_validation,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
    COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
    COUNT(*) as total
  FROM incidents
`);
```

---

## Implementation Order

### Step 1: Database Migration (Low Risk)
- Add new columns
- Create validation_issues table
- Add indexes
- **Test**: Verify columns exist, no existing data affected

### Step 2: Validation API Endpoints (Medium Risk)
- Create `GET /api/incidents/[id]/validation`
- Create `POST /api/incidents/[id]/validate`
- **Test**: Call endpoints manually, verify responses

### Step 3: Update Review Endpoints (Medium Risk)
- Change second review to set `second_review` status (not `verified`)
- Update messages
- **Test**: Submit second review, verify status is `second_review`

### Step 4: Web Validation Page (Low Risk - New Page)
- Create `src/app/dashboard/validate/[id]/page.tsx`
- Simple read-only UI
- **Test**: Load validation page, verify data displays

### Step 5: Dashboard Queue Updates (Low Risk)
- Add new filters
- Add new status badges
- Add Validate action button
- **Test**: Filter works, badges show correctly

### Step 6: Extension Validation Tab (Low Risk - New Feature)
- Add HTML tab structure
- Add JavaScript validation logic
- **Test**: Load validation queue, validate case

### Step 7: Update Extension Review Blocking (Low Risk)
- Block review mode for cases past second_review
- **Test**: Try to review validated case, blocked correctly

---

## Rollback Plan

If issues arise:
1. **Database**: Columns are additive only - no removal of existing columns
2. **Status values**: Add new statuses alongside existing ones
3. **Endpoints**: New endpoints, existing ones only modified at end
4. **UI**: New pages/tabs, existing functionality preserved

To rollback:
- Revert code changes
- Run: `UPDATE incidents SET verification_status = 'verified' WHERE verification_status IN ('second_review', 'first_validation')`
- Validation_issues table can remain (orphaned but harmless)

---

## Success Criteria

- [ ] Cases move through: pending → first_review → second_review → first_validation → verified
- [ ] Review mode allows editing, stops at second_review
- [ ] Validation mode is read-only, only allows approve/return/reject
- [ ] Return to review creates issues, sets status back to first_review
- [ ] Issues display on review page for fixing
- [ ] Two different people required for validation (like reviews)
- [ ] Dashboard shows correct status badges and action buttons
- [ ] Extension has working Validate tab

---

## Files to Create/Modify

### Create:
1. `scripts/validation-architecture-migration.sql`
2. `src/app/api/incidents/[id]/validate/route.ts`
3. `src/app/api/incidents/[id]/validation/route.ts` (GET only)
4. `src/app/dashboard/validate/[id]/page.tsx`

### Modify:
1. `src/app/api/incidents/[id]/verify/route.ts` - second review → second_review status
2. `src/app/api/verification-queue/route.ts` - new filters
3. `src/app/dashboard/page.tsx` - new badges, filters, buttons
4. `src/app/dashboard/review/[id]/page.tsx` - button text, success message
5. `src/lib/incidents-db.ts` - submitIncidentReview to stop at second_review
6. `src/types/incident.ts` - add new status values
7. `extension/sidepanel.html` - validation tab
8. `extension/sidepanel.js` - validation logic, review blocking
