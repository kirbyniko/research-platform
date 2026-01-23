# Conditional Visibility System

## Overview
The platform now features an intelligent conditional visibility system that adapts to field types, allowing fields and field groups to be shown/hidden based on the values of other fields.

## Key Features

### 1. Field-Type-Aware Operators
The system detects the type of the selected field and displays appropriate operators:

#### Boolean Fields
- `is_true` - field is checked/true
- `is_false` - field is unchecked/false

#### Number Fields
- `equals` - exact match
- `not_equals` - not equal to
- `greater_than` - greater than value
- `less_than` - less than value
- `between` - within a range (requires two values)
- `exists` - has any value
- `not_exists` - is empty

#### Date & DateTime Fields
- `equals` - exact date match
- `before` - before a date
- `after` - after a date
- `between` - within a date range (requires two values)
- `exists` - has any value
- `not_exists` - is empty

#### Select & Radio Fields
- `equals` - exact match
- `not_equals` - does not match
- `exists` - has any value
- `not_exists` - is empty

#### Multi-Select & Checkbox Group Fields
- `contains` - contains specific value
- `not_contains` - does not contain value
- `contains_all` - contains all specified values
- `contains_any` - contains any specified value
- `exists` - has any value
- `not_exists` - is empty

#### Text Fields (text, textarea, url, email, location, rich_text)
- `equals` - exact match
- `not_equals` - does not match
- `contains` - contains substring
- `not_contains` - does not contain substring
- `starts_with` - starts with text
- `ends_with` - ends with text
- `exists` - has any value
- `not_exists` - is empty

### 2. Smart Input Types
Value inputs automatically adapt to the selected field type:
- **Number fields**: Number input
- **Date fields**: Date picker (YYYY-MM-DD)
- **DateTime fields**: DateTime picker
- **Boolean fields**: No value input needed (operators are `is_true`/`is_false`)
- **Other fields**: Text input

### 3. Range Support
For `between` operators:
- Two value inputs are displayed ("From Value" and "To Value")
- Both values are stored in the field/group configuration
- Works for both numbers and dates

### 4. Conditional Visibility for Field Groups
Field groups can now have conditional visibility, just like individual fields:
- Configure via "Manage Groups" modal
- Same operator system as fields
- Entire group shows/hides based on condition

## Database Schema

### Field Definitions
Conditional visibility is stored in the `config` JSONB column:
```json
{
  "show_when": {
    "field": "field_slug",
    "operator": "between",
    "value": "2020-01-01",
    "value2": "2025-12-31"
  }
}
```

### Field Groups
New `config` JSONB column added (migration 018):
```sql
ALTER TABLE field_groups 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
```

Same structure as field definitions:
```json
{
  "show_when": {
    "field": "incident_type",
    "operator": "contains",
    "value": "shooting"
  }
}
```

## Usage Examples

### Example 1: Show field only if date is in range
- Field: `death_date`
- Operator: `between`
- From Value: `2020-01-01`
- To Value: `2025-12-31`

### Example 2: Show group only if incident type includes shooting
- Field: `incident_types` (multi-select)
- Operator: `contains`
- Value: `shooting`

### Example 3: Show field only if number exceeds threshold
- Field: `days_in_custody`
- Operator: `greater_than`
- Value: `30`

### Example 4: Show field only if boolean is checked
- Field: `medical_request_denied`
- Operator: `is_true`
- (No value needed)

## Implementation Details

### Helper Function
`getOperatorsForFieldType(fieldType: FieldType)` returns appropriate operators based on field type.

### State Management
- `showWhenField`: Slug of the field to check
- `showWhenOperator`: The operator to use
- `showWhenValue`: Primary value
- `showWhenValue2`: Secondary value (for `between` operators)

### Dynamic Behavior
When a user selects a different field:
1. The system finds the field in the `allFields` array
2. Gets the field's type
3. Updates the operator dropdown with type-appropriate options
4. Resets to the first available operator
5. Shows/hides second value input based on operator

## Files Modified

1. **src/types/platform.ts**
   - Added `config` property to `FieldGroup` interface

2. **src/app/projects/[slug]/record-types/[type]/fields/page.tsx**
   - Added `getOperatorsForFieldType()` helper function
   - Updated `FieldEditorModal` with smart conditional visibility UI
   - Updated `GroupManagerModal` with conditional visibility support
   - Added `showWhenValue2` state for range operators

3. **src/app/api/projects/[slug]/record-types/[type]/groups/route.ts**
   - Added `config` parameter to INSERT query
   - Stores conditional visibility settings

4. **scripts/migrations/018-group-conditional-visibility.sql**
   - Added `config` JSONB column to `field_groups` table
   - Added GIN index for efficient querying

## Future Enhancements

### Runtime Evaluation (TODO)
Currently, conditional visibility is configured but not yet evaluated at runtime. The DynamicForm component will need to:

1. Read field/group `show_when` configs
2. Watch the referenced field's value
3. Evaluate the condition based on operator
4. Show/hide the field/group dynamically

### Multi-Field Conditions (Future)
Could extend to support AND/OR logic with multiple conditions:
```json
{
  "show_when": {
    "operator": "AND",
    "conditions": [
      { "field": "field_a", "operator": "equals", "value": "x" },
      { "field": "field_b", "operator": "greater_than", "value": 5 }
    ]
  }
}
```

## Testing Checklist

- [ ] Create a number field with `between` operator
- [ ] Create a date field with `before`/`after` operators
- [ ] Create a boolean field with `is_true`/`is_false`
- [ ] Create a multi-select field with `contains_all` operator
- [ ] Create a field group with conditional visibility
- [ ] Verify operators change when different field types are selected
- [ ] Verify second value input appears for `between` operator
- [ ] Verify config is saved correctly to database
- [ ] Test editing existing fields with conditional visibility
