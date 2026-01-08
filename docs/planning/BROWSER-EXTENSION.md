# ICE Deaths Research Browser Extension

## Overview

A Firefox/Chrome sidebar extension for rapid data collection from news articles and PDFs. The extension enables researchers to extract exact quotes, fill case fields, and validate data - all while browsing source documents.

## Core Principles

1. **Zero AI Fabrication**: AI classifies text, never generates it
2. **Human Validation Required**: Every quote must be approved
3. **Exact Quotes Only**: Text comes directly from source documents
4. **Local-First**: All data stored in local PostgreSQL via existing API
5. **Source Attribution**: Every piece of data linked to its source URL

---

## User Workflow

### Scenario 1: News Article

1. User navigates to news article (e.g., Reuters story about ICE death)
2. Opens sidebar extension (click icon or keyboard shortcut)
3. Extension auto-detects article content using CSS selectors
4. User sees:
   - **Left**: Article in browser
   - **Right**: Sidebar with case fields + extracted sentences
5. User highlights text → Right-click → "Add as Quote"
6. Or clicks "Extract Sentences" for automatic detection
7. Reviews each sentence, clicks Accept/Reject
8. Fills in case fields (name, date, facility, etc.)
9. Clicks "Save to Database"

### Scenario 2: PDF Document

1. User opens PDF in browser (local file or URL)
2. Opens sidebar extension
3. Extension extracts PDF text using pdf.js
4. Same workflow as news article
5. Quotes include page numbers

### Scenario 3: Manual Selection

