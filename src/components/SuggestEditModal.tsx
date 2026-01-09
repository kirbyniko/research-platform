'use client';

import { useState } from 'react';

interface SuggestEditModalProps {
  incidentId: number;
  fieldName: string;
  fieldLabel: string;
  currentValue: string | null;
  onClose: () => void;
  onSubmitted: () => void;
  fieldType?: 'text' | 'textarea' | 'date' | 'select';
  options?: { value: string; label: string }[];
}

export function SuggestEditModal({
  incidentId,
  fieldName,
  fieldLabel,
  currentValue,
  onClose,
  onSubmitted,
  fieldType = 'text',
  options
}: SuggestEditModalProps) {
  const [suggestedValue, setSuggestedValue] = useState(currentValue || '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (suggestedValue === currentValue) {
      setError('Suggested value must be different from current value');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/incidents/${incidentId}/suggest-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName,
          suggestedValue,
          reason
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit suggestion');
      }

      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Suggest Edit</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field
              </label>
              <p className="text-gray-900 font-medium">{fieldLabel}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Value
              </label>
              <div className="bg-gray-50 p-3 rounded border text-sm">
                {currentValue || <span className="text-gray-400 italic">Not set</span>}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suggested Value <span className="text-red-500">*</span>
              </label>
              {fieldType === 'textarea' ? (
                <textarea
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  required
                  rows={4}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              ) : fieldType === 'date' ? (
                <input
                  type="date"
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              ) : fieldType === 'select' && options ? (
                <select
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select...</option>
                  {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Change
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this change should be made (e.g., cite a source)..."
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Providing a reason with source links helps analysts approve your suggestion faster.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
              <strong>Note:</strong> Your suggestion will be reviewed by two analysts before being applied.
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || suggestedValue === currentValue}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Suggestion'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
