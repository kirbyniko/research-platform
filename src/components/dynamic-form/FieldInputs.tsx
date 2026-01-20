'use client';

import React from 'react';
import { FieldDefinition, FieldVisibility } from '@/types/platform';

export type FormMode = 'guest' | 'review' | 'validation' | 'view';

export interface FieldInputProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
  mode: FormMode;
}

// Check if field should be visible in current mode
export function isFieldVisible(field: FieldDefinition, mode: FormMode): boolean {
  const visibility = field.visibility as FieldVisibility | undefined;
  if (!visibility) return true;
  
  switch (mode) {
    case 'guest':
      return visibility.guest_form !== false;
    case 'review':
      return visibility.review_form !== false;
    case 'validation':
      return visibility.validation_form !== false;
    case 'view':
      return visibility.public_view !== false;
    default:
      return true;
  }
}

// Text Input
export function TextInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  
  return (
    <div className="space-y-1">
      <input
        type="text"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || config.placeholder}
        maxLength={config.max_length}
        minLength={config.min_length}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Textarea Input
export function TextareaInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  
  return (
    <div className="space-y-1">
      <textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || config.placeholder}
        maxLength={config.max_length}
        minLength={config.min_length}
        rows={config.rows || 4}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Number Input
export function NumberInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  
  return (
    <div className="space-y-1">
      <div className="flex items-center">
        {config.prefix && <span className="mr-2 text-gray-500">{config.prefix}</span>}
        <input
          type="number"
          value={value !== undefined && value !== null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          min={config.min}
          max={config.max}
          step={config.step}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {config.unit && <span className="ml-2 text-gray-500">{config.unit}</span>}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Date Input
export function DateInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  
  return (
    <div className="space-y-1">
      <input
        type="date"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        min={config.min_date}
        max={config.max_date}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// DateTime Input
export function DateTimeInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  
  return (
    <div className="space-y-1">
      <input
        type="datetime-local"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        min={config.min_date}
        max={config.max_date}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Boolean/Checkbox Input
export function BooleanInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span className="text-gray-700">{field.help_text || 'Yes'}</span>
      </label>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Select Input
export function SelectInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  const options = config.options || [];
  
  return (
    <div className="space-y-1">
      <select
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <option value="">Select {field.name}...</option>
        {options.map((opt: { value: string; label: string }) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Multi-Select Input
export function MultiSelectInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  const options = config.options || [];
  const selectedValues = (value as string[]) || [];
  
  const handleChange = (optValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, optValue]);
    } else {
      onChange(selectedValues.filter(v => v !== optValue));
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
        {options.map((opt: { value: string; label: string; description?: string }) => (
          <label key={opt.value} className="flex items-start space-x-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={selectedValues.includes(opt.value)}
              onChange={(e) => handleChange(opt.value, e.target.checked)}
              disabled={disabled}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <span className="text-gray-700">{opt.label}</span>
              {opt.description && (
                <p className="text-xs text-gray-500">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Radio Input
export function RadioInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  const options = config.options || [];
  
  return (
    <div className="space-y-2">
      {options.map((opt: { value: string; label: string; description?: string }) => (
        <label key={opt.value} className="flex items-start space-x-2 cursor-pointer">
          <input
            type="radio"
            name={field.slug}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <div>
            <span className="text-gray-700">{opt.label}</span>
            {opt.description && (
              <p className="text-xs text-gray-500">{opt.description}</p>
            )}
          </div>
        </label>
      ))}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// URL Input
export function UrlInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  return (
    <div className="space-y-1">
      <input
        type="url"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || 'https://example.com'}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Email Input
export function EmailInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  return (
    <div className="space-y-1">
      <input
        type="email"
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || 'email@example.com'}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Location Input (City, State, Country)
export function LocationInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  const config = field.config || {};
  const locationValue = (value as { city?: string; state?: string; country?: string }) || {};
  
  const handleChange = (key: string, val: string) => {
    onChange({ ...locationValue, [key]: val });
  };
  
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input
          type="text"
          value={locationValue.city || ''}
          onChange={(e) => handleChange('city', e.target.value)}
          placeholder="City"
          disabled={disabled}
          className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <input
          type="text"
          value={locationValue.state || ''}
          onChange={(e) => handleChange('state', e.target.value)}
          placeholder="State/Province"
          disabled={disabled}
          className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {config.country_options ? (
          <select
            value={locationValue.country || ''}
            onChange={(e) => handleChange('country', e.target.value)}
            disabled={disabled}
            className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Country...</option>
            {config.country_options.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={locationValue.country || ''}
            onChange={(e) => handleChange('country', e.target.value)}
            placeholder="Country"
            disabled={disabled}
            className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Rich Text Input (simplified - just a textarea with more height)
export function RichTextInput({ field, value, onChange, error, disabled }: FieldInputProps) {
  return (
    <div className="space-y-1">
      <textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={8}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono text-sm ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
      <p className="text-xs text-gray-500">Supports Markdown formatting</p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// Get the appropriate input component for a field type
export function getFieldInput(fieldType: string): React.FC<FieldInputProps> {
  switch (fieldType) {
    case 'text':
      return TextInput;
    case 'textarea':
      return TextareaInput;
    case 'number':
      return NumberInput;
    case 'date':
      return DateInput;
    case 'datetime':
      return DateTimeInput;
    case 'boolean':
      return BooleanInput;
    case 'select':
      return SelectInput;
    case 'multi_select':
      return MultiSelectInput;
    case 'radio':
      return RadioInput;
    case 'checkbox_group':
      return MultiSelectInput; // Same component
    case 'url':
      return UrlInput;
    case 'email':
      return EmailInput;
    case 'location':
      return LocationInput;
    case 'rich_text':
      return RichTextInput;
    default:
      return TextInput; // Fallback
  }
}
