'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface Tag {
  id: number;
  name: string;
  slug: string;
  category?: string;
  color?: string;
}

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * TagSelector component - Dropdown + Chips UI for selecting tags
 * Matches the style from the extension's sidepanel
 */
export function TagSelector({
  availableTags,
  selectedTags,
  onChange,
  disabled = false,
  placeholder = 'Select tags to add...',
  className = ''
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group tags by category
  const groupedTags = availableTags.reduce((acc, tag) => {
    const category = tag.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  // Filter tags based on search and exclude already selected
  const selectedIds = new Set(selectedTags.map(t => t.id));
  const filteredGroups = Object.entries(groupedTags)
    .map(([category, tags]) => ({
      category,
      tags: tags.filter(t => 
        !selectedIds.has(t.id) &&
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(g => g.tags.length > 0);

  const addTag = (tag: Tag) => {
    onChange([...selectedTags, tag]);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const removeTag = (tagId: number) => {
    onChange(selectedTags.filter(t => t.id !== tagId));
  };

  const getTagColor = (tag: Tag) => {
    return tag.color || '#6b7280';
  };

  return (
    <div className={`tag-selector ${className}`} ref={dropdownRef}>
      {/* Selected tags as chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: getTagColor(tag) }}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
                  aria-label={`Remove ${tag.name}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      {!disabled && (
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Dropdown */}
          {isOpen && filteredGroups.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
              {filteredGroups.map(({ category, tags }) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                    {category}
                  </div>
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getTagColor(tag) }}
                      />
                      {tag.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {isOpen && filteredGroups.length === 0 && searchTerm && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-sm text-gray-500">
              No tags found matching "{searchTerm}"
            </div>
          )}

          {isOpen && filteredGroups.length === 0 && !searchTerm && availableTags.length === selectedTags.length && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-sm text-gray-500">
              All tags have been selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tag display component for read-only contexts
 */
export function TagDisplay({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return <span className="text-gray-400 text-sm">No tags</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: tag.color || '#6b7280' }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
