// Research Platform Extension - Dynamic Form Renderer
// Generates form UI from field definitions fetched from the API

/**
 * Generate a complete form from field definitions and groups
 * @param {Array} fields - Field definitions from API
 * @param {Array} groups - Field groups from API
 * @param {Object} values - Current values for the fields
 * @param {Object} options - Rendering options
 * @returns {HTMLElement} The form container element
 */
function renderDynamicForm(fields, groups, values = {}, options = {}) {
  const container = document.createElement('div');
  container.className = 'dynamic-form';
  
  // Organize fields by group
  const { grouped, ungrouped } = organizeFieldsByGroup(fields, groups);
  
  // Render each group
  for (const group of groups) {
    const groupFields = grouped[group.id] || [];
    if (groupFields.length === 0) continue;
    
    const section = renderFieldGroup(group, groupFields, values, options);
    container.appendChild(section);
  }
  
  // Render ungrouped fields
  if (ungrouped.length > 0) {
    const section = renderFieldGroup(
      { id: 'ungrouped', name: 'Other Fields' },
      ungrouped,
      values,
      options
    );
    container.appendChild(section);
  }
  
  return container;
}

/**
 * Organize fields into groups
 */
function organizeFieldsByGroup(fields, groups) {
  const grouped = {};
  const ungrouped = [];
  
  // Initialize group buckets
  for (const group of groups) {
    grouped[group.id] = [];
  }
  
  // Sort fields into groups
  for (const field of fields) {
    // Check visibility based on options
    if (field.visibility) {
      // For guest forms, only show fields marked for guest form
      // For review forms, show fields marked for review
      // etc.
    }
    
    if (field.field_group_id && grouped[field.field_group_id]) {
      grouped[field.field_group_id].push(field);
    } else {
      ungrouped.push(field);
    }
  }
  
  // Sort fields within groups by sort_order
  for (const groupId of Object.keys(grouped)) {
    grouped[groupId].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }
  ungrouped.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  
  return { grouped, ungrouped };
}

/**
 * Render a single field group as a collapsible section
 */
function renderFieldGroup(group, fields, values, options) {
  const section = document.createElement('div');
  section.className = 'section field-group-section';
  section.dataset.groupId = group.id;
  
  // Collapsible header
  const header = document.createElement('div');
  header.className = 'collapsible-header';
  header.innerHTML = `<span class="section-title">${escapeHtml(group.name)}</span>`;
  header.addEventListener('click', () => {
    content.classList.toggle('collapsed');
    header.classList.toggle('collapsed');
  });
  
  // Content container
  const content = document.createElement('div');
  content.className = 'collapsible-content';
  
  // Render each field in the group
  for (const field of fields) {
    const fieldEl = renderField(field, values[field.key], options);
    if (fieldEl) {
      content.appendChild(fieldEl);
    }
  }
  
  section.appendChild(header);
  section.appendChild(content);
  
  return section;
}

/**
 * Render a single field based on its type
 */
function renderField(field, value, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group dynamic-field';
  wrapper.dataset.fieldKey = field.key;
  wrapper.dataset.fieldType = field.field_type;
  
  // Handle conditional visibility (show_when)
  if (field.config?.show_when) {
    wrapper.dataset.showWhen = JSON.stringify(field.config.show_when);
    wrapper.style.display = 'none'; // Hidden by default, shown by condition logic
  }
  
  // Label
  const label = document.createElement('label');
  label.className = 'form-label';
  label.htmlFor = `field-${field.key}`;
  label.textContent = field.name;
  if (field.is_required) {
    label.innerHTML += ' <span class="required">*</span>';
  }
  wrapper.appendChild(label);
  
  // Input element based on type
  let input;
  
  switch (field.field_type) {
    case 'text':
    case 'email':
    case 'url':
      input = renderTextInput(field, value);
      break;
      
    case 'textarea':
    case 'rich_text':
      input = renderTextarea(field, value);
      break;
      
    case 'number':
      input = renderNumberInput(field, value);
      break;
      
    case 'date':
      input = renderDateInput(field, value);
      break;
      
    case 'datetime':
      input = renderDateTimeInput(field, value);
      break;
      
    case 'boolean':
      input = renderBooleanInput(field, value);
      break;
      
    case 'select':
      input = renderSelectInput(field, value);
      break;
      
    case 'multi_select':
    case 'checkbox_group':
      input = renderMultiSelectInput(field, value);
      break;
      
    case 'radio':
      input = renderRadioInput(field, value);
      break;
      
    case 'location':
      input = renderLocationInput(field, value);
      break;
      
    default:
      input = renderTextInput(field, value);
  }
  
  if (input) {
    wrapper.appendChild(input);
  }
  
  // Help text
  if (field.description) {
    const help = document.createElement('p');
    help.className = 'help-text';
    help.textContent = field.description;
    wrapper.appendChild(help);
  }
  
  return wrapper;
}

