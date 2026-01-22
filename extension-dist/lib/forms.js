/**
 * Dynamic Form Generator
 * Creates forms from field definitions loaded from the API
 */

class DynamicFormGenerator {
  constructor(container, options = {}) {
    this.container = container;
    this.fields = [];
    this.groups = [];
    this.values = {};
    this.verifiedFields = {};
    this.isReviewMode = options.isReviewMode || false;
    this.canVerify = options.canVerify || false;
    this.onFieldChange = options.onFieldChange || (() => {});
    this.onQuoteLinkClick = options.onQuoteLinkClick || (() => {});
    this.onVerifyChange = options.onVerifyChange || (() => {});
    this.fieldElements = {};
  }

  /**
   * Set the form schema (fields and groups)
   */
  setSchema(fields, groups, viewMode = 'review') {
    this.fields = fields || [];
    this.groups = groups || [];
    this.viewMode = viewMode;
    
    // Filter fields based on view mode
    const filterKey = viewMode === 'guest' ? 'show_in_guest_form' :
                      viewMode === 'review' ? 'show_in_review_form' :
                      viewMode === 'validation' ? 'show_in_validation_form' :
                      'show_in_review_form';
    
    this.visibleFields = this.fields.filter(f => f[filterKey]);
    this.render();
  }

  /**
   * Set form values
   */
  setValues(values, verifiedFields = {}) {
    this.values = values || {};
    this.verifiedFields = verifiedFields || {};
    this.updateFieldValues();
  }

  /**
   * Get current form values
   */
  getValues() {
    const values = {};
    
    for (const field of this.visibleFields) {
      const element = this.fieldElements[field.slug];
      if (!element) continue;
      
      values[field.slug] = this.extractFieldValue(field, element);
    }
    
    return values;
  }

  /**
   * Extract value from field element based on type
   */
  extractFieldValue(field, element) {
    switch (field.field_type) {
      case 'boolean':
        return element.checked;
      
      case 'tri_state':
        const checked = element.querySelector('input:checked');
        return checked ? checked.value : null;
      
      case 'number':
        return element.value ? parseFloat(element.value) : null;
      
      case 'multi_select':
      case 'checkbox_group':
        const checkboxes = element.querySelectorAll('input:checked');
        return Array.from(checkboxes).map(cb => cb.value);
      
      case 'select':
      case 'radio':
        return element.value || null;
      
      default:
        return element.value || '';
    }
  }

  /**
   * Validate the form
   */
  validate() {
    const errors = [];
    
    for (const field of this.visibleFields) {
      if (!field.is_required) continue;
      
      const value = this.values[field.slug];
      const isEmpty = value === null || value === undefined || value === '' || 
                      (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        errors.push({
          field: field.slug,
          message: `${field.name} is required`
        });
      }
    }
    
    return errors;
  }

  /**
   * Render the entire form
   */
  render() {
    this.container.innerHTML = '';
    this.fieldElements = {};
    
    if (this.visibleFields.length === 0) {
      this.container.innerHTML = `
        <div class="form-empty-state">
          <p>No fields available for this view.</p>
        </div>
      `;
      return;
    }
    
    // Group fields by group_id
    const groupedFields = this.groupFields();
    
    // Render groups in order
    const sortedGroups = [...this.groups].sort((a, b) => a.sort_order - b.sort_order);
    
    for (const group of sortedGroups) {
      const fields = groupedFields[group.id] || [];
      if (fields.length === 0) continue;
      
      const section = this.renderGroup(group, fields);
      this.container.appendChild(section);
    }
    
    // Render ungrouped fields
    const ungrouped = groupedFields[null] || [];
    if (ungrouped.length > 0) {
      const section = this.renderGroup(
        { id: null, name: 'Other Fields', slug: 'other' },
        ungrouped
      );
      this.container.appendChild(section);
    }
    
    this.updateFieldValues();
  }

