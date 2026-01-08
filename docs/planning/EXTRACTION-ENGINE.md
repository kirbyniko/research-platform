# Extraction Engine - Quote-Based Timeline Extraction

## Core Philosophy

**The AI suggests, the document provides, the human verifies.**

The extraction engine's job is to identify WHERE in a document relevant information exists, not to interpret or summarize it. Every extracted "event" is actually a pointer to specific characters in the source document.

---

## Extraction Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTRACTION PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT: Raw document (PDF text or article HTML)                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: TEXT NORMALIZATION                                           │   │
│  │                                                                       │   │
│  │ - Extract raw text with character offsets preserved                  │   │
│  │ - Map page numbers to character ranges (for PDFs)                    │   │
│  │ - Preserve paragraph boundaries                                      │   │
│  │ - Create searchable index                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: DATE DETECTION (Rule-Based)                                  │   │
│  │                                                                       │   │
│  │ Find all date mentions using regex patterns:                         │   │
│  │ - "March 7, 2024"                                                    │   │
│  │ - "3/7/2024"                                                         │   │
│  │ - "approximately 10:34 a.m."                                         │   │
│  │ - "On or about [date]"                                               │   │
│  │                                                                       │   │
│  │ Output: List of (date_value, char_start, char_end)                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: SENTENCE SEGMENTATION                                        │   │
│  │                                                                       │   │
│  │ Split document into sentences, preserving offsets:                   │   │
│  │ - Handle abbreviations (Mr., Dr., etc.)                              │   │
│  │ - Handle legal citations                                             │   │
│  │ - Keep multi-sentence quotes together                                │   │
│  │                                                                       │   │
│  │ Output: List of (sentence_text, char_start, char_end, page_num)      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: LOCAL LLM CLASSIFICATION                                     │   │
│  │                                                                       │   │
│  │ For each sentence/paragraph, ask the LLM:                            │   │
│  │                                                                       │   │
│  │ "Given this sentence from a document about a death in ICE custody:   │   │
│  │  [SENTENCE]                                                          │   │
│  │                                                                       │   │
│  │  Classify as one of:                                                 │   │
│  │  - TIMELINE_EVENT: Describes something that happened                 │   │
│  │  - BACKGROUND: Context but not a specific event                      │   │
│  │  - MEDICAL: Health-related information                               │   │
│  │  - OFFICIAL_STATEMENT: Quote from ICE/official                       │   │
│  │  - IRRELEVANT: Not related to the death                              │   │
│  │                                                                       │   │
│  │  If TIMELINE_EVENT, what date does it refer to?"                     │   │
│  │                                                                       │   │
│  │ Output: Classification + optional date reference                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 5: QUOTE BOUNDARY EXPANSION                                     │   │
│  │                                                                       │   │
│  │ For each classified sentence, expand to include:                     │   │
│  │ - Full sentence (don't cut mid-thought)                              │   │
│  │ - Attribution ("ICE stated that...")                                 │   │
│  │ - Temporal context ("On March 7...")                                 │   │
│  │                                                                       │   │
│  │ This creates the "quotable span" - the exact text a human would      │   │
│  │ want to see and verify                                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 6: TIMELINE ASSEMBLY                                            │   │
│  │                                                                       │   │
│  │ Group by date, sort chronologically:                                 │   │
│  │                                                                       │   │
│  │ {                                                                    │   │
│  │   "timeline": [                                                      │   │
│  │     {                                                                │   │
│  │       "date": "2020-04-03",                                          │   │
│  │       "quote": "An APP completed Mr. DANIEL's initial physical...",  │   │
│  │       "quote_start": 4523,                                           │   │
│  │       "quote_end": 4687,                                             │   │
│  │       "page": 3,                                                     │   │
│  │       "category": "medical",                                         │   │
│  │       "confidence": 0.92                                             │   │
│  │     }                                                                │   │
│  │   ]                                                                  │   │
│  │ }                                                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  OUTPUT: Candidate timeline with exact quotes and offsets                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## LLM Prompts (Local Only)

### Relevance Check Prompt
```
You are analyzing a document to determine if it describes a death in U.S. immigration detention.

Document excerpt (first 2000 characters):
---
{document_excerpt}
---

Answer ONLY with one of:
- RELEVANT: This document describes an ICE/immigration detention death
- MAYBE: Mentions detention/ICE but unclear if about a death
- IRRELEVANT: Not about ICE detention deaths

Your answer:
```

### Sentence Classification Prompt
```
You are extracting timeline events from a death investigation report.

Sentence:
---
{sentence}
---

Context (sentences before/after):
---
{context}
---

Tasks:
1. Classify this sentence:
   - TIMELINE_EVENT: Describes a specific action or occurrence
   - MEDICAL: Health/medical information
   - OFFICIAL_STATEMENT: Statement from ICE or officials
   - BACKGROUND: General context, not a specific event
   - IRRELEVANT: Not useful for understanding the death

2. If TIMELINE_EVENT or MEDICAL, what date does this refer to?
   - Extract from the sentence if present
   - Or infer from context
   - Format: YYYY-MM-DD or "unknown"

Respond in JSON:
{
  "classification": "...",
  "date": "..." or null,
  "reasoning": "one sentence explanation"
}
```

### Quote Boundary Prompt
```
Given this sentence that describes an event:
---
{sentence}
---

And the surrounding text:
---
{surrounding_text}
---

What is the MINIMUM text needed to:
1. Understand what happened
2. Know when it happened
3. Be a complete, grammatical quote

Return the start and end character positions within the surrounding text.
Return ONLY a JSON object: {"start": N, "end": M}
```

---

## Data Model for Extractions

```typescript
interface ExtractedQuote {
  // The exact text from the document
  text: string;
  
  // Character offsets in the source document
  charStart: number;
  charEnd: number;
  
  // Page number (for PDFs)
  page: number | null;
  
  // Classification
  category: 'timeline_event' | 'medical' | 'official_statement' | 'background';
  
  // Associated date (if any)
  date: string | null; // ISO format or descriptive
  
  // LLM confidence (0-1)
  confidence: number;
  
  // Verification status
  status: 'pending' | 'verified' | 'rejected' | 'edited';
  
  // If edited, what did the human change?
  humanEdits?: {
    originalText: string;
    editedText: string;
    editedDate: string;
    reason: string;
  };
}

interface ExtractionResult {
  // Source document reference
  documentId: string;
  documentHash: string; // SHA-256 of original file
  
  // Raw text with preserved formatting
  fullText: string;
  
  // Page boundaries (for PDFs)
  pageOffsets: Array<{ page: number; startChar: number; endChar: number }>;
  
  // Extracted quotes
  quotes: ExtractedQuote[];
  
  // Metadata
  extractedAt: string;
  modelUsed: string;
  processingTimeMs: number;
}
```

---

## Validation Rules

### Quote Must Be Exact
```typescript
function validateQuote(quote: ExtractedQuote, fullText: string): boolean {
  const extractedText = fullText.slice(quote.charStart, quote.charEnd);
  return extractedText === quote.text;
}
```

### Date Must Be Parseable
```typescript
function validateDate(dateStr: string): boolean {
  // Accept ISO dates
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return true;
  
  // Accept relative descriptions
  const validDescriptions = [
    'unknown',
    'approximately',
    'on or about',
    'between X and Y'
  ];
  
  return validDescriptions.some(d => dateStr.toLowerCase().includes(d));
}
```

### Confidence Threshold
```typescript
const MIN_CONFIDENCE_AUTO = 0.85;  // Auto-approve if above
const MIN_CONFIDENCE_SHOW = 0.50;  // Show for review if above
// Below 0.50: Don't show to reviewers
```

---

## Learning from Verified Data

As humans verify extractions, we collect training signal:

```typescript
interface VerificationFeedback {
  quoteId: string;
  
  // What happened?
  action: 'approved' | 'rejected' | 'edited';
  
  // If rejected, why?
  rejectionReason?: 
    | 'not_a_real_event'      // AI classified wrong
    | 'wrong_date'            // Date association incorrect
    | 'incomplete_quote'      // Need more context
    | 'duplicate'             // Same event extracted twice
    | 'other';
  
  // If edited, what changed?
  edits?: {
    dateChanged: boolean;
    quoteExpanded: boolean;
    quoteTrimmed: boolean;
    categoryChanged: boolean;
  };
}
```

This feedback can be used to:
1. Fine-tune prompts (few-shot examples from verified data)
2. Adjust confidence thresholds per category
3. Build entity recognition for facilities, staff names
4. Improve date extraction patterns

---

## Implementation Phases

### Phase 1: Manual + Basic Extraction (Current Sprint)
- PDF upload → text extraction
- Basic date regex
- Simple LLM classification
- Human verifies everything

### Phase 2: Smart Extraction (Next Sprint)
- Sentence segmentation
- Quote boundary detection
- Confidence scoring
- Filter low-confidence before showing

### Phase 3: Learning (Future)
- Collect verification feedback
- Update prompts with examples
- Build facility/name entity lists
- Improve date extraction

### Phase 4: Autonomous (Future)
- High-confidence auto-approve
- Human spot-checks only
- Anomaly detection for quality
