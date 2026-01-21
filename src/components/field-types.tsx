'use client';

import { useState } from 'react';
import { SelectOption } from '@/types/platform';

// =====================================================
// TRI-STATE FIELD (Yes/No/Unknown dropdown)
// =====================================================
interface TriStateFieldProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export function TriStateField({ value, onChange, disabled, label }: TriStateFieldProps) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full border rounded px-3 py-2 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'}`}
    >
      <option value="">Unknown</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

// =====================================================
// INCIDENT TYPES FIELD (Checkboxes with per-option source linking)
// =====================================================
interface IncidentTypeOption {
  value: string;
  label: string;
  category?: string;
}

interface IncidentTypesValue {
  selected: string[];
  sources?: Record<string, number | null>; // Maps incident type value to quote ID
}

interface IncidentTypesFieldProps {
  value: IncidentTypesValue | string[] | undefined;
  onChange: (value: IncidentTypesValue) => void;
  options: IncidentTypeOption[];
  disabled?: boolean;
  onLinkSource?: (incidentType: string) => void;
}

export function IncidentTypesField({ value, onChange, options, disabled, onLinkSource }: IncidentTypesFieldProps) {
  // Normalize value to new format
  const normalizedValue: IncidentTypesValue = Array.isArray(value) 
    ? { selected: value, sources: {} }
    : value || { selected: [], sources: {} };
  
  // Group options by category
  const groupedOptions = options.reduce((acc, opt) => {
    const category = opt.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(opt);
    return acc;
  }, {} as Record<string, IncidentTypeOption[]>);
  
  const handleToggle = (optionValue: string) => {
    const isSelected = normalizedValue.selected.includes(optionValue);
    const newSelected = isSelected
      ? normalizedValue.selected.filter(v => v !== optionValue)
      : [...normalizedValue.selected, optionValue];
    
    onChange({
      ...normalizedValue,
      selected: newSelected
    });
  };
  
  return (
    <div className="border rounded-lg p-3 bg-gray-50 space-y-4 max-h-[300px] overflow-y-auto">
      {Object.entries(groupedOptions).map(([category, opts]) => (
        <div key={category}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b">
            {category}
          </div>
          <div className="space-y-1">
            {opts.map(opt => {
              const isChecked = normalizedValue.selected.includes(opt.value);
              const hasSource = normalizedValue.sources?.[opt.value];
              
              return (
                <div key={opt.value} className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 py-1 px-2 rounded hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggle(opt.value)}
                      disabled={disabled}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm ${isChecked ? 'font-medium text-blue-700' : ''}`}>
                      {opt.label}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onLinkSource?.(opt.value)}
                    disabled={disabled}
                    className={`text-xs px-2 py-0.5 rounded border ${
                      hasSource 
                        ? 'bg-blue-100 border-blue-400 text-blue-700' 
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    [src]
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// =====================================================
// MEDIA FIELD (Image/Video URLs with preview and upload)
// =====================================================
interface MediaItem {
  id?: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  verified?: boolean;
}

interface MediaFieldProps {
  value: MediaItem[] | undefined;
  onChange: (value: MediaItem[]) => void;
  disabled?: boolean;
  accept?: string[];
  maxFileSize?: { image: number; video: number };
  description?: string;
}

export function MediaField({ value = [], onChange, disabled, description }: MediaFieldProps) {
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  
  const addMediaUrl = () => {
    if (!newUrl.trim()) return;
    
    // Determine type from URL
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(newUrl) || 
                    newUrl.includes('youtube.com') || 
                    newUrl.includes('vimeo.com');
    
    const newItem: MediaItem = {
      id: `media-${Date.now()}`,
      type: isVideo ? 'video' : 'image',
      url: newUrl.trim(),
      verified: false
    };
    
    onChange([...value, newItem]);
    setNewUrl('');
    setShowAddUrl(false);
  };
  
  const removeMedia = (id: string) => {
    onChange(value.filter(item => item.id !== id));
  };
  
  const toggleVerified = (id: string) => {
    onChange(value.map(item => 
      item.id === id ? { ...item, verified: !item.verified } : item
    ));
  };
  
  return (
    <div className="space-y-3">
      {/* Media List */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div 
              key={item.id || index} 
              className={`flex items-start gap-3 p-2 border rounded ${
                item.verified ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              {/* Thumbnail/Preview */}
              <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {item.type === 'image' ? (
                  <img 
                    src={item.url} 
                    alt="" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.svg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    🎥
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-gray-500">
                    {item.type}
                  </span>
                  {item.verified && (
                    <span className="text-xs text-green-600">✓ Verified</span>
                  )}
                </div>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate block"
                >
                  {item.url}
                </a>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-blue-600"
                >
                  🔗 Preview link
                </a>
              </div>
              
              {/* Actions */}
              {!disabled && (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => toggleVerified(item.id!)}
                    className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                  >
                    {item.verified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMedia(item.id!)}
                    className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Add buttons */}
      {!disabled && (
        <>
          {showAddUrl ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="Enter image or video URL..."
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMediaUrl())}
              />
              <button
                type="button"
                onClick={addMediaUrl}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowAddUrl(false); setNewUrl(''); }}
                className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddUrl(true)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
              >
                + Add URL
              </button>
              <button
                type="button"
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                disabled
                title="File upload not yet implemented"
              >
                📤 Upload File
              </button>
            </div>
          )}
        </>
      )}
      
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

// =====================================================
// CUSTOM FIELDS (User-defined arbitrary fields)
// =====================================================
interface CustomFieldItem {
  id: string;
  name: string;
  value: string;
}

interface CustomFieldsProps {
  value: CustomFieldItem[] | undefined;
  onChange: (value: CustomFieldItem[]) => void;
  disabled?: boolean;
  description?: string;
}

export function CustomFieldsField({ value = [], onChange, disabled, description }: CustomFieldsProps) {
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  
  const addField = () => {
    if (!newFieldName.trim()) return;
    
    const newField: CustomFieldItem = {
      id: `custom-${Date.now()}`,
      name: newFieldName.trim(),
      value: newFieldValue.trim()
    };
    
    onChange([...value, newField]);
    setNewFieldName('');
    setNewFieldValue('');
    setShowAddField(false);
  };
  
  const updateField = (id: string, field: Partial<CustomFieldItem>) => {
    onChange(value.map(item => 
      item.id === id ? { ...item, ...field } : item
    ));
  };
  
  const removeField = (id: string) => {
    onChange(value.filter(item => item.id !== id));
  };
  
  return (
    <div className="space-y-3">
      {/* Existing custom fields */}
      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map(field => (
            <div key={field.id} className="flex gap-2 items-start p-2 border border-gray-200 rounded bg-gray-50">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={field.name}
                  onChange={e => updateField(field.id, { name: e.target.value })}
                  disabled={disabled}
                  placeholder="Field name"
                  className="w-full text-sm font-medium border border-gray-300 rounded px-2 py-1"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={e => updateField(field.id, { value: e.target.value })}
                  disabled={disabled}
                  placeholder="Field value"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeField(field.id)}
                  className="text-red-500 hover:text-red-700 px-2 py-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 text-sm py-4 border border-dashed border-gray-300 rounded">
          <p>No custom fields yet</p>
          {description && <p className="text-xs mt-1">{description}</p>}
        </div>
      )}
      
      {/* Add new field */}
      {!disabled && (
        <>
          {showAddField ? (
            <div className="p-3 border border-blue-200 rounded bg-blue-50 space-y-2">
              <input
                type="text"
                value={newFieldName}
                onChange={e => setNewFieldName(e.target.value)}
                placeholder="Field name"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                value={newFieldValue}
                onChange={e => setNewFieldValue(e.target.value)}
                placeholder="Field value"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addField}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Add Field
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddField(false); setNewFieldName(''); setNewFieldValue(''); }}
                  className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddField(true)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
            >
              + Add Custom Field
            </button>
          )}
        </>
      )}
    </div>
  );
}
