'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  public_validated_records: boolean;
}

interface ProjectRecord {
  id: number;
  record_type_name: string;
  data: Record<string, unknown>;
  tags: string[];
  validated_at: string;
  validated_by_name?: string;
}

interface Tag {
  id: number;
  name: string;
  color?: string;
}

export default function ValidatedRecordsGallery({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<ProjectRecord[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setProjectSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (!projectSlug) return;

    const fetchData = async () => {
      try {
        // Check if public gallery is enabled
        const projectRes = await fetch(`/api/projects/${projectSlug}`);
        if (!projectRes.ok) throw new Error('Project not found');
        const projectData = await projectRes.json();
        
        if (!projectData.project?.public_validated_records) {
          setError('Public gallery is not enabled for this project.');
          setLoading(false);
          return;
        }
        
        setProject(projectData.project);

        // Fetch validated records
        const recordsRes = await fetch(`/api/projects/${projectSlug}/records?status=verified`);
        if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          setRecords(recordsData.records || []);
        }

        // Fetch available tags
        const tagsRes = await fetch(`/api/projects/${projectSlug}/tags`);
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData.tags || []);
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load gallery');
        setLoading(false);
      }
    };

    fetchData();
  }, [projectSlug]);

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const filteredRecords = selectedTags.length === 0
    ? records
    : records.filter(record =>
        selectedTags.some(tag => record.tags?.includes(tag))
      );

  if (!projectSlug) {
    return <div className="p-8">Loading...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading gallery...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-8 text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h2 className="font-medium mb-2">Gallery Not Available</h2>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {project?.name}
          </h1>
          {project?.description && (
            <p className="text-lg text-gray-600">{project.description}</p>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
              {filteredRecords.length} Validated Record{filteredRecords.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tag Filters */}
        {tags.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    selectedTags.includes(tag.name) && tag.color
                      ? { backgroundColor: tag.color }
                      : undefined
                  }
                >
                  {tag.name}
                  {selectedTags.includes(tag.name) && (
                    <span className="ml-2">×</span>
                  )}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Records Grid */}
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedTags.length > 0 ? 'No matching records' : 'No validated records yet'}
            </h3>
            <p className="text-gray-600">
              {selectedTags.length > 0
                ? 'Try adjusting your tag filters to see more results.'
                : 'Validated records will appear here once they are published.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map(record => (
              <Link
                key={record.id}
                href={`/projects/${projectSlug}/records/${record.id}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
              >
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  {record.record_type_name}
                </div>

                {record.data['title'] !== undefined && record.data['title'] !== null && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {String(record.data['title'])}
                  </h3>
                )}
                
                {record.data['summary'] !== undefined && record.data['summary'] !== null && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {String(record.data['summary'])}
                  </p>
                )}

                {record.tags && record.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {record.tags.slice(0, 3).map((tagName, idx) => {
                      const tag = tags.find(t => t.name === tagName);
                      return (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
                          style={tag?.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
                        >
                          {tagName}
                        </span>
                      );
                    })}
                    {record.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{record.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span>Validated {new Date(record.validated_at).toLocaleDateString()}</span>
                    <span className="text-blue-600 hover:text-blue-800">View →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>
            Powered by <span className="font-semibold">{project?.name}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
