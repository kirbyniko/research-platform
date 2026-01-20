'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Record {
  id: number;
  record_type_id: number;
  record_type_name: string;
  record_type_slug: string;
  data: any;
  status: string;
  reviewed_at: string;
  reviewed_by_name?: string;
}

export default function DashboardValidation({ params }: { params: Promise<{ slug: string }> }) {
  const [projectSlug, setProjectSlug] = useState('');
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setProjectSlug(p.slug);
      fetch(`/api/projects/${p.slug}/records?status=pending_validation`)
        .then(r => r.json())
        .then(data => {
          setRecords(data.records || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/projects/${projectSlug}`} className="text-sm text-gray-600 hover:text-black">
            ← Back to Project
          </Link>
          <h1 className="text-2xl font-bold mt-2">Validation Queue</h1>
          <p className="text-gray-600">Reviewed records pending final validation</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {records.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <p className="text-gray-500">No records pending validation</p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Record Type</th>
                  <th className="text-left p-3">Reviewed By</th>
                  <th className="text-left p-3">Reviewed Date</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{record.record_type_name}</td>
                    <td className="p-3">{record.reviewed_by_name || 'Unknown'}</td>
                    <td className="p-3 text-gray-500">
                      {record.reviewed_at ? new Date(record.reviewed_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/projects/${projectSlug}/records/${record.id}/validate`}
                        className="text-blue-600 hover:underline"
                      >
                        Validate →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
