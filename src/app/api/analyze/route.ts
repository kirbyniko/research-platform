import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireDescopeAuth } from '@/lib/descope-auth';

// POST - Analyze a document to extract quotes and timeline
export async function POST(request: NextRequest) {
  try {
    // Try Descope auth first, fallback to legacy
    let authResult;
    
    const descopeAuthFn = await requireDescopeAuth('editor');
    const descopeResult = await descopeAuthFn(request);
    
    if (!('error' in descopeResult)) {
      authResult = descopeResult;
    } else {
      // Fallback to legacy auth
      const legacyAuthFn = requireAuth('editor');
      const legacyResult = await legacyAuthFn(request);
      if ('error' in legacyResult) {
        return NextResponse.json(
          { error: legacyResult.error },
          { status: legacyResult.status }
        );
      }
      authResult = legacyResult;
    }

    const { document, caseId, analysisType } = await request.json();

    if (!document || !caseId) {
      return NextResponse.json(
        { error: 'Document text and case ID are required' },
        { status: 400 }
      );
    }

    let extractedData;

    if (analysisType === 'timeline' || !analysisType) {
      extractedData = await extractTimeline(document);
    } else if (analysisType === 'quotes') {
      extractedData = await extractQuotes(document);
    } else {
      extractedData = await extractBoth(document);
    }

    return NextResponse.json({
      success: true,
      caseId,
      ...extractedData,
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    return NextResponse.json(
      { error: 'Failed to analyze document' },
      { status: 500 }
    );
  }
}

async function extractTimeline(document: string) {
  const prompt = `Analyze this death report and extract a chronological timeline of events. For each event, provide:
- The date (in YYYY-MM-DD format if available, or approximate)
- A factual description of what happened
- The exact quote from the document that supports this event (must be a verbatim substring of the document). If no exact quote exists, set quote to null and still include the event.

Format your response as JSON array:
[
  {
    "date": "YYYY-MM-DD or description like 'approximately March 2024'",
    "event": "Brief factual description",
    "quote": "Exact text from document or null",
    "quote_context": "Surrounding context for the quote"
  }
]

Document to analyze:
${document}

Return ONLY valid JSON, no other text.`;

  const result = await callAI(prompt);
  
  try {
    const timeline = JSON.parse(result);
    const sanitized = Array.isArray(timeline)
      ? timeline.map((e) => ({
          date: e?.date ?? '',
          event: e?.event ?? '',
          quote: (typeof e?.quote === 'string' && e.quote.trim() && document.includes(e.quote)) ? e.quote : null,
          quote_context: e?.quote_context ?? ''
        }))
      : [];
    return { timeline: sanitized };
  } catch {
    return { timeline: [], error: 'Failed to parse AI response' };
  }
}

async function extractQuotes(document: string) {
  const prompt = `Analyze this death report and extract significant quotes that document:
- Official statements (from ICE, medical staff, authorities)
- Witness accounts
- Medical findings
- Key facts about the circumstances

For each quote, provide:
- The quote itself (verbatim from document)
- The context (who said it, when, in what context)
- The category (official_statement, medical, witness, etc)

Format as JSON array:
[
  {
    "quote": "Exact text from document",
    "quote_context": "Context about who/when/why",
    "category": "official_statement|medical|witness|circumstance"
  }
]

Document to analyze:
${document}

Return ONLY valid JSON, no other text.`;

  const result = await callAI(prompt);
  
  try {
    const quotes = JSON.parse(result);
    const sanitized = Array.isArray(quotes)
      ? quotes.filter((q) => typeof q?.quote === 'string' && q.quote.trim().length > 0 && document.includes(q.quote))
              .map((q) => ({
                quote: q.quote,
                quote_context: q?.quote_context ?? '',
                category: q?.category ?? 'unknown'
              }))
      : [];
    return { quotes: sanitized };
  } catch {
    return { quotes: [], error: 'Failed to parse AI response' };
  }
}

async function extractBoth(document: string) {
  const prompt = `Analyze this death report and extract:

1. TIMELINE: Chronological events with dates, descriptions, and supporting quotes
2. QUOTES: Significant quotes from officials, witnesses, medical staff

Format as JSON:
{
  "timeline": [
    {
      "date": "YYYY-MM-DD or description",
      "event": "Brief factual description",
      "quote": "Exact supporting text from document or null",
      "quote_context": "Context"
    }
  ],
  "quotes": [
    {
      "quote": "Exact text from document",
      "quote_context": "Who/when/why context",
      "category": "official_statement|medical|witness|circumstance"
    }
  ]
}

Document to analyze:
${document}

Return ONLY valid JSON, no other text.`;

  const result = await callAI(prompt);
  
  try {
    const parsed = JSON.parse(result);
    const timeline = Array.isArray(parsed?.timeline)
      ? parsed.timeline.map((e: any) => ({
          date: e?.date ?? '',
          event: e?.event ?? '',
          quote: (typeof e?.quote === 'string' && e.quote.trim() && document.includes(e.quote)) ? e.quote : null,
          quote_context: e?.quote_context ?? ''
        }))
      : [];
    const quotes = Array.isArray(parsed?.quotes)
      ? parsed.quotes.filter((q: any) => typeof q?.quote === 'string' && q.quote.trim().length > 0 && document.includes(q.quote))
          .map((q: any) => ({
            quote: q.quote,
            quote_context: q?.quote_context ?? '',
            category: q?.category ?? 'unknown'
          }))
      : [];
    return { timeline, quotes };
  } catch {
    return { timeline: [], quotes: [], error: 'Failed to parse AI response' };
  }
}

async function callAI(prompt: string): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:latest';
  
  // Try Ollama (local) first
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: `You are a precise document analyst. Extract only factual information with exact quotes. Return valid JSON only.\n\n${prompt}`,
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.response;
    }
  } catch (error) {
    console.log('Ollama not available, trying cloud APIs...');
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a precise document analyst. Extract only factual information with exact quotes. Return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Fallback to Anthropic Claude
  if (process.env.ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  throw new Error('No AI service configured. Install Ollama locally or set OPENAI_API_KEY/ANTHROPIC_API_KEY');
}
