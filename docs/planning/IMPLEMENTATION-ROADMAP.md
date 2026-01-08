# Implementation Roadmap

## Overview

This document outlines the concrete implementation steps, organized into sprints with clear deliverables.

---

## Current State Assessment

### What Exists
- ✅ Next.js application with admin dashboard
- ✅ PostgreSQL database with cases, sources, timeline tables
- ✅ Basic PDF upload and text extraction (pdf-parse)
- ✅ Ollama integration for text analysis
- ✅ Descope authentication
- ✅ Case listing and basic editing

### What's Missing
- ❌ Quote-exact extraction (AI returns summaries, not exact quotes)
- ❌ PDF viewer with highlighting
- ❌ Human verification workflow
- ❌ Web scraping system
- ❌ Learning/feedback collection
- ❌ Character position tracking

---

## Sprint 1: PDF Processing Foundation (Week 1-2)

### Goal
Get exact character positions from PDFs so we can highlight specific text.

### Tasks

#### 1.1 Update PDF Processing API
```
File: src/app/api/upload-pdf/route.ts

Changes:
- Use pdfjs-dist directly (not pdf-parse) for position data
- Return text items with positions: {text, x, y, width, height, page}
- Build character offset map: charIndex → {page, x, y}
- Store full text with offset data in database
```

#### 1.2 Create Documents Table
```
File: scripts/add-documents-table.sql

Add:
- documents table (per DATABASE-SCHEMA.md)
- extracted_quotes table
- API endpoint: POST /api/documents (create)
- API endpoint: GET /api/documents/:id (read with quotes)
```

#### 1.3 Update Document Analyzer Component
```
File: src/components/DocumentAnalyzer.tsx

Changes:
- After upload, save document to database
- Display document ID for reference
- Show page count and text length
- Remove direct analysis (move to verification flow)
```

### Deliverables
- [ ] PDF upload returns character positions
- [ ] Documents stored in database
- [ ] Can retrieve document with text and positions

---

## Sprint 2: Quote-Exact Extraction (Week 3-4)

### Goal
AI identifies quotes by character position, not by generating text.

### Tasks

#### 2.1 Sentence Segmentation Service
```
File: src/lib/sentence-segmenter.ts

Features:
- Split text into sentences preserving character offsets
- Handle abbreviations (Mr., Dr., etc.)
- Handle legal citations
- Return: {text, startChar, endChar}[]
```

#### 2.2 Quote Extraction API
```
File: src/app/api/extract-quotes/route.ts

Flow:
1. Load document from database
2. Segment into sentences
3. For each sentence, ask LLM: "Is this a timeline event?"
4. If yes, record: {sentenceIndex, startChar, endChar, category, date}
5. Save extracted quotes to database

Key: Quote text is substring of document.fullText[startChar:endChar]
     AI only provides classification, not the text itself.
```

#### 2.3 Quote Validation
```
File: src/lib/quote-validator.ts

Rules:
- quote.text === document.fullText.slice(quote.startChar, quote.endChar)
- Reject any quote that fails this check
- Log validation failures for debugging
```

### Deliverables
- [ ] Sentences segmented with offsets
- [ ] AI classifies sentences without generating text
- [ ] All quotes are exact substrings (validated)

---

## Sprint 3: PDF Viewer (Week 5-6)

### Goal
View PDFs in browser with highlighted quotes and jump-to functionality.

### Tasks

#### 3.1 PDF Viewer Component
```
File: src/components/verification/PDFViewer.tsx

Features:
- Render PDF pages using pdf.js
- Text layer for selection
- Canvas layer for rendering
- Page navigation (prev/next/jump)
- Zoom controls
```

#### 3.2 Highlight Layer
```
File: src/components/verification/HighlightLayer.tsx

Features:
- SVG overlay on each page
- Render colored rectangles for quotes
- Colors: yellow (pending), green (verified), red (rejected)
- Click highlight → select quote
```

#### 3.3 Quote-to-Position Mapping
```
File: src/lib/quote-position-mapper.ts

Purpose:
- Map character offsets to PDF coordinates
- Handle multi-line quotes (multiple bounding boxes)
- Cache position data per document
```

#### 3.4 Jump-to-Quote Function
```
Integration in PDFViewer:
- jumpToQuote(quoteId) → scroll to page + position
- Flash animation to highlight
- Keyboard shortcut: Enter
```

### Deliverables
- [ ] PDF renders in browser
- [ ] Quotes highlighted on correct pages
- [ ] Click quote → PDF scrolls to it

---

## Sprint 4: Verification Workflow (Week 7-8)

### Goal
Complete UI for human verification of extracted quotes.

### Tasks