  /**
   * Group fields by their group_id
   */
  groupFields() {
    const grouped = { null: [] };
    
    for (const group of this.groups) {
      grouped[group.id] = [];
    }
    
    for (const field of this.visibleFields) {
      const groupId = field.field_group_id || null;
      if (!grouped[groupId]) grouped[groupId] = [];
      grouped[groupId].push(field);
    }
    
    // Sort fields within each group
    for (const groupId of Object.keys(grouped)) {
      grouped[groupId].sort((a, b) => a.sort_order - b.sort_order);
    }
    
    return grouped;
  }

  /**
   * Render a field group section
   */
  renderGroup(group, fields) {
    const section = document.createElement('div');
    section.className = 'form-group-section';
    section.dataset.groupId = group.id || 'ungrouped';
    
    // Group header
    const header = document.createElement('div');
    header.className = 'form-group-header';
    header.innerHTML = `
      <h3 class="form-group-title">${this.escapeHtml(group.name)}</h3>
      ${group.description ? `<p class="form-group-desc">${this.escapeHtml(group.description)}</p>` : ''}
    `;
    section.appendChild(header);
    
    // Fields container
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'form-fields-grid';
    
    for (const field of fields) {
      const fieldEl = this.renderField(field);
      fieldsContainer.appendChild(fieldEl);
    }
    
    section.appendChild(fieldsContainer);
    return section;
  }

  /**
   * Render a single field
   */
  renderField(field) {
    const wrapper = document.createElement('div');
    wrapper.className = `form-field field-width-${field.width || 'full'}`;
    wrapper.dataset.fieldSlug = field.slug;
    
    // Field label with indicators
    const labelRow = document.createElement('div');
    labelRow.className = 'form-field-label-row';
    
    const label = document.createElement('label');
    label.className = 'form-field-label';
    label.innerHTML = this.escapeHtml(field.name);
    if (field.is_required) {
      label.innerHTML += '<span class="required-indicator">*</span>';
    }
    labelRow.appendChild(label);
    
    // Quote link button (always show in review/validation mode)
    if (this.isReviewMode || this.canVerify) {
      const quoteBtn = document.createElement('button');
      quoteBtn.type = 'button';
      quoteBtn.className = 'quote-link-btn';
      quoteBtn.innerHTML = '🔗 Quote';
      quoteBtn.title = 'Link quote to this field';
      quoteBtn.onclick = () => this.onQuoteLinkClick(field.slug, field.name);
      labelRow.appendChild(quoteBtn);
    }
    
    // Verify checkbox (in validation mode)
    if (this.canVerify && this.isReviewMode) {
      const verifyLabel = document.createElement('label');
      verifyLabel.className = 'verify-checkbox-label';
      verifyLabel.innerHTML = `
        <input type="checkbox" class="verify-checkbox" data-field="${field.slug}">
        <span>✓ Verified</span>
      `;
      verifyLabel.querySelector('input').onchange = (e) => {
        this.onVerifyChange(field.slug, e.target.checked);
      };
      labelRow.appendChild(verifyLabel);
    }
    
    wrapper.appendChild(labelRow);
    
    // Description
    if (field.description) {
      const desc = document.createElement('p');
      desc.className = 'form-field-description';
      desc.textContent = field.description;
      wrapper.appendChild(desc);
    }
    
    // Input element based on type
    const input = this.renderFieldInput(field);
    if (input) {
      wrapper.appendChild(input);
      this.fieldElements[field.slug] = input.querySelector('input, textarea, select') || input;
    }
    
    return wrapper;
  }

  /**
   * Render the appropriate input element for a field type
   */
  renderFieldInput(field) {
    const container = document.createElement('div');
    container.className = 'form-input-container';
    
    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'url':
        container.appendChild(this.renderTextInput(field));
        break;
      
      case 'textarea':
      case 'rich_text':
        container.appendChild(this.renderTextarea(field));
        break;
      
      case 'number':
        container.appendChild(this.renderNumberInput(field));
        break;
      
      case 'date':
        container.appendChild(this.renderDateInput(field));
        break;
      
      case 'datetime':
        container.appendChild(this.renderDateTimeInput(field));
        break;
      
      case 'boolean':
        container.appendChild(this.renderBooleanInput(field));
        break;
      
      case 'tri_state':
        container.appendChild(this.renderTriStateInput(field));
        break;
      
      case 'select':
        container.appendChild(this.renderSelectInput(field));
        break;
      
      case 'multi_select':
        container.appendChild(this.renderMultiSelectInput(field));
        break;
      
      case 'radio':
        container.appendChild(this.renderRadioInput(field));
        break;
      
      case 'checkbox_group':
        container.appendChild(this.renderCheckboxGroup(field));
        break;
      
      case 'location':
        container.appendChild(this.renderLocationInput(field));
        break;
      
      default:
        container.appendChild(this.renderTextInput(field));
    }
    
