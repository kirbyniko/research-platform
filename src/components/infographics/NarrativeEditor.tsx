'use client';

import { useState } from 'react';
import { NarrativeBlock } from '@/types/platform';

// Simple icon components
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

interface NarrativeEditorProps {
  narrative: NarrativeBlock[];
  onChange: (narrative: NarrativeBlock[]) => void;
  disabled: boolean;
}

export function NarrativeEditor({ narrative, onChange, disabled }: NarrativeEditorProps) {
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>(
    narrative.map(n => n.id)
  );

  const toggleBlock = (id: string) => {
    setExpandedBlocks(prev =>
      prev.includes(id)
        ? prev.filter(b => b !== id)
        : [...prev, id]
    );
  };

  const addBlock = () => {
    const newId = `block-${Date.now()}`;
    const newBlock: NarrativeBlock = {
      id: newId,
      text: '',
      position: 'bottom',
      trigger: 'immediate'
    };
    onChange([...narrative, newBlock]);
    setExpandedBlocks(prev => [...prev, newId]);
  };

  const updateBlock = (id: string, updates: Partial<NarrativeBlock>) => {
    onChange(
      narrative.map(block =>
        block.id === id ? { ...block, ...updates } : block
      )
    );
  };

  const removeBlock = (id: string) => {
    if (!confirm('Remove this narrative block?')) return;
    onChange(narrative.filter(block => block.id !== id));
    setExpandedBlocks(prev => prev.filter(b => b !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= narrative.length) return;
    
    const newNarrative = [...narrative];
    [newNarrative[index], newNarrative[newIndex]] = [newNarrative[newIndex], newNarrative[index]];
    onChange(newNarrative);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Narrative Content</h2>
        {!disabled && (
          <button
            onClick={addBlock}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
          >
            <PlusIcon className="w-4 h-4" />
            Add Block
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Add narrative text blocks to tell a story alongside your visualization. 
        Position them around the chart and optionally trigger them on scroll.
      </p>

      {narrative.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500 mb-4">No narrative blocks yet</p>
          {!disabled && (
            <button
              onClick={addBlock}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Add Your First Block
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {narrative.map((block, index) => {
            const isExpanded = expandedBlocks.includes(block.id);
            
            return (
              <div
                key={block.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <button
                    onClick={() => toggleBlock(block.id)}
                    className="flex items-center gap-2 text-left flex-1"
                  >
                    <span className="font-medium text-gray-700">
                      Block {index + 1}
                    </span>
                    <span className="text-sm text-gray-400 truncate max-w-xs">
                      {block.text.slice(0, 40) || '(empty)'}
                      {block.text.length > 40 ? '...' : ''}
                    </span>
                  </button>
                  
                  {!disabled && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveBlock(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveBlock(index, 'down')}
                        disabled={index === narrative.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeBlock(block.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Text */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text
                      </label>
                      <textarea
                        value={block.text}
                        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                        disabled={disabled}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                        placeholder="Enter your narrative text here..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Position */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Position
                        </label>
                        <select
                          value={block.position || 'bottom'}
                          onChange={(e) => updateBlock(block.id, { 
                            position: e.target.value as NarrativeBlock['position'] 
                          })}
                          disabled={disabled}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                        >
                          <option value="top">Top (above visualization)</option>
                          <option value="bottom">Bottom (below visualization)</option>
                          <option value="left">Left side</option>
                          <option value="right">Right side</option>
                          <option value="overlay">Overlay (on visualization)</option>
                        </select>
                      </div>

                      {/* Trigger */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Trigger
                        </label>
                        <select
                          value={block.trigger || 'immediate'}
                          onChange={(e) => updateBlock(block.id, { 
                            trigger: e.target.value as NarrativeBlock['trigger'] 
                          })}
                          disabled={disabled}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                        >
                          <option value="immediate">Immediate (always visible)</option>
                          <option value="scroll">Scroll (appear on scroll)</option>
                          <option value="click">Click (appear on interaction)</option>
                        </select>
                      </div>
                    </div>

                    {/* Scroll percent */}
                    {block.trigger === 'scroll' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scroll Trigger Point (%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={block.scrollPercent || 50}
                          onChange={(e) => updateBlock(block.id, { 
                            scrollPercent: parseInt(e.target.value) 
                          })}
                          disabled={disabled}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500 text-center">
                          {block.scrollPercent || 50}% scrolled
                        </div>
                      </div>
                    )}

                    {/* Style overrides */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Style (optional)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                          <input
                            type="text"
                            value={block.style?.fontSize || ''}
                            onChange={(e) => updateBlock(block.id, { 
                              style: { ...block.style, fontSize: e.target.value } 
                            })}
                            disabled={disabled}
                            placeholder="e.g., 18px"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Text Color</label>
                          <input
                            type="text"
                            value={block.style?.color || ''}
                            onChange={(e) => updateBlock(block.id, { 
                              style: { ...block.style, color: e.target.value } 
                            })}
                            disabled={disabled}
                            placeholder="e.g., #333"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Background</label>
                          <input
                            type="text"
                            value={block.style?.background || ''}
                            onChange={(e) => updateBlock(block.id, { 
                              style: { ...block.style, background: e.target.value } 
                            })}
                            disabled={disabled}
                            placeholder="e.g., #f9fafb"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Padding</label>
                          <input
                            type="text"
                            value={block.style?.padding || ''}
                            onChange={(e) => updateBlock(block.id, { 
                              style: { ...block.style, padding: e.target.value } 
                            })}
                            disabled={disabled}
                            placeholder="e.g., 16px"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
