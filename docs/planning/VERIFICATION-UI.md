# PDF Viewer & Verification UI Specification

## Overview

The verification UI is where humans review AI-extracted data against the original source document. The key principle: **you should never have to leave this screen to verify a quote.**

---

## Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  ICE Deaths - Document Verification                           [← Back] [Save] [Next]│
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────┬────────────────────────────────────────┤
│  │                                         │  EXTRACTED TIMELINE                    │
│  │         PDF VIEWER                      │                                        │
│  │                                         │  ┌──────────────────────────────────┐  │
│  │  ┌─────────────────────────────────┐   │  │ ● March 7, 2024                   │  │
│  │  │                                 │   │  │   "At approximately 10:34 a.m..."│  │
│  │  │                                 │   │  │   [✓ Accept] [✗ Reject] [✎ Edit] │  │
│  │  │  [Page content with             │   │  └──────────────────────────────────┘  │
│  │  │   highlighted quotes]           │   │                                        │
│  │  │                                 │   │  ┌──────────────────────────────────┐  │
│  │  │                                 │   │  │ ○ March 8, 2024                   │  │
│  │  │  ████████████████████████████   │   │  │   "Medical staff documented..."  │  │
│  │  │  ████████████████████████████   │   │  │   [✓ Accept] [✗ Reject] [✎ Edit] │  │
│  │  │                                 │   │  └──────────────────────────────────┘  │
│  │  │                                 │   │                                        │
│  │  └─────────────────────────────────┘   │  ┌──────────────────────────────────┐  │
│  │                                         │  │ ○ March 10, 2024                  │  │
│  │  [◀ Prev] Page 3 of 12 [Next ▶]        │  │   "ICE reported that..."         │  │
│  │                                         │  │   [✓ Accept] [✗ Reject] [✎ Edit] │  │
│  │  Zoom: [−] 100% [+] | [🔍 Find]        │  └──────────────────────────────────┘  │
│  │                                         │                                        │
│  └─────────────────────────────────────────┴────────────────────────────────────────┤
│                                                                                      │
│  Progress: 3/8 events verified  │  Confidence: 87% avg  │  Time spent: 4m 32s       │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## PDF Viewer Requirements

### Core Functionality
1. **Render PDF pages** - Use pdf.js for in-browser rendering
2. **Text layer** - Selectable text overlaid on rendered page
3. **Highlight layer** - Colored overlays on quoted text
4. **Navigation** - Page up/down, jump to page, thumbnail sidebar

### Highlighting System
```typescript
interface HighlightRegion {
  quoteId: string;
  page: number;
  
  // Bounding boxes (multiple for multi-line quotes)
  boundingBoxes: Array<{
    x: number;      // Percentage from left
    y: number;      // Percentage from top
    width: number;  // Percentage of page width
    height: number; // Percentage of page height
  }>;
  
  // Visual state
  color: 'yellow' | 'green' | 'red' | 'blue';
  opacity: number;
  isActive: boolean;
}

// Color meanings:
// yellow = pending verification
// green = verified/accepted
// red = rejected
// blue = currently selected
```

### Jump-to-Quote Feature
When user clicks a quote in the timeline:
1. Scroll PDF to the page containing the quote
2. Scroll within page to center the quote
3. Flash highlight briefly to draw attention
4. Set quote highlight to "active" state (blue)

```typescript
function jumpToQuote(quoteId: string) {
  const quote = quotes.find(q => q.id === quoteId);
  if (!quote) return;
  
  // Navigate to page
  pdfViewer.setCurrentPage(quote.page);
  
  // Wait for render, then scroll to highlight
  await pdfViewer.pageRendered(quote.page);
  
  const highlight = highlightLayer.getHighlight(quoteId);
  highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Flash effect
  highlight.flash();
}
```

---

## Timeline Panel

### Quote Card Component
```
┌─────────────────────────────────────────────────────────────┐
│ ● March 7, 2024  [TIMELINE_EVENT]            Confidence: 92%│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "At approximately 10:34 a.m., DANIEL complained of chest   │
│   pain. He was seen by a nurse who documented 'patient      │
│   appears pale and diaphoretic.'"                           │
│                                                              │
│  Page 3, chars 4523-4687                                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [✓ Accept]    [✗ Reject]    [✎ Edit]    [🔍 Jump to]      │
└─────────────────────────────────────────────────────────────┘
```

### Card States
- **Pending** (●) - Yellow dot, needs review
- **Verified** (✓) - Green dot, accepted
- **Rejected** (✗) - Red dot, will not be used
- **Edited** (✎) - Blue dot, modified by human

### Actions

#### Accept
- Mark quote as verified
- Update highlight to green
- Increment progress counter
- Move to next pending quote

#### Reject
- Show rejection reason dropdown:
  - "Not a real event"
  - "Wrong date"
  - "Incomplete quote"
  - "Duplicate of another quote"
  - "Other" (with text field)
- Update highlight to red
- Log rejection reason for learning

