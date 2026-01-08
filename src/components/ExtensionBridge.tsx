'use client';

import { useState, useEffect } from 'react';
import { isExtensionInstalled, loadDocumentIntoExtension } from '@/lib/extensionBridge';

interface ExtensionBridgeProps {
  documentData: {
    name?: string;
    dateOfDeath?: string;
    age?: number | string;
    country?: string;
    facility?: string;
    location?: string;
    causeOfDeath?: string;
    summary?: string;
    incidentType?: string;
    quotes?: Array<{
      text: string;
      category?: string;
      status?: string;
    }>;
    sourceUrl?: string;
    sourceTitle?: string;
    sourceType?: string;
    date?: string;
    author?: string;
    title?: string;
    url?: string;
  };
}

export function ExtensionBridge({ documentData }: ExtensionBridgeProps) {
  const [extensionAvailable, setExtensionAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    isExtensionInstalled().then(setExtensionAvailable);
  }, []);

  const handleSendToExtension = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await loadDocumentIntoExtension(documentData);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Document loaded into extension! Open the sidepanel to view.'
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to load document'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!extensionAvailable) {
    return (
      <div className="border border-gray-300 rounded-lg p-3 bg-gray-100 mb-3">
        <div className="text-xs text-gray-600">
          {extensionAvailable === null ? (
            '🔍 Checking for extension...'
          ) : (
            '💡 Install the Chrome Extension to send data directly to the extension panel'
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Chrome Extension</h3>
          <p className="text-xs text-gray-600 mt-1">
            Load this document into the extension for further analysis
          </p>
        </div>
        <button
          onClick={handleSendToExtension}
          disabled={loading}
          className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : '📤 Send to Extension'}
        </button>
      </div>
      
      {message && (
        <div
          className={`mt-3 p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
