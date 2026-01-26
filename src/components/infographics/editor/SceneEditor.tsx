'use client';

import React, { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Scene {
  id: string;
  narrativeText: string;
  narrativeSubtext?: string;
  visualizationType: 'dotGrid' | 'humanGrid' | 'counter' | 'comparison' | 'timeline' | 'barChart';
  visualizationConfig: Record<string, unknown>;
  filterRecords?: Record<string, unknown>;
  highlightRecordIds?: number[];
  backgroundColor?: string;
  textColor?: string;
  annotation?: {
    text: string;
    position?: string;
  };
}

interface SceneEditorProps {
  scenes: Scene[];
  onChange: (scenes: Scene[]) => void;
  availableFields?: Array<{ slug: string; name: string; type: string }>;
  dataPreview?: Record<string, unknown>[];
  theme?: 'light' | 'dark';
}

interface SceneCardProps {
  scene: Scene;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (scene: Scene) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  availableFields?: Array<{ slug: string; name: string; type: string }>;
}

// ============================================================================
// Visualization Type Options
// ============================================================================

const VISUALIZATION_TYPES = [
  { value: 'counter', label: 'Counter', description: 'Animated number reveal', icon: '🔢' },
  { value: 'dotGrid', label: 'Dot Grid', description: 'Each dot represents a data point', icon: '⚫' },
  { value: 'humanGrid', label: 'Human Grid', description: 'Person icons for emotional impact', icon: '👤' },
  { value: 'barChart', label: 'Bar Chart', description: 'Compare categories', icon: '📊' },
  { value: 'comparison', label: 'Comparison', description: 'Horizontal bar comparison', icon: '📈' },
  { value: 'timeline', label: 'Timeline', description: 'Show change over time', icon: '📅' },
];

const COLOR_PRESETS = [
  { name: 'Red (Deaths/Negative)', value: '#EF4444' },
  { name: 'Gray (Neutral)', value: '#6B7280' },
  { name: 'Green (Positive)', value: '#10B981' },
  { name: 'Amber (Warning)', value: '#F59E0B' },
  { name: 'Blue (Highlight)', value: '#3B82F6' },
  { name: 'Purple (Accent)', value: '#8B5CF6' },
];

// ============================================================================
// Scene Card Component
// ============================================================================

function SceneCard({
  scene,
  index,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  canMoveUp,
  canMoveDown,
  availableFields = []
}: SceneCardProps) {
  const vizType = VISUALIZATION_TYPES.find(v => v.value === scene.visualizationType);
  
  const updateField = useCallback((field: string, value: unknown) => {
    onChange({ ...scene, [field]: value });
  }, [scene, onChange]);
  
  const updateConfig = useCallback((field: string, value: unknown) => {
    onChange({
      ...scene,
      visualizationConfig: {
        ...scene.visualizationConfig,
        [field]: value
      }
    });
  }, [scene, onChange]);
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header - Always visible */}
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        {/* Scene number */}
        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
          {index + 1}
        </span>
        
        {/* Type icon */}
        <span className="text-2xl">{vizType?.icon || '📊'}</span>
        
        {/* Narrative preview */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{scene.narrativeText || 'Untitled scene'}</p>
          <p className="text-sm text-gray-500 truncate">
            {vizType?.label || scene.visualizationType}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 text-gray-400 hover:text-blue-600"
            title="Duplicate"
          >
            📋
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600"
            title="Delete"
          >
            🗑️
          </button>
        </div>
        
        {/* Expand/collapse indicator */}
        <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </div>
      
      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6 space-y-6">
          {/* Narrative Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Narrative Text
              <span className="text-gray-400 font-normal ml-2">(Keep it short and impactful)</span>
            </label>
            <input
              type="text"
              value={scene.narrativeText}
              onChange={e => updateField('narrativeText', e.target.value)}
              placeholder="Each dot represents a life..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
          
          {/* Subtext */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Detail
              <span className="text-gray-400 font-normal ml-2">(Context and numbers)</span>
            </label>
            <textarea
              value={scene.narrativeSubtext || ''}
              onChange={e => updateField('narrativeSubtext', e.target.value)}
              placeholder="Since 2004, 239 people have died in U.S. immigration detention."
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Visualization Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visualization Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VISUALIZATION_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => updateField('visualizationType', type.value)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${scene.visualizationType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <p className="font-medium mt-1">{type.label}</p>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Type-specific config */}
          {(scene.visualizationType === 'dotGrid' || scene.visualizationType === 'humanGrid') && (
            <DotGridConfig 
              config={scene.visualizationConfig}
              onChange={updateConfig}
              availableFields={availableFields}
            />
          )}
          
          {scene.visualizationType === 'counter' && (
            <CounterConfig 
              config={scene.visualizationConfig}
              onChange={updateConfig}
            />
          )}
          
          {(scene.visualizationType === 'barChart' || scene.visualizationType === 'comparison') && (
            <ChartConfig 
              config={scene.visualizationConfig}
              onChange={updateConfig}
              availableFields={availableFields}
            />
          )}
          
          {scene.visualizationType === 'timeline' && (
            <TimelineConfig 
              config={scene.visualizationConfig}
              onChange={updateConfig}
              availableFields={availableFields}
            />
          )}
          
          {/* Annotation (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annotation Callout
              <span className="text-gray-400 font-normal ml-2">(Optional highlight text)</span>
            </label>
            <input
              type="text"
              value={scene.annotation?.text || ''}
              onChange={e => updateField('annotation', e.target.value ? { text: e.target.value } : undefined)}
              placeholder="💡 Did you know..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Config Editors for Different Visualization Types
// ============================================================================

function DotGridConfig({
  config,
  onChange,
  availableFields
}: {
  config: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  availableFields: Array<{ slug: string; name: string; type: string }>;
}) {
  const hasColorBy = typeof config.colorBy === 'string' && config.colorBy.length > 0;
  
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-700">Dot Grid Settings</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Dots Per Row</label>
          <input
            type="number"
            value={(config.dotsPerRow as number) || 20}
            onChange={e => onChange('dotsPerRow', parseInt(e.target.value) || 20)}
            min={5}
            max={50}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Dot Size (px)</label>
          <input
            type="number"
            value={(config.dotSize as number) || 12}
            onChange={e => onChange('dotSize', parseInt(e.target.value) || 12)}
            min={4}
            max={30}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Color By Field</label>
        <select
          value={(config.colorBy as string) || ''}
          onChange={e => onChange('colorBy', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">No coloring (single color)</option>
          {availableFields.map(field => (
            <option key={field.slug} value={field.slug}>{field.name}</option>
          ))}
        </select>
      </div>
      
      {hasColorBy && (
        <div>
          <label className="block text-sm text-gray-600 mb-1">Color Map (JSON)</label>
          <textarea
            value={JSON.stringify(config.colorMap || {}, null, 2)}
            onChange={e => {
              try {
                onChange('colorMap', JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, ignore
              }
            }}
            rows={4}
            placeholder='{"value1": "#EF4444", "value2": "#6B7280"}'
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {COLOR_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => {
                  // This is a simplification - in practice you'd want better UX
                  navigator.clipboard.writeText(preset.value);
                }}
                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white rounded border hover:bg-gray-50"
                title={`Copy ${preset.value}`}
              >
                <span 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: preset.value }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CounterConfig({
  config,
  onChange
}: {
  config: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-700">Counter Settings</h4>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Value</label>
          <input
            type="number"
            value={(config.value as number) || 0}
            onChange={e => onChange('value', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Prefix</label>
          <input
            type="text"
            value={(config.prefix as string) || ''}
            onChange={e => onChange('prefix', e.target.value)}
            placeholder="$"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Suffix</label>
          <input
            type="text"
            value={(config.suffix as string) || ''}
            onChange={e => onChange('suffix', e.target.value)}
            placeholder=" deaths"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Animation Duration (ms)</label>
          <input
            type="number"
            value={(config.duration as number) || 2000}
            onChange={e => onChange('duration', parseInt(e.target.value) || 2000)}
            min={500}
            max={5000}
            step={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Font Size</label>
          <select
            value={(config.fontSize as string) || '6rem'}
            onChange={e => onChange('fontSize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="4rem">Small (4rem)</option>
            <option value="6rem">Medium (6rem)</option>
            <option value="8rem">Large (8rem)</option>
            <option value="10rem">Extra Large (10rem)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ChartConfig({
  config,
  onChange,
  availableFields
}: {
  config: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  availableFields: Array<{ slug: string; name: string; type: string }>;
}) {
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-700">Chart Settings</h4>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Group By Field</label>
        <select
          value={(config.groupBy as string) || ''}
          onChange={e => onChange('groupBy', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select a field...</option>
          {availableFields.map(field => (
            <option key={field.slug} value={field.slug}>{field.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TimelineConfig({
  config,
  onChange,
  availableFields
}: {
  config: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  availableFields: Array<{ slug: string; name: string; type: string }>;
}) {
  const dateFields = availableFields.filter(f => f.type === 'date');
  
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-gray-700">Timeline Settings</h4>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Date Field</label>
        <select
          value={(config.dateField as string) || ''}
          onChange={e => onChange('dateField', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select a date field...</option>
          {dateFields.length > 0 ? (
            dateFields.map(field => (
              <option key={field.slug} value={field.slug}>{field.name}</option>
            ))
          ) : (
            availableFields.map(field => (
              <option key={field.slug} value={field.slug}>{field.name}</option>
            ))
          )}
        </select>
      </div>
      
      <div>
        <label className="block text-sm text-gray-600 mb-1">Group By</label>
        <select
          value={(config.groupBy as string) || 'month'}
          onChange={e => onChange('groupBy', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="day">Day</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// Main Scene Editor Component
// ============================================================================

export function SceneEditor({
  scenes,
  onChange,
  availableFields = [],
  dataPreview = [],
  theme = 'light'
}: SceneEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  
  const handleSceneChange = useCallback((index: number, scene: Scene) => {
    const newScenes = [...scenes];
    newScenes[index] = scene;
    onChange(newScenes);
  }, [scenes, onChange]);
  
  const handleDelete = useCallback((index: number) => {
    if (confirm('Delete this scene?')) {
      const newScenes = scenes.filter((_, i) => i !== index);
      onChange(newScenes);
      if (expandedIndex === index) {
        setExpandedIndex(null);
      }
    }
  }, [scenes, onChange, expandedIndex]);
  
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newScenes = [...scenes];
    [newScenes[index - 1], newScenes[index]] = [newScenes[index], newScenes[index - 1]];
    onChange(newScenes);
    setExpandedIndex(index - 1);
  }, [scenes, onChange]);
  
  const handleMoveDown = useCallback((index: number) => {
    if (index === scenes.length - 1) return;
    const newScenes = [...scenes];
    [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
    onChange(newScenes);
    setExpandedIndex(index + 1);
  }, [scenes, onChange]);
  
  const handleDuplicate = useCallback((index: number) => {
    const newScene = {
      ...scenes[index],
      id: `scene-${Date.now()}`
    };
    const newScenes = [...scenes];
    newScenes.splice(index + 1, 0, newScene);
    onChange(newScenes);
    setExpandedIndex(index + 1);
  }, [scenes, onChange]);
  
  const handleAddScene = useCallback(() => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      narrativeText: 'New scene',
      visualizationType: 'counter',
      visualizationConfig: {
        value: dataPreview.length,
        suffix: ' records'
      }
    };
    onChange([...scenes, newScene]);
    setExpandedIndex(scenes.length);
  }, [scenes, onChange, dataPreview.length]);
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scene Editor</h3>
          <p className="text-sm text-gray-500">
            {scenes.length} scene{scenes.length !== 1 ? 's' : ''} • Click to expand and edit
          </p>
        </div>
        <button
          onClick={handleAddScene}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <span>+</span>
          Add Scene
        </button>
      </div>
      
      {/* Scene list */}
      <div className="space-y-3">
        {scenes.map((scene, index) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={index}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            onChange={(s) => handleSceneChange(index, s)}
            onDelete={() => handleDelete(index)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            onDuplicate={() => handleDuplicate(index)}
            canMoveUp={index > 0}
            canMoveDown={index < scenes.length - 1}
            availableFields={availableFields}
          />
        ))}
      </div>
      
      {scenes.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-500">No scenes yet</p>
          <button
            onClick={handleAddScene}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add your first scene
          </button>
        </div>
      )}
    </div>
  );
}

export default SceneEditor;
