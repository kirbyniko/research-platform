# Proposed Changes System

## Overview
A system allowing users to propose changes to published incidents and statements. Changes go through review and validation before being applied to the live record.

## Implementation Status

### ✅ Completed
1. **Database table** - `proposed_changes` created with all required columns and indexes
2. **API endpoints** - Full CRUD + status updates
   - `POST /api/proposed-changes` - Create proposal
   - `GET /api/proposed-changes` - List proposals with filters
   - `GET /api/proposed-changes/[id]` - Get single proposal with original
   - `PATCH /api/proposed-changes/[id]` - Review/validate/reject
3. **Queue page** - `/dashboard/proposed-changes` - Lists all proposals
4. **Review page** - `/dashboard/proposed-changes/[id]/review` - Side-by-side comparison
5. **Validation page** - `/dashboard/proposed-changes/[id]/validate` - Checkbox verification
6. **Incident propose form** - `/dashboard/incidents/[id]/propose-changes`
7. **Statement propose form** - `/dashboard/statements/[id]/propose-changes`
8. **"Propose Changes" buttons** - Added to incident and statement detail pages
9. **Dashboard link** - Added "Proposed Changes" button to analyst dashboard

## User Flow

### For Any Published Record (Incident or Statement):
1. User views published record
2. Clicks "Suggest Changes" button
3. Form loads pre-filled with current data (same layout as review form)
4. User modifies fields they want to change
5. User adds optional change summary/reason
6. User submits proposed change
7. Original record stays live, proposal enters queue

### Review & Validation Flow:
```
[Submitted] → [Pending Review] → [Pending Validation] → [Approved/Applied]
                    ↓                      ↓
               [Rejected]              [Rejected]
```

1. **Pending Review**: Admin reviews proposal side-by-side with original
   - Can approve → moves to Pending Validation
   - Can reject → proposal rejected, original unchanged

2. **Pending Validation**: Validator verifies the proposed changes
   - Can validate → changes applied to original, proposal marked approved
   - Can reject → proposal rejected, original unchanged

## Database Schema

### New Table: `proposed_changes`
```sql
CREATE TABLE proposed_changes (
  id SERIAL PRIMARY KEY,
  
  -- What record this proposes to change
  entity_type VARCHAR(50) NOT NULL,  -- 'incident' or 'statement'
  entity_id INTEGER NOT NULL,         -- ID of the original record
  
  -- The proposed state (full record data as JSONB)
  proposed_data JSONB NOT NULL,
  changed_fields TEXT[],              -- Array of field names that were modified
  change_summary TEXT,                -- User's description of the change
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
  -- Values: pending_review, pending_validation, approved, rejected
  
  -- Submission info
  submitted_by VARCHAR(255),
  submitted_at TIMESTAMP DEFAULT NOW(),
  
  -- Review stage
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  
  -- Validation stage  
  validated_by VARCHAR(255),
  validated_at TIMESTAMP,
  validation_notes TEXT,
  
  -- Application tracking
  applied_at TIMESTAMP,
  
  -- Standard timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_proposed_changes_entity ON proposed_changes(entity_type, entity_id);
CREATE INDEX idx_proposed_changes_status ON proposed_changes(status);
```

## API Endpoints

### Create Proposal
```
POST /api/proposed-changes
Body: {
  entity_type: 'incident' | 'statement',
  entity_id: number,
  proposed_data: object,
  change_summary?: string,
  submitted_by?: string
}
Response: { id, status, ... }
```

### List Proposals
```
GET /api/proposed-changes?status=pending_review&entity_type=incident
Response: { proposals: [...], total: number }
```

### Get Single Proposal (with original for comparison)
```
GET /api/proposed-changes/[id]
Response: { 
  proposal: {...}, 
  original: {...},  // The current state of the entity
  changed_fields: ['field1', 'field2']
}
```

### Update Proposal Status (Review/Validate)
```
PATCH /api/proposed-changes/[id]
Body: {
  action: 'approve_for_validation' | 'validate' | 'reject',
  notes?: string,
  reviewer?: string
}
```

### Apply Changes (called automatically on validation)
Internal function that:
1. Updates the original entity with proposed_data
2. Marks proposal as 'approved'
3. Sets applied_at timestamp

## UI Components

### 1. "Suggest Changes" Button
Location: Incident detail page, Statement detail page
Only visible for published records

