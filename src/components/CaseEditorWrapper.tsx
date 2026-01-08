'use client';

import { useState } from 'react';
import { Case } from '@/types/case';
import CaseEditor from '@/components/CaseEditor';

interface CaseEditorWrapperProps {
  caseData: Case;
}

export default function CaseEditorWrapper({ caseData }: CaseEditorWrapperProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsEditing(true)}
        className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700"
      >
        Edit Case Data
      </button>
      
      {isEditing && (
        <CaseEditor
          caseData={caseData}
          onSave={(data) => {
            // In a static site, we can't save directly
            // The editor will let users download the JSON
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </>
  );
}
