import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/server-auth';
import pool from '@/lib/db';
import { extractPdfWithPositions, getPageForChar, getBoundingBoxesForRange } from '@/lib/pdf-processor';
import { segmentSentences, getSurroundingContext, Sentence } from '@/lib/sentence-segmenter';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Date patterns for extraction
const DATE_PATTERNS = [
  // Full dates: March 7, 2024
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
  // Short dates: 3/7/2024 or 03-07-2024
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  // ISO dates: 2024-03-07
  /\b\d{4}-\d{2}-\d{2}\b/g,
  // Relative: "on or about", "approximately"
  /\b(on or about|approximately)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/gi,
];

// Extract dates from text
function extractDates(text: string): string[] {
  const dates: string[] = [];
  for (const pattern of DATE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }
  return [...new Set(dates)]; // Deduplicate
}

// Parse a date string to ISO format
function parseDate(dateStr: string): string | null {
  try {
    // Try various formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return null;
  } catch {
    return null;
  }
}

// Classify a sentence using Ollama
async function classifySentence(
  sentence: string,
  context: { before: string; after: string }
): Promise<{ category: string; date: string | null; confidence: number } | null> {
  try {
    const prompt = `You are classifying sentences from a document about a death in U.S. immigration detention.

Sentence to classify:
"${sentence}"

Context (sentences before):
"${context.before}"

Context (sentences after):
"${context.after}"

Classify this sentence into ONE of these categories:
- TIMELINE_EVENT: Describes a specific action, event, or occurrence with a time reference
- MEDICAL: Health or medical information (symptoms, diagnoses, treatments, vital signs)
- OFFICIAL_STATEMENT: Statement from ICE, officials, or authorities
- BACKGROUND: General context or background information
- IRRELEVANT: Not useful for understanding the death (headers, footers, administrative text)

Also extract any date mentioned in or referenced by this sentence.

Respond ONLY with valid JSON in this exact format, nothing else:
{"category": "TIMELINE_EVENT", "date": "2024-03-07", "confidence": 0.85}

If no date, use null for date. Confidence should be 0.0 to 1.0.`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 100
        }
      })
    });

    if (!response.ok) {
      console.error('[extract-quotes] Ollama error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.response?.trim();
    
    // Parse JSON response
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category?.toLowerCase() || 'background',
        date: parsed.date || null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
      };
    }
    
    return null;
  } catch (error) {
    console.error('[extract-quotes] Classification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[extract-quotes] Request received');
    
    // Auth check
    const authResult = await requireServerAuth(request, 'editor');
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { documentId, caseId } = body;
    
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }

    // Get document from database
    const docResult = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [documentId]
    );
    
    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    const document = docResult.rows[0];
    const fullText = document.full_text;
    const pageOffsets = document.page_offsets || [];
    const textItems = document.text_positions || [];

    console.log('[extract-quotes] Processing document:', documentId, 'with', fullText?.length, 'characters');

    // Segment into sentences
    const sentences = segmentSentences(fullText);
    console.log('[extract-quotes] Found', sentences.length, 'sentences');

    // Classify each sentence
    const extractedQuotes: Array<{
      quote_text: string;
      char_start: number;
      char_end: number;
      page_number: number;
      category: string;
      event_date: string | null;
      confidence_score: number;
      bounding_boxes: unknown;
    }> = [];

    // Process in batches to avoid overwhelming Ollama
    const BATCH_SIZE = 5;
    const MIN_CONFIDENCE = 0.5;
    
    for (let i = 0; i < sentences.length; i += BATCH_SIZE) {
      const batch = sentences.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.all(
        batch.map(async (sentence) => {
          // Skip very short sentences
          if (sentence.text.length < 20) {
            return null;
          }
          
          const context = getSurroundingContext(sentences, sentence.index);
          const classification = await classifySentence(sentence.text, context);
          
          if (!classification) return null;
          if (classification.category === 'irrelevant') return null;
          if (classification.confidence < MIN_CONFIDENCE) return null;
          
          return {
            sentence,
            classification
          };
        })
      );
      
      for (const result of results) {
        if (!result) continue;
        
        const { sentence, classification } = result;
        
        // Get page number
        const pageNumber = getPageForChar(sentence.startChar, pageOffsets);
        
        // Get bounding boxes for highlighting
        const boundingBoxes = getBoundingBoxesForRange(
          sentence.startChar,
          sentence.endChar,
          textItems,
          pageOffsets
        );
        
        extractedQuotes.push({
          quote_text: sentence.text,
          char_start: sentence.startChar,
          char_end: sentence.endChar,
          page_number: pageNumber,
          category: classification.category,
          event_date: classification.date ? parseDate(classification.date) : null,
          confidence_score: classification.confidence,
          bounding_boxes: boundingBoxes
        });
      }
      
      console.log('[extract-quotes] Processed', Math.min(i + BATCH_SIZE, sentences.length), '/', sentences.length, 'sentences');
    }

    console.log('[extract-quotes] Extracted', extractedQuotes.length, 'quotes');

    // Validate quotes: ensure they're exact substrings
    const validatedQuotes = extractedQuotes.filter(quote => {
      const extracted = fullText.slice(quote.char_start, quote.char_end);
      const isValid = extracted.trim() === quote.quote_text.trim();
      if (!isValid) {
        console.warn('[extract-quotes] Quote validation failed:', {
          expected: quote.quote_text.slice(0, 50),
          got: extracted.slice(0, 50)
        });
      }
      return isValid;
    });

    console.log('[extract-quotes] Validated', validatedQuotes.length, 'quotes');

    // Save to database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing quotes for this document
      await client.query('DELETE FROM extracted_quotes WHERE document_id = $1', [documentId]);
      
      // Insert new quotes
      for (const quote of validatedQuotes) {
        await client.query(`
          INSERT INTO extracted_quotes (
            document_id, case_id, quote_text, char_start, char_end, 
            page_number, bounding_boxes, category, event_date,
            confidence_score, extracted_by, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
        `, [
          documentId,
          caseId || document.case_id,
          quote.quote_text,
          quote.char_start,
          quote.char_end,
          quote.page_number,
          JSON.stringify(quote.bounding_boxes),
          quote.category,
          quote.event_date,
          quote.confidence_score,
          'llama3.1:8b'
        ]);
      }
      
      // Mark document as processed
      await client.query(
        'UPDATE documents SET processed = true, processed_at = NOW(), extraction_model = $2 WHERE id = $1',
        [documentId, 'llama3.1:8b']
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      documentId,
      quotesExtracted: validatedQuotes.length,
      quotes: validatedQuotes
    });

  } catch (error) {
    console.error('[extract-quotes] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract quotes', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET: Retrieve quotes for a document
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 });
    }
    
    const result = await pool.query(
      `SELECT * FROM extracted_quotes WHERE document_id = $1 ORDER BY char_start`,
      [documentId]
    );
    
    return NextResponse.json({
      success: true,
      quotes: result.rows
    });
    
  } catch (error) {
    console.error('[extract-quotes] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get quotes' },
      { status: 500 }
    );
  }
}
