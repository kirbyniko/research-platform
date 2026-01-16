# Multi-Incident Type Selection Plan

## Overview
Allow incidents to have multiple types (e.g., "protest_suppression" + "excessive_force" + "arrest").

## Implementation Status

### ✅ COMPLETED
1. **Database Migration** - `incident_types TEXT[]` column added with GIN index
2. **API Updates** - `createIncident()` handles array, validation accepts array
3. **Extension HTML** - Checkbox grid UI replacing dropdown
4. **Extension JS** - Multi-select support:
   - `getSelectedIncidentTypes()` - reads all checked types
   - `setIncidentTypeCheckboxes()` - sets checkboxes from array
   - `handleIncidentTypeChange()` - shows sections for ALL selected types
   - `buildIncidentObject()` - sends `incident_types` array
   - `addTypeSpecificDetails()` - adds details for each type

### ⚠️ MANUAL STEP REQUIRED
Copy extension files to extension-dist (terminal has issues):
```
copy extension\sidepanel.js extension-dist\sidepanel.js
copy extension\sidepanel.html extension-dist\sidepanel.html
```

### 🔲 TODO
- Website UI - replicate checkbox approach in review page
- Full testing of multi-type flows
- Commit and push to trigger Vercel deploy

---

## Current State

### Database
- `incidents.incident_type` - single VARCHAR column (backward compat)
- `incidents.incident_types` - TEXT[] array column (NEW)
- `incident_details` - stores type-specific data with `detail_type` and JSONB `details`
  - Already supports multiple rows per incident (one per detail_type)

### UI
- Single dropdown for incident type selection
- Type-specific form sections shown/hidden based on single type

### Incident Types
```
death_in_custody, death_during_operation, death_at_protest, detention_death,
shooting, excessive_force, medical_neglect, protest_suppression,
arrest, injury, rights_violation, retaliation
```

---

## Proposed Changes

### Phase 1: Database Migration

**Option A: Array Column (Recommended)**
```sql
-- Add new array column
ALTER TABLE incidents ADD COLUMN incident_types TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data
UPDATE incidents SET incident_types = ARRAY[incident_type] WHERE incident_type IS NOT NULL;

-- Eventually deprecate old column (after testing)
-- ALTER TABLE incidents DROP COLUMN incident_type;
```

**Pros:**
- PostgreSQL has excellent array support
- Can use `@>` (contains), `&&` (overlaps) operators for queries
- Simpler than junction table
- GIN index for fast queries: `CREATE INDEX idx_incident_types ON incidents USING GIN(incident_types);`

**Queries:**
```sql
-- Find all with excessive_force
SELECT * FROM incidents WHERE 'excessive_force' = ANY(incident_types);

-- Find all with BOTH protest_suppression AND excessive_force  
SELECT * FROM incidents WHERE incident_types @> ARRAY['protest_suppression', 'excessive_force'];

-- Find all with ANY of these types
SELECT * FROM incidents WHERE incident_types && ARRAY['shooting', 'death_in_custody'];
```

### Phase 2: API Changes

**GET /api/incidents/[id]**
```json
{
  "incident": {
    "incident_types": ["protest_suppression", "excessive_force"],
    "incident_type": "protest_suppression"  // Keep for backward compatibility (primary type)
  }
}
```

**POST/PUT endpoints**
- Accept both `incident_type` (string) and `incident_types` (array)
- If only `incident_type` provided, convert to array
- If `incident_types` provided, use that and set `incident_type` to first item (primary)

### Phase 3: UI Changes

#### Extension (sidepanel.html)
Replace single dropdown with checkbox group:

```html
<div id="incidentTypes" class="grid grid-cols-2 gap-2">
  <label class="flex items-center gap-2 text-sm">
    <input type="checkbox" name="incidentType" value="death_in_custody" class="incident-type-checkbox">
    Death in Custody
  </label>
  <label class="flex items-center gap-2 text-sm">
    <input type="checkbox" name="incidentType" value="shooting" class="incident-type-checkbox">
    Shooting
  </label>
  <!-- ... more types ... -->
</div>
```

