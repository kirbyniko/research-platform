import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/next-auth';
import { checkAIRateLimit, recordAIUsage } from '@/lib/ai-rate-limit';
import pool from '@/lib/db';
import OpenAI from 'openai';

// Initialize OpenAI lazily to avoid build errors when API key is not set
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface FieldDefinition {
  slug: string;
  name: string;
  field_type: string;
  required?: boolean;
  description?: string;
}

// Match the frontend DisplayTemplate structure
interface TemplateSectionItem {
  id: string;
  fieldSlug?: string;
  dataType?: 'quotes' | 'sources' | 'media';
  colSpan?: number;
  rowSpan?: number;
  hideIfEmpty?: boolean;
  hideLabel?: boolean;
  labelOverride?: string;
  labelPosition?: 'above' | 'inline' | 'hidden';
  style?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: string;
    backgroundColor?: string;
    padding?: string;
    margin?: string;
    borderRadius?: string;
    border?: string;
  };
}

interface TemplateSection {
  id: string;
  type: 'full-width' | 'grid' | 'sidebar-left' | 'sidebar-right' | 'hero' | 'cards' | 'masonry';
  title?: string;
  columns?: number;
  gap?: string;
  sidebarWidth?: string;
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  items: TemplateSectionItem[];
}

interface DisplayTemplate {
  version: 1;
  page: {
    maxWidth: string;
    padding: string;
    backgroundColor: string;
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
  };
  sections: TemplateSection[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from database
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    );
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    
    const userId = userResult.rows[0].id;
    
    const body = await request.json();
    const { fields, recordTypeName, projectName, userPrompt, projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check rate limit before processing (now checks project credits)
    const rateLimitCheck = await checkAIRateLimit(userId, projectId, 'template_generation');
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        message: rateLimitCheck.reason,
        resetTime: rateLimitCheck.resetTime,
        upgradeUrl: '/settings/billing'
      }, { status: 429 });
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Fields array is required' },
        { status: 400 }
      );
    }

    // Build the field information for the AI
    const fieldInfo = fields.map((f: FieldDefinition) => ({
      slug: f.slug,
      name: f.name,
      type: f.field_type,
      required: f.required,
      description: f.description
    }));

    const validSlugs = fields.map((f: FieldDefinition) => f.slug);
    
    const systemPrompt = `You are an expert UI/UX designer specializing in data presentation templates. 
Your task is to create beautiful, professional display templates for structured data records.

CRITICAL CONSTRAINTS - YOU MUST FOLLOW THESE:
1. You can ONLY use the field slugs provided in the available fields list
2. Each field slug can be used AT MOST ONCE across all sections
3. You CANNOT add any custom text, labels, or content that isn't derived from a field
4. You CANNOT create fake fields or make up field slugs
5. All displayable content must come from the provided fields

AVAILABLE FIELDS (these are the ONLY field slugs you can use):
${JSON.stringify(fieldInfo, null, 2)}

VALID FIELD SLUGS: ${validSlugs.join(', ')}

SECTION TYPES (use these as the "type" field in sections):
- "full-width": Single column, items stack vertically - good for main content
- "grid": Multi-column grid (specify columns: 2, 3, or 4) - good for compact data
- "sidebar-left": Main content with left sidebar (set sidebarWidth like "300px")
- "sidebar-right": Main content with right sidebar
- "hero": Large header area - good for images and main titles

ITEM OPTIONS (each item in a section's items array):
- id: Unique identifier like "item-1", "item-2", etc.
- fieldSlug: The exact field slug from the list above (REQUIRED unless using dataType)
- dataType: "quotes", "sources", or "media" - use instead of fieldSlug for these special types
- colSpan: How many columns the item spans in a grid (1-4)
- hideIfEmpty: true to hide if no value (usually true)
- hideLabel: true to hide the field label
- labelOverride: Alternative label text
- style: { fontSize, fontWeight, color, textAlign, backgroundColor, padding, margin, borderRadius }

DESIGN PRINCIPLES:
- Create visually striking, modern layouts that make data easy to scan
- Use whitespace effectively for readability
- Group related fields logically (dates together, names together, etc.)
- Put images and important fields in hero sections
- Use appropriate visual hierarchy
- For dates, keep them together in a clean grid
- For long text fields (textarea, rich_text), give them full width

EXACT OUTPUT FORMAT (return ONLY this JSON structure):
{
  "version": 1,
  "page": {
    "maxWidth": "1200px",
    "padding": "2rem",
    "backgroundColor": "#ffffff",
    "fontFamily": "system-ui, -apple-system, sans-serif"
  },
  "sections": [
    {
      "id": "section-1",
      "type": "hero",
      "padding": "2rem",
      "backgroundColor": "#f8fafc",
      "items": [
        {
          "id": "item-1",
          "fieldSlug": "name_field_slug",
          "hideIfEmpty": true,
          "style": { "fontSize": "2rem", "fontWeight": "bold" }
        }
      ]
    },
    {
      "id": "section-2",
      "type": "grid",
      "columns": 2,
      "gap": "1rem",
      "padding": "1rem",
      "items": [
        { "id": "item-2", "fieldSlug": "field_slug", "hideIfEmpty": true },
        { "id": "item-3", "fieldSlug": "another_field", "hideIfEmpty": true }
      ]
    }
  ]
}

Remember: Use ONLY field slugs from this list: ${validSlugs.join(', ')}
Return ONLY the JSON object, no markdown or explanation.`;

    const userMessage = `Create a beautiful display template for "${recordTypeName}" records in the "${projectName}" project.

${userPrompt ? `User's design preferences: ${userPrompt}` : 'Create a professional, modern template that showcases the data effectively.'}

