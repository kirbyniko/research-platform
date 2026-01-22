'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GuestFormMode, FieldDefinition } from '@/types/platform';

interface RecordTypeSettings {
  id: number;
  slug: string;
  name: string;
  guest_form_enabled: boolean;
  requires_review: boolean;
  requires_validation: boolean;
  guest_form_mode: GuestFormMode;
  analyst_can_skip_guest_form: boolean;
  require_quotes_for_review: boolean;
  require_sources_for_quotes: boolean;
  allow_quote_requirement_bypass: boolean;
  quote_bypass_roles: string[];
  require_all_fields_verified: boolean;
  allow_validation_bypass: boolean;
  validation_bypass_roles: string[];
  use_quotes: boolean;
  use_sources: boolean;
  use_media: boolean;
}

interface FieldWithVisibility extends Pick<FieldDefinition, 
  'id' | 'slug' | 'name' | 'field_type' | 'is_required' | 'requires_quote' | 
  'show_in_guest_form' | 'show_in_review_form'
> {
  requires_source_for_quote?: boolean;
  require_verified_for_publish?: boolean;
}

const ROLE_OPTIONS = ['admin', 'editor', 'reviewer', 'validator', 'analyst'];

export default function RecordTypeSettingsPage({ 
  params 
}: { 
  params: Promise<{ slug: string; type: string }> 
}) {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [typeSlug, setTypeSlug] = useState<string>('');
  
  const [settings, setSettings] = useState<RecordTypeSettings | null>(null);
  const [fields, setFields] = useState<FieldWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ slug, type }) => {
      setProjectSlug(slug);
      setTypeSlug(type);
    });
  }, [params]);

  const fetchSettings = useCallback(async () => {
    if (!projectSlug || !typeSlug) return;
    
    try {
      const res = await fetch(`/api/projects/${projectSlug}/record-types/${typeSlug}/settings`);
      if (!res.ok) throw new Error('Failed to fetch settings');
      
      const data = await res.json();
      setSettings(data.recordType);
      setFields(data.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [projectSlug, typeSlug]);

  useEffect(() => {
    if (projectSlug && typeSlug) {
      fetchSettings();
    }
  }, [projectSlug, typeSlug, fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const res = await fetch(`/api/projects/${projectSlug}/record-types/${typeSlug}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_form_mode: settings.guest_form_mode,
          analyst_can_skip_guest_form: settings.analyst_can_skip_guest_form,
          require_quotes_for_review: settings.require_quotes_for_review,
          require_sources_for_quotes: settings.require_sources_for_quotes,
          allow_quote_requirement_bypass: settings.allow_quote_requirement_bypass,
          quote_bypass_roles: settings.quote_bypass_roles,
          require_all_fields_verified: settings.require_all_fields_verified,
          use_quotes: settings.use_quotes,
          use_sources: settings.use_sources,
          use_media: settings.use_media,
          allow_validation_bypass: settings.allow_validation_bypass,
          validation_bypass_roles: settings.validation_bypass_roles
        })
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldVisibilityChange = async (fieldId: number, key: string, value: boolean) => {
    try {
      const res = await fetch(`/api/projects/${projectSlug}/record-types/${typeSlug}/fields/${fieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      
      if (!res.ok) throw new Error('Failed to update field');
      
      setFields(prev => prev.map(f => 
        f.id === fieldId ? { ...f, [key]: value } : f
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update field');
    }
  };

  const toggleRole = (roles: string[], role: string) => {
    return roles.includes(role) 
      ? roles.filter(r => r !== role)
      : [...roles, role];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <p className="text-red-600">{error || 'Record type not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href={`/projects/${projectSlug}/record-types`} className="hover:text-gray-700">
              Record Types
            </Link>
            <span>/</span>
            <Link href={`/projects/${projectSlug}/record-types/${typeSlug}`} className="hover:text-gray-700">
              {settings.name}
            </Link>
            <span>/</span>
            <span>Settings</span>
          </div>
          <h1 className="text-2xl font-bold">{settings.name} Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {/* Default Data Types Section */}
        <section className="mb-8 bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Default Data Types</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enable default data types that will be available for all records of this type.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.use_quotes}
                onChange={(e) => setSettings({ ...settings, use_quotes: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Quotes</div>
                <div className="text-sm text-gray-500">
                  Allow staff to attach text quotes with sources to records during review/validation
                </div>
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.use_sources}
                onChange={(e) => setSettings({ ...settings, use_sources: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Sources</div>
                <div className="text-sm text-gray-500">
                  Allow staff to attach source documents and links (primary/secondary) to records
                </div>
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.use_media}
                onChange={(e) => setSettings({ ...settings, use_media: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium">Media</div>
                <div className="text-sm text-gray-500">
                  Allow staff to attach media (videos, images, audio, documents) via URLs
                  <span className="block text-xs mt-1 text-amber-600">Note: Currently supports URLs only (YouTube, Vimeo, direct links). File upload coming soon.</span>
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Form Settings Section */}
        <section className="mb-8 bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Form Configuration</h2>
          
          <div className="space-y-4">
            {/* Guest Form Mode */}
            <div>
              <label className="block text-sm font-medium mb-2">Guest Form Mode</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="guest_form_mode"
                    value="custom"
                    checked={settings.guest_form_mode === 'custom'}
                    onChange={() => setSettings({ ...settings, guest_form_mode: 'custom' })}
                  />
                  <span>Custom</span>
                  <span className="text-sm text-gray-500">— Select specific fields to show in guest form</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="guest_form_mode"
                    value="mirror_review"
                    checked={settings.guest_form_mode === 'mirror_review'}
                    onChange={() => setSettings({ ...settings, guest_form_mode: 'mirror_review' })}
                  />
                  <span>Mirror Review Form</span>
                  <span className="text-sm text-gray-500">— Guest form shows same fields as review form</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="guest_form_mode"
                    value="disabled"
                    checked={settings.guest_form_mode === 'disabled'}
                    onChange={() => setSettings({ ...settings, guest_form_mode: 'disabled' })}
                  />
                  <span>Disabled</span>
                  <span className="text-sm text-gray-500">— No guest submissions for this type</span>
                </label>
              </div>
            </div>
            
            {/* Analyst Skip Option */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.analyst_can_skip_guest_form}
                onChange={(e) => setSettings({ ...settings, analyst_can_skip_guest_form: e.target.checked })}
              />
              <span>Analysts can skip guest form</span>
              <span className="text-sm text-gray-500">— Submit directly via review form</span>
            </label>
          </div>
        </section>

        {/* Guest Form Fields (when custom mode) */}
        {settings.guest_form_mode === 'custom' && (
          <section className="mb-8 bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Guest Form Fields</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select which fields to include in the public guest submission form.
            </p>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {fields.filter(f => f.show_in_review_form).map(field => (
                <label key={field.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={field.show_in_guest_form}
                    onChange={(e) => handleFieldVisibilityChange(field.id, 'show_in_guest_form', e.target.checked)}
                  />
                  <span className="flex-1">{field.name}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {field.field_type}
                  </span>
                  {field.is_required && (
                    <span className="text-xs text-red-600">Required</span>
                  )}
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Quote Requirements Section */}
        <section className="mb-8 bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quote Requirements</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.require_quotes_for_review}
                onChange={(e) => setSettings({ ...settings, require_quotes_for_review: e.target.checked })}
              />
              <span>Require quotes for review approval</span>
            </label>
            <p className="text-sm text-gray-600 ml-6">
              Fields marked &quot;requires quote&quot; must have a linked quote before a record can pass review.
            </p>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.require_sources_for_quotes}
                onChange={(e) => setSettings({ ...settings, require_sources_for_quotes: e.target.checked })}
              />
              <span>Require sources for quotes</span>
            </label>
            <p className="text-sm text-gray-600 ml-6">
              All quotes must have a source URL or citation attached.
            </p>
            
            {/* Bypass Settings */}
            <div className="border-t pt-4 mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allow_quote_requirement_bypass}
                  onChange={(e) => setSettings({ ...settings, allow_quote_requirement_bypass: e.target.checked })}
                />
                <span>Allow bypass for certain roles</span>
              </label>
              
              {settings.allow_quote_requirement_bypass && (
                <div className="ml-6 mt-2">
                  <label className="block text-sm text-gray-600 mb-2">Roles that can bypass:</label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map(role => (
                      <label key={role} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                        <input
                          type="checkbox"
                          checked={settings.quote_bypass_roles.includes(role)}
                          onChange={() => setSettings({
                            ...settings,
                            quote_bypass_roles: toggleRole(settings.quote_bypass_roles, role)
                          })}
                        />
                        <span className="text-sm capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Validation Requirements Section */}
        <section className="mb-8 bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Validation Requirements</h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.require_all_fields_verified}
                onChange={(e) => setSettings({ ...settings, require_all_fields_verified: e.target.checked })}
              />
              <span>Require all fields verified to publish</span>
            </label>
            <p className="text-sm text-gray-600 ml-6">
              Every field must be individually verified before a record can be published.
            </p>
            
            {/* Bypass Settings */}
            <div className="border-t pt-4 mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.allow_validation_bypass}
                  onChange={(e) => setSettings({ ...settings, allow_validation_bypass: e.target.checked })}
                />
                <span>Allow bypass for certain roles</span>
              </label>
              
              {settings.allow_validation_bypass && (
                <div className="ml-6 mt-2">
                  <label className="block text-sm text-gray-600 mb-2">Roles that can bypass:</label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map(role => (
                      <label key={role} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                        <input
                          type="checkbox"
                          checked={settings.validation_bypass_roles.includes(role)}
                          onChange={() => setSettings({
                            ...settings,
                            validation_bypass_roles: toggleRole(settings.validation_bypass_roles, role)
                          })}
                        />
                        <span className="text-sm capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Per-Field Quote Settings */}
        <section className="mb-8 bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Per-Field Quote Requirements</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure which fields require quotes to pass review.
          </p>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {fields.filter(f => f.show_in_review_form).map(field => (
              <div key={field.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <span className="flex-1">{field.name}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={field.requires_quote}
                    onChange={(e) => handleFieldVisibilityChange(field.id, 'requires_quote', e.target.checked)}
                  />
                  <span>Requires quote</span>
                </label>
              </div>
            ))}
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  );
}
