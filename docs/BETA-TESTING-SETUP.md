# Beta Testing Setup - Admin Instructions

## Before Sending to Testers

### 1. Prepare Test Environment
- [ ] Ensure production/staging site is deployed and accessible
- [ ] Create test account credentials:
  - Username: `betatester1` (or similar)
  - Password: `[secure password]`
  - Role: `analyst` (gives review form access)

### 2. Package Extension
```bash
cd extension-dist
# Send them: ice-deaths-extension-v1.0.zip
```

### 3. Customize Beta Testing Guide
Open `docs/BETA-TESTING-GUIDE.md` and replace:
- `[SITE_URL]` with your actual URL (e.g., `https://ice-deaths.vercel.app`)
- Send extension ZIP file separately

### 4. Send to Testers

**Email Template:**
```
Subject: Beta Testing - ICE Deaths Documentation Platform

Hi [Tester Name],

Thank you for agreeing to beta test the ICE Deaths platform. 

CREDENTIALS:
- Site: https://[your-site].vercel.app
- Username: betatester1
- Password: [password]

INSTRUCTIONS:
- Attached: Beta Testing Guide (PDF)
- Attached: Extension (ice-deaths-extension-v1.0.zip)
- Estimated time: 30-45 minutes
- Please complete all test cases and return the filled guide

IMPORTANT:
- This is test data only - nothing you submit will affect real cases
- Your test submissions will be marked with "BETA TEST" for easy cleanup

Questions? Reply to this email.

Thanks,
[Your name]
```

### 5. After Testing

**Review Results:**
```bash
# Check what test data was created
node scripts/verify-db-data.js [incident_id_from_tester]
```

**Cleanup Test Data:**
```sql
-- Connect to your database
DELETE FROM incidents WHERE victim_name LIKE '%BETA TEST%' OR victim_name LIKE '%Test Extension%';
DELETE FROM incidents WHERE incident_id LIKE 'TEST-%';
```

---

## Quick Verification Checklist

Before sending to testers, verify these work:

### Extension
```bash
# Test extension loads
1. Load extension in Chrome
2. Visit any ICE.gov page
3. Click extension icon - panel opens
✓ Works
```

### Guest Submission
```bash
# Test in private/incognito window
1. Go to /submit
2. Fill form
3. Submit
✓ Gets added to queue
```

### Review Form
```bash
# Test with test account
1. Login as betatester1
2. Go to /dashboard/review/[any_id]
3. Make changes
4. Verify saves with: node scripts/verify-db-data.js [id]
✓ Data persists
```

### Public Site
```bash
# Test without login
1. Logout
2. Browse homepage
3. View case details
✓ Verified cases visible
```

---

## Common Tester Issues

### "Extension won't load"
- **Fix:** Make sure they enabled Developer Mode in chrome://extensions
- **Fix:** Try Edge instead of Chrome

### "Can't login"
- **Check:** Verify account exists in database
- **Check:** Verify account has `analyst` role (not just `viewer`)

### "Changes don't save"
- **Check:** Check dev server logs for API errors
- **Check:** Verify DATABASE_URL is set correctly in production
- **Check:** Run automated test: `node scripts/test-review-form-auto.js`

### "Don't see test incidents"
- **Check:** Make sure incidents have `submitted_by` matching the test user ID
- **Fix:** Guest submissions go to queue automatically, extension submissions need analyst to see them

---

## Tester Results Analysis

### Scoring Interpretation

**Extension Issues (TC1.x fails):**
- Affects: Data capture workflow
- Priority: High (core feature)
- Fix first: Extension side panel, data extraction

**Review Form Issues (TC3.x fails):**
- Affects: Analyst workflow
- Priority: Critical (main interface)
- Fix first: Save operations, field validation

**Public Site Issues (TC5.x fails):**
- Affects: End users
- Priority: High (public-facing)
- Fix first: Data display, case rendering

### Response Template

```
Thank you for completing the beta test!

RESULTS SUMMARY:
- Overall Pass Rate: [X]%
- Critical Issues Found: [X]
- Minor Issues: [X]

We're addressing the following issues you found:
1. [Issue from their report] - [Status: Fixed/In Progress/Planned]
2. [Issue from their report] - [Status]

Updated version will be ready by [date]. Would you be willing to do a quick re-test
of the fixed issues?

Thanks again,
[Your name]
```
