'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DynamicForm } from '@/components/dynamic-form';
import { FieldDefinition, FieldGroup, RecordQuote, RecordSource } from '@/types/platform';

interface RecordData {
  id: number;
  data: Record<string, unknown>;
  status: string;
  record_type_slug: string;
  record_type_name: string;
  record_type_id: number;
  workflow_config?: Record<string, unknown>;
  verified_fields: Record<string, { verified: boolean; by: number; at: string }>;
  submitted_by_name?: string;
  is_guest_submission: boolean;
  guest_name?: string;
  guest_email?: string;
  created_at: string;
  updated_at: string;
}

export default function ProposeEditPage({ 
  params 
}: { 
  params: Promise<{ slug: string; recordId: string }> 
}) {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [recordId, setRecordId] = useState<string>('');
  const [record, setRecord] = useState<RecordData | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [groups, setGroups] = useState<FieldGroup[]>([]);
  const [quotes, setQuotes] = useState<RecordQuote[]>([]);
  const [sources, setSources] = useState<RecordSource[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposalNotes, setProposalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRecord = useCallback(async () => {
    if (!projectSlug || !recordId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectSlug}/records/${recordId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Record not found');
        }
        throw new Error('Failed to fetch record');
      }
      
      const data = await response.json();
      
      // Only allow proposing edits for verified records
      if (data.record.status !== 'verified') {
        throw new Error('Can only propose edits for verified records');
      }
      
      setRecord(data.record);
      setFields(data.fields || []);
      setGroups(data.groups || []);
      setQuotes(data.quotes || []);
      setSources(data.sources || []);
      setUserRole(data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [projectSlug, recordId]);

  useEffect(() => {
    params.then(p => {
      setProjectSlug(p.slug);
      setRecordId(p.recordId);
    });
  }, [params]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/proposed-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: record!.id,
          proposed_data: formData,
          notes: proposalNotes,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit proposed edit');
      }
      
      // Redirect back to record detail
      router.push(`/projects/${projectSlug}/records/${recordId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit proposed edit');
      setSaving(false);
    }
  };

  if (!projectSlug || !recordId) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return <div className="p-8 text-center">Loading record...</div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <Link href={`/projects/${projectSlug}/records/${recordId}`} className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Record
        </Link>
      </div>
    );
  }

  if (!record) {
    return <div className="p-8">Record not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/projects/${projectSlug}/records/${recordId}`} className="text-blue-600 hover:underline text-sm">
          ← Back to Record
        </Link>
        
        <div className="mt-4">
          <h1 className="text-2xl font-bold">Propose Edit</h1>
          <p className="text-gray-600 mt-2">
            Propose changes to this verified record. Your changes will be reviewed and validated before being applied.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-1">📝 How Proposed Edits Work</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Make your proposed changes using the form below</li>
          <li>Add quotes and sources to support your edits</li>
          <li>Explain your changes in the notes section</li>
          <li>Your proposal will go through review and validation</li>
          <li>If approved, the changes will be applied to the published record</li>
        </ul>
      </div>

      {/* Proposal Notes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium mb-2">Proposal Notes *</h3>
        <p className="text-sm text-gray-600 mb-3">
          Explain what you're changing and why
        </p>
        <textarea
          value={proposalNotes}
          onChange={(e) => setProposalNotes(e.target.value)}
          placeholder="e.g., Updating victim age based on new source from family..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          required
        />
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Proposed Changes</h3>
        <DynamicForm
          fields={fields}
          groups={groups}
          initialData={record.data}
          mode="review"
          projectSlug={projectSlug}
          recordTypeSlug={record.record_type_slug}
          recordId={record.id}
          quotes={quotes}
          verifiedFields={record.verified_fields}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/projects/${projectSlug}/records/${recordId}`)}
        />
      </div>

      {/* Submit Button */}
      <div className="mt-6 flex justify-end gap-3">
        <Link
          href={`/projects/${projectSlug}/records/${recordId}`}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          onClick={() => {
            if (!proposalNotes.trim()) {
              alert('Please add notes explaining your proposed changes');
              return;
            }
            const form = document.querySelector('form');
            if (form) {
              form.requestSubmit();
            }
          }}
          disabled={saving || !proposalNotes.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Submitting Proposal...' : 'Submit Proposed Edit'}
        </button>
      </div>

      {/* Notes */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <strong>Note:</strong> This form uses the same interface as the review form. Make your changes, add supporting quotes and sources, and submit. The original record will remain published while your proposal is under review.
      </div>
    </div>
  );
}
