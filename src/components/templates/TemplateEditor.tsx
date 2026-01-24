'use client';

import { useState, useCallback } from 'react';
import { FieldDefinition } from '@/types/platform';
import { 
  DisplayTemplate, 
  TemplateSection, 
  TemplateSectionItem,
  SectionType,
  FieldStyle,
  PRESET_SECTION_LAYOUTS,
  PRESET_FIELD_STYLES
} from '@/types/templates';
import { TemplateAIAssistant } from './TemplateAIAssistant';

interface TemplateEditorProps {
  fields: FieldDefinition[];
  enabledDataTypes: { quotes: boolean; sources: boolean; media: boolean };
  initialTemplate?: DisplayTemplate;
  onChange: (template: DisplayTemplate) => void;
  previewData?: Record<string, any>;
  projectId?: number;
}

const DEFAULT_TEMPLATE: DisplayTemplate = {
  version: 1,
  page: {
    maxWidth: '1200px',
    padding: '2rem',
    backgroundColor: '#ffffff',
  },
  sections: [],
};

const SECTION_TYPES: { value: SectionType; label: string; icon: string }[] = [
  { value: 'full-width', label: 'Full Width', icon: '▭' },
  { value: 'grid', label: 'Grid', icon: '▦' },
  { value: 'sidebar-left', label: 'Left Sidebar', icon: '◧' },
  { value: 'sidebar-right', label: 'Right Sidebar', icon: '◨' },
  { value: 'hero', label: 'Hero Banner', icon: '▬' },
];