#### 4.1 Verification Page
```
File: src/app/admin/verify/[documentId]/page.tsx

Layout:
- Left: PDF viewer (60% width)
- Right: Quote list (40% width)
- Top: Navigation, save button, progress
- Bottom: Stats
```

#### 4.2 Quote Card Component
```
File: src/components/verification/QuoteCard.tsx

Features:
- Display quote text (truncated if long)
- Show date, category, confidence
- Action buttons: Accept, Reject, Edit
- Click → jump to PDF location
```

#### 4.3 Quote Actions API
```
File: src/app/api/quotes/[id]/route.ts

PATCH operations:
- Accept: status = 'verified'
- Reject: status = 'rejected', rejectionReason = ...
- Edit: Update text bounds, date, category
```

#### 4.4 Add Quote from Selection
```
Integration in PDFViewer:
- Text selection → "Add as Quote" button
- Form: date picker, category dropdown
- Save new quote with selected bounds
```

### Deliverables
- [ ] Full verification page working
- [ ] Accept/reject/edit quotes
- [ ] Add new quotes from PDF selection
- [ ] Progress tracking

---

## Sprint 5: Scraping System (Week 9-10)

### Goal
Automated discovery of news articles about ICE deaths.

### Tasks

#### 5.1 Scrape Queue Infrastructure
```
Files:
- scripts/add-scrape-tables.sql (queue, results)
- src/lib/scraper/queue.ts (add/get from queue)
- src/lib/scraper/rate-limiter.ts (per-domain limits)
```

#### 5.2 Content Fetcher
```
File: src/lib/scraper/fetcher.ts

Using Playwright:
- Headless browser for JS-rendered sites
- Cookie banner handling
- User agent rotation
- Screenshot capture
```

#### 5.3 Content Extractors
```
Files:
- src/lib/scraper/extractors/generic.ts (Readability fallback)
- src/lib/scraper/extractors/ice-gov.ts
- src/lib/scraper/extractors/nytimes.ts
- etc.
```

#### 5.4 Relevance Scoring
```
File: src/lib/scraper/relevance.ts

Using Ollama:
- Quick check: Is this about ICE custody death?
- Deep check: Extract person name, date, facility
- Score: 0-100 relevance
```

#### 5.5 Admin Queue View
```
File: src/app/admin/scrape/page.tsx

Features:
- View pending URLs
- Manual add URL
- Run discovery (trigger search)
- View results with relevance scores
```

### Deliverables
- [ ] Queue system working
- [ ] Can fetch and extract articles
- [ ] Relevance scoring with Ollama
- [ ] Admin UI for monitoring

---

## Sprint 6: Integration & Learning (Week 11-12)

### Goal
Connect all pieces and start collecting feedback.

### Tasks

#### 6.1 Feedback Collection
```
Files:
- scripts/add-feedback-tables.sql
- src/lib/feedback.ts (log verification actions)
- Auto-log on every accept/reject/edit
```

#### 6.2 Article → Document Pipeline
```
File: src/lib/article-to-document.ts

Flow:
1. Scraped article marked relevant
2. Convert to document format
3. Run quote extraction
4. Add to verification queue
```

#### 6.3 Case Linking
```
File: src/lib/case-linker.ts

Features:
- Extract person name from document
- Match against existing cases
- Create new case if no match
- UI for manual linking
```

#### 6.4 Dashboard Updates
```
File: src/app/admin/page.tsx

Add:
- Verification queue count
- Scraping stats
- Recent activity feed
```

### Deliverables
- [ ] Articles flow into verification
- [ ] Documents linked to cases
- [ ] Feedback logged for learning
- [ ] Dashboard shows system health

---

## Future Sprints

### Sprint 7+: Advanced Features
- Confidence calibration (adjust thresholds from feedback)
- Few-shot prompt updates (use verified examples)
- Domain performance tracking
- Automated quality alerts
- Bulk operations
- Export improvements

---

## Dependencies & Blockers

### External Dependencies
- **Ollama**: Must be running locally with appropriate model
- **PostgreSQL**: Database migrations must run cleanly
- **pdf.js worker**: Must be properly bundled for browser

### Potential Blockers
- PDF coordinate mapping accuracy (different PDF structures)
- LLM response consistency (may need prompt iteration)
- Rate limiting by news sites
- Playwright browser compatibility

---

## Success Metrics

### Sprint 1-2 (Foundation)
- 100% of quotes are exact substrings
- < 2 seconds to process single PDF page

### Sprint 3-4 (Verification)
- Average verification time < 30 seconds per quote
- < 5% of quotes require manual position correction

### Sprint 5-6 (Scraping)
- > 50% relevance rate on scraped articles
- < 5% false positives in auto-detection

### Overall
- 10x faster than manual documentation
- > 95% accuracy on verified data
- Zero fabricated quotes in production