/**
 * Text input
 */
function renderTextInput(field, value) {
  const input = document.createElement('input');
  input.type = field.field_type === 'email' ? 'email' : 
               field.field_type === 'url' ? 'url' : 'text';
  input.className = 'form-input';
  input.id = `field-${field.key}`;
  input.name = field.key;
  input.value = value || '';
  input.placeholder = field.config?.placeholder || '';
  
  if (field.is_required) input.required = true;
  if (field.config?.maxLength) input.maxLength = field.config.maxLength;
  if (field.config?.pattern) input.pattern = field.config.pattern;
  
  return input;
}

/**
 * Textarea input
 */
function renderTextarea(field, value) {
  const textarea = document.createElement('textarea');
  textarea.className = 'form-input';
  textarea.id = `field-${field.key}`;
  textarea.name = field.key;
  textarea.value = value || '';
  textarea.placeholder = field.config?.placeholder || '';
  textarea.rows = field.config?.rows || 4;
  
  if (field.is_required) textarea.required = true;
  if (field.config?.maxLength) textarea.maxLength = field.config.maxLength;
  
  return textarea;
}

/**
 * Number input
 */
function renderNumberInput(field, value) {
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'form-input';
  input.id = `field-${field.key}`;
  input.name = field.key;
  input.value = value ?? '';
  
  if (field.is_required) input.required = true;
  if (field.config?.min !== undefined) input.min = field.config.min;
  if (field.config?.max !== undefined) input.max = field.config.max;
  if (field.config?.step) input.step = field.config.step;
  
  return input;
}

/**
 * Date input
 */
function renderDateInput(field, value) {
  const input = document.createElement('input');
  input.type = 'date';
  input.className = 'form-input';
  input.id = `field-${field.key}`;
  input.name = field.key;
  input.value = value || '';
  
  if (field.is_required) input.required = true;
  
  return input;
}

/**
 * DateTime input
 */
function renderDateTimeInput(field, value) {
  const input = document.createElement('input');
  input.type = 'datetime-local';
  input.className = 'form-input';
  input.id = `field-${field.key}`;
  input.name = field.key;
  input.value = value || '';
  
  if (field.is_required) input.required = true;
  
  return input;
}

/**
 * Boolean input (checkbox)
 */
function renderBooleanInput(field, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'checkbox-wrapper';
  
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = `field-${field.key}`;
  input.name = field.key;
  input.checked = value === true || value === 'true';
  
  const checkLabel = document.createElement('label');
  checkLabel.htmlFor = `field-${field.key}`;
  checkLabel.textContent = field.config?.checkboxLabel || 'Yes';
  
  wrapper.appendChild(input);
  wrapper.appendChild(checkLabel);
  
  return wrapper;
}

/**
 * Select input (dropdown)
 */
