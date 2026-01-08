# ICE Deaths Documentation System - Architecture Overview

## Mission Statement

Build the fastest, most accurate system for documenting ICE-related deaths through:
1. **Automated discovery** of potential sources (news articles, government documents, court filings)
2. **Intelligent extraction** of exact quotes and timeline events
3. **Human verification** workflow with visual PDF/document overlay
4. **Continuous learning** architecture that improves over time

## Core Principles

- **No AI fabrication**: All extracted data must be exact quotes from source documents
- **Human-in-the-loop**: Every piece of data requires human verification before publishing
- **Local-first AI**: Use local LLMs (16GB VRAM available) - no cloud model dependencies
- **Transparency**: Full audit trail of where every quote came from
- **Speed**: Optimize for volunteer time - minimize clicks, maximize context

---

## System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ICE DEATHS DOCUMENTATION SYSTEM                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  SOURCE CRAWLER  │───▶│  TRIAGE ENGINE   │───▶│ EXTRACTION ENGINE │       │
│  │                  │    │                  │    │                   │       │
│  │ - News scrapers  │    │ - Relevance AI   │    │ - Quote finder    │       │
│  │ - PDF ingestion  │    │ - Deduplication  │    │ - Timeline parser │       │
│  │ - Manual upload  │    │ - Priority queue │    │ - Entity linking  │       │
│  └──────────────────┘    └──────────────────┘    └───────────────────┘       │
│           │                       │                        │                 │
│           │                       │                        ▼                 │
│           │                       │              ┌──────────────────┐        │
│           │                       │              │ VERIFICATION UI  │        │
│           │                       │              │                  │        │
│           │                       │              │ - PDF viewer     │        │
│           │                       │              │ - Quote overlay  │        │
│           │                       │              │ - Jump-to-quote  │        │
│           │                       │              │ - Approve/reject │        │
│           │                       │              └──────────────────┘        │
│           │                       │                        │                 │
│           ▼                       ▼                        ▼                 │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                        LEARNING LAYER                              │      │
│  │                                                                    │      │
│  │  - Track which sources yield valid data                           │      │
│  │  - Learn extraction patterns from verified data                   │      │
│  │  - Improve relevance scoring based on human feedback              │      │
│  │  - Build entity knowledge graph (facilities, staff, cases)        │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                      PUBLISHED DATA STORE                          │      │
│  │                                                                    │      │
│  │  /data/cases/*.json  - Verified case files                        │      │
│  │  PostgreSQL          - Timeline, sources, quotes                  │      │
│  │  Public exports      - CSV, JSON for researchers                  │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Phase 1: Source Acquisition

```
External Sources                    Manual Input
      │                                  │
      ▼                                  ▼
┌─────────────┐                  ┌──────────────┐
│ Auto-crawl  │                  │ Upload/Paste │
│             │                  │              │
│ - Google    │                  │ - PDF files  │
│   News API  │                  │ - Article    │
│ - ICE.gov   │                  │   text       │
│ - FOIA      │                  │ - Court docs │
│   archives  │                  │              │
└─────────────┘                  └──────────────┘
      │                                  │
      └──────────────┬───────────────────┘
                     ▼
            ┌────────────────┐
            │  RAW DOCUMENT  │
            │     STORE      │
            │                │
            │ - Original PDF │
            │ - Full text    │
            │ - Metadata     │
            │ - Source URL   │
            └────────────────┘
```

### Phase 2: Triage & Extraction

```
         RAW DOCUMENT
              │
              ▼
    ┌──────────────────┐
    │  LOCAL LLM       │
    │  RELEVANCE CHECK │
    │                  │
    │  "Is this about  │
    │   an ICE death?" │
    └──────────────────┘
              │
         yes / no / maybe
              │
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
 PRIORITY  REVIEW    ARCHIVE
  QUEUE    QUEUE     (skip)
    │         │
    └────┬────┘
         ▼
    ┌──────────────────┐
    │  QUOTE EXTRACTOR │
    │                  │
    │  Find spans that │
    │  contain:        │
    │  - Dates         │
    │  - Events        │
    │  - Names         │
    │  - Facilities    │
    │  - Medical info  │
    └──────────────────┘
         │
         ▼
    ┌──────────────────┐
    │  CANDIDATE       │
    │  TIMELINE        │
    │                  │
    │  Each entry:     │
    │  - Exact quote   │
    │  - Char offsets  │
    │  - Page number   │
    │  - Category      │
    │  - Confidence    │
    └──────────────────┘
```

### Phase 3: Human Verification

```
    CANDIDATE TIMELINE
           │
           ▼
    ┌─────────────────────────────────────────────────────────┐
    │                    VERIFICATION UI                       │
    │                                                          │
    │  ┌─────────────────────┐  ┌─────────────────────────┐   │
    │  │                     │  │   EXTRACTED EVENTS      │   │
    │  │    PDF VIEWER       │  │                         │   │
    │  │                     │  │  ┌───────────────────┐  │   │
    │  │  ┌───────────────┐  │  │  │ April 3, 2020    │  │   │
    │  │  │               │  │  │  │                   │  │   │
    │  │  │  [highlighted │◀─┼──┼──│ "An APP completed │  │   │
    │  │  │   quote]      │  │  │  │  initial physical │  │   │
    │  │  │               │  │  │  │  exam..."         │  │   │
    │  │  └───────────────┘  │  │  │                   │  │   │
    │  │                     │  │  │ [Jump] [✓] [✗]    │  │   │
    │  │  Page 3 of 12       │  │  └───────────────────┘  │   │
    │  │                     │  │                         │   │
    │  └─────────────────────┘  │  ┌───────────────────┐  │   │
    │                           │  │ March 7, 2024     │  │   │
    │                           │  │ ...               │  │   │
    │                           │  └───────────────────┘  │   │
    │                           └─────────────────────────┘   │
    │                                                          │
    │  [Save Verified] [Skip Document] [Flag for Review]       │
    └─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Next.js** (current) - App Router, React 19
- **react-pdf** or **PDF.js** - In-browser PDF rendering with text layer
- **Tailwind CSS** - Minimal, documentation-focused styling

### Backend
- **Next.js API Routes** - Document processing, verification endpoints
- **PostgreSQL** - Structured data, timeline events, sources
- **File storage** - Original PDFs, extracted text cache

### AI/ML (Local Only)
- **Ollama** - Local LLM runtime (llama3.2, mistral, qwen2.5)
- **Embedding model** - For semantic search, deduplication
- **No cloud dependencies** - All AI runs on local 16GB VRAM

### Scraping Infrastructure
- **Playwright** - JavaScript-rendered pages, anti-bot handling
- **Node.js workers** - Background scraping jobs
- **Rate limiting** - Respectful crawling, avoid blocks

---

## Key Design Decisions

### 1. Quote-First Architecture
The system extracts **character offset ranges** from documents, not AI-generated text.
- Every timeline event links to `[start_char, end_char]` in source
- Verification UI can highlight exact location
- No possibility of AI hallucination in published data

### 2. Progressive Enhancement
- Start with manual PDF upload + human verification
- Add semi-automated extraction
- Build learning layer as verified data accumulates
- Eventually: fully automated pipeline with human spot-checks

### 3. Volunteer-Optimized UX
- Single-page verification flow
- Keyboard shortcuts for approve/reject
- Batch operations
- Progress tracking and gamification potential

### 4. Audit Trail
- Every data point links to source document
- Change history preserved
- Who verified what, when
- Enables corrections and accountability

---

## Related Documents

1. [EXTRACTION-ENGINE.md](./EXTRACTION-ENGINE.md) - Quote extraction without AI fabrication
2. [VERIFICATION-UI.md](./VERIFICATION-UI.md) - PDF viewer with quote overlay
3. [SCRAPING-SYSTEM.md](./SCRAPING-SYSTEM.md) - Intelligent source discovery
4. [LEARNING-LAYER.md](./LEARNING-LAYER.md) - System improvement over time
5. [DATA-MODEL.md](./DATA-MODEL.md) - Database schema and relationships