The template should use ALL available fields exactly once, arranged in a visually appealing and logical way.
Return ONLY the JSON object, no markdown code blocks or explanation.`;

    const startTime = Date.now();
    
    const client = getOpenAI();
    if (!client) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set OPENAI_API_KEY.', fallback: true },
        { status: 503 }
      );
    }
    
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseTime = Date.now() - startTime;
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI');
    }

    // Parse and validate the response
    let template: DisplayTemplate;
    try {
      template = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse AI response:', responseText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate that only valid field slugs are used
    const usedSlugs = new Set<string>();
    const invalidSlugs: string[] = [];
    const duplicateSlugs: string[] = [];

    for (const section of template.sections || []) {
      for (const item of section.items || []) {
        if (item.fieldSlug) {
          if (!validSlugs.includes(item.fieldSlug)) {
            invalidSlugs.push(item.fieldSlug);
          }
          if (usedSlugs.has(item.fieldSlug)) {
            duplicateSlugs.push(item.fieldSlug);
          }
          usedSlugs.add(item.fieldSlug);
        }
      }
    }

    if (invalidSlugs.length > 0) {
      console.warn('AI generated invalid field slugs:', invalidSlugs);
      // Remove invalid items from sections
      for (const section of template.sections || []) {
        section.items = section.items.filter(item => 
          !item.fieldSlug || validSlugs.includes(item.fieldSlug)
        );
      }
    }

    if (duplicateSlugs.length > 0) {
      console.warn('AI generated duplicate field slugs:', duplicateSlugs);
      // Remove duplicates, keeping first occurrence
      const seenSlugs = new Set<string>();
      for (const section of template.sections || []) {
        section.items = section.items.filter(item => {
          if (!item.fieldSlug) return true;
          if (seenSlugs.has(item.fieldSlug)) return false;
          seenSlugs.add(item.fieldSlug);
          return true;
        });
      }
    }

    // Record AI usage
    const tokensUsed = completion.usage?.total_tokens || 0;
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    
    await recordAIUsage(
      userId,
      projectId,
      'template_generation',
      {
        modelName: 'gpt-4o',
        inputTokens,
        outputTokens,
        responseTimeMs: responseTime
      }
    );

    return NextResponse.json({
      success: true,
      template,
      usage: {
        tokensUsed,
        responseTime,
        creditsRemaining: rateLimitCheck.creditsRemaining,
        requestsRemaining: {
          hourly: rateLimitCheck.hourlyRemaining,
          daily: rateLimitCheck.dailyRemaining
        }
      }
    });

  } catch (error) {
    console.error('AI template generation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'OpenAI rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate template', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
