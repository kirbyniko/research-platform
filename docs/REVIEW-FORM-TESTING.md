# Review Form Testing Guide

## Overview
This guide covers all the test cases needed to verify the review form (`/dashboard/review/[id]`) saves data correctly to the database.

---

## Prerequisites
1. Dev server running: `npm run dev`
2. Logged in as admin/analyst
3. Have a test incident to work with (note the ID, e.g., `/dashboard/review/42`)

---

## 1. INCIDENT DETAILS SECTION

### Basic Fields (11 fields)

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Victim Name** | Enter "Test Name 123" → Save Details | Refresh page, confirm value persists |
| **Date** | Select a date → Save Details | Refresh page, confirm date persists |
| **Incident Type** | Change type → Save Details | Refresh, confirm type changed |
| **City** | Enter "Test City" → Save Details | Refresh, confirm value |
| **State** | Enter "TX" → Save Details | Refresh, confirm value |
| **Country** | Enter "USA" → Save Details | Refresh, confirm value |
| **Facility** | Enter "Test Facility" → Save Details | Refresh, confirm value |
| **Age** | Enter 35 → Save Details | Refresh, confirm number |
| **Gender** | Enter "male" → Save Details | Refresh, confirm value |
| **Nationality** | Enter "Mexico" → Save Details | Refresh, confirm value |
| **Summary** | Enter long text → Save Details | Refresh, confirm text |

### Quote Linking for Basic Fields

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Any linkable field** | Click [src] Link → Select quote | Field shows [linked] badge |
| **Linked field** | Click ⓘ button | Shows quote details, verification status, source link |
| **Unverified quote** | Click "Mark as Verified" | Badge changes to "Verified ✓" |
| **Linked field** | Click ✕ button | Quote unlinked, shows [src] Link again |

---

## 2. TYPE-SPECIFIC DETAILS

### 2A. SHOOTING Type (8 fields)
*First set Incident Type to "Shooting"*

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Fatal** | Check checkbox → Save Type-Specific Details | Refresh, confirm checked |
| **Shots Fired** | Enter 5 → Save | Refresh, confirm number |
| **Weapon Type** | Select "Handgun" → Save | Refresh, confirm selection |
| **Victim Armed** | Check checkbox → Save | Refresh, confirm checked |
| **Warning Given** | Check checkbox → Save | Refresh, confirm checked |
| **Bodycam Available** | Check checkbox → Save | Refresh, confirm checked |
| **Context** | Enter text → Save | Refresh, confirm text |

### 2B. DEATH Type (5 fields)
*Set Incident Type to "Death in Custody" or similar*

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Cause of Death** | Enter text → Save | Refresh, confirm |
| **Official Cause** | Enter text → Save | Refresh, confirm |
| **Autopsy Available** | Check → Save | Refresh, confirm |
| **Medical Neglect Alleged** | Check → Save | Refresh, confirm |
| **Circumstances** | Enter text → Save | Refresh, confirm |

### 2C. ARREST Type (5 fields)
*Set Incident Type to "Arrest/Detention"*

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Arrest Reason** | Enter text → Save | Refresh, confirm |
| **Charges** | Enter text → Save | Refresh, confirm |
| **Warrant Present** | Check → Save | Refresh, confirm |
| **Selective Enforcement** | Check → Save | Refresh, confirm |
| **Context** | Enter text → Save | Refresh, confirm |

### 2D. EXCESSIVE FORCE Type (7 fields)
*Set Incident Type to "Excessive Force"*

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Force Types** | Check multiple (physical, taser) → Save | Refresh, confirm all checked |
| **Injuries Sustained** | Enter text → Save | Refresh, confirm |
| **Victim Restrained** | Check → Save | Refresh, confirm |
| **Victim Complying** | Check → Save | Refresh, confirm |
| **Video Evidence** | Check → Save | Refresh, confirm |
| **Hospitalization Required** | Check → Save | Refresh, confirm |

### 2E. MEDICAL NEGLECT Type (4 fields)
*Set Incident Type to "Medical Neglect"*

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Medical Condition** | Enter text → Save | Refresh, confirm |
| **Treatment Denied** | Enter text → Save | Refresh, confirm |
| **Requests Documented** | Check → Save | Refresh, confirm |
| **Resulted in Death** | Check → Save | Refresh, confirm |

### 2F. PROTEST SUPPRESSION Type (5 fields)
*Set Incident Type to "Protest Suppression"*

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Protest Topic** | Enter text → Save | Refresh, confirm |
| **Protest Size** | Enter "100-200" → Save | Refresh, confirm |
| **Permit Obtained** | Check → Save | Refresh, confirm |
| **Dispersal Method** | Select option → Save | Refresh, confirm |
| **Arrests Made** | Enter number → Save | Refresh, confirm |

---

## 3. AGENCIES SECTION (12 checkboxes)

| Agency | Test Action | Verify |
|--------|-------------|--------|
| **ICE** | Check checkbox | Immediate DB save (no Save button needed) |
| **ICE ERO** | Check, then uncheck | Agency removed |
| **CBP** | Check checkbox | Verify persists after refresh |
| **Border Patrol** | Check, link quote | Quote linked to agency |
| *...test any 3-4 agencies* | | |