#### Extension (sidepanel.js)
```javascript
// Replace single incidentType with array
currentCase.incidentTypes = ['protest_suppression', 'excessive_force'];

// Show sections for ALL selected types
function handleIncidentTypesChange() {
  const selectedTypes = getSelectedIncidentTypes();
  
  // Hide all type-specific sections
  hideAllTypeSections();
  
  // Show sections for each selected type
  selectedTypes.forEach(type => {
    showSectionForType(type);
  });
  
  updateCaseFromForm();
}

function getSelectedIncidentTypes() {
  return Array.from(document.querySelectorAll('.incident-type-checkbox:checked'))
    .map(cb => cb.value);
}

function showSectionForType(type) {
  switch(type) {
    case 'protest_suppression':
      elements.protestSection?.classList.remove('hidden');
      break;
    case 'excessive_force':
      elements.excessiveForceSection?.classList.remove('hidden');
      break;
    case 'shooting':
      elements.shootingSection?.classList.remove('hidden');
      break;
    // ... etc
  }
}
```

#### Website (review page)
Similar changes - replace dropdown with checkboxes.

### Phase 4: Data Model for incident_details

The `incident_details` table already supports multiple rows per incident with different `detail_type` values. No changes needed.

When saving, create/update a row in `incident_details` for EACH selected type that has associated form fields.

```javascript
// On save, for each type with data:
async function saveTypeSpecificDetails() {
  for (const type of selectedTypes) {
    const details = getDetailsForType(type);
    if (Object.keys(details).length > 0) {
      await fetch(`/api/incidents/${id}/details`, {
        method: 'PUT',
        body: JSON.stringify({ detail_type: type, details })
      });
    }
  }
}
```

---

## Type → Section Mapping

| Incident Type | Form Sections Shown |
|--------------|---------------------|
| death_in_custody | Death Details |
| death_during_operation | Death Details |
| death_at_protest | Death Details, Protest Details |
| detention_death | Death Details |
| shooting | Shooting Details |
| excessive_force | Excessive Force Details, Injury Details |
| medical_neglect | Medical Neglect Details |
| protest_suppression | Protest Details |
| arrest | Arrest Details |
| injury | Injury Details |
| rights_violation | Violation Details |
| retaliation | Violation Details |

**When multiple types selected:**
Show union of all their sections (deduplicated).

Example: `protest_suppression` + `excessive_force` + `arrest` shows:
- Protest Details
- Excessive Force Details  
- Injury Details
- Arrest Details

---

## Migration Strategy

1. **Add `incident_types` column** (array, nullable initially)
2. **Migrate existing data** - copy `incident_type` to `incident_types` array
3. **Update API** - return both fields, accept both
4. **Update Extension** - support multi-select, backward compatible
5. **Update Website** - support multi-select, backward compatible
6. **Verify everything works**
7. **Remove old `incident_type` column** (optional, can keep for simplicity)

---

## Considerations

### Primary Type
- Keep concept of "primary" incident type for:
  - Display name/categorization
  - Default sorting
  - Backward compatibility
- Could be first in array, or separate `primary_incident_type` column

### Validation
- At least one type required
- Some combinations may not make sense (warn but allow?)

### Search/Filter
- Dashboard filters need to handle arrays
- "Show all with shooting" should include multi-type incidents

### Statistics
- How to count? An incident with 3 types counts as 1 incident, not 3
- Type breakdown stats need adjustment

---

## Implementation Order

1. ✅ Quick fix: Remove excessive_force from protest_suppression (done)
2. 🔲 Database migration script
3. 🔲 Update API endpoints
4. 🔲 Update Extension UI (checkbox multi-select)
5. 🔲 Update Website UI (checkbox multi-select)
6. 🔲 Test all flows
7. 🔲 Update test cases

---

## Questions to Resolve

1. Should there be a "primary" incident type, or are all types equal?
2. Any type combinations that should be prohibited or warned?
3. How should multi-type incidents display in lists/cards?
4. Should existing incidents be reviewed to add additional types?