    return container;
  }

  // ==================== Input Renderers ====================

  renderTextInput(field) {
    const input = document.createElement('input');
    input.type = field.field_type === 'email' ? 'email' : 
                 field.field_type === 'url' ? 'url' : 'text';
    input.className = 'form-input';
    input.name = field.slug;
    input.placeholder = field.placeholder || '';
    
    if (field.config?.max_length) input.maxLength = field.config.max_length;
    if (field.config?.pattern) input.pattern = field.config.pattern;
    
    input.addEventListener('change', () => this.handleFieldChange(field.slug, input.value));
    
    return input;
  }

  renderTextarea(field) {
    const textarea = document.createElement('textarea');
    textarea.className = 'form-input form-textarea';
    textarea.name = field.slug;
    textarea.placeholder = field.placeholder || '';
    textarea.rows = field.config?.rows || 4;
    
    textarea.addEventListener('change', () => this.handleFieldChange(field.slug, textarea.value));
    
    return textarea;
  }

  renderNumberInput(field) {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-input';
    input.name = field.slug;
    input.placeholder = field.placeholder || '';
    
    if (field.config?.min !== undefined) input.min = field.config.min;
    if (field.config?.max !== undefined) input.max = field.config.max;
    if (field.config?.step) input.step = field.config.step;
    
    input.addEventListener('change', () => {
      const value = input.value ? parseFloat(input.value) : null;
      this.handleFieldChange(field.slug, value);
    });
    
    return input;
  }

  renderDateInput(field) {
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'form-input';
    input.name = field.slug;
    
    input.addEventListener('change', () => this.handleFieldChange(field.slug, input.value));
    
    return input;
  }

  renderDateTimeInput(field) {
    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.className = 'form-input';
    input.name = field.slug;
    
    input.addEventListener('change', () => this.handleFieldChange(field.slug, input.value));
    
    return input;
  }

  renderBooleanInput(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-checkbox-wrapper';
    
    const label = document.createElement('label');
    label.className = 'form-checkbox-label';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'form-checkbox';
    input.name = field.slug;
    
    input.addEventListener('change', () => this.handleFieldChange(field.slug, input.checked));
    
    label.appendChild(input);
    label.appendChild(document.createTextNode(' Yes'));
    wrapper.appendChild(label);
    
    // Store input reference directly
    this.fieldElements[field.slug] = input;
    
    return wrapper;
  }

  renderTriStateInput(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-tristate-wrapper';
    
    const options = [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
      { value: 'unknown', label: 'Unknown' }
    ];
    
    for (const opt of options) {
      const label = document.createElement('label');
      label.className = 'form-radio-label';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = field.slug;
      input.value = opt.value;
      
      input.addEventListener('change', () => {
        this.handleFieldChange(field.slug, opt.value);
      });
      
      label.appendChild(input);
      label.appendChild(document.createTextNode(` ${opt.label}`));
      wrapper.appendChild(label);
    }
    
    return wrapper;
  }

  renderSelectInput(field) {
    const select = document.createElement('select');
    select.className = 'form-input form-select';
    select.name = field.slug;
    
    // Empty option
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = field.placeholder || '-- Select --';
    select.appendChild(emptyOpt);
    
    // Options from config
    const options = field.config?.options || [];
    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }
    
    select.addEventListener('change', () => this.handleFieldChange(field.slug, select.value));
    
    return select;
  }

  renderMultiSelectInput(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-multiselect-wrapper';
    
    const options = field.config?.options || [];
    for (const opt of options) {
      const label = document.createElement('label');
      label.className = 'form-checkbox-label';
      
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = `${field.slug}[]`;
      input.value = opt.value;
      
      input.addEventListener('change', () => {
        const checked = wrapper.querySelectorAll('input:checked');
        const values = Array.from(checked).map(cb => cb.value);
        this.handleFieldChange(field.slug, values);
      });
      
      label.appendChild(input);
      label.appendChild(document.createTextNode(` ${opt.label}`));
      wrapper.appendChild(label);
    }
    
    return wrapper;
  }

  renderRadioInput(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-radio-wrapper';
    
    const options = field.config?.options || [];
    for (const opt of options) {
      const label = document.createElement('label');
      label.className = 'form-radio-label';
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = field.slug;
      input.value = opt.value;
      
      input.addEventListener('change', () => this.handleFieldChange(field.slug, opt.value));
      
      label.appendChild(input);
      label.appendChild(document.createTextNode(` ${opt.label}`));
      wrapper.appendChild(label);
    }
    
    return wrapper;
  }

  renderCheckboxGroup(field) {
    return this.renderMultiSelectInput(field);
  }

  renderLocationInput(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-location-wrapper';
    
    // City
    const cityInput = document.createElement('input');
    cityInput.type = 'text';
    cityInput.className = 'form-input';
    cityInput.placeholder = 'City';
    cityInput.name = `${field.slug}_city`;
    
    // State
    const stateInput = document.createElement('input');
    stateInput.type = 'text';
    stateInput.className = 'form-input';
    stateInput.placeholder = 'State';
    stateInput.name = `${field.slug}_state`;
    
    const handleChange = () => {
      this.handleFieldChange(field.slug, {
        city: cityInput.value,
        state: stateInput.value
      });
    };
    
    cityInput.addEventListener('change', handleChange);
    stateInput.addEventListener('change', handleChange);
    
    wrapper.appendChild(cityInput);
    wrapper.appendChild(stateInput);
    
    return wrapper;
  }

  // ==================== Helpers ====================

  handleFieldChange(slug, value) {
    this.values[slug] = value;
    this.onFieldChange(slug, value);
  }

  updateFieldValues() {
    for (const field of this.visibleFields) {
      const element = this.fieldElements[field.slug];
      if (!element) continue;
      
      const value = this.values[field.slug];
      
      switch (field.field_type) {
        case 'boolean':
          element.checked = !!value;
          break;
        
        case 'tri_state':
          if (value !== null && value !== undefined) {
            const radio = element.querySelector(`input[value="${value}"]`);
            if (radio) radio.checked = true;
          }
          break;
        
        case 'multi_select':
        case 'checkbox_group':
          const values = Array.isArray(value) ? value : [];
          element.querySelectorAll('input').forEach(cb => {
            cb.checked = values.includes(cb.value);
          });
          break;
        
        default:
          element.value = value ?? '';
      }
      
      // Update verification checkbox
      if (this.canVerify && this.isReviewMode) {
        const verifyCheckbox = this.container.querySelector(
          `.verify-checkbox[data-field="${field.slug}"]`
        );
        if (verifyCheckbox) {
          verifyCheckbox.checked = !!this.verifiedFields[field.slug];
        }
      }
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set value for a specific field programmatically
   */
  setFieldValue(fieldSlug, value) {
    this.values[fieldSlug] = value;
    
    const element = this.fieldElements[fieldSlug];
    if (element) {
      const field = this.fields.find(f => f.slug === fieldSlug);
      if (field) {
        switch (field.field_type) {
          case 'boolean':
            element.checked = !!value;
            break;
          case 'multi_select':
          case 'checkbox_group':
            const values = Array.isArray(value) ? value : [];
            element.querySelectorAll('input').forEach(cb => {
              cb.checked = values.includes(cb.value);
            });
            break;
          default:
            element.value = value ?? '';
        }
      }
    }
    
    this.onFieldChange(fieldSlug, value);
  }
}

// Export
if (typeof window !== 'undefined') {
  window.DynamicFormGenerator = DynamicFormGenerator;
}

export { DynamicFormGenerator };