---

## 4. VIOLATIONS SECTION (9 violation types)

### Adding Violations

| Violation | Test Action | Verify |
|-----------|-------------|--------|
| **4th Amendment** | Check checkbox | Immediately saved, shows expanded form |
| **5th Amendment** | Check, add description | Description saves on blur |
| **8th Amendment** | Check, select Case Law | Case law dropdown works, saves |
| *...test 3-4 violations* | | |

### Violation Sub-fields

| Field | Test Action | Verify |
|-------|-------------|--------|
| **Description** | Enter text, click outside | Text saved (no button) |
| **Case Law dropdown** | Click, select "Graham v. Connor" | Selection saved, shows case citation |
| **Case Law "View Details"** | Click after selecting | Shows case info, holding, source link |
| **Quote linking** | Link quote to violation | Shows linked badge with verify status |

---

## 5. SOURCES SECTION

| Action | Test Steps | Verify |
|--------|------------|--------|
| **Add Source** | Enter URL, title, publication → Add | Source appears in list |
| **Delete Source** | Click ✕ → Confirm | Source removed from list |
| **Source Types** | Add with different types (news, court_doc, etc.) | Type saved correctly |
| **Refresh** | After adding sources | All sources persist |

---

## 6. QUOTES SECTION

| Action | Test Steps | Verify |
|--------|------------|--------|
| **Add Quote** | Enter text, select category, link source → Add | Quote appears in list |
| **Quote Categories** | Test: witness_statement, official_statement, media_report | Category saved |
| **Link to Source** | Select source from dropdown | Source connection saved |
| **Delete Quote** | Click ✕ → Confirm | Quote removed |
| **Verify from list** | Check if "Verified" badge shows for verified quotes | Status visible |

### Quote Auto-Suggest (while typing)

| Action | Test Steps | Verify |
|--------|------------|--------|
| **Type in Name field** | Start typing matching quote text | Matching quotes appear below |
| **Stop typing** | Wait 2 seconds | Auto-suggest disappears |
| **Click suggested quote** | Click a matching quote | Quote gets linked to field |
| **Unverified indicator** | Quotes show "Unverified" badge | Badge visible |
| **View Source link** | Click "View Source →" | Opens source URL |
| **Verify button** | Click "Verify" on unverified quote | Quote marked as verified |

---

## 7. TIMELINE SECTION

| Action | Test Steps | Verify |
|--------|------------|--------|
| **Add Entry** | Enter date, description, sequence → Add | Entry appears in list |
| **Link to Source** | Select source from dropdown | Source connection saved |
| **Sequence Order** | Enter numbers (1, 2, 3) | Order saved |
| **Delete Entry** | Click ✕ → Confirm | Entry removed |
| **Refresh** | After adding entries | All entries persist |

---

## EDGE CASES TO TEST

| Case | Test Steps | Expected |
|------|------------|----------|
| **Empty required field** | Clear victim name, save | Should still save (DB allows null) |
| **Special characters** | Enter "O'Brien" in name | Should handle apostrophes |
| **Long text** | Enter 1000+ char summary | Should save without truncation |
| **Number as text** | Enter "abc" in age field | Should reject or save as null |
| **Rapid saves** | Click Save 3x quickly | Should not create duplicates |
| **Concurrent edit** | Open in 2 tabs, edit both | Last save wins |
| **Type change** | Change shooting→death→arrest | Each type's fields save separately |

---

## QUICK SMOKE TEST (5 minutes)

If you only have 5 minutes, test these critical paths:

1. ✅ Change incident type to "Shooting" → Save → Refresh → Verify type persisted
2. ✅ Fill shooting details (fatal=yes, shots=3) → Save Type-Specific → Refresh → Verify
3. ✅ Add a source → Add a quote linked to that source → Verify both appear
4. ✅ Check ICE as agency → Check 4th Amendment violation → Add description → Verify both saved
5. ✅ Add timeline entry → Refresh → Verify entry persists

---

## Automated Test Script

For more comprehensive testing, run:

```bash
# Set environment variables
$env:SESSION_COOKIE = "your-session-cookie-from-browser"
$env:TEST_INCIDENT_ID = "42"

# Run tests
npx ts-node scripts/test-review-form.ts
```

To get your session cookie:
1. Open DevTools (F12)
2. Go to Application → Cookies → localhost:3000
3. Copy the value of `next-auth.session-token`

---

## Test Completion Checklist

- [ ] All basic incident fields save
- [ ] Shooting details save
- [ ] Death details save  
- [ ] Arrest details save
- [ ] Excessive force details save (including force_types array)
- [ ] Medical neglect details save
- [ ] Protest suppression details save
- [ ] Agencies toggle on/off correctly
- [ ] Violations save with description and case law
- [ ] Sources CRUD works
- [ ] Quotes CRUD works
- [ ] Quote verification works
- [ ] Quote field linking works
- [ ] Quote auto-suggest appears while typing
- [ ] Timeline CRUD works
- [ ] All data persists after page refresh