export function TemplateEditor({
  fields,
  enabledDataTypes,
  initialTemplate,
  onChange,
  previewData,
  projectId,
}: TemplateEditorProps) {
  const [template, setTemplate] = useState<DisplayTemplate>(initialTemplate || DEFAULT_TEMPLATE);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const updateTemplate = useCallback((updates: Partial<DisplayTemplate>) => {
    const newTemplate = { ...template, ...updates };
    setTemplate(newTemplate);
    onChange(newTemplate);
  }, [template, onChange]);

  const addSection = (type: SectionType) => {
    const newSection: TemplateSection = {
      id: `section-${Date.now()}`,
      type,
      columns: type === 'grid' ? 2 : undefined,
      gap: '1rem',
      padding: '1rem',
      items: [],
      ...(PRESET_SECTION_LAYOUTS[type] || {}),
    };
    updateTemplate({ sections: [...template.sections, newSection] });
    setSelectedSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    updateTemplate({
      sections: template.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    });
  };

  const removeSection = (sectionId: string) => {
    updateTemplate({
      sections: template.sections.filter(s => s.id !== sectionId),
    });
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
      setSelectedItemId(null);
    }
  };

  const addItemToSection = (sectionId: string, fieldSlug?: string, dataType?: 'quotes' | 'sources' | 'media') => {
    const newItem: TemplateSectionItem = {
      id: `item-${Date.now()}`,
      fieldSlug,
      dataType,
      colSpan: 1,
      hideIfEmpty: true,
    };
    updateTemplate({
      sections: template.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: [...s.items, newItem] }
          : s
      ),
    });
    setSelectedItemId(newItem.id);
  };

  const updateItem = (sectionId: string, itemId: string, updates: Partial<TemplateSectionItem>) => {
    updateTemplate({
      sections: template.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
          : s
      ),
    });
  };

  const removeItem = (sectionId: string, itemId: string) => {
    updateTemplate({
      sections: template.sections.map(s => 
        s.id === sectionId 
          ? { ...s, items: s.items.filter(i => i.id !== itemId) }
          : s
      ),
    });
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    }
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const idx = template.sections.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === template.sections.length - 1) return;
    
    const newSections = [...template.sections];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
    updateTemplate({ sections: newSections });
  };

  // Find which fields are already used
  const usedFieldSlugs = new Set(
    template.sections.flatMap(s => s.items.map(i => i.fieldSlug).filter(Boolean))
  );
  const usedDataTypes = new Set(
    template.sections.flatMap(s => s.items.map(i => i.dataType).filter(Boolean))
  );

  const selectedSection = template.sections.find(s => s.id === selectedSectionId);
  const selectedItem = selectedSection?.items.find(i => i.id === selectedItemId);

  // Handle AI-generated template
  const handleAITemplate = (generatedTemplate: DisplayTemplate) => {
    console.log('[TemplateEditor] Applying AI-generated template:', generatedTemplate);
    setTemplate(generatedTemplate);
    onChange(generatedTemplate);
    setSelectedSectionId(null);
    setSelectedItemId(null);
    setShowAIAssistant(false); // Close modal after successful generation
  };

  return (
    <>
    <div className="flex h-full gap-4">
      {/* Left Panel: Field Palette */}
      <div className="w-64 flex-shrink-0 bg-gray-50 rounded-lg p-4 overflow-y-auto">
        {/* AI Assistant Button */}
        <button
          onClick={() => setShowAIAssistant(true)}
          className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <span className="text-lg">✨</span>
          <span className="font-medium">AI Assistant</span>
        </button>

        <h3 className="font-semibold text-gray-900 mb-3">Available Fields</h3>
        
        {/* Custom Fields */}
        <div className="space-y-1 mb-4">
          {fields.map(field => (
            <div
              key={field.id}
              draggable
              onDragStart={() => setDraggedField(field.slug)}
              onDragEnd={() => setDraggedField(null)}
              className={`
                p-2 rounded border cursor-move text-sm
                ${usedFieldSlugs.has(field.slug) 
                  ? 'bg-green-50 border-green-300 text-green-700' 
                  : 'bg-white border-gray-200 hover:border-blue-400'
                }
              `}
            >
              <div className="font-medium">{field.name}</div>
              <div className="text-xs text-gray-500">{field.field_type}</div>
            </div>
          ))}
        </div>
        
        {/* Data Types */}
        <h4 className="font-medium text-gray-700 mb-2 text-sm">Data Types</h4>
        <div className="space-y-1">
          {enabledDataTypes.quotes && (
            <div
              draggable
              onDragStart={() => setDraggedField('__quotes__')}
              onDragEnd={() => setDraggedField(null)}
              className={`
                p-2 rounded border cursor-move text-sm
                ${usedDataTypes.has('quotes') 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-white border-gray-200 hover:border-blue-400'
                }
              `}
            >
              Quotes
            </div>
          )}
          {enabledDataTypes.sources && (
            <div
              draggable
              onDragStart={() => setDraggedField('__sources__')}
              onDragEnd={() => setDraggedField(null)}
              className={`
                p-2 rounded border cursor-move text-sm
                ${usedDataTypes.has('sources') 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-white border-gray-200 hover:border-blue-400'
                }
              `}
            >
              Sources
            </div>
          )}
          {enabledDataTypes.media && (
            <div
              draggable
              onDragStart={() => setDraggedField('__media__')}
              onDragEnd={() => setDraggedField(null)}
              className={`
                p-2 rounded border cursor-move text-sm
                ${usedDataTypes.has('media') 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-white border-gray-200 hover:border-blue-400'
                }
              `}
            >
              Media Gallery
            </div>
          )}
        </div>
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 bg-white rounded-lg border overflow-y-auto">
        <div 
          className="min-h-full p-4"
          style={{
            maxWidth: template.page.maxWidth,
            margin: '0 auto',
            padding: template.page.padding,
            backgroundColor: template.page.backgroundColor,
          }}
        >
          {template.sections.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-500 mb-4">No sections yet. Add a section to get started.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SECTION_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => addSection(st.value)}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    {st.icon} {st.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {template.sections.map((section, sIdx) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  fields={fields}
                  isSelected={selectedSectionId === section.id}
                  selectedItemId={selectedItemId}
                  previewData={previewData}
                  onSelect={() => {
                    setSelectedSectionId(section.id);
                    setSelectedItemId(null);
                  }}
                  onSelectItem={(itemId) => {
                    setSelectedSectionId(section.id);
                    setSelectedItemId(itemId);
                  }}
                  onRemoveItem={(itemId) => removeItem(section.id, itemId)}
                  onDrop={(fieldSlug) => {
                    if (fieldSlug.startsWith('__')) {
                      const dataType = fieldSlug.replace(/__/g, '') as 'quotes' | 'sources' | 'media';
                      addItemToSection(section.id, undefined, dataType);
                    } else {
                      addItemToSection(section.id, fieldSlug);
                    }
                  }}
                  onMoveUp={() => moveSection(section.id, 'up')}
                  onMoveDown={() => moveSection(section.id, 'down')}
                  onRemove={() => removeSection(section.id)}
                  isFirst={sIdx === 0}
                  isLast={sIdx === template.sections.length - 1}
                />
              ))}
              
              {/* Add Section Button */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <div className="flex flex-wrap gap-2 justify-center">
                  {SECTION_TYPES.map(st => (
                    <button
                      key={st.value}
                      onClick={() => addSection(st.value)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm"
                    >
                      {st.icon} {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Properties */}
      <div className="w-72 flex-shrink-0 bg-gray-50 rounded-lg p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-3">Properties</h3>
        
        {selectedItem && selectedSection ? (
          <ItemProperties
            item={selectedItem}
            section={selectedSection}
            fields={fields}
            onChange={(updates) => updateItem(selectedSection.id, selectedItem.id, updates)}
          />
        ) : selectedSection ? (
          <SectionProperties
            section={selectedSection}
            onChange={(updates) => updateSection(selectedSection.id, updates)}
          />
        ) : (
          <PageProperties
            page={template.page}
            onChange={(page) => updateTemplate({ page })}
          />
        )}
      </div>
    </div>

    {/* AI Assistant Modal */}
    <TemplateAIAssistant
      fields={fields}
      enabledDataTypes={enabledDataTypes}
      onTemplateGenerated={handleAITemplate}
      isOpen={showAIAssistant}
      onClose={() => setShowAIAssistant(false)}
      projectId={projectId}
    />
    </>
  );
}

// Section Renderer Component
interface SectionRendererProps {
  section: TemplateSection;
  fields: FieldDefinition[];
  isSelected: boolean;
  selectedItemId: string | null;
  previewData?: Record<string, any>;
  onSelect: () => void;
  onSelectItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onDrop: (fieldSlug: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function SectionRenderer({
  section,
  fields,
  isSelected,
  selectedItemId,
  previewData,
  onSelect,
  onSelectItem,
  onRemoveItem,
  onDrop,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
}: SectionRendererProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const fieldSlug = e.dataTransfer.getData('text/plain') || (e.target as any).dataset?.field;
    // The parent component tracks dragged field, so we just trigger the callback
    onDrop(''); // Will use the tracked draggedField from parent
  };

  const getGridStyle = () => {
    if (section.type === 'grid') {
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(${section.columns || 2}, 1fr)`,
        gap: section.gap,
      };
    }
    if (section.type === 'sidebar-left' || section.type === 'sidebar-right') {
      const sidebarWidth = section.sidebarWidth || '300px';
      return {
        display: 'grid',
        gridTemplateColumns: section.type === 'sidebar-left' 
          ? `${sidebarWidth} 1fr` 
          : `1fr ${sidebarWidth}`,
        gap: section.gap,
      };
    }
    return {};
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-lg border-2 transition-all
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
        ${isDragOver ? 'border-blue-400 bg-blue-50' : ''}
      `}
      style={{
        padding: section.padding,
        backgroundColor: section.backgroundColor,
        margin: section.margin,
        borderRadius: section.borderRadius,
      }}
    >
      {/* Section Controls */}
      {isSelected && (
        <div className="absolute -top-3 left-2 flex gap-1 bg-white rounded shadow-sm border px-1">
          <span className="text-xs text-gray-500 px-1">{section.type}</span>
          <button onClick={onMoveUp} disabled={isFirst} className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↑</button>
          <button onClick={onMoveDown} disabled={isLast} className="px-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">↓</button>
          <button onClick={onRemove} className="px-1 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Section Content */}
      <div style={getGridStyle()}>
        {section.items.length === 0 ? (
          <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded">
            Drag fields here
          </div>
        ) : (
          section.items.map(item => {
            const field = item.fieldSlug ? fields.find(f => f.slug === item.fieldSlug) : null;
            const value = previewData?.[item.fieldSlug || ''] ?? (field ? `[${field.name}]` : `[${item.dataType}]`);
            
            return (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem(item.id);
                }}
                className={`
                  relative p-2 rounded border transition-all cursor-pointer
                  ${selectedItemId === item.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'}
                `}
                style={{
                  gridColumn: item.colSpan ? `span ${item.colSpan}` : undefined,
                  gridRow: item.rowSpan ? `span ${item.rowSpan}` : undefined,
                  ...item.style,
                }}
              >
                {/* Item label */}
                {!item.hideLabel && (
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {item.labelOverride || field?.name || item.dataType}
                  </div>
                )}
                {/* Item value preview */}
                <div className="text-sm">
                  {item.dataType ? (
                    <span className="text-gray-400 italic">[{item.dataType}]</span>
                  ) : (
                    typeof value === 'object' ? JSON.stringify(value) : String(value)
                  )}
                </div>
                {/* Remove button */}
                {selectedItemId === item.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Page Properties Panel
function PageProperties({ 
  page, 
  onChange 
}: { 
  page: DisplayTemplate['page']; 
  onChange: (page: DisplayTemplate['page']) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-700">Page Settings</h4>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Max Width</label>
        <select
          value={page.maxWidth || '1200px'}
          onChange={e => onChange({ ...page, maxWidth: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
        >
          <option value="100%">Full Width</option>
          <option value="1400px">1400px</option>
          <option value="1200px">1200px</option>
          <option value="960px">960px</option>
          <option value="800px">800px</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Padding</label>
        <select
          value={page.padding || '2rem'}
          onChange={e => onChange({ ...page, padding: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
        >
          <option value="0">None</option>
          <option value="1rem">Small (1rem)</option>
          <option value="2rem">Medium (2rem)</option>
          <option value="3rem">Large (3rem)</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Background</label>
        <input
          type="color"
          value={page.backgroundColor || '#ffffff'}
          onChange={e => onChange({ ...page, backgroundColor: e.target.value })}
          className="w-full h-8 border rounded cursor-pointer"
        />
      </div>
    </div>
  );
}

// Section Properties Panel
function SectionProperties({ 
  section, 
  onChange 
}: { 
  section: TemplateSection; 
  onChange: (updates: Partial<TemplateSection>) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-700">Section: {section.type}</h4>
      
      {section.type === 'grid' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Columns</label>
          <select
            value={section.columns || 2}
            onChange={e => onChange({ columns: parseInt(e.target.value) })}
            className="w-full px-2 py-1.5 border rounded text-sm"
          >
            {[1, 2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n} Column{n > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      )}
      
      {(section.type === 'sidebar-left' || section.type === 'sidebar-right') && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sidebar Width</label>
          <select
            value={section.sidebarWidth || '300px'}
            onChange={e => onChange({ sidebarWidth: e.target.value })}
            className="w-full px-2 py-1.5 border rounded text-sm"
          >
            <option value="200px">200px</option>
            <option value="250px">250px</option>
            <option value="300px">300px</option>
            <option value="350px">350px</option>
            <option value="25%">25%</option>
            <option value="33%">33%</option>
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Gap</label>
        <select
          value={section.gap || '1rem'}
          onChange={e => onChange({ gap: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
        >
          <option value="0.5rem">Small (0.5rem)</option>
          <option value="1rem">Medium (1rem)</option>
          <option value="1.5rem">Large (1.5rem)</option>
          <option value="2rem">Extra Large (2rem)</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Padding</label>
        <select
          value={section.padding || '1rem'}
          onChange={e => onChange({ padding: e.target.value })}
          className="w-full px-2 py-1.5 border rounded text-sm"
        >
          <option value="0">None</option>
          <option value="0.5rem">Small</option>
          <option value="1rem">Medium</option>
          <option value="1.5rem">Large</option>
          <option value="2rem">Extra Large</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Background</label>
        <input
          type="color"
          value={section.backgroundColor || '#ffffff'}
          onChange={e => onChange({ backgroundColor: e.target.value })}
          className="w-full h-8 border rounded cursor-pointer"
        />
      </div>
    </div>
  );
}

// Item Properties Panel
function ItemProperties({ 
  item, 
  section,
  fields,
  onChange 
}: { 
  item: TemplateSectionItem;
  section: TemplateSection;
  fields: FieldDefinition[];
  onChange: (updates: Partial<TemplateSectionItem>) => void;
}) {
  const field = item.fieldSlug ? fields.find(f => f.slug === item.fieldSlug) : null;
  const maxCols = section.columns || (section.type === 'grid' ? 2 : 1);

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-700">
        {field?.name || item.dataType || 'Item'}
      </h4>
      
      {section.type === 'grid' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Column Span</label>
          <select
            value={item.colSpan || 1}
            onChange={e => onChange({ colSpan: parseInt(e.target.value) })}
            className="w-full px-2 py-1.5 border rounded text-sm"
          >
            {Array.from({ length: maxCols }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.hideLabel || false}
            onChange={e => onChange({ hideLabel: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Hide Label</span>
        </label>
      </div>
      
      {!item.hideLabel && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Label Override</label>
          <input
            type="text"
            value={item.labelOverride || ''}
            onChange={e => onChange({ labelOverride: e.target.value || undefined })}
            placeholder={field?.name || item.dataType || ''}
            className="w-full px-2 py-1.5 border rounded text-sm"
          />
        </div>
      )}
      
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={item.hideIfEmpty !== false}
            onChange={e => onChange({ hideIfEmpty: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Hide if empty</span>
        </label>
      </div>
      
      {/* Style Presets */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Style Preset</label>
        <select
          value=""
          onChange={e => {
            const preset = PRESET_FIELD_STYLES[e.target.value];
            if (preset) {
              onChange({ style: { ...item.style, ...preset } });
            }
          }}
          className="w-full px-2 py-1.5 border rounded text-sm"
        >
          <option value="">Apply preset...</option>
          <option value="heading-large">Large Heading</option>
          <option value="heading-medium">Medium Heading</option>
          <option value="body-text">Body Text</option>
          <option value="caption">Caption</option>
          <option value="emphasized">Emphasized</option>
          <option value="card">Card Style</option>
        </select>
      </div>
      
      {/* Font Size */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Font Size</label>
        <select
          value={item.style?.fontSize || ''}
          onChange={e => onChange({ style: { ...item.style, fontSize: e.target.value || undefined } })}
          className="w-full px-2 py-1.5 border rounded text-sm"
        >
          <option value="">Default</option>
          <option value="0.75rem">Extra Small</option>
          <option value="0.875rem">Small</option>
          <option value="1rem">Medium</option>
          <option value="1.25rem">Large</option>
          <option value="1.5rem">Extra Large</option>
          <option value="2rem">Huge</option>
        </select>
      </div>
      
      {/* Font Weight */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Font Weight</label>
        <select
          value={item.style?.fontWeight || ''}
          onChange={e => onChange({ style: { ...item.style, fontWeight: e.target.value || undefined } })}
          className="w-full px-2 py-1.5 border rounded text-sm"
        >
          <option value="">Default</option>
          <option value="400">Normal</option>
          <option value="500">Medium</option>
          <option value="600">Semi-bold</option>
          <option value="700">Bold</option>
        </select>
      </div>
      
      {/* Text Color */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
        <input
          type="color"
          value={item.style?.color || '#000000'}
          onChange={e => onChange({ style: { ...item.style, color: e.target.value } })}
          className="w-full h-8 border rounded cursor-pointer"
        />
      </div>
    </div>
  );
}

export default TemplateEditor;
