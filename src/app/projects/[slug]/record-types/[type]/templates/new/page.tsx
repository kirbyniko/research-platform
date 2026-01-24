'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TemplateEditor } from '@/components/templates/TemplateEditor';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { DisplayTemplate, DEFAULT_TEMPLATE } from '@/types/templates';
import { FieldDefinition } from '@/types/platform';

// Inline SVG Icons
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// Helper to convert enabled_data_types array to object format
function getEnabledDataTypes(arr?: string[]): { quotes: boolean; sources: boolean; media: boolean } {
  const types = arr || ['quotes', 'sources', 'media'];
  return {
    quotes: types.includes('quotes'),
    sources: types.includes('sources'),
    media: types.includes('media'),
  };
}

export default function NewTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const type = params.type as string;

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [recordType, setRecordType] = useState<{ id: number; name: string; slug: string; enabled_data_types?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<Record<string, any> | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [template, setTemplate] = useState<DisplayTemplate>(DEFAULT_TEMPLATE);

  useEffect(() => {
    fetchData();
  }, [slug, type]);

  const fetchData = async () => {
    try {
      // Fetch record type
      const rtRes = await fetch(`/api/projects/${slug}/record-types/${type}`);
      if (!rtRes.ok) throw new Error('Failed to fetch record type');
      const rtData = await rtRes.json();
      setRecordType(rtData);

      // Fetch fields
      const fieldsRes = await fetch(`/api/projects/${slug}/record-types/${type}/fields`);
      if (!fieldsRes.ok) throw new Error('Failed to fetch fields');
      const fieldsData = await fieldsRes.json();
      setFields(fieldsData.fields || []);

      // Fetch a sample record for preview
      fetchPreviewRecord();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewRecord = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/projects/${slug}/records?type=${type}&limit=1&sortBy=created_at&sortOrder=desc`);
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          setPreviewRecord(data.records[0].data);
        }
      }
    } catch (err) {
      console.warn('Could not load preview record:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('[TemplateSave] Saving template:', {
        name: name.trim(),
        sections: template.sections.length,
        fields: template.sections.reduce((sum, s) => sum + s.items.length, 0),
        template
      });
      
      const res = await fetch(`/api/projects/${slug}/record-types/${type}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          is_default: isDefault,
          template,
        }),
      });

      const data = await res.json();
      console.log('[TemplateSave] Response data:', data);

      if (!res.ok) {
        console.error('[TemplateSave] Save failed:', { status: res.status, data });
        
        // Show the actual error details to the user
        if (data.details) {
          setError(`Server error: ${data.details}`);
          return;
        }
        
        if (data.validation?.errors) {
          const errorMsg = data.validation.errors.map((e: any) => `${e.path}: ${e.message}`).join(', ');
          setError(`Validation errors: ${errorMsg}`);
        } else if (data.validationErrors) {
          setError(`Validation errors: ${data.validationErrors.join(', ')}`);
        } else {
          const errorDetails = data.details ? `\n\nDetails: ${data.details}` : '';
          throw new Error((data.error || 'Failed to create template') + errorDetails);
        }
        return;
      }
      
      console.log('[TemplateSave] Template saved successfully:', data);

      router.push(`/projects/${slug}/record-types/${type}/templates`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/projects/${slug}/record-types/${type}/templates`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Templates
          </Link>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              New Display Template
            </h1>

            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${slug}/record-types/${type}/templates`}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Template Meta */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Layout, Detailed View"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Set as default template for {recordType?.name}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Template Editor */}
        <TemplateEditor
          fields={fields}
          enabledDataTypes={getEnabledDataTypes(recordType?.enabled_data_types)}
          initialTemplate={template}
          onChange={setTemplate}
        />

        {/* Live Preview */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
            <button
              onClick={fetchPreviewRecord}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Refresh Preview
            </button>
          </div>
          
          <TemplatePreview
            template={template}
            recordData={previewRecord}
            fields={fields}
            loading={loadingPreview}
          />
        </div>
      </div>
    </div>
  );
}
