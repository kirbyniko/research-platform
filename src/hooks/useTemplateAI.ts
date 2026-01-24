'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DisplayTemplate, TemplateSection, TemplateSectionItem, SectionType } from '@/types/templates';
import { FieldDefinition } from '@/types/platform';

interface UseTemplateAIOptions {
  fields: FieldDefinition[];
  enabledDataTypes: { quotes: boolean; sources: boolean; media: boolean };
  onTemplateGenerated: (template: DisplayTemplate) => void;
}

interface AIState {
  status: 'idle' | 'loading-model' | 'generating' | 'validating' | 'error' | 'complete';
  progress: number;
  message: string;
  error?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// WebLLM types (simplified for our use)
interface WebLLMEngine {
  chat: {
    completions: {
      create: (options: {
        messages: { role: string; content: string }[];
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
      }) => Promise<{ choices: { message: { content: string } }[] }>;
    };
  };
}

declare global {
  interface Window {
    webllm?: {
      CreateMLCEngine: (
        model: string,
        options?: { initProgressCallback?: (progress: { progress: number; text: string }) => void }
      ) => Promise<WebLLMEngine>;
    };
  }
}

// Model to use - Llama 3.2 3B is better for structured output and reasoning
const MODEL_ID = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';

export function useTemplateAI({
  fields,
  enabledDataTypes,
  onTemplateGenerated,
}: UseTemplateAIOptions) {
  const [state, setState] = useState<AIState>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  
  const engineRef = useRef<WebLLMEngine | null>(null);
  const [isWebGPUSupported, setIsWebGPUSupported] = useState<boolean | null>(null);

  // Check WebGPU support on mount
  useEffect(() => {
    const checkWebGPU = async () => {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          setIsWebGPUSupported(!!adapter);
        } catch {
          setIsWebGPUSupported(false);
        }
      } else {
        setIsWebGPUSupported(false);
      }
    };
    checkWebGPU();
  }, []);

  // Build the system prompt with available fields
  const buildSystemPrompt = useCallback(() => {
    const fieldDescriptions = fields.map(f => 
      `- ${f.slug} (${f.field_type}): ${f.name}${f.help_text ? ` - ${f.help_text}` : ''}`
    ).join('\n');

    const dataTypes: string[] = [];
    if (enabledDataTypes.quotes) dataTypes.push('- quotes: Collection of quotes related to this record');
    if (enabledDataTypes.sources) dataTypes.push('- sources: Source citations and references');
    if (enabledDataTypes.media) dataTypes.push('- media: Images, documents, and other media files');

    return `You are a layout designer assistant. Create display templates for data records.

AVAILABLE FIELDS (you can ONLY use these field slugs):
${fieldDescriptions}

${dataTypes.length > 0 ? `AVAILABLE DATA TYPES:\n${dataTypes.join('\n')}` : ''}

TEMPLATE STRUCTURE:
A template has sections, each containing items. Each item references ONE field by its exact slug.

SECTION TYPES:
- "full-width": Single column, items stack vertically
- "grid": Multi-column grid (specify columns: 2, 3, or 4)
- "sidebar-left": Main content with left sidebar (sidebarWidth: "300px" or "25%")
- "sidebar-right": Main content with right sidebar
- "hero": Large header area, good for images and titles

ITEM OPTIONS:
- fieldSlug: The exact field slug from the list above
- dataType: "quotes", "sources", or "media" (instead of fieldSlug)
- colSpan: How many columns the item spans (1-4)
- hideIfEmpty: true/false - hide if no value
- hideLabel: true/false - hide the field label
- labelOverride: Alternative label text
- style: { fontSize, fontWeight, color, textAlign, backgroundColor, padding, margin, borderRadius }

RULES:
1. ONLY use field slugs from the list above - never invent new fields
2. ONLY use data types that are available
3. Do NOT add custom text content - only field references
4. Keep the structure simple and clean
5. Group related fields together in sections

OUTPUT FORMAT:
Return ONLY valid JSON matching this structure (no markdown, no explanation):
{
  "version": 1,
  "page": {
    "maxWidth": "1200px",
    "padding": "2rem",
    "backgroundColor": "#ffffff"
  },
  "sections": [
    {
      "id": "section-1",
      "type": "full-width",
      "columns": 2,
      "gap": "1rem",
      "padding": "1rem",
      "items": [
        {
          "id": "item-1",
          "fieldSlug": "example_field",
          "colSpan": 1,
          "hideIfEmpty": true
        }
      ]
    }
  ]
}`;
  }, [fields, enabledDataTypes]);

  // Validate the generated template
  const validateTemplate = useCallback((template: any): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldSlugs = new Set(fields.map(f => f.slug));

    // Basic structure validation
    if (!template || typeof template !== 'object') {
      errors.push('Invalid template: not an object');
      return { valid: false, errors, warnings };
    }

    if (template.version !== 1) {
      warnings.push('Missing or invalid version, defaulting to 1');
    }

    if (!Array.isArray(template.sections)) {
      errors.push('Invalid template: sections must be an array');
      return { valid: false, errors, warnings };
    }

    // Validate each section
    template.sections.forEach((section: any, sIndex: number) => {
      if (!section.id) {
        warnings.push(`Section ${sIndex + 1} missing id, will be auto-generated`);
      }

      if (!section.type || !['grid', 'hero', 'sidebar-left', 'sidebar-right', 'full-width', 'cards', 'masonry'].includes(section.type)) {
        errors.push(`Section ${sIndex + 1}: invalid type "${section.type}"`);
      }

      if (!Array.isArray(section.items)) {
        errors.push(`Section ${sIndex + 1}: items must be an array`);
        return;
      }

      // Validate each item
      section.items.forEach((item: any, iIndex: number) => {
        if (!item.fieldSlug && !item.dataType) {
          errors.push(`Section ${sIndex + 1}, Item ${iIndex + 1}: must have fieldSlug or dataType`);
          return;
        }

        // Check field reference
        if (item.fieldSlug && !fieldSlugs.has(item.fieldSlug)) {
          errors.push(`Section ${sIndex + 1}, Item ${iIndex + 1}: unknown field "${item.fieldSlug}"`);
        }

        // Check data type reference
        if (item.dataType) {
          if (!['quotes', 'sources', 'media'].includes(item.dataType)) {
            errors.push(`Section ${sIndex + 1}, Item ${iIndex + 1}: invalid dataType "${item.dataType}"`);
          } else if (item.dataType === 'quotes' && !enabledDataTypes.quotes) {
            errors.push(`Section ${sIndex + 1}, Item ${iIndex + 1}: quotes not enabled for this record type`);
          } else if (item.dataType === 'sources' && !enabledDataTypes.sources) {
            errors.push(`Section ${sIndex + 1}, Item ${iIndex + 1}: sources not enabled for this record type`);
          } else if (item.dataType === 'media' && !enabledDataTypes.media) {
            errors.push(`Section ${sIndex + 1}, Item ${iIndex + 1}: media not enabled for this record type`);
          }
        }
      });
    });

    return { valid: errors.length === 0, errors, warnings };
  }, [fields, enabledDataTypes]);

  // Sanitize and fix common issues in generated template
  const sanitizeTemplate = useCallback((raw: any): DisplayTemplate => {
    const template: DisplayTemplate = {
      version: 1,
      page: {
        maxWidth: raw.page?.maxWidth || '1200px',
        padding: raw.page?.padding || '2rem',
        backgroundColor: raw.page?.backgroundColor || '#ffffff',
        fontFamily: raw.page?.fontFamily,
        fontSize: raw.page?.fontSize,
        lineHeight: raw.page?.lineHeight,
      },
      sections: [],
    };

    if (Array.isArray(raw.sections)) {
      template.sections = raw.sections.map((s: any, idx: number): TemplateSection => ({
        id: s.id || `section-${Date.now()}-${idx}`,
        type: s.type as SectionType || 'full-width',
        title: s.title,
        columns: s.columns,
        gap: s.gap || '1rem',
        sidebarWidth: s.sidebarWidth,
        backgroundColor: s.backgroundColor,
        padding: s.padding || '1rem',
        margin: s.margin,
        borderRadius: s.borderRadius,
        border: s.border,
        boxShadow: s.boxShadow,
        items: Array.isArray(s.items) ? s.items.map((item: any, iIdx: number): TemplateSectionItem => ({
          id: item.id || `item-${Date.now()}-${idx}-${iIdx}`,
          fieldSlug: item.fieldSlug,
          dataType: item.dataType,
          colSpan: item.colSpan || 1,
          rowSpan: item.rowSpan,
          colStart: item.colStart,
          rowStart: item.rowStart,
          alignSelf: item.alignSelf,
          justifySelf: item.justifySelf,
          style: item.style,
          hideLabel: item.hideLabel,
          labelOverride: item.labelOverride,
          labelPosition: item.labelPosition,
          aspectRatio: item.aspectRatio,
          objectFit: item.objectFit,
          hideIfEmpty: item.hideIfEmpty ?? true,
        })) : [],
      }));
    }

    return template;
  }, []);

  // Initialize the WebLLM engine
  const initEngine = useCallback(async () => {
    if (engineRef.current) return engineRef.current;
    if (!window.webllm) {
      throw new Error('WebLLM not available. Please ensure the WebLLM bundle is loaded.');
    }

    setState(s => ({ ...s, status: 'loading-model', progress: 0, message: 'Loading AI model...' }));

    const engine = await window.webllm.CreateMLCEngine(MODEL_ID, {
      initProgressCallback: (progress) => {
        setState(s => ({
          ...s,
          progress: progress.progress * 100,
          message: progress.text,
        }));
      },
    });

    engineRef.current = engine;
    return engine;
  }, []);

  // Generate a template from a user prompt
  const generateTemplate = useCallback(async (prompt: string) => {
    try {
      setState({ status: 'loading-model', progress: 0, message: 'Initializing AI...', error: undefined });

      // Try GitHub Copilot API first (server-side)
      try {
        setState(s => ({ ...s, message: 'Connecting to GitHub Copilot...' }));
        
        const response = await fetch('/api/ai/generate-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            fields,
            enabledDataTypes,
          }),
        });

        const data = await response.json();

        // If successful, use the Copilot-generated template
        if (response.ok && data.template) {
          console.log('[TemplateAI] GitHub Copilot generated template:', data.template);
          
          setState(s => ({ ...s, status: 'validating', message: 'Validating template...' }));

          // Validate
          const validation = validateTemplate(data.template);
          if (!validation.valid) {
            throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
          }

          // Sanitize and return
          const template = sanitizeTemplate(data.template);
          
          console.log('[TemplateAI] Template generated successfully via Copilot:', {
            sections: template.sections.length,
            totalFields: template.sections.reduce((sum, s) => sum + s.items.length, 0),
            template
          });
          
          setState({ status: 'complete', progress: 100, message: 'Template generated via GitHub Copilot!' });
          onTemplateGenerated(template);

          return template;
        }

        // If fallback flag is set, continue to local WebLLM
        if (!data.fallback) {
          throw new Error(data.error || 'Failed to generate template');
        }

        console.log('[TemplateAI] Copilot unavailable, falling back to local WebLLM');
      } catch (copilotError) {
        console.log('[TemplateAI] Copilot error, falling back to WebLLM:', copilotError);
      }

      // Fall back to local WebLLM
      const engine = await initEngine();

      setState(s => ({ ...s, status: 'generating', message: 'Generating template with local AI...' }));

      const response = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      // Parse JSON from response
      let parsed: any;
      try {
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response as JSON: ${content.slice(0, 200)}...`);
      }

      setState(s => ({ ...s, status: 'validating', message: 'Validating template...' }));

      // Validate
      const validation = validateTemplate(parsed);
      if (!validation.valid) {
        throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
      }

      // Sanitize and return
      const template = sanitizeTemplate(parsed);
      
      console.log('[TemplateAI] Template generated successfully:', {
        sections: template.sections.length,
        totalFields: template.sections.reduce((sum, s) => sum + s.items.length, 0),
        template
      });
      
      setState({ status: 'complete', progress: 100, message: 'Template generated successfully!' });
      onTemplateGenerated(template);

      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ status: 'error', progress: 0, message: '', error: errorMessage });
      throw error;
    }
  }, [initEngine, buildSystemPrompt, validateTemplate, sanitizeTemplate, onTemplateGenerated, fields, enabledDataTypes]);

  // Generate using a simpler rule-based approach (fallback when WebGPU not available)
  const generateSimpleTemplate = useCallback((prompt: string) => {
    const promptLower = prompt.toLowerCase();
    const sections: TemplateSection[] = [];
    let sectionCounter = 1;
    let itemCounter = 1;

    // Helper to create items
    const createItem = (fieldSlug?: string, dataType?: 'quotes' | 'sources' | 'media', options: Partial<TemplateSectionItem> = {}): TemplateSectionItem => ({
      id: `item-${itemCounter++}`,
      fieldSlug,
      dataType,
      colSpan: options.colSpan || 1,
      hideIfEmpty: true,
      ...options,
    });

    // Find media fields for hero/header
    const mediaFields = fields.filter(f => f.field_type === 'media');
    const textFields = fields.filter(f => f.field_type === 'text');
    const nameFields = textFields.filter(f => f.slug.includes('name') || f.name.toLowerCase().includes('name'));
    const dateFields = fields.filter(f => f.field_type === 'date' || f.field_type === 'datetime');
    const longTextFields = fields.filter(f => f.field_type === 'textarea' || f.field_type === 'rich_text');
    const otherFields = fields.filter(f => 
      !mediaFields.includes(f) && 
      !nameFields.includes(f) && 
      !dateFields.includes(f) && 
      !longTextFields.includes(f)
    );

    // Detect layout preferences from prompt
    const wantsSidebar = promptLower.includes('sidebar');
    const wantsHero = promptLower.includes('hero') || promptLower.includes('banner') || promptLower.includes('header');
    const wantsGrid = promptLower.includes('grid') || promptLower.includes('column');
    const wantsImageRight = promptLower.includes('right') && (promptLower.includes('image') || promptLower.includes('photo'));
    const wantsImageLeft = promptLower.includes('left') && (promptLower.includes('image') || promptLower.includes('photo'));
    const wantsCompact = promptLower.includes('compact') || promptLower.includes('minimal');
    const wantsCards = promptLower.includes('card');

    // Hero section with image and name
    if ((wantsHero || mediaFields.length > 0) && !wantsCompact) {
      const heroItems: TemplateSectionItem[] = [];
      
      // Add primary image
      if (mediaFields.length > 0) {
        heroItems.push(createItem(mediaFields[0].slug, undefined, {
          colSpan: wantsImageRight || wantsImageLeft ? 1 : 2,
          style: { maxHeight: '300px' },
          objectFit: 'cover',
        }));
      }
      
      // Add name field
      if (nameFields.length > 0) {
        heroItems.push(createItem(nameFields[0].slug, undefined, {
          colSpan: mediaFields.length > 0 && (wantsImageRight || wantsImageLeft) ? 1 : 2,
          style: { fontSize: '2rem', fontWeight: '700' },
          hideLabel: true,
        }));
      }

      if (heroItems.length > 0) {
        sections.push({
          id: `section-${sectionCounter++}`,
          type: 'hero',
          columns: 2,
          gap: '2rem',
          padding: '2rem',
          backgroundColor: '#f8fafc',
          items: wantsImageRight ? heroItems.reverse() : heroItems,
        });
      }
    }

    // Main content section
    if (wantsSidebar && mediaFields.length > 0) {
      // Sidebar layout with image
      const mainItems: TemplateSectionItem[] = [];
      const sidebarItems: TemplateSectionItem[] = [];

      // Put image in sidebar
      sidebarItems.push(createItem(mediaFields[0].slug, undefined, {
        objectFit: 'cover',
        aspectRatio: '1/1',
      }));

      // Add dates
      dateFields.forEach(f => mainItems.push(createItem(f.slug)));
      
      // Add other text fields
      textFields.filter(f => !nameFields.includes(f)).forEach(f => mainItems.push(createItem(f.slug)));
      otherFields.slice(0, 8).forEach(f => mainItems.push(createItem(f.slug)));

      sections.push({
        id: `section-${sectionCounter++}`,
        type: wantsImageLeft ? 'sidebar-left' : 'sidebar-right',
        sidebarWidth: '280px',
        gap: '1.5rem',
        padding: '1rem',
        items: [...mainItems, ...sidebarItems],
      });
    } else if (wantsGrid || wantsCards) {
      // Grid layout
      const gridItems: TemplateSectionItem[] = [];
      
      dateFields.forEach(f => gridItems.push(createItem(f.slug)));
      textFields.filter(f => !nameFields.includes(f)).forEach(f => gridItems.push(createItem(f.slug)));
      otherFields.slice(0, 10).forEach(f => gridItems.push(createItem(f.slug)));

      sections.push({
        id: `section-${sectionCounter++}`,
        type: 'grid',
        columns: promptLower.includes('three') || promptLower.includes('3') ? 3 : 2,
        gap: '1rem',
        padding: '1rem',
        items: gridItems,
      });
    } else {
      // Simple full-width layout
      const items: TemplateSectionItem[] = [];
      
      // Name first if not in hero
      if (!wantsHero && nameFields.length > 0) {
        items.push(createItem(nameFields[0].slug, undefined, {
          style: { fontSize: '1.5rem', fontWeight: '600' },
          hideLabel: true,
        }));
      }

      // Image if not in hero
      if (!wantsHero && mediaFields.length > 0) {
        items.push(createItem(mediaFields[0].slug, undefined, {
          style: { maxWidth: '400px' },
          objectFit: 'contain',
        }));
      }

      // Dates
      dateFields.forEach(f => items.push(createItem(f.slug)));
      
      // Other fields
      textFields.filter(f => !nameFields.includes(f)).forEach(f => items.push(createItem(f.slug)));
      otherFields.slice(0, 8).forEach(f => items.push(createItem(f.slug)));

      if (items.length > 0) {
        sections.push({
          id: `section-${sectionCounter++}`,
          type: 'full-width',
          gap: '1rem',
          padding: '1rem',
          items,
        });
      }
    }

    // Long text content section
    if (longTextFields.length > 0) {
      sections.push({
        id: `section-${sectionCounter++}`,
        type: 'full-width',
        gap: '1.5rem',
        padding: '1rem',
        items: longTextFields.map(f => createItem(f.slug)),
      });
    }

    // Quotes section
    if (enabledDataTypes.quotes) {
      sections.push({
        id: `section-${sectionCounter++}`,
        type: 'full-width',
        padding: '1rem',
        items: [createItem(undefined, 'quotes')],
      });
    }

    // Sources section
    if (enabledDataTypes.sources) {
      sections.push({
        id: `section-${sectionCounter++}`,
        type: 'full-width',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        items: [createItem(undefined, 'sources')],
      });
    }

    const template: DisplayTemplate = {
      version: 1,
      page: {
        maxWidth: wantsCompact ? '800px' : '1200px',
        padding: '2rem',
        backgroundColor: '#ffffff',
      },
      sections,
    };

    console.log('[TemplateAI] Simple template generated:', {
      sections: sections.length,
      totalFields: sections.reduce((sum, s) => sum + s.items.length, 0),
      template
    });

    setState({ status: 'complete', progress: 100, message: 'Template generated!' });
    onTemplateGenerated(template);
    return template;
  }, [fields, enabledDataTypes, onTemplateGenerated]);

  // Main generate function - uses AI if available, falls back to rules
  const generate = useCallback(async (prompt: string, preferAI: boolean = true) => {
    if (preferAI && isWebGPUSupported && window.webllm) {
      return generateTemplate(prompt);
    } else {
      setState({ status: 'generating', progress: 50, message: 'Generating template...', error: undefined });
      await new Promise(r => setTimeout(r, 500)); // Brief delay for UX
      return generateSimpleTemplate(prompt);
    }
  }, [isWebGPUSupported, generateTemplate, generateSimpleTemplate]);

  const reset = useCallback(() => {
    setState({ status: 'idle', progress: 0, message: '' });
  }, []);

  return {
    state,
    isWebGPUSupported,
    generate,
    generateTemplate,
    generateSimpleTemplate,
    validateTemplate,
    reset,
  };
}
