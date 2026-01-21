'use client';

import React, { useState, useRef } from 'react';

interface FileUploadProps {
  projectSlug: string;
  recordId?: number;
  fieldSlug?: string;
  onUploadComplete?: (file: UploadedFile) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  maxFileSize?: number;  // bytes
  acceptedTypes?: string;  // e.g., "image/*,video/*,.pdf"
  className?: string;
}

export interface UploadedFile {
  id: number;
  filename: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  cdn_url?: string;
  storage_key: string;
  status: string;
}

interface StorageInfo {
  subscription: {
    plan: {
      name: string;
      slug: string;
      storage_limit_bytes: number;
      max_file_size_bytes: number;
      features: Record<string, any>;
    };
    status: string;
  };
  usage: {
    bytes_used: number;
    file_count: number;
    bytes_limit: number;
    percentage_used: number;
    uploads_enabled: boolean;
  };
  canUpload: boolean;
  maxFileSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * FileUpload component for uploading files to projects
 * Checks storage quota and permissions before upload
 */
export function FileUpload({
  projectSlug,
  recordId,
  fieldSlug,
  onUploadComplete,
  onError,
  disabled = false,
  maxFileSize,
  acceptedTypes = '*/*',
  className = ''
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch storage info when component mounts or before upload
  const fetchStorageInfo = async () => {
    try {
      const res = await fetch(`/api/projects/${projectSlug}/storage`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch storage info');
      }
      const data = await res.json();
      setStorageInfo(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch storage info';
      setError(msg);
      onError?.(msg);
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    
    // Fetch fresh storage info
    const info = await fetchStorageInfo();
    if (!info) return;

    // Check if uploads are enabled
    if (!info.usage.uploads_enabled) {
      const msg = 'Uploads are not enabled. Upgrade your storage plan to enable uploads.';
      setError(msg);
      onError?.(msg);
      return;
    }

    // Check permission
    if (!info.canUpload) {
      const msg = 'You do not have permission to upload files to this project.';
      setError(msg);
      onError?.(msg);
      return;
    }

    // Check file size
    const effectiveMaxSize = maxFileSize || info.maxFileSize;
    if (file.size > effectiveMaxSize) {
      const msg = `File too large. Maximum size is ${formatBytes(effectiveMaxSize)}.`;
      setError(msg);
      onError?.(msg);
      return;
    }

    // Check remaining quota
    const remaining = info.usage.bytes_limit - info.usage.bytes_used;
    if (file.size > remaining) {
      const msg = `Not enough storage space. You have ${formatBytes(remaining)} remaining.`;
      setError(msg);
      onError?.(msg);
      return;
    }

    // Start upload
    setUploading(true);
    setProgress(10);

    try {
      // Request upload URL
      const uploadRes = await fetch(`/api/projects/${projectSlug}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          recordId,
          fieldSlug
        })
      });

      setProgress(30);

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || 'Failed to initiate upload');
      }

      const uploadData = await uploadRes.json();
      
      if (uploadData.uploadUrl) {
        // Direct upload to R2 (when configured)
        setProgress(50);
        const r2Res = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });

        if (!r2Res.ok) {
          throw new Error('Failed to upload file to storage');
        }

        setProgress(80);

        // Confirm upload
        const confirmRes = await fetch(`/api/projects/${projectSlug}/files/${uploadData.file.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' })
        });

        if (!confirmRes.ok) {
          throw new Error('Failed to confirm upload');
        }

        const finalData = await confirmRes.json();
        setProgress(100);
        onUploadComplete?.(finalData.file);
      } else {
        // R2 not configured - file record created but no actual upload
        setProgress(100);
        setError('Storage not fully configured. File record created but upload pending.');
        onUploadComplete?.(uploadData.file);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`file-upload ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />
      
      <button
        type="button"
        onClick={triggerFileSelect}
        disabled={disabled || uploading}
        className={`
          px-4 py-2 border-2 border-dashed rounded-lg text-sm
          transition-colors duration-200
          ${uploading 
            ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-wait'
            : disabled
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }
        `}
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Uploading... {progress}%
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload File
          </span>
        )}
      </button>

      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

/**
 * StorageUsageBar - Visual indicator of storage usage
 */
export function StorageUsageBar({ 
  bytesUsed, 
  bytesLimit, 
  className = '' 
}: { 
  bytesUsed: number; 
  bytesLimit: number;
  className?: string;
}) {
  const percentage = bytesLimit > 0 ? (bytesUsed / bytesLimit) * 100 : 0;
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;
  
  return (
    <div className={className}>
      <div className="flex justify-between text-sm mb-1">
        <span>{formatBytes(bytesUsed)} used</span>
        <span>{formatBytes(bytesLimit)} total</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {percentage.toFixed(1)}% used
        {percentage >= 100 && ' - Storage full!'}
      </p>
    </div>
  );
}

/**
 * FileList - Display list of uploaded files
 */
export function FileList({
  files,
  onDelete,
  showDelete = true
}: {
  files: UploadedFile[];
  onDelete?: (fileId: number) => void;
  showDelete?: boolean;
}) {
  if (files.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">No files uploaded yet.</p>
    );
  }

  return (
    <div className="divide-y">
      {files.map(file => (
        <div key={file.id} className="py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* File type icon */}
            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500">
              {file.mime_type.startsWith('image/') ? '🖼️' :
               file.mime_type.startsWith('video/') ? '🎬' :
               file.mime_type.includes('pdf') ? '📄' : '📁'}
            </div>
            <div>
              <p className="text-sm font-medium truncate max-w-xs">{file.original_filename}</p>
              <p className="text-xs text-gray-500">{formatBytes(file.size_bytes)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {file.cdn_url && (
              <a 
                href={file.cdn_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                View
              </a>
            )}
            {showDelete && onDelete && (
              <button
                onClick={() => onDelete(file.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
