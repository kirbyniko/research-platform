'use client';

import { useState, useEffect } from 'react';
import { SuggestEditModal } from './SuggestEditModal';

interface EditableFieldProps {
  incidentId: number;
  fieldName: string;
  fieldLabel: string;
  value: string | null;
  fieldType?: 'text' | 'textarea' | 'date' | 'select';
  options?: { value: string; label: string }[];
  className?: string;
}

interface User {
  id: number;
  role: string;
}

export function EditableField({
  incidentId,
  fieldName,
  fieldLabel,
  value,
  fieldType = 'text',
  options,
  className = ''
}: EditableFieldProps) {
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => data ? setUser(data.user) : null)
      .catch(() => null);
  }, []);

  function handleSubmitted() {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  // Only show edit button for logged-in users
  if (!user) {
    return <span className={className}>{value || '-'}</span>;
  }

  return (
    <>
      <span className={`group inline-flex items-center gap-1 ${className}`}>
        <span>{value || '-'}</span>
        <button
          onClick={() => setShowModal(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600"
          title="Suggest edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        {showSuccess && (
          <span className="text-green-600 text-xs ml-1">✓ Submitted</span>
        )}
      </span>

      {showModal && (
        <SuggestEditModal
          incidentId={incidentId}
          fieldName={fieldName}
          fieldLabel={fieldLabel}
          currentValue={value}
          fieldType={fieldType}
          options={options}
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}
    </>
  );
}
