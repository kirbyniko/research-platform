'use client';

import { useState, useEffect } from 'react';
import { FieldDefinition, FieldGroup, SelectOption } from '@/types/platform';

interface DynamicFormProps {
  fields: FieldDefinition[];
  groups?: FieldGroup[];
  initialValues?: Record<string, any>;
  mode: 'guest' | 'review' | 'validation' | 'edit';
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  disabled?: boolean;
  showQuoteFields?: boolean;
}

export function DynamicForm({
  fields,
  groups = [],
  initialValues = {},
  mode,
  onSubmit,
  disabled = false,
  showQuoteFields = false,
}: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Filter fields based on mode
  const visibleFields = fields.filter(field => {
    switch (mode) {
      case 'guest':
        return field.show_in_guest_form;
      case 'review':
        return field.show_in_review_form;
      case 'validation':
        return field.show_in_validation_form;
      default:
        return true;
    }
  });

  // Group fields
  const ungroupedFields = visibleFields.filter(f => !f.group_id);
  const groupedFields = groups.map(group => ({
    ...group,
    fields: visibleFields.filter(f => f.group_id === group.id),
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
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

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
            disabled={disabled}
            className={baseInputClass}
          />
        )}
        
        {/* Textarea */}
        {field.field_type === 'textarea' && (
          <textarea
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
            className={baseInputClass}
          />
        )}
        
        {/* DateTime */}
        {field.field_type === 'datetime' && (
          <input
            type="datetime-local"
            value={value}
            onChange={e => handleChange(field.slug, e.target.value)}
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
              disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
              disabled={disabled}
              className={baseInputClass}
            />
            <input
              type="text"
              value={value?.state || ''}
              onChange={e => handleChange(field.slug, { ...value, state: e.target.value })}
              placeholder="State"
              disabled={disabled}
              className={baseInputClass}
            />
            <input
              type="text"
              value={value?.country || ''}
              onChange={e => handleChange(field.slug, { ...value, country: e.target.value })}
              placeholder="Country"
              disabled={disabled}
              className={baseInputClass}
            />
          </div>
        )}
        
        {/* Quote field indicator */}
        {showQuoteFields && field.requires_quote && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            ⚠️ This field requires a supporting quote/source
          </div>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
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
