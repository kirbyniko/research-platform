# Extension Review Mode Requirements

## Current State vs. Required State

### Website Review Mode (Reference Implementation)
Location: `src/app/dashboard/review/[id]/page.tsx`

**Key Features:**
1. **Field Verification Checkboxes**: Every field with data shows a checkbox
2. **Verified Fields Tracking**: `verifiedFields` state object tracks which fields are verified
3. **Visual Indicators**: Unverified fields highlight with yellow background when "Find" button clicked
4. **Verification Counter**: Shows "X/Y fields verified" in header
5. **Required Fields**: All fields with data must be verified before final submission
6. **Quote Linking**: Each field can link to supporting quotes/sources

**Field List (from INCIDENT_FIELDS):**
- `victim_name` - Text
- `incident_date` - Date
- `incident_type` - Select (with groups)
- `city` - Text
- `state` - Text
- `country` - Text
- `facility` - Text
- `subject_age` - Number
- `subject_gender` - Text
- `subject_nationality` - Text
- `subject_immigration_status` - Text
- `summary` - Textarea

### Extension Review Mode (Current Implementation)
Location: `extension/sidepanel.js`

**Current Behavior:**
- `reviewMode` flag set when reviewing
- `reviewIncidentId` stores ID being reviewed
- `verifiedFields` object exists but is NOT USED
- No visual checkboxes for field verification
- Submit button just says "Submit Verification"
- No tracking of which fields have been verified
- No validation to ensure all fields are verified before submission

## Required Changes

### 1. Add Verification Checkboxes to HTML
**File:** `extension/sidepanel.html`

For each form field in the incident details section, add:
```html
<div class="field-verification-group">
  <label for="caseName">
    Name
    <span class="verification-checkbox-wrapper" style="display: none;" data-field="name">
      <input type="checkbox" class="field-verify-checkbox" data-field="name">
      <span class="checkbox-label">Verified</span>
    </span>
  </label>
  <input type="text" class="form-input" id="caseName" placeholder="Last name, First name">
</div>
```

**Fields needing checkboxes:**
- `caseName` → `name` or `victim_name`
- `caseDate` → `incident_date`
- `incidentType` → `incident_type`
- `caseAge` → `subject_age`
- `caseCountry` → `subject_nationality`
- `caseOccupation` → `occupation`
- `caseFacility` → `facility`
- `caseLocation` → `city` / `state`
- `caseSummary` → `summary`

### 2. Update Review Mode UI Logic
**File:** `extension/sidepanel.js`

#### A. Show/Hide Checkboxes Based on Review Mode
```javascript
function updateReviewModeUI() {
  const checkboxWrappers = document.querySelectorAll('.verification-checkbox-wrapper');
  
  if (reviewMode) {
    // Show checkboxes for fields with values
    checkboxWrappers.forEach(wrapper => {
      const fieldName = wrapper.dataset.field;
      const fieldInput = getFieldInputElement(fieldName);
      
      if (fieldInput && fieldInput.value && fieldInput.value.trim() !== '') {
        wrapper.style.display = 'inline-flex';
      }
    });
    
    // Update button
    elements.saveCaseBtn.textContent = 'Submit Verification';
    elements.saveCaseBtn.style.background = '#10b981';
    
    // Show verification counter
    updateVerificationCounter();
  } else {
    // Hide all checkboxes
    checkboxWrappers.forEach(wrapper => {
      wrapper.style.display = 'none';
    });
    
    // Reset button
    elements.saveCaseBtn.textContent = 'Save Incident';
    elements.saveCaseBtn.style.background = '';
  }
}
```

#### B. Track Verification State
```javascript
// Listen to checkbox changes
function setupVerificationListeners() {
  document.querySelectorAll('.field-verify-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const fieldName = e.target.dataset.field;
      verifiedFields[fieldName] = e.target.checked;
      updateVerificationCounter();
    });
  });
}

function updateVerificationCounter() {
  if (!reviewMode) return;
  
  const allFields = Object.keys(verifiedFields);
  const verifiedCount = allFields.filter(f => verifiedFields[f]).length;
  const totalCount = allFields.length;
  
  // Show counter near submit button or in header
  const counter = document.getElementById('verificationCounter');
  if (counter) {
    counter.textContent = `${verifiedCount}/${totalCount} fields verified`;
    counter.style.color = verifiedCount === totalCount ? '#22c55e' : '#f59e0b';
  }
}
```