### 2. Change Proposal Form
Path: `/dashboard/incidents/[id]/propose-changes`
Path: `/dashboard/statements/[id]/propose-changes`
- Pre-filled with current data
- Looks exactly like review form
- "Submit Proposed Change" button
- Optional "Change Summary" textarea

### 3. Proposed Changes Dashboard
Path: `/dashboard/proposed-changes`
- Tabs: All | Incidents | Statements
- Status filter: Pending Review | Pending Validation | Approved | Rejected
- Table columns: ID, Type, Entity, Summary, Status, Submitted, Actions

### 4. Review Proposed Change Page
Path: `/dashboard/proposed-changes/[id]/review`
- Side-by-side comparison: Original vs Proposed
- Highlight changed fields
- Approve / Reject buttons
- Notes field

### 5. Validate Proposed Change Page  
Path: `/dashboard/proposed-changes/[id]/validate`
- Similar to review page
- Validate / Reject buttons
- Checkbox validation for changed fields

## Files to Create/Modify

### New Files:
1. `src/app/api/proposed-changes/route.ts` - List & create proposals
2. `src/app/api/proposed-changes/[id]/route.ts` - Get, update, apply
3. `src/app/dashboard/proposed-changes/page.tsx` - Queue listing
4. `src/app/dashboard/proposed-changes/[id]/review/page.tsx` - Review UI
5. `src/app/dashboard/proposed-changes/[id]/validate/page.tsx` - Validation UI
6. `src/app/dashboard/incidents/[id]/propose-changes/page.tsx` - Incident change form
7. `src/app/dashboard/statements/[id]/propose-changes/page.tsx` - Statement change form
8. `scripts/create-proposed-changes-table.js` - Database migration

### Modified Files:
1. `src/app/dashboard/incidents/[id]/page.tsx` - Add "Suggest Changes" button
2. `src/app/dashboard/statements/[id]/page.tsx` - Add "Suggest Changes" button  
3. `src/app/dashboard/layout.tsx` - Add nav link to proposed changes queue

## Changed Fields Detection

When comparing original to proposed, detect which fields actually changed:
```typescript
function getChangedFields(original: any, proposed: any): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(proposed)) {
    if (JSON.stringify(original[key]) !== JSON.stringify(proposed[key])) {
      changed.push(key);
    }
  }
  return changed;
}
```

## Implementation Order

### Phase 1: Database & API Foundation
1. Create `proposed_changes` table
2. Create API endpoints (CRUD + status updates)
3. Test API with curl/Postman

### Phase 2: Proposal Creation UI
4. Create incident propose-changes form
5. Create statement propose-changes form
6. Add "Suggest Changes" buttons to detail pages

### Phase 3: Review & Validation UI
7. Create proposed-changes queue page
8. Create review page with side-by-side comparison
9. Create validation page
10. Add nav link to dashboard

### Phase 4: Apply Changes Logic
11. Implement apply function that updates original
12. Test full flow end-to-end

## Testing Checklist

### API Tests:
- [ ] Can create proposal for incident
- [ ] Can create proposal for statement
- [ ] Can list proposals with filters
- [ ] Can get single proposal with original data
- [ ] Can approve proposal for validation
- [ ] Can reject proposal at review stage
- [ ] Can validate proposal (applies changes)
- [ ] Can reject proposal at validation stage
- [ ] Original entity unchanged until validation

### UI Tests:
- [ ] Propose changes form loads with current data (incident)
- [ ] Propose changes form loads with current data (statement)
- [ ] Form submission creates proposal
- [ ] Queue shows proposals with correct status
- [ ] Review page shows side-by-side comparison
- [ ] Changed fields are highlighted
- [ ] Approve moves to pending_validation
- [ ] Reject marks as rejected
- [ ] Validation page works correctly
- [ ] Validated changes appear on original record

### Edge Cases:
- [ ] Multiple pending proposals for same entity
- [ ] Proposal when original has been modified since
- [ ] Empty change (no fields modified)
- [ ] Proposal for non-existent entity

## Security Considerations

- Only authenticated users can create proposals
- Only admins can review proposals
- Only validators can validate proposals
- Audit trail maintained for all actions
- Original data preserved (can see history)

## Future Enhancements

- Email notifications on proposal submission
- Diff view showing exact text changes
- Batch apply multiple proposals
- Public submission (with additional review)
- Proposal comments/discussion thread
- Auto-detect conflicting proposals
