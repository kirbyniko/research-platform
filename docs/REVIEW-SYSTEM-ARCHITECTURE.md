# Review System Architecture

## Current Workflow (January 2026)

### Status Flow
```
pending ? first_review ? second_review ? first_validation ? verified
                                    ?
                              (if returned)
                                    ?
                         first_review (review_cycle increments)
```

### Review Phase (Edit Mode)
1. **Pending** - Case needs first review
2. **First Review** - One analyst reviewed, needs second
3. **Second Review** - Two analysts reviewed, ready for validation

### Validation Phase (Read-Only)
4. **First Validation** - One validator confirmed, needs second
5. **Verified** - Published and public

### Special States
- **Rejected** - Case is not publishable
- **Returned for Re-Review** - Case has `review_cycle >= 2` (was returned from validation)

## Database Columns

### incidents table
- `verification_status`: pending | first_review | second_review | first_validation | verified | rejected
- `review_cycle`: INTEGER (default 1, increments when returned from validation)
- `first_verified_by`, `first_verified_at`: First reviewer
- `second_verified_by`, `second_verified_at`: Second reviewer  
- `first_validated_by`, `first_validated_at`: First validator
- `second_validated_by`, `second_validated_at`: Second validator
- `rejected_by`, `rejected_at`, `rejection_reason`: Rejection tracking

### validation_issues table
Stores feedback when cases are returned from validation:
- `incident_id`: Which case
- `validation_session_id`: Groups issues from same return action
- `field_type`: field | quote | timeline | source
- `field_name`: Which specific item had the issue
- `issue_reason`: Why it failed validation
- `created_by`, `created_at`: Who returned it and when
- `resolved_at`: When the issue was addressed (NULL if unresolved)

## Dashboard Features

### Stats Cards
- Needs Review (pending + first_review)
- Needs Validation (second_review + first_validation)  
- Published
- Rejected
- Total

### Special Alert Cards (appear when count > 0)
- Returned for Re-Review: Cases with validation feedback
- Ready for Re-Validation: Re-reviewed cases awaiting validation

### Filter Buttons
Primary (colored):
- Needs Review (yellow)
- Needs Validation (purple)
- Rejected (red)

Secondary (gray):
- Pending, 2nd Review, Published, All

### Case Cards
- Orange border + background for returned cases (review_cycle >= 2)
- Status badges show Re-Review or Re-Validation for returned cases
- Cycle indicator shows which review round

## Key Principles

1. **Review = Editing** - Analysts can modify data during review
2. **Validation = Certification** - Validators can only check/flag, not edit
3. **Different People** - Cannot review/validate same case twice in same phase
4. **Feedback Loop** - Returned cases show validation feedback to reviewers
5. **Cycle Tracking** - review_cycle tracks how many times returned

## Chrome Extension Features

### Review Tab
- Shows all cases awaiting review
- Filter buttons: All, Returned, New
- Priority badges for returned cases:
  - Orange PRIORITY for cycle 2
  - Red HIGH PRIORITY for cycle 3+
- Cycle badges show Cycle X
- Card styling:
  - Orange left border + background for cycle 2
  - Red left border + light red background for cycle 3+
- Returned cases sorted to top of queue

### Validate Tab
- Shows all cases awaiting validation
- Filter buttons: All, Re-validate, New
- Priority alert for re-validation cases (clickable to filter)
- Same priority badge system as Review tab
- Case details show:
  - Cycle badge in title
  - Status badge changes to RE-VALIDATION REQUIRED for returned cases
  - Orange/red banner with cycle info
  - Previous validation issues displayed prominently

## API Endpoints

### GET /api/verification-queue
Query params:
- status: Filter by verification status
  - needs_review: pending + first_review
  - needs_validation: second_review + first_validation
  - returned_for_review: review statuses with cycle >= 2
  - revalidation: validation statuses with cycle >= 2

Response includes:
- incidents[]: Array with review_cycle field
- stats: Includes returned_for_review and revalidation counts

### POST /api/incidents/[id]/validate
Actions:
- validate: Approve case (advances status)
- return_to_review: Send back with feedback (increments review_cycle)
- reject: Mark as rejected
