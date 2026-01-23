'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FieldDefinition, FieldType, FieldConfig, SelectOption } from '@/types/platform';

interface FieldGroup {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
}

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'boolean', label: 'Checkbox', description: 'Yes/No toggle' },
  { value: 'select', label: 'Dropdown', description: 'Single selection from options' },
  { value: 'multi_select', label: 'Multi-Select', description: 'Multiple selections from options' },
  { value: 'radio', label: 'Radio Buttons', description: 'Single selection with visible options' },
  { value: 'checkbox_group', label: 'Checkbox Group', description: 'Multiple checkboxes' },
  { value: 'url', label: 'URL', description: 'Web address input' },
  { value: 'email', label: 'Email', description: 'Email address input' },
  { value: 'location', label: 'Location', description: 'City/State/Country' },
  { value: 'rich_text', label: 'Rich Text', description: 'Formatted text with markdown' },
];

interface GroupManagerModalProps {
  projectSlug: string;
  recordTypeSlug: string;
  groups: FieldGroup[];
  onClose: () => void;
  onSave: () => void;
}

function GroupManagerModal({ projectSlug, recordTypeSlug, groups, onClose, onSave }: GroupManagerModalProps) {
  const [localGroups, setLocalGroups] = useState<FieldGroup[]>(groups);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSlug, setNewGroupSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  function handleNameChange(value: string) {
    setNewGroupName(value);
    if (autoSlug) {
      setNewGroupSlug(generateSlug(value));
    }
  }

  async function handleAddGroup() {
    if (!newGroupName.trim() || !newGroupSlug.trim()) {
      setError('Name and slug are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectSlug}/record-types/${recordTypeSlug}/groups`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newGroupName.trim(),
            slug: newGroupSlug.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group');
      }

      setLocalGroups([...localGroups, data.group]);
      setNewGroupName('');
      setNewGroupSlug('');
      setAutoSlug(true);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(groupId: number) {
    if (!confirm('Are you sure you want to delete this group? Fields in this group will become ungrouped.')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectSlug}/record-types/${recordTypeSlug}/groups/${groupId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete group');
      }

      setLocalGroups(localGroups.filter(g => g.id !== groupId));
      onSave();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete group');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Field Groups</h2>
          <p className="text-sm text-gray-500 mt-1">Groups organize fields into sections in forms</p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Add New Group */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Group</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Group Name *</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Shooting Details"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Slug will be auto-generated: {newGroupSlug || '(type a name)'}</p>
            </div>
            <button
              onClick={handleAddGroup}
              disabled={saving || !newGroupName.trim() || !newGroupSlug.trim()}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {saving ? 'Adding...' : '+ Add Group'}
            </button>
          </div>

          {/* Existing Groups */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Existing Groups ({localGroups.length})</h3>
            {localGroups.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No groups yet. Create your first group above.
              </p>
            ) : (
              <div className="space-y-2">
                {localGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{group.name}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-red-600 hover:text-red-800 text-sm px-3 py-1"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface FieldEditorModalProps {
  projectSlug: string;
  recordTypeSlug: string;
  field?: FieldDefinition;
  groups: FieldGroup[];
  allFields: FieldDefinition[];
  onSave: () => void;
  onClose: () => void;
}

function FieldEditorModal({ projectSlug, recordTypeSlug, field, groups, allFields, onSave, onClose }: FieldEditorModalProps) {
  const isEditing = !!field;
  
  const [slug, setSlug] = useState(field?.slug || '');
  const [name, setName] = useState(field?.name || '');
  const [description, setDescription] = useState(field?.description || '');
  const [placeholder, setPlaceholder] = useState(field?.placeholder || '');
  const [fieldType, setFieldType] = useState<FieldType>(field?.field_type || 'text');
  const [fieldGroupId, setFieldGroupId] = useState<number | null>(field?.field_group_id || null);
  const [isRequired, setIsRequired] = useState(field?.is_required || false);
  const [requiresQuote, setRequiresQuote] = useState(field?.requires_quote || false);
  const [requiresSourceForQuote, setRequiresSourceForQuote] = useState(field?.requires_source_for_quote || false);
  const [requireVerifiedForPublish, setRequireVerifiedForPublish] = useState(field?.require_verified_for_publish ?? true);
  const [showInGuestForm, setShowInGuestForm] = useState(field?.show_in_guest_form || false);
  const [showInReviewForm, setShowInReviewForm] = useState(field?.show_in_review_form ?? true);
  const [showInValidationForm, setShowInValidationForm] = useState(field?.show_in_validation_form ?? true);
  const [showInPublicView, setShowInPublicView] = useState(field?.show_in_public_view ?? true);
  const [width, setWidth] = useState(field?.width || 'full');
  
  // Config for select/multi_select
  const [options, setOptions] = useState<SelectOption[]>(
    (field?.config?.options as SelectOption[]) || []
  );
  const [newOptionLabel, setNewOptionLabel] = useState('');
  
  // Conditional visibility
  const [showWhenEnabled, setShowWhenEnabled] = useState(!!field?.config?.show_when);
  const [showWhenField, setShowWhenField] = useState(field?.config?.show_when?.field || '');
  const [showWhenOperator, setShowWhenOperator] = useState<string>(field?.config?.show_when?.operator || 'contains');
  const [showWhenValue, setShowWhenValue] = useState(field?.config?.show_when?.value?.toString() || '');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing && name) {
      setSlug(generateSlug(name));
    }
  }, [name, isEditing]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  function generateOptionValue(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s/-]/g, '')
      .replace(/[\s/-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  function addOption() {
    if (!newOptionLabel.trim()) return;
    const label = newOptionLabel.trim();
    const value = generateOptionValue(label);
    // Check for duplicate values
    if (options.some(opt => opt.value === value)) {
      alert(`Option with value "${value}" already exists`);
      return;
    }
    setOptions([...options, { value, label }]);
    setNewOptionLabel('');
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index));
  }

  const needsOptions = ['select', 'multi_select', 'radio', 'checkbox_group'].includes(fieldType);

  async function handleSave() {
    setError(null);
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!slug.trim()) {
      setError('Slug is required');
      return;
    }
    
    if (needsOptions && options.length === 0) {
      setError('At least one option is required for this field type');
      return;
    }
    
    setSaving(true);
    
    const config: FieldConfig = {};
    if (needsOptions) {
      config.options = options;
    }
    if (showWhenEnabled && showWhenField) {
      config.show_when = {
        field: showWhenField,
        operator: showWhenOperator as 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists',
        value: ['exists', 'not_exists'].includes(showWhenOperator) ? undefined : showWhenValue,
      };
    }
    
    const payload = {
      slug,
      name: name.trim(),
      description: description.trim() || null,
      placeholder: placeholder.trim() || null,
      field_type: fieldType,
      field_group_id: fieldGroupId,
      config,
      is_required: isRequired,
      requires_quote: requiresQuote,
      requires_source_for_quote: requiresSourceForQuote,
      require_verified_for_publish: requireVerifiedForPublish,
      show_in_guest_form: showInGuestForm,
      show_in_review_form: showInReviewForm,
      show_in_validation_form: showInValidationForm,
      show_in_public_view: showInPublicView,
      width,
    };
    
    try {
      const url = isEditing
        ? `/api/projects/${projectSlug}/record-types/${recordTypeSlug}/fields/${field.id}`
        : `/api/projects/${projectSlug}/record-types/${recordTypeSlug}/fields`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save field');
      }
      
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save field');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Field' : 'Add Field'}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Subject Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {name && !isEditing && (
                <p className="text-xs text-gray-500 mt-2">
                  Slug will be auto-generated: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{slug || generateSlug(name)}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Help text shown to users"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Field Group */}
          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section/Group</label>
              <select
                value={fieldGroupId ?? ''}
                onChange={(e) => setFieldGroupId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No group (ungrouped)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Fields are displayed grouped by section in forms
              </p>
            </div>
          )}

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Field Type *</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {FIELD_TYPES.map((ft) => (
                <label
                  key={ft.value}
                  className={`flex items-start gap-2 p-2 rounded cursor-pointer transition ${
                    fieldType === ft.value ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="fieldType"
                    value={ft.value}
                    checked={fieldType === ft.value}
                    onChange={() => setFieldType(ft.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-sm">{ft.label}</div>
                    <div className="text-xs text-gray-500">{ft.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options for select types */}
          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options *</label>
              <div className="border rounded-lg p-3 space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="font-mono text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">{opt.value}</span>
                    <span className="text-sm flex-1">{opt.label}</span>
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="text-red-500 hover:text-red-700 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">
                    💡 Just type the label - value is auto-generated (e.g., &quot;Death in Custody&quot; → death_in_custody)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      placeholder="Type option label (e.g., Death in Custody)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Validation</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Required field</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresQuote}
                  onChange={(e) => setRequiresQuote(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Requires supporting quote to verify</span>
              </label>
              {requiresQuote && (
                <label className="flex items-center gap-2 cursor-pointer ml-6">
                  <input
                    type="checkbox"
                    checked={requiresSourceForQuote}
                    onChange={(e) => setRequiresSourceForQuote(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">Quote must have a source</span>
                </label>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireVerifiedForPublish}
                  onChange={(e) => setRequireVerifiedForPublish(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Must be verified before publish</span>
              </label>
            </div>
          </div>

          {/* Conditional Visibility */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Conditional Visibility</h3>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={showWhenEnabled}
                onChange={(e) => setShowWhenEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm">Only show this field when another field has a specific value</span>
            </label>
            
            {showWhenEnabled && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <p className="text-xs text-gray-500 mb-2">
                  💡 Example: Show &quot;Shooting Details&quot; only when &quot;incident_types&quot; contains &quot;shooting&quot;
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Field slug</label>
                    <input
                      type="text"
                      value={showWhenField}
                      onChange={(e) => setShowWhenField(e.target.value)}
                      placeholder="e.g., incident_types"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
                    <select
                      value={showWhenOperator}
                      onChange={(e) => setShowWhenOperator(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    >
                      <option value="contains">contains</option>
                      <option value="not_contains">does not contain</option>
                      <option value="equals">equals</option>
                      <option value="not_equals">does not equal</option>
                      <option value="exists">has any value</option>
                      <option value="not_exists">is empty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                    <input
                      type="text"
                      value={showWhenValue}
                      onChange={(e) => setShowWhenValue(e.target.value)}
                      placeholder="e.g., shooting"
                      disabled={['exists', 'not_exists'].includes(showWhenOperator)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Visibility */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Form Visibility</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInGuestForm}
                  onChange={(e) => setShowInGuestForm(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Guest Form</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInReviewForm}
                  onChange={(e) => setShowInReviewForm(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Review Form</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInValidationForm}
                  onChange={(e) => setShowInValidationForm(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Validation Form</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInPublicView}
                  onChange={(e) => setShowInPublicView(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm">Public View</span>
              </label>
            </div>
          </div>

          {/* Width */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Field Width</label>
            <div className="flex gap-4">
              {(['full', 'half', 'third'] as const).map((w) => (
                <label key={w} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="width"
                    value={w}
                    checked={width === w}
                    onChange={() => setWidth(w)}
                    className="text-blue-600"
                  />
                  <span className="text-sm capitalize">{w}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Field'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FieldEditorPage({ params }: { params: Promise<{ slug: string; type: string }> }) {
  const resolvedParams = use(params);
  const { status } = useSession();
  const router = useRouter();
  
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [recordType, setRecordType] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<FieldDefinition | undefined>(undefined);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, resolvedParams.slug, resolvedParams.type]);

  async function fetchData() {
    try {
      // Fetch record type details
      const typeRes = await fetch(`/api/projects/${resolvedParams.slug}/record-types/${resolvedParams.type}`);
      if (!typeRes.ok) throw new Error('Record type not found');
      const typeData = await typeRes.json();
      setRecordType(typeData.recordType);
      setFields(typeData.fields);
      setGroups(typeData.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(fieldId: number) {
    if (!confirm('Are you sure you want to delete this field?')) return;
    
    try {
      const response = await fetch(
        `/api/projects/${resolvedParams.slug}/record-types/${resolvedParams.type}/fields/${fieldId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete field');
      }
      
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete field');
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{error}</h1>
          <Link href={`/projects/${resolvedParams.slug}`} className="text-blue-600 hover:text-blue-800">
            ← Back to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={`/projects/${resolvedParams.slug}/record-types/${resolvedParams.type}`} className="text-blue-600 hover:text-blue-800">
            ← Back to {recordType?.name}
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {recordType?.icon} {recordType?.name} Fields
              </h1>
              <p className="text-gray-600">Define the fields for this record type</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGroupManager(true)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                📁 Manage Groups
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Field
              </button>
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No fields yet</h3>
              <p className="text-gray-600 mb-6">Add fields to define what data to collect.</p>
              
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6 mx-auto max-w-2xl text-sm text-left">
                <strong className="block mb-1">💡 About Quotes, Sources & Media:</strong>
                <p className="mb-2">
                  These are managed separately from fields and don't need field definitions. Enable them in{' '}
                  <Link 
                    href={`/projects/${resolvedParams.slug}/record-types/${resolvedParams.type}/settings`}
                    className="underline font-medium"
                  >
                    Settings → Default Data Types
                  </Link>
                  .
                </p>
                <p>
                  When enabled, you can add quotes, sources, and media when creating or reviewing records.
                </p>
              </div>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Add First Field
              </button>
            </div>
          ) : (
            <div>
              {/* Group fields by their field_group_id */}
              {(() => {
                // Separate fields into groups
                const ungroupedFields = fields.filter(f => !f.field_group_id);
                const groupedFieldsMap = new Map<number, FieldDefinition[]>();
                
                fields.forEach(f => {
                  if (f.field_group_id) {
                    const existing = groupedFieldsMap.get(f.field_group_id) || [];
                    existing.push(f);
                    groupedFieldsMap.set(f.field_group_id, existing);
                  }
                });

                const renderFieldRow = (field: FieldDefinition) => (
                  <div key={field.id} className="p-4 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{field.name}</span>
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {field.slug}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {field.field_type}
                        </span>
                      </div>
                      {field.description && (
                        <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {field.is_required && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Required</span>
                        )}
                        {field.requires_quote && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">Needs Quote</span>
                        )}
                        {field.show_in_guest_form && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Guest</span>
                        )}
                        {field.show_in_list_view && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">In List</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingField(field)}
                        className="text-blue-600 hover:text-blue-800 px-3 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(field.id)}
                        className="text-red-600 hover:text-red-800 px-3 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );

                return (
                  <>
                    {/* Ungrouped fields first */}
                    {ungroupedFields.length > 0 && (
                      <div className="border-b border-gray-200">
                        <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-600">
                          Ungrouped Fields
                        </div>
                        {ungroupedFields.map(renderFieldRow)}
                      </div>
                    )}

                    {/* Grouped fields by section */}
                    {groups.map(group => {
                      const groupFields = groupedFieldsMap.get(group.id) || [];
                      if (groupFields.length === 0) return null;
                      
                      return (
                        <div key={group.id} className="border-b border-gray-200 last:border-b-0">
                          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                            <div className="font-medium text-blue-900">{group.name}</div>
                            <div className="text-xs text-blue-600">{groupFields.length} field{groupFields.length !== 1 ? 's' : ''}</div>
                          </div>
                          {groupFields.map(renderFieldRow)}
                        </div>
                      );
                    })}

                    {/* Empty groups at the end */}
                    {groups.filter(g => !(groupedFieldsMap.get(g.id) || []).length).length > 0 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          <strong>Empty groups:</strong>{' '}
                          {groups.filter(g => !(groupedFieldsMap.get(g.id) || []).length).map(g => g.name).join(', ')}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Link
            href={`/projects/${resolvedParams.slug}`}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Project
          </Link>
          <Link
            href={`/projects/${resolvedParams.slug}/submit?type=${resolvedParams.type}`}
            className="text-blue-600 hover:text-blue-800"
          >
            Preview Guest Form →
          </Link>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingField) && (
        <FieldEditorModal
          projectSlug={resolvedParams.slug}
          recordTypeSlug={resolvedParams.type}
          field={editingField}
          groups={groups}
          allFields={fields}
          onSave={() => {
            setShowAddModal(false);
            setEditingField(undefined);
            fetchData();
          }}
          onClose={() => {
            setShowAddModal(false);
            setEditingField(undefined);
          }}
        />
      )}

      {/* Group Manager Modal */}
      {showGroupManager && (
        <GroupManagerModal
          projectSlug={resolvedParams.slug}
          recordTypeSlug={resolvedParams.type}
          groups={groups}
          onSave={() => {
            fetchData();
          }}
          onClose={() => {
            setShowGroupManager(false);
          }}
        />
      )}
    </div>
  );
}
