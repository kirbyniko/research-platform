'use client';

import { useState } from 'react';
import { InfographicConfig, InfographicComponentType, DotGridConfig, CounterConfig } from '@/types/platform';

// Simple chevron icons
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

interface ConfigEditorProps {
  componentType: InfographicComponentType;
  config: InfographicConfig;
  fields: Array<{ slug: string; name: string; type: string }>;
  onChange: (config: InfographicConfig) => void;
  disabled: boolean;
}

export function ConfigEditor({ componentType, config, fields, onChange, disabled }: ConfigEditorProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic', 'appearance']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const updateConfig = (key: string, value: unknown) => {
    onChange({ ...config, [key]: value } as InfographicConfig);
  };

  const updateNestedConfig = (parent: string, key: string, value: unknown) => {
    const parentObj = (config as any)[parent] || {};
    onChange({ 
      ...config, 
      [parent]: { ...parentObj, [key]: value } 
    } as InfographicConfig);
  };

  const renderSection = (id: string, title: string, content: React.ReactNode) => {
    const isExpanded = expandedSections.includes(id);
    
    return (
      <div key={id} className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
          disabled={disabled}
        >
          <span className="font-medium text-gray-700">{title}</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 space-y-4">
            {content}
          </div>
        )}
      </div>
    );
  };

  const renderInput = (
    label: string, 
    key: string, 
    type: 'text' | 'number' | 'color' | 'select' | 'checkbox',
    options?: { value: string; label: string }[]
  ) => {
    const value = (config as any)[key];
    
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {type === 'text' && (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateConfig(key, e.target.value)}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
          />
        )}
        {type === 'number' && (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => updateConfig(key, parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
          />
        )}
        {type === 'color' && (
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => updateConfig(key, e.target.value)}
              disabled={disabled}
              className="w-10 h-10 border border-gray-300 rounded cursor-pointer disabled:opacity-50"
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => updateConfig(key, e.target.value)}
              disabled={disabled}
              placeholder="#000000"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono disabled:bg-gray-100"
            />
          </div>
        )}
        {type === 'select' && options && (
          <select
            value={value || ''}
            onChange={(e) => updateConfig(key, e.target.value)}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
          >
            <option value="">-- Select --</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {type === 'checkbox' && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateConfig(key, e.target.checked)}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600 disabled:opacity-50"
            />
            <span className="text-sm text-gray-600">Enabled</span>
          </label>
        )}
      </div>
    );
  };

  // Field options for groupBy/colorBy
  const fieldOptions = fields.map(f => ({ value: f.slug, label: f.name }));

  // Component-specific config sections
  const renderDotGridConfig = () => {
    const c = config as DotGridConfig;
    return (
      <>
        {renderSection('basic', 'Basic Settings', (
          <>
            {renderInput('Title', 'title', 'text')}
            {renderInput('Subtitle', 'subtitle', 'text')}
          </>
        ))}
        
        {renderSection('appearance', 'Dot Appearance', (
          <>
            {renderInput('Dot Size (px)', 'dotSize', 'number')}
            {renderInput('Dot Spacing (px)', 'dotSpacing', 'number')}
            {renderInput('Dot Color', 'dotColor', 'color')}
            {renderInput('Dot Shape', 'dotShape', 'select', [
              { value: 'circle', label: 'Circle' },
              { value: 'square', label: 'Square' }
            ])}
          </>
        ))}
        
        {renderSection('data', 'Data Options', (
          <>
            {renderInput('Group By Field', 'groupBy', 'select', fieldOptions)}
            {renderInput('Color By Field', 'colorBy', 'select', fieldOptions)}
            {renderInput('Show Count', 'showCount', 'checkbox')}
            {renderInput('Show Legend', 'showLegend', 'checkbox')}
            {c.showLegend && renderInput('Legend Position', 'legendPosition', 'select', [
              { value: 'top', label: 'Top' },
              { value: 'bottom', label: 'Bottom' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' }
            ])}
          </>
        ))}
        
        {renderSection('animation', 'Animation', (
          <>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Enable Animation</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.animation?.enabled ?? true}
                  onChange={(e) => updateNestedConfig('animation', 'enabled', e.target.checked)}
                  disabled={disabled}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-600">Animate on scroll</span>
              </label>
            </div>
            {c.animation?.enabled && (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Duration (ms)</label>
                  <input
                    type="number"
                    value={c.animation?.duration ?? 1500}
                    onChange={(e) => updateNestedConfig('animation', 'duration', parseInt(e.target.value))}
                    disabled={disabled}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Stagger Delay (ms)</label>
                  <input
                    type="number"
                    value={c.animation?.staggerDelay ?? 10}
                    onChange={(e) => updateNestedConfig('animation', 'staggerDelay', parseInt(e.target.value))}
                    disabled={disabled}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
          </>
        ))}
      </>
    );
  };

  const renderCounterConfig = () => {
    const c = config as CounterConfig;
    return (
      <>
        {renderSection('basic', 'Basic Settings', (
          <>
            {renderInput('Title', 'title', 'text')}
            {renderInput('Subtitle', 'subtitle', 'text')}
            {renderInput('Prefix', 'prefix', 'text')}
            {renderInput('Suffix', 'suffix', 'text')}
          </>
        ))}
        
        {renderSection('appearance', 'Appearance', (
          <>
            {renderInput('Font Size (px)', 'fontSize', 'number')}
            {renderInput('Font Weight', 'fontWeight', 'select', [
              { value: 'normal', label: 'Normal' },
              { value: 'medium', label: 'Medium' },
              { value: 'semibold', label: 'Semi Bold' },
              { value: 'bold', label: 'Bold' },
              { value: 'extrabold', label: 'Extra Bold' }
            ])}
            {renderInput('Color', 'color', 'color')}
          </>
        ))}
        
        {renderSection('comparison', 'Comparison', (
          <>
            {renderInput('Show Comparison', 'showComparison', 'checkbox')}
            {c.showComparison && (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Comparison Value</label>
                  <input
                    type="number"
                    value={c.comparisonValue ?? ''}
                    onChange={(e) => updateConfig('comparisonValue', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g., previous year's count"
                  />
                </div>
                {renderInput('Comparison Label', 'comparisonLabel', 'text')}
              </>
            )}
          </>
        ))}
        
        {renderSection('animation', 'Animation', (
          <>
            {renderInput('Animate on Scroll', 'animateOnScroll', 'checkbox')}
            {c.animateOnScroll && (
              <>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Start Value</label>
                  <input
                    type="number"
                    value={c.startValue ?? 0}
                    onChange={(e) => updateConfig('startValue', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Duration (ms)</label>
                  <input
                    type="number"
                    value={c.duration ?? 2000}
                    onChange={(e) => updateConfig('duration', parseInt(e.target.value) || 2000)}
                    disabled={disabled}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
          </>
        ))}
      </>
    );
  };

  const renderDefaultConfig = () => (
    <>
      {renderSection('basic', 'Basic Settings', (
        <>
          {renderInput('Title', 'title', 'text')}
          {renderInput('Subtitle', 'subtitle', 'text')}
          {renderInput('Background Color', 'backgroundColor', 'color')}
        </>
      ))}
      
      <div className="text-center py-8 text-gray-500">
        <p>Advanced configuration for <strong>{componentType}</strong> coming soon.</p>
        <p className="text-sm mt-2">You can still edit the JSON directly in the future.</p>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
      
      {componentType === 'dot-grid' && renderDotGridConfig()}
      {componentType === 'counter' && renderCounterConfig()}
      {!['dot-grid', 'counter'].includes(componentType) && renderDefaultConfig()}
    </div>
  );
}