1. User on any webpage
2. Highlights text with mouse
3. Right-click context menu → "Add Quote to Case"
4. Quote appears in sidebar with source URL
5. User categorizes and validates

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Extension                         │
├─────────────────┬───────────────────────┬───────────────────────┤
│  Content Script │   Background Script   │     Sidebar Panel     │
│                 │                       │                       │
│ • DOM access    │ • API communication   │ • React UI            │
│ • Text select   │ • State management    │ • Case form           │
│ • CSS selectors │ • Storage sync        │ • Quote list          │
│ • PDF.js        │ • Auth token          │ • Validation controls │
└────────┬────────┴───────────┬───────────┴───────────┬───────────┘
         │                    │                       │
         │     Messages       │      Messages         │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     localhost:3000/api/*                         │
│                                                                  │
│  • /api/cases (CRUD)                                            │
│  • /api/quotes (save quotes)                                    │
│  • /api/sources (track URLs)                                    │
│  • /api/extract-quotes (sentence classification)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Extension Components

### 1. Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "ICE Deaths Research Assistant",
  "version": "1.0.0",
  "description": "Extract and validate case data from news articles and documents",
  "permissions": [
    "activeTab",
    "storage",
    "contextMenus",
    "sidePanel"
  ],
  "host_permissions": [
    "http://localhost:3000/*",
    "http://localhost:3001/*"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"]
  }],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Content Script (content.js)

Responsibilities:
- Inject into all pages
- Listen for text selection
- Apply CSS selectors to extract content
- Handle PDF.js for PDF pages
- Send extracted content to background script

Key Functions:
```javascript
// Get selected text with source info
getSelection() → { text, url, title, timestamp }

// Extract article content using selectors
extractArticle(selectorConfig) → { headline, body, date, author }

// Extract PDF text (when viewing PDF)
extractPdfText() → { text, pageCount, pageOffsets }

// Highlight quote on page (for verification)
highlightText(quote) → void
```

### 3. Background Script (background.js)

Responsibilities:
- Manage extension state
- Communicate with localhost API
- Handle context menu actions
- Sync data between tabs and sidebar

Key Functions:
```javascript
// API calls
saveQuote(quote) → Promise<Quote>
saveCase(caseData) → Promise<Case>
classifySentences(sentences) → Promise<Classification[]>

// State management
getCurrentCase() → Case
setCurrentCase(case) → void

// Auth
getAuthToken() → string
```

### 4. Sidebar Panel (sidepanel.html + React)

UI Components:
- **CaseHeader**: Current case name, status, quick actions
- **CaseForm**: All editable fields (name, date, facility, etc.)
- **QuoteList**: Extracted quotes with Accept/Reject/Delete
- **QuoteCard**: Individual quote with category, source, validation
- **SelectorConfig**: CSS selector management for sites
- **StatusBar**: Connection status, save state, shortcuts

---

## CSS Selector Configuration

### Default Selectors (built-in)

```javascript
const DEFAULT_SELECTORS = {
  // Major news sites
  "nytimes.com": {
    article: "article[data-testid='story-body'], section[name='articleBody']",
    headline: "h1[data-testid='headline']",
    date: "time[datetime]",
    author: "[data-testid='byline']"
  },
  "washingtonpost.com": {
    article: "article.paywall",
    headline: "h1[data-qa='headline']",
    date: "span.display-date",
    author: ".author-name"
  },
  "theguardian.com": {
    article: "div[data-gu-name='body']",
    headline: "h1",
    date: "time[datetime]",
    author: "a[rel='author']"
  },
  "reuters.com": {
    article: "article",
    headline: "h1[data-testid='Heading']",
    date: "time[datetime]",
    author: "[data-testid='AuthorName']"
  },
  "apnews.com": {
    article: "div.RichTextStoryBody",
    headline: "h1",
    date: "span.Timestamp",
    author: ".CardHeadline-By"
  },
  // ICE official site
  "ice.gov": {
    article: "article, .main-content",
    headline: "h1",
    date: ".date-display-single"
  },
  // Generic fallback
  "*": {
    article: "article, main, .article, .post, .content",
    headline: "h1",
    date: "time, .date, .published",
    author: ".author, .byline, [rel='author']"
  }
};
```

### Custom Selector UI

For unknown sites, users can:
1. Click "Configure Selectors" in sidebar
2. Enter CSS selector for each field
3. Test selector (highlights matches on page)
4. Save for this domain

```typescript
interface SiteSelector {
  domain: string;
  selectors: {
    article?: string;
    headline?: string;
    date?: string;
    author?: string;
    custom?: { name: string; selector: string }[];
  };
  createdAt: string;
  lastUsed: string;
}
```

---

## Data Flow

### Adding a Quote (Manual Selection)

```
1. User selects text on page
2. Right-click → "Add Quote to Case"
3. Content Script captures:
   - Selected text (exact)
   - Source URL
   - Page title
   - Selection coordinates (for re-highlighting)
4. Background Script:
   - Adds to current case quotes[]
   - Sends to sidebar
5. Sidebar shows quote in list
6. User clicks Accept/Reject
7. On Accept → saved to API
```

### Extracting Article (Auto)

```
1. User clicks "Extract Article" in sidebar
2. Sidebar → Background → Content Script
3. Content Script:
   - Gets domain from URL
   - Looks up CSS selectors
   - Queries DOM for article content
   - Splits into sentences
4. Background Script:
   - Sends sentences to /api/extract-quotes
   - Ollama classifies each sentence
   - Returns classifications
5. Sidebar displays:
   - Sentences grouped by category
   - Confidence scores
   - Accept/Reject buttons
6. User validates each relevant quote
```

---

## Sidebar UI Design

```
┌──────────────────────────────────────┐
│ ICE Deaths Research          [⚙️] [×] │
├──────────────────────────────────────┤
│ 📄 Current Case                      │
│ ┌──────────────────────────────────┐ │
│ │ Name: [________________] 🔍      │ │
│ │ DOD:  [____-__-__]               │ │
│ │ Age:  [___]                      │ │
│ │ Country: [________________]      │ │
│ │ Facility: [________________]     │ │
│ │ Location: [________________]     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 📝 Cause of Death                    │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ 💬 Extracted Quotes (5)    [Extract] │
├──────────────────────────────────────┤
│ ○ "The detainee was found..."       │
│   Timeline • March 7 • 95%          │
│   [✓] [✗] [📋] [p.2→]               │
├──────────────────────────────────────┤
│ ✓ "ICE confirmed the death..."      │
│   Official • March 8 • 92%          │
│   [Verified]                        │
├──────────────────────────────────────┤
│ ○ "Medical records show..."         │
│   Medical • No date • 88%           │
│   [✓] [✗] [📋] [p.5→]               │
├──────────────────────────────────────┤
│                                      │
│ 🔗 Sources (2)                       │
│ • reuters.com/article/...           │
│ • ice.gov/news/releases/...         │
│                                      │
├──────────────────────────────────────┤
│ [Save Case]  [New Case]  [Export]   │
└──────────────────────────────────────┘
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+S` | Open/close sidebar |
| `Alt+Q` | Add selection as quote |
| `Alt+E` | Extract article content |
| `↑` / `↓` | Navigate quotes |
| `A` | Accept current quote |
| `R` | Reject current quote |
| `Enter` | Jump to quote in page |

---

## API Endpoints Required

### Existing (may need modification)

- `POST /api/cases` - Create new case
- `PATCH /api/cases/:id` - Update case
- `POST /api/extract-quotes` - Classify sentences
- `POST /api/quotes` - Save verified quote
- `DELETE /api/quotes/:id` - Remove quote

### New Endpoints Needed

```typescript
// Save source URL for a case
POST /api/sources
{
  caseId: string,
  url: string,
  title: string,
  accessedAt: string,
  type: 'news' | 'official' | 'document' | 'other'
}

// Search existing cases (for linking)
GET /api/cases/search?q=name
→ { cases: Case[] }

// Batch save quotes
POST /api/quotes/batch
{
  caseId: string,
  quotes: Quote[]
}

// Extension config sync
GET /api/extension/config
POST /api/extension/config
{
  selectorOverrides: SiteSelector[],
  defaultCategory: string,
  autoExtract: boolean
}
```

---

## File Structure

```
extension/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── sidepanel.html
├── sidepanel.js           # React bundle
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── CaseForm.tsx
│   │   ├── QuoteList.tsx
│   │   ├── QuoteCard.tsx
│   │   ├── SelectorConfig.tsx
│   │   └── SourceList.tsx
│   ├── hooks/
│   │   ├── useCase.ts
│   │   ├── useQuotes.ts
│   │   └── useExtraction.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── selectors.ts
│   │   ├── pdf.ts
│   │   └── storage.ts
│   └── types.ts
├── selectors/
│   └── default.json
└── package.json
```

---

## Implementation Phases

### Phase 1: Core Extension (Week 1) ✅

- [x] Extension scaffold (manifest, background, content scripts)
- [x] Basic sidebar UI with case form
- [x] Manual text selection → add quote
- [x] Connect to localhost API
- [x] Save/load current case

### Phase 2: Article Extraction (Week 2) ✅

- [x] CSS selector engine
- [x] Default selectors for major news sites
- [x] Custom selector configuration UI
- [x] Article extraction with sentence splitting
- [x] Quote classification via Ollama

### Phase 3: PDF Support (Week 3) ✅

- [x] PDF.js integration for browser PDFs
- [x] Page number tracking
- [x] PDF text extraction
- [x] Same quote workflow as articles

### Phase 4: Polish & UX (Week 4) ✅

- [x] Keyboard shortcuts (Alt+Q, Alt+E, Alt+S, Alt+N)
- [x] Quote highlighting on page (with category colors)
- [x] Case search/linking from existing database
- [x] Source URL management
- [x] Export functionality (JSON, Markdown, Copy all)
- [x] Settings panel with API config

---

## Security Considerations

1. **API Access**: Only connects to localhost (no external servers)
2. **Auth**: Uses existing Descope session token if available
3. **Storage**: Local browser storage for selectors, sync storage for settings
4. **Permissions**: Minimal - only activeTab, not full history access

---

## Testing Strategy

1. **Manual Testing**:
   - Test on major news sites (NYT, Guardian, Reuters, AP)
   - Test on ICE.gov press releases
   - Test on various PDF viewers

2. **Test Cases**:
   - Article with standard HTML structure
   - Article behind paywall
   - PDF in browser viewer
   - PDF.js viewer
   - Multi-page document
   - Non-English content

3. **Edge Cases**:
   - JavaScript-rendered content
   - Paywalled articles
   - PDFs with scanned images (no text)
   - Articles with embedded social media

---

## Future Enhancements

- **OCR**: For scanned PDF documents
- **Translation**: Auto-translate foreign language sources
- **Bulk Import**: Process multiple URLs at once
- **Team Sync**: Share cases across researchers
- **Offline Mode**: Queue saves when API unavailable
- **Mobile Companion**: Simple mobile app for quick captures
