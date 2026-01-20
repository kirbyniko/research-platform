'use client';

import React, { useState, useEffect } from 'react';
import { FieldDefinition, FieldGroup, RecordQuote } from '@/types/platform';
import { FormMode, getFieldInput, isFieldVisible } from './FieldInputs';

interface DynamicFormProps {
  projectSlug: string;
  recordTypeSlug: string;
  recordId?: number;
  mode: FormMode;
  fields: FieldDefinition[];
  groups?: FieldGroup[];
  initialData?: Record<string, unknown>;
  quotes?: RecordQuote[];
  verifiedFields?: Record<string, { verified: boolean; by: number; at: string }>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  onVerifyField?: (fieldKey: string, verified: boolean) => void;
  onLinkQuote?: (fieldKey: string, quoteId: number, linked: boolean) => void;
}

interface FieldErrors {
  [key: string]: string;
}

export default function DynamicForm({
  mode,
  fields,
  groups = [],
  initialData = {},
  quotes = [],
  verifiedFields = {},
  onSubmit,
  onCancel,
  onVerifyField,
  onLinkQuote,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Group fields by their group_id
  const fieldsByGroup = React.useMemo(() => {
    const grouped: Record<string | number, FieldDefinition[]> = { ungrouped: [] };
    
    // Initialize groups
    groups.forEach(g => {
      grouped[g.id] = [];
    });
    
    // Assign fields to groups
    fields.forEach(field => {
      if (!isFieldVisible(field, mode)) return;
      
      if (field.field_group_id && grouped[field.field_group_id]) {
        grouped[field.field_group_id].push(field);
      } else {
        grouped['ungrouped'].push(field);
      }
    });
    
    return grouped;
  }, [fields, groups, mode]);

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    // Clear error when user starts typing
    if (errors[fieldKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FieldErrors = {};
    
    fields.forEach(field => {
      if (!isFieldVisible(field, mode)) return;
      
      const value = formData[field.slug];
      
      // Required validation
      if (field.is_required) {
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[field.slug] = `${field.name} is required`;
          return;
        }
      }
      
      // Type-specific validation
      if (value !== undefined && value !== null && value !== '') {
        const config = field.config || {};
        const validationRules = field.validation_rules || {};
        
        // Pattern validation
        if (validationRules.pattern && typeof value === 'string') {
          const regex = new RegExp(validationRules.pattern);
          if (!regex.test(value)) {
            newErrors[field.slug] = validationRules.pattern_message || `Invalid format for ${field.name}`;
          }
        }
        
        // Min/max for numbers
        if (field.field_type === 'number' && typeof value === 'number') {
          if (config.min !== undefined && value < config.min) {
            newErrors[field.slug] = `${field.name} must be at least ${config.min}`;
          }
          if (config.max !== undefined && value > config.max) {
            newErrors[field.slug] = `${field.name} must be at most ${config.max}`;
          }
        }
        
        // Length validation for strings
        if (typeof value === 'string') {
          if (config.min_length !== undefined && value.length < config.min_length) {
            newErrors[field.slug] = `${field.name} must be at least ${config.min_length} characters`;
          }
          if (config.max_length !== undefined && value.length > config.max_length) {
            newErrors[field.slug] = `${field.name} must be at most ${config.max_length} characters`;
          }
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGroup = (groupId: string | number) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(String(groupId))) {
        next.delete(String(groupId));
      } else {
        next.add(String(groupId));
      }
      return next;
    });
  };

  const renderField = (field: FieldDefinition) => {
    const InputComponent = getFieldInput(field.field_type);
    const linkedQuotes = quotes.filter(q => q.linked_fields?.includes(field.slug));
    const isVerified = verifiedFields[field.slug]?.verified;
    
    return (
      <div key={field.id} className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {field.name}
            {field.is_required && <span className="text-red-500 ml-1">*</span>}
            {field.requires_quote && (
              <span className="ml-2 text-xs text-orange-600" title="Requires supporting quote">
                📎 Quote required
              </span>
            )}
          </label>
          
          {/* Verification checkbox for validation mode */}
          {mode === 'validation' && onVerifyField && (
            <label className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => onVerifyField(field.slug, e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className={isVerified ? 'text-green-600' : 'text-gray-500'}>
                Verified
              </span>
            </label>
          )}
        </div>
        
        {field.description && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}
        
        <InputComponent
          field={field}
          value={formData[field.slug]}
          onChange={(value) => handleFieldChange(field.slug, value)}
          error={errors[field.slug]}
          disabled={mode === 'view' || isSubmitting}
          mode={mode}
        />
        
        {/* Show linked quotes */}
        {linkedQuotes.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-gray-500">Linked Quotes:</p>
            {linkedQuotes.map(quote => (
              <div key={quote.id} className="text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                <p className="italic">&ldquo;{quote.quote_text}&rdquo;</p>
                {quote.source && <p className="text-gray-500 mt-1">— {quote.source}</p>}
              </div>
            ))}
          </div>
        )}
        
        {/* Quote linking UI for review mode */}
        {mode === 'review' && quotes.length > 0 && onLinkQuote && (
          <details className="text-xs">
            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
              Link quotes to this field
            </summary>
            <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200">
              {quotes.map(quote => {
                const isLinked = quote.linked_fields?.includes(field.slug);
                return (
                  <label key={quote.id} className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={(e) => onLinkQuote(field.slug, quote.id, e.target.checked)}
                      className="mt-1 w-3 h-3"
                    />
                    <span className="text-gray-700 line-clamp-2">
                      {quote.quote_text.substring(0, 100)}...
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderFieldGroup = (groupId: string | number, groupFields: FieldDefinition[], groupInfo?: FieldGroup) => {
    if (groupFields.length === 0) return null;
    
    const isCollapsed = collapsedGroups.has(String(groupId));
    const groupName = groupInfo?.name || 'General';
    
    return (
      <div key={groupId} className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleGroup(groupId)}
          className="w-full px-4 py-3 bg-gray-50 text-left font-medium text-gray-700 flex items-center justify-between hover:bg-gray-100"
        >
          <span>{groupName}</span>
          <span className="text-gray-400">{isCollapsed ? '▶' : '▼'}</span>
        </button>
        
        {!isCollapsed && (
          <div className="p-4 space-y-6">
            {groupFields.map(field => renderField(field))}
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {submitError}
        </div>
      )}
      
      {/* Render ungrouped fields first */}
      {fieldsByGroup['ungrouped']?.length > 0 && (
        <div className="space-y-6">
          {fieldsByGroup['ungrouped'].map(field => renderField(field))}
        </div>
      )}
      
      {/* Render grouped fields */}
      {groups
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(group => renderFieldGroup(group.id, fieldsByGroup[group.id] || [], group))}
      
      {/* Form actions */}
      {mode !== 'view' && (
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : (
              mode === 'guest' ? 'Submit' :
              mode === 'review' ? 'Save & Continue' :
              mode === 'validation' ? 'Complete Validation' :
              'Save'
            )}
          </button>
        </div>
      )}
    </form>
  );
}