#### C. Validate Before Submission
```javascript
async function submitVerification() {
  if (!reviewIncidentId) {
    alert('No incident loaded for review');
    return;
  }
  
  // Check if all fields are verified
  const fieldsWithData = Object.keys(verifiedFields);
  const unverifiedFields = fieldsWithData.filter(f => !verifiedFields[f]);
  
  if (unverifiedFields.length > 0) {
    const fieldLabels = unverifiedFields.map(f => getFieldLabel(f)).join(', ');
    alert(`Please verify all fields before submitting.\n\nUnverified fields: ${fieldLabels}`);
    
    // Highlight unverified fields
    unverifiedFields.forEach(fieldName => {
      const input = getFieldInputElement(fieldName);
      if (input) {
        input.style.border = '2px solid #f59e0b';
        input.style.background = '#fef3c7';
        setTimeout(() => {
          input.style.border = '';
          input.style.background = '';
        }, 2000);
      }
    });
    
    return;
  }
  
  // Continue with existing submission logic...
  const saveBtn = document.getElementById('saveCaseBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner white"></div> Submitting...';
  
  // ... rest of existing code
}
```

#### D. Initialize Verification State When Loading Case
```javascript
// In loadReviewCaseDetails(), after populating currentCase:
function initializeVerificationState() {
  verifiedFields = {};
  
  // Reset all checkboxes
  document.querySelectorAll('.field-verify-checkbox').forEach(cb => {
    cb.checked = false;
  });
  
  // Identify fields with data
  const fieldMappings = {
    'caseName': 'name',
    'caseDate': 'incident_date',
    'incidentType': 'incident_type',
    'caseAge': 'subject_age',
    'caseCountry': 'subject_nationality',
    'caseOccupation': 'occupation',
    'caseFacility': 'facility',
    'caseLocation': 'location',
    'caseSummary': 'summary'
  };
  
  Object.entries(fieldMappings).forEach(([inputId, fieldName]) => {
    const input = document.getElementById(inputId);
    if (input && input.value && input.value.trim() !== '') {
      verifiedFields[fieldName] = false; // Start as unverified
    }
  });
  
  updateReviewModeUI();
}
```

### 3. Add CSS Styles
**File:** `extension/sidepanel.html` (in `<style>` section)

```css
.field-verification-group {
  margin-bottom: 12px;
}

.verification-checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 11px;
  color: #666;
}

.field-verify-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.field-verify-checkbox:checked + .checkbox-label {
  color: #22c55e;
  font-weight: 600;
}

#verificationCounter {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #f0f0f0;
  margin-left: 8px;
}
```

### 4. Match Website Validation Rules
- All fields with data MUST be verified
- incident_type always requires verification if set
- Summary field is critical - always verify
- Sources and quotes should also have verification (future enhancement)

## Implementation Priority
1. ✅ Add verification checkbox HTML to all form fields
2. ✅ Wire up checkbox change listeners
3. ✅ Show/hide checkboxes based on review mode
4. ✅ Validate all fields verified before submission
5. ✅ Show verification counter
6. ⚠️ Match exact field names between extension and website
7. ⚠️ Test with real review cases

## Field Name Mapping (Extension → Website)
| Extension HTML ID | Website Field Key | Display Label |
|------------------|-------------------|---------------|
| caseName | victim_name | Name |
| caseDate | incident_date | Date |
| incidentType | incident_type | Type |
| caseAge | subject_age | Age |
| caseCountry | subject_nationality | Nationality |
| caseOccupation | (custom) | Occupation |
| caseFacility | facility | Facility |
| caseLocation | city/state | Location |
| caseSummary | summary | Summary |

## Testing Checklist
- [ ] Review mode activates when clicking a case from review queue
- [ ] Checkboxes appear next to all fields with data
- [ ] Checkboxes hidden in normal (create) mode
- [ ] Verification counter shows correct count
- [ ] Cannot submit with unverified fields
- [ ] Unverified fields highlight when attempting to submit
- [ ] Successfully submits when all fields verified
- [ ] Review queue refreshes after submission
