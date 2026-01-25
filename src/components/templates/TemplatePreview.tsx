'use client';

import { DisplayTemplate } from '@/types/templates';
import { FieldDefinition } from '@/types/platform';

interface TemplatePreviewProps {
  template: DisplayTemplate;
  recordData: Record<string, any> | null;
  fields: FieldDefinition[];
  loading?: boolean;
}

export function TemplatePreview({ template, recordData, fields, loading }: TemplatePreviewProps) {
  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!recordData) {
    return (
      <div className="w-full h-96 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No records available for preview</p>
          <p className="text-sm text-gray-500 mt-1">Create a record to see the template preview</p>
        </div>
      </div>
    );
  }

  const fieldMap = new Map(fields.map(f => [f.slug, f]));

  const renderItem = (item: any) => {
    if (item.dataType) {
      // Render data type (quotes, sources, media)
      return (
        <div key={item.id} style={item.style} className="text-gray-500 italic">
          [{item.dataType}]
        </div>
      );
    }

    if (!item.fieldSlug) return null;

    const field = fieldMap.get(item.fieldSlug);
    const value = recordData[item.fieldSlug];
    
    if (!field || (item.hideIfEmpty && !value)) return null;

    return (
      <div key={item.id} style={item.style}>
        {!item.hideLabel && field && (
          <div className="text-sm font-medium text-gray-700 mb-1">
            {field.name}
          </div>
        )}
        <div className="text-gray-900">
          {renderFieldValue(field, value, item)}
        </div>
      </div>
    );
  };

  const renderFieldValue = (field: FieldDefinition, value: any, item: any) => {
    if (!value) return <span className="text-gray-400">—</span>;

    switch (field.field_type) {
      case 'media':
        if (Array.isArray(value) && value.length > 0) {
          return (
            <img
              src={value[0].url || '/placeholder.png'}
              alt={value[0].caption || field.name}
              style={{
                objectFit: item.objectFit || 'cover',
                aspectRatio: item.aspectRatio,
                maxHeight: item.style?.maxHeight || '400px',
                maxWidth: item.style?.maxWidth || '100%',
              }}
              className="rounded-lg"
            />
          );
        }
        return null;

      case 'date':
      case 'datetime':
        return new Date(value).toLocaleDateString();

      case 'select':
      case 'multi_select':
        if (Array.isArray(value)) {
          return value.map((v, i) => (
            <span key={i} className="inline-block bg-gray-100 px-2 py-1 rounded text-sm mr-1">
              {v}
            </span>
          ));
        }
        return <span className="bg-gray-100 px-2 py-1 rounded text-sm">{value}</span>;

      case 'textarea':
      case 'rich_text':
        return <div className="whitespace-pre-wrap">{value}</div>;

      case 'url':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {value}
          </a>
        );

      case 'boolean':
        return value ? '✓ Yes' : '✗ No';

      default:
        return String(value);
    }
  };

  const getSectionStyle = (section: any) => ({
    backgroundColor: section.backgroundColor,
    padding: section.padding,
    borderRadius: section.borderRadius,
    margin: section.margin,
    border: section.border,
    boxShadow: section.boxShadow,
  });

  const getSectionClass = (section: any) => {
    const classes = ['mb-4'];
    
    if (section.type === 'grid') {
      classes.push('grid');
      classes.push(`grid-cols-${section.columns || 2}`);
      classes.push(`gap-${section.gap || '4'}`);
    } else if (section.type === 'sidebar-left' || section.type === 'sidebar-right') {
      classes.push('grid grid-cols-[1fr_auto]');
      if (section.type === 'sidebar-right') classes.push('grid-flow-col-dense');
    } else if (section.type === 'hero') {
      classes.push('grid');
      classes.push(`grid-cols-${section.columns || 1}`);
    } else {
      classes.push('space-y-4');
    }
    
    return classes.join(' ');
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      style={{
        maxWidth: template.page?.maxWidth || '1200px',
        padding: template.page?.padding || '2rem',
        backgroundColor: template.page?.backgroundColor || '#ffffff',
      }}
    >
      {template.sections.map((section) => (
        <div
          key={section.id}
          className={getSectionClass(section)}
          style={getSectionStyle(section)}
        >
          {section.items.map(item => renderItem(item))}
        </div>
      ))}
    </div>
  );
}