function renderSelectInput(field, value) {
  const select = document.createElement('select');
  select.className = 'form-input';
  select.id = `field-${field.key}`;
  select.name = field.key;
  
  if (field.is_required) select.required = true;
  
  // Empty option
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = field.config?.placeholder || '-- Select --';
  select.appendChild(emptyOption);
  
  // Options from field config
  const options = field.config?.options || [];
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (value === opt.value) option.selected = true;
    select.appendChild(option);
  }
  
  return select;
}

/**
 * Multi-select input (checkboxes)
 */
function renderMultiSelectInput(field, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'checkbox-group';
  wrapper.id = `field-${field.key}`;
  
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
  const options = field.config?.options || [];
  
  for (const opt of options) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'checkbox-item';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `field-${field.key}-${opt.value}`;
    input.name = field.key;
    input.value = opt.value;
    input.checked = selectedValues.includes(opt.value);
    
    const label = document.createElement('label');
    label.htmlFor = `field-${field.key}-${opt.value}`;
    label.textContent = opt.label;
    
    itemWrapper.appendChild(input);
    itemWrapper.appendChild(label);
    wrapper.appendChild(itemWrapper);
  }
  
  return wrapper;
}

/**
 * Radio input
 */
function renderRadioInput(field, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'radio-group';
  wrapper.id = `field-${field.key}`;
  
  const options = field.config?.options || [];
  
  for (const opt of options) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'radio-item';
    
    const input = document.createElement('input');
    input.type = 'radio';
    input.id = `field-${field.key}-${opt.value}`;
    input.name = field.key;
    input.value = opt.value;
    input.checked = value === opt.value;
    
    const label = document.createElement('label');
    label.htmlFor = `field-${field.key}-${opt.value}`;
    label.textContent = opt.label;
    
    itemWrapper.appendChild(input);
    itemWrapper.appendChild(label);
    wrapper.appendChild(itemWrapper);
  }
  
  return wrapper;
}

/**
 * Location input (city, state, country)
 */
function renderLocationInput(field, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'location-input-group';
  wrapper.id = `field-${field.key}`;
  
  const locationValue = typeof value === 'object' ? value : {};
  
  // City
  const cityGroup = document.createElement('div');
  cityGroup.className = 'form-group';
  cityGroup.innerHTML = `
    <label class="form-label" for="field-${field.key}-city">City</label>
    <input type="text" class="form-input" id="field-${field.key}-city" 
           name="${field.key}_city" value="${escapeHtml(locationValue.city || '')}">
  `;
  wrapper.appendChild(cityGroup);
  
  // State
  const stateGroup = document.createElement('div');
  stateGroup.className = 'form-group';
  stateGroup.innerHTML = `
    <label class="form-label" for="field-${field.key}-state">State</label>
    <input type="text" class="form-input" id="field-${field.key}-state" 
           name="${field.key}_state" value="${escapeHtml(locationValue.state || '')}">
  `;
  wrapper.appendChild(stateGroup);
  
  // Country (if enabled)
  if (field.config?.includeCountry !== false) {
    const countryGroup = document.createElement('div');
    countryGroup.className = 'form-group';
    countryGroup.innerHTML = `
      <label class="form-label" for="field-${field.key}-country">Country</label>
      <input type="text" class="form-input" id="field-${field.key}-country" 
             name="${field.key}_country" value="${escapeHtml(locationValue.country || 'USA')}">
    `;
    wrapper.appendChild(countryGroup);
  }
  
  return wrapper;
}

/**
 * Collect form values from the dynamic form
 */
