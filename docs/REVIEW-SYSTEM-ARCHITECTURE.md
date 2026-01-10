# Review System Architecture Updates

## Summary
Two major changes requested:
1. **Timeline should link to QUOTES instead of SOURCES**
2. **Two-analyst review workflow with tracking**

## Status

### ✅ Database Migration Complete
- Added review tracking columns to `incidents` table:
  - `first_review_by` INTEGER (references users.id)
  - `first_review_at` TIMESTAMP  
  - `second_review_by` INTEGER (references users.id)
  - `second_review_at` TIMESTAMP
  - `verification_status` already exists: 'pending' | 'first_review' | 'verified'
- Updated 3 verified incidents to have both review timestamps
- Updated 35 pending incidents to 'pending' status
- Timeline table already has BOTH `source_id` and `quote_id` columns (no migration needed)

### 🔨 Frontend Changes Needed

#### 1. Timeline: Switch from Sources to Quotes

**Current State:**
```tsx
// Add timeline entry - uses source_id
<select value={newTimeline.source_id} ...>
  <option value="">Link source</option>
  {sources.map(s => <option ...>{s.title}</option>)}
</select>
```

**Should Be:**
```tsx
// Add timeline entry - uses quote_id
<select value={newTimeline.quote_id} ...>
  <option value="">Link quote</option>
  {quotes.map(q => <option ...>{q.quote_text.slice(0, 50)}...</option>)}
</select>
```

**Files to Update:**
- `src/app/dashboard/review/[id]/page.tsx`:
  - Change `newTimeline` state from `source_id` to `quote_id`
  - Change `editingTimeline` state from `source_id` to `quote_id`
  - Update `addTimelineEntry()` to send `quote_id` instead of `source_id`
  - Update `updateTimelineEntry()` to send `quote_id` instead of `source_id`
  - Update timeline rendering to show quote text instead of source title
  - Update dropdown in add/edit forms to show quotes instead of sources

- `src/lib/incidents-db.ts`:
  - Verify `addTimelineEntry()` accepts `quote_id` parameter
  - Verify `updateTimelineEntry()` accepts `quote_id` parameter
  - Update queries to JOIN quotes table instead of sources
  - Return quote text and source info through the quote relationship

#### 2. Two-Analyst Review Workflow

**Current Button:**
```tsx
<button onClick={verifyIncident}>
  Mark as Verified
</button>
```

**Should Be:**
```tsx
<button onClick={submitReview}>
  {incident.verification_status === 'pending' ? 'Submit First Review' : 'Submit Second Review & Publish'}
</button>
```

**Workflow Logic:**
```
User submits review:
  IF verification_status == 'pending':
    - Set verification_status = 'first_review'
    - Set first_review_by = current_user_id
    - Set first_review_at = NOW()
    - Keep verified = false
    - Show message: "First review submitted. Awaiting second review."
    - Return to dashboard
  
  ELSE IF verification_status == 'first_review':
    - Check: current_user_id != first_review_by (can't review own review)
    - Set verification_status = 'verified'
    - Set second_review_by = current_user_id
    - Set second_review_at = NOW()
    - Set verified = true
    - Show message: "Second review complete. Incident is now public."
    - Return to dashboard
```

**Files to Update:**
- `src/app/dashboard/review/[id]/page.tsx`:
  - Change button text based on verification_status
  - Update validation to differentiate warnings (proceed) vs blocking errors (stop)
  - Add "Submit Review" function that calls new API endpoint
  - Pass current user ID from session
  - Show appropriate success message based on review stage

- `src/app/api/incidents/[id]/route.ts`:
  - Add new `POST /api/incidents/[id]/review` endpoint (separate from PUT)
  - Check current verification_status
  - Validate user isn't reviewing their own first review
  - Set appropriate columns based on workflow stage
  - Return updated incident with new verification_status

- `src/lib/incidents-db.ts`:
  - Add `submitReview(incident_id, user_id)` function
  - Check verification_status and apply workflow logic
  - Update columns: first_review_by, first_review_at, second_review_by, second_review_at
  - Return error if same user tries to do both reviews

#### 3. Dashboard Queue Updates

The review queue should show:
- Pending incidents (need first review)
- First review complete incidents (need second review)
- Show WHO did the first review (so you can see if you can do the second)

**Files to Update:**
- `src/app/dashboard/page.tsx`:
  - Show verification_status badge: 'Pending' | 'Awaiting 2nd Review' | 'Verified'
  - Show first_review_by name if verification_status == 'first_review'
  - Filter: Can't see incidents for second review where you did the first review

## Implementation Order

1. **Timeline → Quotes** (Simpler, independent)
   - Update state variables
   - Update API calls
   - Update UI dropdowns
   - Update database queries
   - Test: Add timeline entry, edit timeline entry

2. **Two-Analyst Review** (Complex, needs user session)
   - Add review API endpoint
   - Update review page button
   - Add workflow validation
   - Update dashboard queue
   - Test: Complete full two-analyst workflow

## Data Flow

### Timeline with Quotes
```
Timeline Entry
  ↓
  has quote_id
  ↓
Quote (has quote_text, source_id, verified)
  ↓
  has source_id
  ↓
Source (has url, title, publication, priority)
```

This gives timeline entries the evidence (quote) AND the source of that evidence.

### Review Workflow
```
Incident created → verification_status: 'pending'
  ↓
Analyst A submits review → verification_status: 'first_review'
                          first_review_by: user_A_id
                          first_review_at: timestamp
  ↓
Analyst B submits review → verification_status: 'verified'
                          second_review_by: user_B_id
                          second_review_at: timestamp
                          verified: true (makes public)
```

## Next Steps

Would you like me to:
1. Implement the timeline→quotes change first? (Simpler)
2. Implement the two-analyst review system? (More complex, needs user auth context)
3. Both together? (Will take longer but ships as one cohesive update)
