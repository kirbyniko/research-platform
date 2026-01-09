# Review Form Frontend Testing Guide

**Time Required:** 15 minutes  
**Prerequisite:** Run `node scripts/test-review-form-auto.js` first (proves DB works)

---

## Setup
1. Open: http://localhost:3000/dashboard/review/42
2. Open terminal: `node scripts/verify-db-data.js 42` (leave this open)

---

## Test Path (15 minutes)

### 1. BASIC FIELDS (2 min)
- [ ] Change **Victim Name** to "Frontend Test" → **Save Details**
- [ ] Run: `node scripts/verify-db-data.js 42`
- [ ] Verify: `"victim_name": "Frontend Test"` appears
- [ ] Refresh page → confirm name still shows

### 2. INCIDENT TYPE SWITCHING (3 min)
- [ ] Change **Incident Type** to "Shooting" → **Save Details**
- [ ] Verify shooting fields appear (Fatal, Shots Fired, etc.)
- [ ] Fill in: Fatal ✓, Shots Fired: 3, Weapon: Handgun
- [ ] **Save Type-Specific Details**
- [ ] Run: `node scripts/verify-db-data.js 42`
- [ ] Verify shows: `shooting:` with `shooting_fatal: true` and `shots_fired: 3`

### 3. TYPE CHANGES (2 min)
- [ ] Change type to "Death in Custody" → **Save Details**
- [ ] Verify death fields appear (Cause of Death, etc.)
- [ ] Fill in: Cause of Death: "Test", Autopsy Available ✓
- [ ] **Save Type-Specific Details**
- [ ] Run verify script → confirm shows `death:` details

### 4. AGENCIES (1 min)
- [ ] Check **ICE** checkbox (no save button - auto-saves)
- [ ] Check **CBP** checkbox
- [ ] Run verify script → confirm shows both agencies
- [ ] Uncheck **CBP** → verify script → CBP should be gone

### 5. VIOLATIONS (2 min)
- [ ] Check **4th Amendment**
- [ ] Type description: "Test violation"
- [ ] Click **Case Law dropdown** → Select "Graham v. Connor"
- [ ] Click outside (auto-saves)
- [ ] Run verify script → confirm violation with description and case law

### 6. SOURCES (1 min)
- [ ] Add source: URL: `https://test.com`, Title: "Test Source"
- [ ] Click **Add**
- [ ] Verify appears in list
- [ ] Run verify script → confirm source exists

### 7. QUOTES (2 min)
- [ ] Add quote: Text: "Frontend test quote", Category: witness_statement
- [ ] Select the source you just created
- [ ] Click **Add**
- [ ] Verify appears in quotes list
- [ ] Find quote in list, click **ⓘ** button
- [ ] Should show "Unverified" badge and source link
- [ ] Click **Verify** → badge should change to "Verified ✓"
- [ ] Run verify script → confirm `verified: true`

### 8. QUOTE LINKING (2 min)
- [ ] Go to **Victim Name** field
- [ ] Click **[src] Link...** button next to it
- [ ] Select the quote you created
- [ ] Should show `[linked]` badge with ✓ or ! indicator
- [ ] Click **ⓘ** next to the linked badge
- [ ] Should show full quote with verify status
- [ ] Run verify script → confirm quote has `Linked to: victim_name`

---

## Success Criteria

Run final verification:
```bash
node scripts/verify-db-data.js 42
```

Should show:
- ✅ Victim name: "Frontend Test"
- ✅ Incident type matches what you set (shooting/death/etc)
- ✅ Type-specific details saved (shooting_fatal, shots_fired, etc)
- ✅ Agencies: ICE (and not CBP)
- ✅ Violations: 1+ with description and case law
- ✅ Sources: "Test Source"
- ✅ Quotes: "Frontend test quote" with verified=true
- ✅ Quote linked to victim_name field

---

## If Anything Fails

1. Check browser console for errors
2. Check dev server output for API errors
3. Note which specific action failed (e.g., "Save Type-Specific Details doesn't save shooting_fatal")
4. Run the database test to confirm DB layer works: `node scripts/test-review-form-auto.js`

---

## Quick Smoke Test (5 min)
If you only have 5 minutes:
1. Change victim name → verify saves
2. Switch to Shooting → fill details → verify saves
3. Add agency → verify saves
4. Add violation → verify saves
5. Add quote → verify quote → link to field → verify saves