function collectFormValues(formContainer) {
  const values = {};
  const fields = formContainer.querySelectorAll('.dynamic-field');
  
  for (const fieldWrapper of fields) {
    const key = fieldWrapper.dataset.fieldKey;
    const type = fieldWrapper.dataset.fieldType;
    
    switch (type) {
      case 'boolean':
        const checkbox = fieldWrapper.querySelector('input[type="checkbox"]');
        values[key] = checkbox?.checked || false;
        break;
        
      case 'multi_select':
      case 'checkbox_group':
        const checkboxes = fieldWrapper.querySelectorAll('input[type="checkbox"]:checked');
        values[key] = Array.from(checkboxes).map(cb => cb.value);
        break;
        
      case 'radio':
        const radio = fieldWrapper.querySelector('input[type="radio"]:checked');
        values[key] = radio?.value || null;
        break;
        
      case 'location':
        values[key] = {
          city: fieldWrapper.querySelector(`[name="${key}_city"]`)?.value || '',
          state: fieldWrapper.querySelector(`[name="${key}_state"]`)?.value || '',
          country: fieldWrapper.querySelector(`[name="${key}_country"]`)?.value || ''
        };
        break;
        
      default:
        const input = fieldWrapper.querySelector('input, select, textarea');
        values[key] = input?.value || '';
    }
  }
  
  return values;
}

/**
 * Set form values on the dynamic form
 */
function setFormValues(formContainer, values) {
  for (const [key, value] of Object.entries(values)) {
    const fieldWrapper = formContainer.querySelector(`[data-field-key="${key}"]`);
    if (!fieldWrapper) continue;
    
    const type = fieldWrapper.dataset.fieldType;
    
    switch (type) {
      case 'boolean':
        const checkbox = fieldWrapper.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = value === true || value === 'true';
        break;
        
      case 'multi_select':
      case 'checkbox_group':
        const selectedValues = Array.isArray(value) ? value : [value];
        const checkboxes = fieldWrapper.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
          cb.checked = selectedValues.includes(cb.value);
        });
        break;
        
      case 'radio':
        const radios = fieldWrapper.querySelectorAll('input[type="radio"]');
        radios.forEach(r => {
          r.checked = r.value === value;
        });
        break;
        
      case 'location':
        if (typeof value === 'object') {
          const cityInput = fieldWrapper.querySelector(`[name="${key}_city"]`);
          const stateInput = fieldWrapper.querySelector(`[name="${key}_state"]`);
          const countryInput = fieldWrapper.querySelector(`[name="${key}_country"]`);
          if (cityInput) cityInput.value = value.city || '';
          if (stateInput) stateInput.value = value.state || '';
          if (countryInput) countryInput.value = value.country || '';
        }
        break;
        
      default:
        const input = fieldWrapper.querySelector('input, select, textarea');
        if (input) input.value = value || '';
    }
  }
}

/**
 * Apply conditional visibility rules
 * Call this whenever a field value changes
 */
function applyConditionalVisibility(formContainer, values) {
  const conditionalFields = formContainer.querySelectorAll('[data-show-when]');
  
  for (const fieldWrapper of conditionalFields) {
    try {
      const showWhen = JSON.parse(fieldWrapper.dataset.showWhen);
      const isVisible = evaluateCondition(showWhen, values);
      fieldWrapper.style.display = isVisible ? '' : 'none';
    } catch (e) {
      console.error('Error evaluating show_when condition:', e);
    }
  }
}

/**
 * Evaluate a show_when condition
 */
function evaluateCondition(condition, values) {
  const { field, operator, value: expectedValue } = condition;
  const actualValue = values[field];
  
  switch (operator) {
    case 'equals':
      return actualValue === expectedValue;
    case 'not_equals':
      return actualValue !== expectedValue;
    case 'contains':
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue);
      }
      return String(actualValue || '').includes(expectedValue);
    case 'not_contains':
      if (Array.isArray(actualValue)) {
        return !actualValue.includes(expectedValue);
      }
      return !String(actualValue || '').includes(expectedValue);
    case 'is_empty':
      return !actualValue || (Array.isArray(actualValue) && actualValue.length === 0);
    case 'is_not_empty':
      return actualValue && (!Array.isArray(actualValue) || actualValue.length > 0);
    default:
      return true;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for use in sidepanel
if (typeof window !== 'undefined') {
  window.DynamicForm = {
    render: renderDynamicForm,
    collectValues: collectFormValues,
    setValues: setFormValues,
    applyConditionalVisibility,
    organizeFieldsByGroup
  };
}
