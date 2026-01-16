# Field Visibility Specification

## Overview
This document specifies which fields are visible based on incident type. The **web version** is the source of authority.

## Incident Types

| Category | Type Value | Display Name |
|----------|------------|--------------|
| Deaths | `death_in_custody` | Death in Custody |
| Deaths | `death_during_operation` | Death During Operation |
| Force/Violence | `shooting` | Shooting |
| Force/Violence | `excessive_force` | Excessive Force |
| Force/Violence | `injury` | Injury |
| Enforcement | `arrest` | Arrest/Detention |
| Enforcement | `deportation` | Deportation |
| Enforcement | `workplace_raid` | Workplace Raid |
| Rights Issues | `rights_violation` | Rights Violation |
| Rights Issues | `medical_neglect` | Medical Neglect |
| Other | `other` | Other |

### Extension-Only Types (to add to web):
- `death_at_protest` - Death at Protest
- `family_separation` - Family Separation
- `protest_suppression` - Protest Suppression
- `retaliation` - Retaliation

## Always-Visible Fields (All Types)

### Basic Information
| Field | Web | Extension | Notes |
|-------|-----|-----------|-------|
| Incident Type | ✅ | ✅ | Required |
| Subject/Victim Name | ✅ | ✅ | Required |
| Incident Date | ✅ | ✅ | Required |
| Location (City, State) | ✅ (combined) | ✅ (combined) | Web uses single field, extension uses combined |
| Facility Name | ✅ | ✅ | If applicable |
| Description/Summary | ✅ | ✅ | Required on web |

### Subject Details (Optional Collapsible)
| Field | Web | Extension | Status |
|-------|-----|-----------|--------|
| Age | ✅ | ✅ | ✅ Match |
| Gender | ✅ | ✅ | ✅ Added to extension |
| Nationality | ✅ | ✅ | ✅ Match |
| City | ✅ | ✅ | ✅ Added separate field |
| State | ✅ | ✅ | ✅ Added separate field |
| Occupation | ❌ | ❌ | ✅ Removed from extension |
| Immigration Status | ❌ | ✅ | ✅ Added to extension |

### Agencies Involved
| Field | Web | Extension | Notes |
|-------|-----|-----------|-------|
| ICE | ✅ | ✅ | Match |
| ICE ERO | ✅ | ✅ | Match |
| CBP | ✅ | ✅ | Match |
| Border Patrol | ✅ | ✅ | Match |
| Local Police | ✅ | ✅ | Match |
| State Police | ✅ | ✅ | Match |
| US Marshals | ✅ | ✅ | Match |
| National Guard | ✅ | ✅ | Match |
| DHS | ✅ | ✅ | Match |
| Private Contractor | ✅ | ✅ | Match |
| Other | ✅ | ✅ | Match |
| Unknown | ✅ | ✅ | Match |

## Conditional Fields by Incident Type

### Death Types (`death_in_custody`, `death_during_operation`)

| Field | Web | Extension | Action |
|-------|-----|-----------|--------|
| Cause of Death | ✅ | ✅ | Match |
| Manner of Death | ✅ | ✅ | Match |
| Custody Duration | ✅ | ✅ | Match |
| Medical Denied | ✅ | ✅ | Match |

### Shooting (`shooting`)

| Field | Web | Extension | Action |
|-------|-----|-----------|--------|
| Shots Fired | ✅ | ✅ | Match |
| Weapon Type | ✅ | ✅ | Match |
| Bodycam Available | ✅ | ✅ | Match |
| Victim Armed | ✅ | ✅ | Match |
| Context | ✅ | ✅ | Match |
| Fatal | ❌ | ✅ | Extension has extra |
| Warning Given | ❌ | ✅ | Extension has extra |

### Excessive Force (`excessive_force`)

| Field | Web | Extension | Action |
|-------|-----|-----------|--------|
| Force Type: Physical | ✅ | ✅ | Match |
| Force Type: Taser | ✅ | ✅ | Match |
| Force Type: Pepper Spray | ✅ | ✅ | Match |
| Force Type: Baton | ✅ | ✅ | Match |
| Force Type: Rubber Bullets | ✅ | ✅ | Match |
| Force Type: Firearm | ❌ | ✅ | Extension extra |
| Victim Restrained | ✅ | ✅ | Match |
| Victim Complying | ✅ | ✅ | Match |
| Video Evidence | ❌ | ✅ | Extension extra |

### Constitutional Violations

**Web Review Page:** Always visible for all incident types

**Extension:** Now always visible (matches web review page)

~~**Old Extension Behavior:** Visible for:~~
~~- `rights_violation`~~
~~- `arrest`~~
~~- `shooting`~~
~~- `excessive_force`~~
~~- `death_in_custody`~~
~~- `death_during_operation`~~
~~- `death_at_protest`~~
~~- `protest_suppression`~~
~~- `retaliation`~~

**Action:** ✅ Updated - violations section now always visible in extension

## Required Changes

### Extension Changes ✅ COMPLETED
1. ~~**Remove:** Occupation field~~ ✅ Done
2. ~~**Add:** Gender field (dropdown: Male, Female, Other)~~ ✅ Done
3. ~~**Add:** Immigration Status field (dropdown with options)~~ ✅ Done
4. ~~**Add:** Duplicate checker integration~~ ✅ Done
5. ~~**Ensure:** Violations section shows for all death types and force incidents~~ ✅ Verified

### Web Changes (Optional)
1. **Add:** Immigration Status to Subject Details collapsible

## Duplicate Checker Integration ✅ COMPLETED

The extension now includes a duplicate checker similar to the web submit page:

1. **Location:** Below Subject Name field ✅
2. **Trigger:** Manual button click ✅
3. **Display:** ✅
   - Number of potential matches
   - List of matching cases with:
     - Name
     - Date
     - Location
     - Status (verified/unverified/in_review/guest_report)
   - Link to existing case
4. **API Endpoint:** `/api/duplicate-check?name={name}` ✅
