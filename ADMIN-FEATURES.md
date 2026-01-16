# Admin Features Documentation

## Tag Filtering

### Overview
The analyst dashboard now supports filtering cases by tags. This helps analysts focus on specific types of violations, vulnerable populations, or incident patterns.

### How to Use
1. Navigate to the Dashboard
2. Below the status filter buttons, you'll see a "🏷️ Filter by Tag:" dropdown
3. Select any tag from the dropdown to filter cases
4. Click "Clear" to remove the tag filter
5. Tag filters work in combination with status filters

### Available Tags
Tags are automatically displayed based on what's in the current case set. Common tags include:
- **Incident Nature**: Death in Custody, Use of Force, Shooting, Medical Neglect, etc.
- **Vulnerable Populations**: Minor, Elderly, Young Adult, Asylum Seeker, DACA Recipient
- **Constitutional Issues**: Due Process Violation, False Imprisonment
- **Special Circumstances**: Journalist, Bystander Victim, Protest-Related, etc.

### Technical Details
- **API**: `/api/verification-queue?status={status}&tag={tagName}`
- **Frontend**: Dashboard automatically fetches unique tags and populates dropdown
- **Database**: Tags stored as PostgreSQL TEXT[] array in `incidents.tags` column

---

## Unpublishing Cases (Admin Only)

### Overview
Admins can now unpublish verified cases to send them back to the review queue. This is useful when:
- New information is discovered that changes the case details
- Factual errors are found in published cases
- Additional verification is needed
- Sources need to be updated or corrected

### How to Use
1. Navigate to the Dashboard
2. Filter to view "Published" cases (`verified` status)
3. On any verified case card, admins will see an "↩ Unpublish" button
4. Click the button to open the unpublish modal
5. **Required**: Enter a detailed reason for unpublishing
6. Click "↩ Unpublish & Return to Review" to confirm

### What Happens When Unpublishing
1. Case `verification_status` changes from `verified` → `pending`
2. Case `review_cycle` increments (tracks how many times returned)
3. Case removed from public view
4. Case appears in review queue with 🔄 indicator showing it's a returned case
5. Audit log entry created with:
   - Admin who unpublished
   - Reason provided
   - Timestamp
   - Status change details

### Restrictions
- **Admin Only**: Only users with `role = 'admin'` can unpublish
- **Verified Only**: Can only unpublish cases with `verification_status = 'verified'`
- **Reason Required**: Must provide a non-empty reason

### Technical Details
- **API**: `POST /api/incidents/[id]/unpublish`
- **Payload**: `{ reason: string }`
- **Response**: Success message and updated incident data
- **Audit**: Logged to `incident_audit_log` table
- **Frontend**: Modal with required reason field, double-confirmation

---

## Tag Display on Dashboard

### Where Tags Appear
Tags are now visible on every case card in the analyst dashboard:
- Displayed after data completeness indicators
- Shows first 4 tags as blue badges
- "+N more" indicator if case has more than 4 tags
- Hovering over tags shows full tag text

### Tag Badge Styling
- Background: Light blue (`bg-blue-50`)
- Text: Dark blue (`text-blue-700`)
- Border: Blue outline (`border-blue-200`)
- Size: Extra small text with padding

---

## Benefits for Analysts

### Pattern Recognition
- Quickly identify cases involving specific violation types
- Track trends in ICE deaths over time
- Focus on vulnerable populations (minors, elderly, asylum seekers)

### Workflow Efficiency
- Filter to work on specific types of cases
- Prioritize cases based on personal expertise or interest
- Reduce cognitive load by focusing on one category at a time

### Quality Control (Unpublish)
- Correct errors in published cases without permanent damage
- Update cases as new information emerges
- Maintain accuracy and credibility of the database

---

## Implementation Files

### Tag Filtering
- **API**: `src/app/api/verification-queue/route.ts`
  - Added `tag` query parameter support
  - PostgreSQL array query: `$tag = ANY(i.tags)`
- **Frontend**: `src/app/dashboard/page.tsx`
  - Added `tagFilter` and `availableTags` state
  - Dynamic dropdown populated from fetched cases
  - Filter UI with clear button

### Unpublishing
- **API**: `src/app/api/incidents/[id]/unpublish/route.ts`
  - Admin-only endpoint
  - Updates status to `pending`, increments `review_cycle`
  - Creates audit log entry
- **Frontend**: `src/app/dashboard/page.tsx`
  - Admin-only unpublish button on verified cases
  - Modal with required reason field
  - Confirmation dialog before submission

---

## Future Enhancements

### Potential Tag Features
- Multi-tag filtering (AND/OR logic)
- Tag statistics dashboard
- Tag-based case assignment
- Export reports by tag category
- Tag trending over time

### Potential Unpublish Features
- View unpublish history on case detail page
- Notification system for analysts when their cases are unpublished
- Bulk unpublish for related cases
- Unpublish reason templates (common scenarios)
- Re-publish capability with approval workflow

---

## Testing

### To Test Tag Filtering
1. Login as analyst or admin
2. Navigate to dashboard
3. Verify tag dropdown appears below status filters
4. Select a tag (e.g., "Death in Custody")
5. Verify only cases with that tag are displayed
6. Change status filter - verify tag filter persists
7. Clear tag filter - verify all cases return

### To Test Unpublishing
1. Login as admin (required)
2. Filter dashboard to "Published" cases
3. Select a verified case
4. Verify "↩ Unpublish" button appears
5. Click button to open modal
6. Leave reason blank - verify button disabled
7. Enter reason and confirm
8. Verify case moves to review queue with 🔄 indicator
9. Check audit log in database for entry

---

## Database Schema

No schema changes required - all features use existing columns:
- `incidents.tags` (TEXT[]): Already existed, now utilized
- `incidents.verification_status`: Existing column, values unchanged
- `incidents.review_cycle`: Existing column, now incremented on unpublish
- `incident_audit_log`: Existing table, new action type 'unpublish'

---

## Security Notes

### Tag Filtering
- No special permissions required
- Available to all analyst/editor/admin roles
- Tags filtered on server-side (SQL query)
- No SQL injection risk (parameterized queries)

### Unpublishing
- **Admin role check** on both frontend and backend
- Backend validates user role via `requireServerAuth(request, 'admin')`
- Frontend hides button for non-admins (defense in depth)
- Reason field required and validated
- Audit trail maintains accountability
