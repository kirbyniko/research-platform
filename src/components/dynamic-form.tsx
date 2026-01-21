'use client';

import { useState, useEffect } from 'react';
import { FieldDefinition, FieldGroup, SelectOption, RecordQuote } from '@/types/platform';
import { ViolationsField, DEFAULT_VIOLATIONS, ViolationValue } from './violation-card';
import { DuplicateChecker } from './duplicate-checker';
import { TriStateField, IncidentTypesField, MediaField, CustomFieldsField } from './field-types';

interface DynamicFormProps {
  fields: FieldDefinition[];
  groups?: FieldGroup[];
  initialValues?: Record<string, any>;
  initialData?: Record<string, any>; // Alias for initialValues
  mode: 'guest' | 'review' | 'validation' | 'edit' | 'view';
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onCancel?: () => void;
  onLinkQuote?: (fieldSlug: string, quoteId: number) => void;
  disabled?: boolean;
  showQuoteFields?: boolean;
  // Additional props used by existing pages (optional)
  projectSlug?: string;
  recordTypeSlug?: string;
  recordId?: number;
  quotes?: RecordQuote[];
  verifiedFields?: Record<string, any>;
}

export function DynamicForm({
  fields,
  groups = [],
  initialValues,
  initialData,
  mode,
  onSubmit,
  onCancel,
  onLinkQuote,
  disabled = false,
  showQuoteFields = false,
  projectSlug,
  recordTypeSlug,
  recordId,
  quotes = [],
  verifiedFields = {},
}: DynamicFormProps) {
  // Use initialData if initialValues not provided (backward compatibility)
  const startValues = initialValues || initialData || {};
  const [values, setValues] = useState<Record<string, any>>(startValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // In view mode, disable all fields
  const isViewMode = mode === 'view';
  const isDisabled = disabled || isViewMode;

  // Check if a field should be visible based on show_when config
  const isFieldVisible = (field: FieldDefinition): boolean => {
    const config = field.config as Record<string, any> || {};
    const showWhen = config.show_when;
    
    if (!showWhen) return true; // No condition = always visible
    
    const { field: dependentField, value: requiredValue, operator = 'equals' } = showWhen;
    const currentValue = values[dependentField];
    
    // Handle incident_types which can be an object with selected array
    const effectiveValue = typeof currentValue === 'object' && currentValue?.selected
      ? currentValue.selected
      : currentValue;
    
    switch (operator) {
      case 'equals':
        return effectiveValue === requiredValue;
      case 'not_equals':
        return effectiveValue !== requiredValue;
      case 'contains':
        // Check if array contains the value
        if (Array.isArray(effectiveValue)) {
          return effectiveValue.includes(requiredValue);
        }
        return effectiveValue === requiredValue;
      case 'contains_any':
        // Check if array contains any of the required values
        if (Array.isArray(effectiveValue) && Array.isArray(requiredValue)) {
          return requiredValue.some(v => effectiveValue.includes(v));
        }
        if (Array.isArray(effectiveValue)) {
          return effectiveValue.includes(requiredValue);
        }
        if (Array.isArray(requiredValue)) {
          return requiredValue.includes(effectiveValue);
        }
        return effectiveValue === requiredValue;
      case 'is_empty':
        return !effectiveValue || (Array.isArray(effectiveValue) && effectiveValue.length === 0);
      case 'is_not_empty':
        return !!effectiveValue && (!Array.isArray(effectiveValue) || effectiveValue.length > 0);
      default:
        // Legacy format: { field, value } without operator
        if (Array.isArray(effectiveValue)) {
          if (Array.isArray(requiredValue)) {
            return requiredValue.some(v => effectiveValue.includes(v));
          }
          return effectiveValue.includes(requiredValue);
        }
        return effectiveValue === requiredValue;
    }
  };

  // Filter fields based on mode and conditional visibility
  const visibleFields = fields.filter(field => {
    // First check mode-based visibility
    let modeVisible = true;
    switch (mode) {
      case 'guest':
        modeVisible = field.show_in_guest_form;
        break;
      case 'review':
        modeVisible = field.show_in_review_form;
        break;
      case 'validation':
        modeVisible = field.show_in_validation_form;
        break;
      case 'view':
      case 'edit':
      default:
        modeVisible = true;
    }
    
    if (!modeVisible) return false;
    
    // Then check conditional visibility (show_when)
    return isFieldVisible(field);
  });

  // Group fields
  const ungroupedFields = visibleFields.filter(f => !f.field_group_id);
  const groupedFields = groups.map(group => ({
    ...group,
    fields: visibleFields.filter(f => f.field_group_id === group.id),
  })).filter(g => g.fields.length > 0);

  const handleChange = (fieldSlug: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldSlug]: value }));
    // Clear error when field is modified
    if (errors[fieldSlug]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldSlug];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    visibleFields.forEach(field => {
      const value = values[field.slug];
      
      // Required check
      if (field.is_required) {
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[field.slug] = `${field.name} is required`;
          return;
        }
      }
      
      // Type-specific validation
      if (value !== undefined && value !== null && value !== '') {
        switch (field.field_type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              newErrors[field.slug] = 'Invalid email format';
            }
            break;
          case 'url':
            try {
              new URL(value);
            } catch {
              newErrors[field.slug] = 'Invalid URL format';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[field.slug] = 'Must be a number';
            }
            break;
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FieldDefinition) => {
    const value = values[field.slug] ?? '';
    const error = errors[field.slug];
    const config = field.config as Record<string, any> || {};
    
    const baseInputClass = `w-full border rounded px-3 py-2 ${
      error ? 'border-red-500' : 'border-gray-300'
    } ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

    return (
      <div key={field.id} className={`mb-4 ${field.width === 'half' ? 'w-1/2' : 'w-full'}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.name}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.description && (
          <p className="text-xs text-gray-500 mb-1">{field.description}</p>
        )}
        
        {/* Text input */}
        {field.field_type === 'text' && (
          <input
            type="text"
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isDisabled}
            className={baseInputClass}
          />
        )}
        
        {/* Textarea */}
        {field.field_type === 'textarea' && (
          <textarea
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isDisabled}
            rows={4}
            className={baseInputClass}
          />
        )}
        
        {/* Rich text (same as textarea for now) */}
        {field.field_type === 'rich_text' && (
          <textarea
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isDisabled}
            rows={6}
            className={baseInputClass}
          />
        )}
        
        {/* Number */}
        {field.field_type === 'number' && (
          <input
            type="number"
            value={value}
            onChange={e => handleChange(field.slug, e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || ''}
            disabled={isDisabled}
            min={config.min}
            max={config.max}
            step={config.step || 1}
            className={baseInputClass}
          />
        )}
        
        {/* Date */}
        {field.field_type === 'date' && (
          <input
            type="date"
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            disabled={isDisabled}
            className={baseInputClass}
          />
        )}
        
        {/* DateTime */}
        {field.field_type === 'datetime' && (
          <input
            type="datetime-local"
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            disabled={isDisabled}
            className={baseInputClass}
          />
        )}
        
        {/* Email */}
        {field.field_type === 'email' && (
          <input
            type="email"
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isDisabled}
            className={baseInputClass}
          />
        )}
        
        {/* URL */}
        {field.field_type === 'url' && (
          <input
            type="url"
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isDisabled}
            className={baseInputClass}
          />
        )}
        
        {/* Boolean / Checkbox */}
        {field.field_type === 'boolean' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => handleChange(field.slug, e.target.checked)}
              disabled={isDisabled}
              className="w-4 h-4"
            />
            <span className="text-sm">{field.placeholder || 'Yes'}</span>
          </label>
        )}
        
        {/* Select */}
        {field.field_type === 'select' && (
          <select
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            disabled={isDisabled}
            className={baseInputClass}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {(config.options as SelectOption[] || []).map((opt: SelectOption) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        
        {/* Multi-select */}
        {field.field_type === 'multi_select' && (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={e => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              handleChange(field.slug, selected);
            }}
            disabled={isDisabled}
            className={`${baseInputClass} min-h-[100px]`}
          >
            {(config.options as SelectOption[] || []).map((opt: SelectOption) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        
        {/* Radio */}
        {field.field_type === 'radio' && (
          <div className="space-y-2">
            {(config.options as SelectOption[] || []).map((opt: SelectOption) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.slug}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={e => handleChange(field.slug, e.target.value)}
                  disabled={isDisabled}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
        
        {/* Checkbox group */}
        {field.field_type === 'checkbox_group' && (
          <div className="space-y-2">
            {(config.options as SelectOption[] || []).map((opt: SelectOption) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(opt.value)}
                  onChange={e => {
                    const current = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleChange(field.slug, [...current, opt.value]);
                    } else {
                      handleChange(field.slug, current.filter((v: string) => v !== opt.value));
                    }
                  }}
                  disabled={isDisabled}
                  className="w-4 h-4"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
        
        {/* Location */}
        {field.field_type === 'location' && (
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={value?.city || ''}
              onChange={e => handleChange(field.slug, { ...value, city: e.target.value })}
              placeholder="City"
              disabled={isDisabled}
              className={baseInputClass}
            />
            <input
              type="text"
              value={value?.state || ''}
              onChange={e => handleChange(field.slug, { ...value, state: e.target.value })}
              placeholder="State"
              disabled={isDisabled}
              className={baseInputClass}
            />
            <input
              type="text"
              value={value?.country || ''}
              onChange={e => handleChange(field.slug, { ...value, country: e.target.value })}
              placeholder="Country"
              disabled={isDisabled}
              className={baseInputClass}
            />
          </div>
        )}
        
        {/* Violations - checkbox cards with case law dropdowns */}
        {field.field_type === 'violations' && (
          <ViolationsField
            value={value as Record<string, ViolationValue> || {}}
            onChange={(newVal) => handleChange(field.slug, newVal)}
            violations={config.violations || DEFAULT_VIOLATIONS}
            disabled={isDisabled}
          />
        )}
        
        {/* Tri-state - Yes/No/Unknown dropdown */}
        {field.field_type === 'tri_state' && (
          <TriStateField
            value={value}
            onChange={(newVal) => handleChange(field.slug, newVal)}
            disabled={isDisabled}
          />
        )}
        
        {/* Incident Types - Checkboxes with per-option [src] buttons */}
        {field.field_type === 'incident_types' && (
          <IncidentTypesField
            value={value}
            onChange={(newVal) => handleChange(field.slug, newVal)}
            options={config.options || []}
            disabled={isDisabled}
          />
        )}
        
        {/* Media - Image/Video URLs with preview */}
        {field.field_type === 'media' && (
          <MediaField
            value={value}
            onChange={(newVal) => handleChange(field.slug, newVal)}
            disabled={isDisabled}
            description={config.description}
          />
        )}
        
        {/* Custom Fields - User-defined arbitrary fields */}
        {field.field_type === 'custom_fields' && (
          <CustomFieldsField
            value={value}
            onChange={(newVal) => handleChange(field.slug, newVal)}
            disabled={isDisabled}
            description={config.description}
          />
        )}
        
        {/* Quote field indicator */}
        {showQuoteFields && field.requires_quote && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            ⚠️ This field requires a supporting quote/source
          </div>
        )}
        
        {/* Show linked quotes in review/validation mode */}
        {(mode === 'review' || mode === 'validation') && quotes && quotes.length > 0 && (
          <div className="mt-2">
            {quotes
              .filter(q => q.linked_fields?.includes(field.slug))
              .map(quote => (
                <div key={quote.id} className="mb-2 border-l-2 border-blue-300 pl-2 py-1 text-xs bg-blue-50 rounded-r">
                  <p className="italic">&ldquo;{quote.quote_text}&rdquo;</p>
                  {quote.source && (
                    <p className="text-gray-500 mt-0.5">
                      — {quote.source}
                      {quote.source_url && (
                        <a 
                          href={quote.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-1 text-blue-600 hover:underline"
                        >
                          [link]
                        </a>
                      )}
                    </p>
                  )}
                  {onLinkQuote && (
                    <button
                      type="button"
                      onClick={() => onLinkQuote(field.slug, quote.id)}
                      className="text-red-500 hover:underline mt-0.5"
                    >
                      Unlink
                    </button>
                  )}
                </div>
              ))}
            
            {/* Show button to link available quotes */}
            {onLinkQuote && quotes.filter(q => !q.linked_fields?.includes(field.slug)).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                  + Link quote to this field
                </summary>
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                  {quotes
                    .filter(q => !q.linked_fields?.includes(field.slug))
                    .map(quote => (
                      <button
                        key={quote.id}
                        type="button"
                        onClick={() => onLinkQuote(field.slug, quote.id)}
                        className="block w-full text-left text-xs p-2 hover:bg-gray-100 rounded border border-gray-200"
                      >
                        <p className="italic truncate">&ldquo;{quote.quote_text}&rdquo;</p>
                        {quote.source && <p className="text-gray-500 text-xs">— {quote.source}</p>}
                      </button>
                    ))}
                </div>
              </details>
            )}
          </div>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  };

  // Find name field for duplicate checking (look for common name field slugs)
  const nameFieldSlug = visibleFields.find(f => 
    ['name', 'victim_name', 'subject_name', 'case_name'].includes(f.slug)
  )?.slug;
  const nameValue = nameFieldSlug ? values[nameFieldSlug] : '';

  return (
    <form onSubmit={handleSubmit}>
      {/* Duplicate Checker - shown at top if name field exists */}
      {projectSlug && nameFieldSlug && mode !== 'view' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            🔎 Duplicate & Related Cases
          </h3>
          <DuplicateChecker
            nameValue={nameValue}
            projectSlug={projectSlug}
            recordTypeSlug={recordTypeSlug}
            excludeRecordId={recordId}
          />
        </div>
      )}
      
      {/* Ungrouped fields */}
      {ungroupedFields.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          {ungroupedFields.map(renderField)}
        </div>
      )}
      
      {/* Grouped fields */}
      {groupedFields.map(group => (
        <fieldset key={group.id} className="border rounded p-4 mb-6">
          <legend className="text-lg font-semibold px-2">{group.name}</legend>
          {group.description && (
            <p className="text-sm text-gray-500 mb-4">{group.description}</p>
          )}
          <div className="flex flex-wrap gap-4">
            {group.fields.map(renderField)}
          </div>
        </fieldset>
      ))}
      
      {/* No fields message */}
      {visibleFields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No fields configured for this form.
        </div>
      )}
      
      {/* Submit button */}
      {visibleFields.length > 0 && (
        <div className="mt-6">
          <button
            type="submit"
            disabled={disabled || submitting}
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
    </form>
  );
}

export default DynamicForm;