#### Edit
Opens inline editor:
```
┌─────────────────────────────────────────────────────────────┐
│ Editing Quote                                   [Cancel] [Save]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Date: [March 7, 2024    ▼]                                 │
│                                                              │
│  Quote: (select text in PDF to update)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ At approximately 10:34 a.m., DANIEL complained of     │  │
│  │ chest pain. He was seen by a nurse who documented     │  │
│  │ 'patient appears pale and diaphoretic.'               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Category: [TIMELINE_EVENT ▼]                               │
│                                                              │
│  Edit reason: [Expanded quote to include full context    ]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Jump to
- Click anywhere on the quote card → jump to that location in PDF
- Keyboard shortcut: Enter when quote is focused

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move between quotes |
| `Enter` | Jump to selected quote in PDF |
| `A` | Accept current quote |
| `R` | Reject current quote |
| `E` | Edit current quote |
| `N` | Next page in PDF |
| `P` | Previous page in PDF |
| `Ctrl+S` | Save all changes |
| `Escape` | Cancel current action |

---

## Text Selection for New Quotes

Allow human to add quotes the AI missed:

1. User selects text in PDF
2. Selection button appears: "Add as Quote"
3. Opens new quote form:
   - Date picker
   - Category dropdown
   - Confirm button

```typescript
function handleTextSelection(selection: Selection) {
  const text = selection.toString();
  if (text.length < 20) return; // Too short
  
  // Get character offsets
  const range = selection.getRangeAt(0);
  const offsets = textLayer.getCharOffsets(range);
  
  // Show "Add Quote" button near selection
  showAddQuoteButton({
    text,
    charStart: offsets.start,
    charEnd: offsets.end,
    page: currentPage
  });
}
```

---

## Progress & Stats

### Session Stats
- Quotes verified this session
- Average time per quote
- Rejection rate
- Edit rate

### Document Stats
- Total quotes extracted
- Verified vs pending
- Unique dates found
- Document confidence score

### Global Stats (Admin)
- Documents processed today
- Quotes verified today
- Average confidence by category
- Top rejection reasons

---

## Mobile Considerations

On mobile/tablet:
- Stack layout (PDF above, timeline below)
- Swipe gestures for accept/reject
- Pinch to zoom on PDF
- Tap quote to jump

---

## Technology Stack

### PDF Rendering
```javascript
// Using pdf.js
import * as pdfjsLib from 'pdfjs-dist';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Load and render
const pdf = await pdfjsLib.getDocument(url).promise;
const page = await pdf.getPage(pageNumber);
const viewport = page.getViewport({ scale: 1.5 });

const canvas = document.getElementById('pdf-canvas');
const context = canvas.getContext('2d');
canvas.height = viewport.height;
canvas.width = viewport.width;

await page.render({
  canvasContext: context,
  viewport: viewport
}).promise;
```

### Text Layer
```javascript
// Get text content with positions
const textContent = await page.getTextContent();

// textContent.items contains:
// - str: the text
// - transform: position matrix
// - width, height: dimensions

// Render text layer for selection
pdfjsLib.renderTextLayer({
  textContent: textContent,
  container: textLayerDiv,
  viewport: viewport,
  textDivs: []
});
```

### Highlight Layer
```javascript
// Create SVG overlay for highlights
function createHighlight(quote: Quote, viewport: Viewport) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  
  // Convert text position to viewport coordinates
  const [x, y] = viewport.convertToViewportPoint(
    quote.bbox.x,
    quote.bbox.y
  );
  
  svg.setAttribute('x', x);
  svg.setAttribute('y', y);
  svg.setAttribute('width', quote.bbox.width * viewport.scale);
  svg.setAttribute('height', quote.bbox.height * viewport.scale);
  svg.setAttribute('fill', getColorForStatus(quote.status));
  svg.setAttribute('opacity', '0.3');
  
  return svg;
}
```

---

## Component Structure

```
components/
  verification/
    VerificationPage.tsx       # Main page container
    PDFViewer/
      PDFViewer.tsx            # Main PDF component
      PageRenderer.tsx         # Single page canvas
      TextLayer.tsx            # Selectable text overlay
      HighlightLayer.tsx       # Quote highlights
      Thumbnail.tsx            # Page thumbnail
      Controls.tsx             # Zoom, page nav
    Timeline/
      TimelinePanel.tsx        # Right panel container
      QuoteCard.tsx            # Individual quote display
      QuoteEditor.tsx          # Edit mode for quote
      AddQuoteForm.tsx         # Form for new quotes
    Stats/
      ProgressBar.tsx          # Session progress
      SessionStats.tsx         # Current session metrics
```

---

## API Endpoints

### Load Document for Verification
```
GET /api/verify/document/:documentId

Response:
{
  document: {
    id: string,
    filename: string,
    pdfUrl: string,
    pageCount: number,
    processedAt: string
  },
  quotes: Quote[],
  pageOffsets: PageOffset[]
}
```

### Update Quote Status
```
PATCH /api/verify/quote/:quoteId

Body:
{
  status: 'verified' | 'rejected' | 'edited',
  rejectionReason?: string,
  edits?: {
    text: string,
    date: string,
    category: string,
    charStart: number,
    charEnd: number
  }
}
```

### Add New Quote
```
POST /api/verify/quote

Body:
{
  documentId: string,
  text: string,
  charStart: number,
  charEnd: number,
  page: number,
  date: string,
  category: string
}
```

### Save Session
```
POST /api/verify/session/save

Body:
{
  documentId: string,
  quotes: QuoteUpdate[],
  sessionDuration: number
}
```
