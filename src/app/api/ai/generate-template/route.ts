import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';

// Type definitions for Copilot SDK
interface CopilotClient {
  start(): Promise<void>;
  createSession(options: { model: string }): Promise<CopilotSession>;
}

interface CopilotSession {
  send(options: { prompt: string }): Promise<void>;
  on(event: 'message', callback: (data: { content: string }) => void): void;
  close(): Promise<void>;
}

// Dynamic import to handle potential module issues
let CopilotClientClass: any = null;

async function getCopilotClient() {
  if (!CopilotClientClass) {
    try {
      const module = await import('@github/copilot-sdk');
      CopilotClientClass = module.CopilotClient;
    } catch (error) {
      console.error('Failed to load Copilot SDK:', error);
      return null;
    }
  }
  return CopilotClientClass;
}

// POST /api/ai/generate-template
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireServerAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { prompt, fields, enabledDataTypes } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build system prompt
    const fieldDescriptions = (fields || []).map((f: any) => 
      `- ${f.slug} (${f.field_type}): ${f.name}${f.help_text ? ` - ${f.help_text}` : ''}`
    ).join('\n');

    const dataTypes: string[] = [];
    if (enabledDataTypes?.quotes) dataTypes.push('- quotes: Collection of quotes related to this record');
    if (enabledDataTypes?.sources) dataTypes.push('- sources: Source citations and references');
    if (enabledDataTypes?.media) dataTypes.push('- media: Images, documents, and other media files');

    const systemPrompt = `You are a layout designer assistant. Create display templates for data records.

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

    // Try to use Copilot SDK
    const ClientClass = await getCopilotClient();
    
    if (!ClientClass) {
      return NextResponse.json({ 
        error: 'Copilot SDK not available',
        fallback: true 
      }, { status: 503 });
    }

    const client = new ClientClass();
    await client.start();

    const session = await client.createSession({
      model: 'gpt-4o', // Use GPT-4o for best structured output
    });

    let responseContent = '';
    let resolved = false;

    // Set up message handler
    return new Promise<NextResponse>((resolve) => {
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          session.close().catch(console.error);
          resolve(NextResponse.json({ 
            error: 'Request timeout',
            fallback: true 
          }, { status: 504 }));
        }
      }, 30000); // 30 second timeout

      session.on('message', async (data: { content: string }) => {
        responseContent += data.content;
        
        // Check if we have a complete JSON response
        if (responseContent.includes('}')) {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            
            try {
              // Parse the response
              const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/);
              const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseContent.trim();
              const template = JSON.parse(jsonStr);
              
              await session.close();
              resolve(NextResponse.json({ template }));
            } catch (error) {
              await session.close();
              resolve(NextResponse.json({ 
                error: 'Failed to parse AI response',
                fallback: true,
                rawResponse: responseContent
              }, { status: 500 }));
            }
          }
        }
      });

      // Send the request
      const fullPrompt = `${systemPrompt}\n\nUSER REQUEST: ${prompt}`;
      session.send({ prompt: fullPrompt }).catch((error: Error) => {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          session.close().catch(console.error);
          resolve(NextResponse.json({ 
            error: 'Failed to send prompt',
            fallback: true,
            details: error.message 
          }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    console.error('Error generating template with Copilot:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      fallback: true,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
