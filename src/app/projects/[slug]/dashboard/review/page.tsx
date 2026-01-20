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
  created_at: string;
  submitted_by_name?: string;
  guest_name?: string;
  guest_email?: string;
}

export default function DashboardReview({ params }: { params: Promise<{ slug: string }> }) {
  const [projectSlug, setProjectSlug] = useState('');
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setProjectSlug(p.slug);
      fetch(`/api/projects/${p.slug}/records?status=pending_review`)
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
          <h1 className="text-2xl font-bold mt-2">Review Queue</h1>
          <p className="text-gray-600">Guest submissions pending review</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {records.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <p className="text-gray-500">No submissions pending review</p>
          </div>
        ) : (
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Record Type</th>
                  <th className="text-left p-3">Submitted By</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{record.record_type_name}</td>
                    <td className="p-3">
                      {record.guest_name || record.submitted_by_name || 'Anonymous'}
                      {record.guest_email && (
                        <span className="text-gray-500 text-xs ml-2">({record.guest_email})</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/projects/${projectSlug}/records/${record.id}/review`}
                        className="text-blue-600 hover:underline"
                      >
                        Review →
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
