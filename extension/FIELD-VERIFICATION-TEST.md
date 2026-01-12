# Field Verification Testing Guide

## What Changed
The extension review mode now matches the website's field-by-field verification workflow. Analysts must explicitly verify each field with data before submitting.

## Testing Steps

### 1. Install Updated Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension-dist` folder
5. Pin the extension to your toolbar

### 2. Configure Extension
1. Click the extension icon
2. Enter your analyst API key (from website settings)
3. Verify connection status shows green "Connected"

### 3. Test Review Workflow

#### Load a Case for Review
1. Switch to "Review" tab in extension
2. Click "Load Review Queue"
3. Select an unverified case from the list
4. Click to load the case details

**Expected:** Extension switches to "Incident" tab with case data populated

#### Verify Field Checkboxes Appear
Once in review mode, check that:
- ✅ Each field with data shows a "Verified" checkbox next to its label
- ✅ Empty fields do NOT show checkboxes
- ✅ Submit button says "Submit Verification" (green)
- ✅ Verification counter appears showing "0/X fields verified"

**Fields that should have checkboxes (if they have data):**
- Subject Name
- Incident Date
- Age
- Nationality
- Occupation
- Facility
- Location
- Summary

#### Test Verification Tracking
1. Check one field's verification checkbox
2. **Expected:** Checkbox label turns green and says "Verified"
3. **Expected:** Counter updates (e.g., "1/8 fields verified")
4. Check all remaining fields
5. **Expected:** Counter shows "8/8 fields verified" in green

#### Test Validation (Preventing Unverified Submission)
1. Uncheck at least one field
2. Click "Submit Verification" button
3. **Expected:** Alert appears saying "Please verify all fields before submitting"
4. **Expected:** Alert lists which fields are unverified
5. **Expected:** Unverified fields briefly highlight with yellow background

#### Test Successful Submission
1. Check ALL field verification checkboxes
2. Click "Submit Verification"
3. **Expected:** Button shows spinner and "Submitting..."
4. **Expected:** Success alert appears
5. **Expected:** Extension returns to Review tab
6. **Expected:** Review queue reloads
7. **Expected:** The submitted case is removed from queue

### 4. Test Normal (Non-Review) Mode
1. Switch to "Incident" tab
2. Click "Clear" or start entering a new case
3. **Expected:** NO verification checkboxes appear
4. **Expected:** Submit button says "Save Incident" (blue)
5. **Expected:** Can save normally without verification checks

## Field Verification Rules

### What Gets a Checkbox
- Any field that has data (non-empty value)
- Fields are checked when review mode loads

### What Doesn't Need Verification
- Empty fields
- Fields not applicable to incident type
- Fields without data

### Validation Rules
- ALL populated fields must be checked before submission
- System blocks submission with unverified fields
- Clear error message shows which fields need verification

## Comparison with Website

The extension should now match the website review page exactly:

| Feature | Website | Extension |
|---------|---------|-----------|
| Checkbox per field | ✅ | ✅ |
| Verification counter | ✅ | ✅ |
| Block unverified submission | ✅ | ✅ |
| Highlight unverified fields | ✅ | ✅ |
| Only show for fields with data | ✅ | ✅ |
| Green checkmark when verified | ✅ | ✅ |

## Known Limitations
- Extension does not support field-level quote linking in review mode (website does)
- Extension does not show individual field history (website does)
- Extension review is single-analyst (website requires two analysts)

## Troubleshooting

### Checkboxes Don't Appear
- Ensure you're in review mode (loaded a case from Review tab)
- Verify fields actually have data
- Check browser console for errors

### Counter Doesn't Update
- Try refreshing extension
- Check that checkboxes are being checked/unchecked
- Verify `verifiedFields` object is tracking state (check console)

### Validation Doesn't Block Submission
- Ensure all fields with checkboxes are checked
- Review console for JavaScript errors
- Verify `submitVerification` function is running

## Report Issues
If you find bugs or unexpected behavior:
1. Note which step failed
2. Check browser console for errors (F12 → Console)
3. Screenshot the issue
4. Report with incident ID being reviewed
