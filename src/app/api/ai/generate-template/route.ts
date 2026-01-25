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
    
    const systemPrompt = `You are a UI designer. Create a beautiful JSON template for displaying records.

RULES:
- Use ONLY these field slugs (nothing else): ${validSlugs.join(', ')}
- Each slug used AT MOST once
- Return ONLY valid JSON, no markdown or text
- Use bold colors: blues (#1e40af, #3b82f6), teals (#0891b2), oranges (#ea580c), purples (#7c3aed)
- Add backgrounds, padding, borders for visual impact
- Create 2-3 sections with different layouts (hero, grid, sidebar)

AVAILABLE FIELDS:
${JSON.stringify(fieldInfo, null, 2)}

Return ONLY this JSON structure - no extra text:
{
  "version": 1,
  "page": { "maxWidth": "1200px", "padding": "2rem", "backgroundColor": "#ffffff" },
  "sections": [
    {
      "id": "section-1",
      "type": "hero",
      "backgroundColor": "#1e40af",
      "padding": "3rem",
      "borderRadius": "12px",
      "items": [{ "id": "item-1", "fieldSlug": "field_slug_here", "hideIfEmpty": true, "style": { "color": "#ffffff", "fontSize": "2rem" } }]
    }
  ]
}`;

    const userMessage = `Create a beautiful template for "${recordTypeName}" records.
${userPrompt ? `User wants: ${userPrompt}` : 'Make it visually striking with colors and good layout.'}
Use all available fields exactly once.`;

    const startTime = Date.now();
    
    const client = getOpenAI();
    if (!client) {
      console.error('OpenAI client not initialized - API key missing or invalid');
      return NextResponse.json(
        { error: 'AI service not configured. Please set OPENAI_API_KEY.', fallback: true },
        { status: 503 }
      );
    }
    
    console.log('Making OpenAI API call with model gpt-4o-mini');
    console.log('System prompt length:', systemPrompt.length);
    console.log('User message:', userMessage);
    
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });
    
    console.log('OpenAI API call successful');

    const responseTime = Date.now() - startTime;
    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      console.error('No response content from OpenAI');
      throw new Error('No response from AI');
    }

    console.log('Raw AI response (first 500 chars):', responseText.substring(0, 500));
    console.log('Response length:', responseText.length);

    // Parse and validate the response (tolerant to wrapping/extra text)
    let template: DisplayTemplate;
    const tryParse = (txt: string, label: string) => {
      const parsed = JSON.parse(txt);
      console.log(`Parsed via ${label}`);
      return parsed;
    };

    // Prefer SDK-provided parsed message when available
    const parsedFromSDK = (completion.choices[0] as any)?.message?.parsed as DisplayTemplate | undefined;
    if (parsedFromSDK) {
      console.log('Using parsed message from SDK');
      template = parsedFromSDK;
    } else {
      try {
        template = tryParse(responseText, 'direct');
      } catch (e1) {
        console.log('Direct JSON parse failed, trying to strip markdown/fences, drop trailing commas, and trim to first/last brace...');
        try {
          let cleaned = responseText.trim();
          if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/, '');
          if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/, '');
          if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```\s*$/, '');

          // Remove trailing commas before closing braces/brackets
          cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

          // Narrow to first opening brace and last closing brace to avoid stray text
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.slice(firstBrace, lastBrace + 1);
          }

          template = tryParse(cleaned, 'cleaned brace slice');
        } catch (e2) {
          console.error('Failed to parse AI response after all attempts');
          console.error('Original response length:', responseText.length);
          console.error('Original response (first 1000 chars):', responseText.substring(0, 1000));
          console.error('Original response (chars 13000-14000):', responseText.substring(13000, 14000));
          console.error('Parse error:', e2);
          console.error('Full response for debugging:', responseText);
          
          // Fallback: generate a simple template instead of failing
          console.warn('AI response parsing failed, generating fallback simple template instead');
          template = {
            version: 1,
            page: {
              maxWidth: '1200px',
              padding: '2rem',
              backgroundColor: '#ffffff',
            },
            sections: [
              {
                id: 'section-1',
                type: 'full-width',
                padding: '1rem',
                items: fields.slice(0, 10).map((f: FieldDefinition, i: number) => ({
                  id: `item-${i}`,
                  fieldSlug: f.slug,
                  hideIfEmpty: true,
                })),
              },
            ],
          };
        }
        }
      }
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
        modelName: 'gpt-4o-mini',
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
    console.error('=== AI TEMPLATE GENERATION ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // For OpenAI errors, log additional details
    if (error && typeof error === 'object' && 'status' in error) {
      console.error('OpenAI API error status:', (error as any).status);
      console.error('OpenAI API error type:', (error as any).type);
      console.error('OpenAI API error code:', (error as any).code);
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error && typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error);
    
    console.error('Full error details:', errorDetails);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || errorMessage.includes('rate_limit')) {
        return NextResponse.json(
          { 
            error: 'OpenAI rate limit exceeded. Please try again later.',
            details: errorMessage 
          },
          { status: 429 }
        );
      }
      if (error.message.includes('API key') || error.message.includes('authentication') || error.message.includes('Incorrect API key')) {
        return NextResponse.json(
          { 
            error: 'AI service configuration error - Invalid API key',
            details: errorMessage 
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate template', 
        details: errorMessage,
        fullError: errorDetails
      },
      { status: 500 }
    );
  }
}
