'use client';

import React, { useState, useEffect } from 'react';
import { Tag } from './tag-selector';

interface TagManagerProps {
  projectSlug: string;
  onTagsChange?: () => void;
}

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#6b7280', // gray
];

interface EditingTag {
  id?: number;
  name: string;
  category: string;
  color: string;
  description: string;
}

/**
 * TagManager - Full CRUD interface for managing project tags
 * Used in project settings
 */
export function TagManager({ projectSlug, onTagsChange }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch tags
  useEffect(() => {
    fetchTags();
  }, [projectSlug]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectSlug}/tags`);
      if (!res.ok) throw new Error('Failed to fetch tags');
      const data = await res.json();
      setTags(data.tags || []);
      
      // Extract unique categories
      const cats = new Set<string>();
      data.tags?.forEach((t: Tag) => {
        if (t.category) cats.add(t.category);
      });
      setCategories(Array.from(cats).sort());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const openNewForm = () => {
    setEditingTag({ name: '', category: '', color: '#6b7280', description: '' });
    setShowForm(true);
  };

  const openEditForm = (tag: Tag) => {
    setEditingTag({
      id: tag.id,
      name: tag.name,
      category: tag.category || '',
      color: tag.color || '#6b7280',
      description: ''
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTag(null);
  };

  const saveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editingTag.name.trim()) return;

    setSaving(true);
    try {
      const isNew = !editingTag.id;
      const url = isNew 
        ? `/api/projects/${projectSlug}/tags`
        : `/api/projects/${projectSlug}/tags/${editingTag.id}`;
      
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingTag.name.trim(),
          category: editingTag.category.trim() || null,
          color: editingTag.color,
          description: editingTag.description.trim() || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save tag');
      }

      await fetchTags();
      onTagsChange?.();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const deleteTag = async (tagId: number, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectSlug}/tags/${tagId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete tag');
      }

      await fetchTags();
      onTagsChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading tags...</div>;
  }

  // Group tags by category
  const groupedTags = tags.reduce((acc, tag) => {
    const cat = tag.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Tags</h3>
        <button
          onClick={openNewForm}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Add Tag
        </button>
      </div>

      {/* Tags List */}
      {tags.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
          <p>No tags yet. Create your first tag to start organizing records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTags).sort(([a], [b]) => a.localeCompare(b)).map(([category, catTags]) => (
            <div key={category} className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 font-medium text-sm text-gray-700">
                {category}
              </div>
              <div className="divide-y">
                {catTags.map(tag => (
                  <div key={tag.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color || '#6b7280' }}
                      />
                      <span>{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditForm(tag)}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTag(tag.id, tag.name)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && editingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <form onSubmit={saveTag}>
              <div className="px-6 py-4 border-b">
                <h4 className="text-lg font-semibold">
                  {editingTag.id ? 'Edit Tag' : 'New Tag'}
                </h4>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag Name *
                  </label>
                  <input
                    type="text"
                    value={editingTag.name}
                    onChange={e => setEditingTag({ ...editingTag, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Medical Neglect"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingTag.category}
                    onChange={e => setEditingTag({ ...editingTag, category: e.target.value })}
                    list="tag-categories"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Incident Type"
                  />
                  <datalist id="tag-categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500">
                    Group similar tags together
                  </p>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditingTag({ ...editingTag, color })}
                        className={`w-8 h-8 rounded-full border-2 ${
                          editingTag.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editingTag.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingTag.id ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
