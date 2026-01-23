'use client';

import { useMemo } from 'react';
import { FieldDefinition } from '@/types/platform';
import { DisplayTemplate, TemplateSection, TemplateSectionItem } from '@/types/templates';

interface TemplateRendererProps {
  template: DisplayTemplate;
  fields: FieldDefinition[];
  data: Record<string, any>;
  quotes?: { id: number; text: string; source?: string }[];
  sources?: { id: number; title: string; url?: string; date?: string }[];
  media?: { id: number; type: 'image' | 'video'; url: string; caption?: string }[];
}

export function TemplateRenderer({
  template,
  fields,
  data,
  quotes = [],
  sources = [],
  media = [],
}: TemplateRendererProps) {
  // Create a map of field slugs to field definitions for quick lookup
  const fieldMap = useMemo(() => {
    const map = new Map<string, FieldDefinition>();
    fields.forEach(f => map.set(f.slug, f));
    return map;
  }, [fields]);

  // Check if a value is considered empty
  const isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  };

  // Format a field value for display
  const formatValue = (field: FieldDefinition | undefined, value: any): React.ReactNode => {
    if (isEmpty(value)) return null;

    if (!field) {
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    switch (field.field_type) {
      case 'date':
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

      case 'datetime':
        return new Date(value).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'url':
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        );

      case 'email':
        return (
          <a 
            href={`mailto:${value}`}
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        );

      case 'location':
        if (typeof value === 'object') {
          const parts = [value.city, value.state, value.country].filter(Boolean);
          return parts.join(', ');
        }
        return String(value);

      case 'select':
      case 'radio':
        const options = (field.config as any)?.options || [];
        const option = options.find((o: any) => o.value === value);
        return option?.label || value;

      case 'multi_select':
      case 'checkbox_group':
        if (Array.isArray(value)) {
          const opts = (field.config as any)?.options || [];
          return value.map(v => {
            const opt = opts.find((o: any) => o.value === v);
            return opt?.label || v;
          }).join(', ');
        }
        return String(value);

      case 'media':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-2">
              {value.map((item: any, idx: number) => (
                <MediaItem key={idx} item={item} />
              ))}
            </div>
          );
        }
        return null;

      case 'tri_state':
        if (value === 'yes') return 'Yes';
        if (value === 'no') return 'No';
        return 'Unknown';

      default:
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
  };

  // Render a single item
  const renderItem = (item: TemplateSectionItem): React.ReactNode => {
    // Handle data types (quotes, sources, media)
    if (item.dataType) {
      switch (item.dataType) {
        case 'quotes':
          if (quotes.length === 0 && item.hideIfEmpty !== false) return null;
          return <QuotesDisplay quotes={quotes} style={item.style} />;
        case 'sources':
          if (sources.length === 0 && item.hideIfEmpty !== false) return null;
          return <SourcesDisplay sources={sources} style={item.style} />;
        case 'media':
          if (media.length === 0 && item.hideIfEmpty !== false) return null;
          return <MediaDisplay media={media} style={item.style} />;
      }
    }

    // Handle field reference
    if (item.fieldSlug) {
      const field = fieldMap.get(item.fieldSlug);
      const value = data[item.fieldSlug];

      // Skip if empty and hideIfEmpty is true
      if (isEmpty(value) && item.hideIfEmpty !== false) {
        return null;
      }

      const formattedValue = formatValue(field, value);
      const label = item.labelOverride || field?.name || item.fieldSlug;

      return (
        <div style={item.style}>
          {!item.hideLabel && (
            <div className="text-sm font-medium text-gray-500 mb-1">
              {label}
            </div>
          )}
          <div>{formattedValue ?? <span className="text-gray-400 italic">No data</span>}</div>
        </div>
      );
    }

    return null;
  };

  // Render a section
  const renderSection = (section: TemplateSection): React.ReactNode => {
    const getGridStyle = (): React.CSSProperties => {
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
      if (section.type === 'hero') {
        return {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        } as React.CSSProperties;
      }
      return {};
    };

    // Filter out null items (empty fields with hideIfEmpty)
    const renderedItems = section.items
      .map((item, idx) => {
        const rendered = renderItem(item);
        if (!rendered) return null;
        
        return (
          <div
            key={item.id || idx}
            style={{
              gridColumn: item.colSpan ? `span ${item.colSpan}` : undefined,
              gridRow: item.rowSpan ? `span ${item.rowSpan}` : undefined,
            }}
          >
            {rendered}
          </div>
        );
      })
      .filter(Boolean);

    // Skip section if all items are empty
    if (renderedItems.length === 0) {
      return null;
    }

    return (
      <div
        key={section.id}
        style={{
          padding: section.padding,
          margin: section.margin,
          backgroundColor: section.backgroundColor,
          borderRadius: section.borderRadius,
          border: section.border,
          boxShadow: section.boxShadow,
          ...getGridStyle(),
        }}
      >
        {renderedItems}
      </div>
    );
  };

  return (
    <div
      style={{
        maxWidth: template.page.maxWidth,
        margin: '0 auto',
        padding: template.page.padding,
        backgroundColor: template.page.backgroundColor,
        fontFamily: template.page.fontFamily,
        fontSize: template.page.fontSize,
        lineHeight: template.page.lineHeight,
      }}
    >
      {template.sections.map((section, idx) => {
        const rendered = renderSection(section);
        return rendered ? <div key={section.id || idx} className="mb-6">{rendered}</div> : null;
      })}
    </div>
  );
}

// Helper Components
function MediaItem({ item }: { item: { type: string; url: string; caption?: string } }) {
  if (item.type === 'video') {
    return (
      <video 
        src={item.url} 
        controls 
        className="max-w-full h-auto rounded"
      />
    );
  }
  return (
    <img 
      src={item.url} 
      alt={item.caption || ''} 
      className="max-w-full h-auto rounded"
    />
  );
}

function QuotesDisplay({ quotes, style }: { quotes: any[]; style?: any }) {
  return (
    <div className="space-y-4" style={style}>
      {quotes.map((quote, idx) => (
        <blockquote 
          key={quote.id || idx} 
          className="border-l-4 border-gray-300 pl-4 italic text-gray-700"
        >
          <p>"{quote.text}"</p>
          {quote.source && (
            <cite className="text-sm text-gray-500 not-italic">— {quote.source}</cite>
          )}
        </blockquote>
      ))}
    </div>
  );
}

function SourcesDisplay({ sources, style }: { sources: any[]; style?: any }) {
  return (
    <div className="space-y-2" style={style}>
      <h4 className="font-medium text-gray-700">Sources</h4>
      <ul className="list-disc list-inside space-y-1">
        {sources.map((source, idx) => (
          <li key={source.id || idx} className="text-sm">
            {source.url ? (
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {source.title}
              </a>
            ) : (
              source.title
            )}
            {source.date && (
              <span className="text-gray-500 ml-2">
                ({new Date(source.date).toLocaleDateString()})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MediaDisplay({ media, style }: { media: any[]; style?: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4" style={style}>
      {media.map((item, idx) => (
        <div key={item.id || idx} className="relative">
          <MediaItem item={item} />
          {item.caption && (
            <p className="text-xs text-gray-500 mt-1">{item.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default TemplateRenderer;
