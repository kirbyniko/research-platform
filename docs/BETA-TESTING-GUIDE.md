# Review Form - Quick Test Script

**Time: 10 minutes**

## Setup
1. Login: [SITE_URL]/login (username/password from admin)
2. Go to: [SITE_URL]/dashboard/review/42 (or any incident ID)

---

## Test Steps

### 1. Basic Fields (2 min)
```
Type EXACTLY this:
- Victim Name: "Test QA Run"
- City: "Houston"
- State: "TX"
- Age: 35

Click "Save Details"
Refresh page
✓ All fields still show correct values
✗ Any field wrong or blank = BROKEN
```

### 2. Shooting Type (2 min)
```
Change "Incident Type" to: Shooting
Click "Save Details"
✓ "Shooting Details" section appears below

Fill in:
- Fatal: CHECK the box
- Shots Fired: 3
- Weapon Type: Handgun

Click "Save Type-Specific Details"
Refresh page
✓ All 3 values still correct
✗ Any missing = BROKEN
```

### 3. Death Type (2 min)
```
Change "Incident Type" to: Death in Custody
Click "Save Details"
✓ "Death Details" section appears (different fields)

Fill in:
- Cause of Death: "Medical neglect"
- Autopsy Available: CHECK

Click "Save Type-Specific Details"
Refresh page
✓ Both values still there
✗ Missing = BROKEN
```

### 4. Agencies (1 min)
```
Check: ICE
Check: CBP
Refresh page
✓ Both still checked

Uncheck: ICE
Refresh page
✓ Only CBP checked
✗ Both checked or both unchecked = BROKEN
```

### 5. Violations (2 min)
```
Check: 4th Amendment
Type in description box: "Test description"
Click Case Law dropdown → Select "Graham v. Connor"
Click OUTSIDE the boxes (triggers auto-save)
Refresh page
✓ Violation checked, description there, case law there
✗ Any missing = BROKEN
```

### 6. Source (1 min)
```
Add source:
- URL: https://test.com/article
- Title: "Test Source"
Click "Add"
✓ Appears in list

Refresh page
✓ Still in list
✗ Gone = BROKEN
```

### 7. Quote (2 min)
```
Add quote:
- Text: "Test quote text here"
- Category: witness_statement
- Source: (select the source you just added)
Click "Add"
✓ Quote appears in list

Find quote → Click ⓘ button
✓ Shows badge "Unverified" and "Mark as Verified" button
Click "Mark as Verified"
✓ Badge changes to "Verified ✓"
✗ Doesn't change = BROKEN

Go to Victim Name field → Click [src] Link button
Select your quote
✓ Shows [linked] badge
Click ⓘ next to linked badge
✓ Shows full quote details
✗ Nothing = BROKEN
```

---

## Results

**What broke?** (write line number and what happened):
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

**Everything worked?** YES / NO

**Tester:** _________________ **Date:** _________________
