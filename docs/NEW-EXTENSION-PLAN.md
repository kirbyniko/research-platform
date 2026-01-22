# New Generalized Extension Plan

## Executive Summary

Create a **completely new, fully generalized Chrome extension** for the Research Platform. The extension will:

1. Work with **any project** and **any record type** defined in the platform
2. Support **dynamic forms** based on field definitions from the API
3. Allow **right-click context menus** to add selected text to any field
4. Provide a **generalizable AI analysis framework** that projects can customize
5. Support the full **review and validation workflow**
6. Include **duplicate checking**, **quotes**, and **sources** management

---

## Part 1: Architecture Overview

### File Structure (New Extension)

```
extension-v2/
├── manifest.json          # Chrome MV3 manifest
├── background.js          # Service worker - context menus, messaging
├── sidepanel.html         # Main UI (single page)
├── sidepanel.js           # Main UI logic
├── sidepanel.css          # All styles (separate for maintainability)
├── content.js             # Page extraction, text selection
├── lib/
│   ├── api.js             # All API calls to platform
│   ├── storage.js         # Chrome storage management
│   ├── forms.js           # Dynamic form generation
│   ├── quotes.js          # Quote management
│   ├── sources.js         # Source management
│   ├── ai-analysis.js     # AI analysis framework
│   └── utils.js           # Shared utilities
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Core Design Principles

1. **Zero hardcoded forms** - All forms generated from API field definitions
2. **Project-agnostic** - Works with any project the user has access to
3. **Configuration-driven AI** - AI prompts and patterns stored per-project
4. **Modular code** - Separate concerns into logical modules
5. **Clean state management** - Clear data flow, no global mutation soup

---

## Part 2: API Integration Layer (`lib/api.js`)

### API Client Class

```javascript
class ResearchPlatformAPI {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  // Authentication
  async validateConnection() { ... }
  async getCurrentUser() { ... }
  
  // Projects
  async getProjects() { ... }
  async getProject(slug) { ... }
  
  // Record Types
  async getRecordTypes(projectSlug) { ... }
  async getRecordType(projectSlug, typeSlug) { ... }
  
  // Fields
  async getFields(projectSlug, typeSlug) { ... }
  
  // Records
  async getRecords(projectSlug, options) { ... }
  async getRecord(projectSlug, recordId) { ... }
  async createRecord(projectSlug, data) { ... }
  async updateRecord(projectSlug, recordId, data) { ... }
  async verifyField(projectSlug, recordId, fieldKey) { ... }
  
  // Quotes
  async getQuotes(projectSlug, recordId) { ... }
  async addQuote(projectSlug, recordId, quote) { ... }
  
  // Sources
  async getSources(projectSlug, recordId) { ... }
  async addSource(projectSlug, recordId, source) { ... }
  
  // Duplicate Check
  async checkDuplicates(projectSlug, typeSlug, searchText) { ... }
  
  // Storage (for media)
  async getStorageInfo(projectSlug) { ... }
  async requestUpload(projectSlug, fileInfo) { ... }
}
```

### Endpoints Used

| Feature | Endpoint | Method |
|---------|----------|--------|
| List projects | `/api/projects` | GET |
| Project details | `/api/projects/{slug}` | GET |
| Record types | `/api/projects/{slug}/record-types` | GET |
| Type details | `/api/projects/{slug}/record-types/{type}` | GET |
| List records | `/api/projects/{slug}/records` | GET |
| Create record | `/api/projects/{slug}/records` | POST |
| Get record | `/api/projects/{slug}/records/{id}` | GET |
| Update record | `/api/projects/{slug}/records/{id}` | PATCH |
| Verify field | `/api/projects/{slug}/records/{id}/verify-field` | POST |
| Record quotes | `/api/projects/{slug}/records/{id}/quotes` | GET/POST |
| Record sources | `/api/projects/{slug}/records/{id}/sources` | GET/POST |
| Storage info | `/api/projects/{slug}/storage` | GET |
| File upload | `/api/projects/{slug}/files` | POST |
| Duplicate check | `/api/duplicate-check?project={slug}&type={type}&q={query}` | GET |

---

## Part 3: State Management (`lib/storage.js`)

### Application State

```javascript
const AppState = {
  // Connection
  apiUrl: '',
  apiKey: '',
  isConnected: false,
  user: null,
  
  // Project Context
  currentProject: null,        // { slug, name, ... }
  currentRecordType: null,     // { slug, name, fields, groups }
  
  // Current Work
  currentRecord: null,         // Record being created/edited
  isEditMode: false,           // Creating new vs editing existing
  isReviewMode: false,         // Reviewing submitted record
  
  // Quotes & Sources (local before save)
  pendingQuotes: [],           // Quotes not yet saved to server
  pendingSources: [],          // Sources not yet saved
  fieldQuoteLinks: {},         // { fieldSlug: [quoteId, ...] }
  
  // Review Queue
  reviewQueue: [],
  reviewFilter: 'pending_review',
  
  // UI State
  activeTab: 'record',
  extractedSentences: [],
  
  // AI Analysis Config (per-project)
  aiConfig: null
};
```

### Chrome Storage Schema

```javascript
// chrome.storage.local
{
  // Settings (persistent)
  "settings": {
    "apiUrl": "https://...",
    "apiKey": "ice_...",
    "defaultProject": "project-a",
    "theme": "light"
  },
  
  // Cached data (refresh on load)
  "cache": {
    "projects": [...],
    "lastProjectSlug": "...",
    "lastRecordTypeSlug": "..."
  },
  
  // Draft work (persist across sessions)
  "draft": {
    "projectSlug": "...",
    "recordTypeSlug": "...",
    "formData": {...},
    "quotes": [...],
    "sources": [...]
  }
}
```

---

## Part 4: Dynamic Form System (`lib/forms.js`)

### Form Generator

```javascript
class DynamicFormGenerator {
  constructor(container) {
    this.container = container;
    this.fields = [];
    this.groups = [];
    this.values = {};
    this.verifiedFields = {};
  }
  
  // Load field definitions
  setSchema(fields, groups) {
    this.fields = fields;
    this.groups = groups;
    this.render();
  }
  
  // Render the entire form
  render() {
    this.container.innerHTML = '';
    
    // Group fields by group_id
    const groupedFields = this.groupFields();
    
    for (const group of this.groups) {
      const section = this.renderGroup(group, groupedFields[group.id] || []);
      this.container.appendChild(section);
    }
    
    // Ungrouped fields
    if (groupedFields[null]?.length > 0) {
      const section = this.renderGroup(
        { name: 'Other Fields', slug: 'other' },
        groupedFields[null]
      );
      this.container.appendChild(section);
    }
  }
  
  // Render a single field based on type
  renderField(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    wrapper.dataset.fieldSlug = field.slug;
    
    // Field types supported:
    switch (field.field_type) {
      case 'text': return this.renderTextField(field, wrapper);
      case 'textarea': return this.renderTextareaField(field, wrapper);
      case 'number': return this.renderNumberField(field, wrapper);
      case 'date': return this.renderDateField(field, wrapper);
      case 'boolean': return this.renderBooleanField(field, wrapper);
      case 'select': return this.renderSelectField(field, wrapper);
      case 'multi_select': return this.renderMultiSelectField(field, wrapper);
      case 'url': return this.renderUrlField(field, wrapper);
      case 'media': return this.renderMediaField(field, wrapper);
      // ... all other types
    }
  }
  
  // Quote linking UI for each field
  renderQuoteLinkButton(field, wrapper) {
    if (!field.requires_quote) return;
    
    const linkBtn = document.createElement('button');
    linkBtn.className = 'quote-link-btn';
    linkBtn.innerHTML = '🔗 Link Quote';
    linkBtn.onclick = () => this.openQuotePicker(field.slug);
    wrapper.appendChild(linkBtn);
  }
  
  // Get all form values
  getValues() { ... }
  
  // Set values (for edit mode)
  setValues(data) { ... }
  
  // Validation
  validate() { ... }
}
```

### Field Type Renderers

Each field type has a dedicated renderer that:
1. Creates the appropriate input element
2. Applies field configuration (min/max, options, etc.)
3. Handles conditional visibility (`show_when` config)
4. Adds quote link button if `requires_quote: true`
5. Shows verification badge if `show_in_review_form`

---

## Part 5: Context Menu System (`background.js`)

### Dynamic Menu Building

```javascript
// When record type changes, rebuild menus
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_CONTEXT_MENUS') {
    buildContextMenus(message.fields, message.groups);
  }
});

function buildContextMenus(fields, groups) {
  // Remove all existing menus
  chrome.contextMenus.removeAll(() => {
    // Create root menu
    chrome.contextMenus.create({
      id: 'research-platform-root',
      title: '📋 Add to Field',
      contexts: ['selection']
    });
    
    // Group fields by their group
    const groupedFields = groupFieldsByGroup(fields, groups);
    
    // Create menu items for each group
    for (const group of groups) {
      const groupFields = groupedFields[group.id] || [];
      if (groupFields.length === 0) continue;
      
      // Group submenu
      chrome.contextMenus.create({
        id: `group-${group.slug}`,
        parentId: 'research-platform-root',
        title: group.name,
        contexts: ['selection']
      });
      
      // Fields in group
      for (const field of groupFields) {
        chrome.contextMenus.create({
          id: `field-${field.slug}`,
          parentId: `group-${group.slug}`,
          title: field.name,
          contexts: ['selection']
        });
      }
    }
    
    // Add "As Quote" option
    chrome.contextMenus.create({
      id: 'add-as-quote',
      parentId: 'research-platform-root',
      title: '💬 Add as Quote',
      contexts: ['selection']
    });
  });
}

// Handle menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith('field-')) {
    const fieldSlug = info.menuItemId.replace('field-', '');
    // Send to sidepanel
    chrome.runtime.sendMessage({
      type: 'SET_FIELD_VALUE',
      fieldSlug: fieldSlug,
      value: info.selectionText,
      sourceUrl: tab.url,
      sourceTitle: tab.title
    });
  } else if (info.menuItemId === 'add-as-quote') {
    chrome.runtime.sendMessage({
      type: 'ADD_QUOTE',
      text: info.selectionText,
      sourceUrl: tab.url,
      sourceTitle: tab.title
    });
  }
});
```

---

## Part 6: Quote & Source Management

### Quote Management (`lib/quotes.js`)

```javascript
class QuoteManager {
  constructor() {
    this.quotes = [];        // All quotes for current record
    this.fieldLinks = {};    // { fieldSlug: [quoteIds] }
  }
  
  // Add a new quote
  addQuote(quote) {
    const newQuote = {
      id: crypto.randomUUID(),
      text: quote.text,
      source: quote.source || '',
      sourceUrl: quote.sourceUrl || '',
      sourceDate: quote.sourceDate || '',
      linkedFields: quote.linkedFields || [],
      addedAt: new Date().toISOString(),
      status: 'pending'  // pending, verified, rejected
    };
    this.quotes.push(newQuote);
    return newQuote;
  }
  
  // Link quote to field
  linkToField(quoteId, fieldSlug) {
    if (!this.fieldLinks[fieldSlug]) {
      this.fieldLinks[fieldSlug] = [];
    }
    if (!this.fieldLinks[fieldSlug].includes(quoteId)) {
      this.fieldLinks[fieldSlug].push(quoteId);
    }
  }
  
  // Get quotes for a field
  getQuotesForField(fieldSlug) {
    const quoteIds = this.fieldLinks[fieldSlug] || [];
    return this.quotes.filter(q => quoteIds.includes(q.id));
  }
  
  // Verify a quote
  verifyQuote(quoteId) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (quote) quote.status = 'verified';
  }
  
  // Get all quotes formatted for API
  toAPIFormat() {
    return this.quotes.map(q => ({
      quote_text: q.text,
      source: q.source,
      source_url: q.sourceUrl,
      source_date: q.sourceDate,
      linked_fields: this.getLinkedFields(q.id)
    }));
  }
  
  getLinkedFields(quoteId) {
    const fields = [];
    for (const [field, ids] of Object.entries(this.fieldLinks)) {
      if (ids.includes(quoteId)) fields.push(field);
    }
    return fields;
  }
}
```

### Source Management (`lib/sources.js`)

```javascript
class SourceManager {
  constructor() {
    this.sources = [];
  }
  
  addSource(source) {
    // Prevent duplicates by URL
    if (this.sources.find(s => s.url === source.url)) {
      return null;
    }
    
    const newSource = {
      id: crypto.randomUUID(),
      url: source.url,
      title: source.title || '',
      sourceType: source.sourceType || 'article',
      accessedDate: source.accessedDate || new Date().toISOString().split('T')[0],
      archivedUrl: source.archivedUrl || '',
      notes: source.notes || '',
      linkedFields: source.linkedFields || []
    };
    this.sources.push(newSource);
    return newSource;
  }
  
  // Add current page as source
  addCurrentPage(tab, extractedData = {}) {
    return this.addSource({
      url: tab.url,
      title: extractedData.headline || tab.title,
      sourceType: this.detectSourceType(tab.url)
    });
  }
  
  detectSourceType(url) {
    if (url.includes('.gov')) return 'government';
    if (url.includes('court') || url.includes('law')) return 'legal';
    if (url.includes('twitter') || url.includes('x.com')) return 'social_media';
    return 'news';
  }
  
  toAPIFormat() {
    return this.sources.map(s => ({
      url: s.url,
      title: s.title,
      source_type: s.sourceType,
      accessed_date: s.accessedDate,
      archived_url: s.archivedUrl,
      notes: s.notes,
      linked_fields: s.linkedFields
    }));
  }
}
```

---

## Part 7: Page Extraction (`content.js`)

### Content Script

```javascript
// Domain-specific selectors
const SITE_SELECTORS = {
  'nytimes.com': {
    article: 'article[data-testid="story-body"]',
    headline: 'h1[data-testid="headline"]',
    date: 'time[datetime]',
    author: '[data-testid="byline"]'
  },
  'washingtonpost.com': { ... },
  'theguardian.com': { ... },
  '*': {
    article: 'article, main, [role="main"], .content',
    headline: 'h1',
    date: 'time[datetime], .date, .published',
    author: '.author, .byline, [rel="author"]'
  }
};

// Extract article content
function extractPage() {
  const domain = getDomain(window.location.hostname);
  const selectors = SITE_SELECTORS[domain] || SITE_SELECTORS['*'];
  
  const headline = extractText(selectors.headline);
  const date = extractDate(selectors.date);
  const author = extractText(selectors.author);
  const body = extractBody(selectors.article);
  const sentences = splitIntoSentences(body);
  
  return {
    url: window.location.href,
    title: document.title,
    headline,
    date,
    author,
    body,
    sentences,
    extractedAt: new Date().toISOString()
  };
}

// Split text into sentences
function splitIntoSentences(text) {
  // Smart sentence splitting that handles abbreviations
  return text
    .replace(/([.!?])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_PAGE') {
    const data = extractPage();
    sendResponse(data);
  }
  return true;
});
```

---

## Part 8: AI Analysis Framework (`lib/ai-analysis.js`)

### Generalizable AI Analysis System

The key insight is that the current system has **hardcoded constitutional amendment patterns**. We need to make this **project-configurable** while keeping the same powerful pattern-matching approach.

### AI Configuration Schema (stored per-project)

```javascript
// Project settings -> ai_analysis_config (JSONB)
{
  "enabled": true,
  "name": "Constitutional Violations Analysis",
  "description": "Analyzes quotes for potential constitutional rights violations",
  
  // Categories to detect
  "categories": [
    {
      "id": "fourth_amendment",
      "name": "4th Amendment - Unreasonable Seizure / Excessive Force",
      "description": "Protects against unreasonable searches and seizures",
      
      // Legal reference (if applicable)
      "legalReference": {
        "text": "The right of the people to be secure...",
        "source": "https://constitution.congress.gov/constitution/amendment-4/",
        "keyCases": [
          {
            "name": "Graham v. Connor (1989)",
            "citation": "490 U.S. 386",
            "holding": "The reasonableness of a particular use of force...",
            "url": "https://www.law.cornell.edu/supremecourt/text/490/386"
          }
        ]
      },
      
      // Detection patterns
      "patterns": [
        { "regex": "pepper\\s*(ball|spray|gas)", "indicator": "Pepper spray/balls used", "weight": 2 },
        { "regex": "rubber\\s*bullet", "indicator": "Rubber bullets used", "weight": 2 },
        { "regex": "tear\\s*gas", "indicator": "Tear gas used", "weight": 2 },
        { "regex": "taser|tased|stun\\s*gun", "indicator": "Taser/stun gun used", "weight": 2 },
        { "regex": "excessive\\s*force", "indicator": "Excessive force allegation", "weight": 3 },
        { "regex": "unarmed", "indicator": "Victim was unarmed", "weight": 2 }
      ],
      
      // Threshold for strength classification
      "thresholds": {
        "possible": 2,
        "moderate": 4,
        "strong": 6
      }
    },
    // ... more categories
  ],
  
  // LLM prompts (for local AI if available)
  "llmPrompts": {
    "classify": "Classify this sentence from a news article about {project_context}...",
    "summarize": "Summarize the key findings regarding {category_name}..."
  }
}
```

### AI Analysis Class

```javascript
class AIAnalysisEngine {
  constructor() {
    this.config = null;
    this.llmInstance = null;
  }
  
  // Load project-specific AI configuration
  async loadConfig(projectSlug) {
    const response = await api.getProject(projectSlug);
    this.config = response.project.settings?.ai_analysis_config || null;
    
    if (!this.config) {
      console.log('No AI analysis config for project:', projectSlug);
    }
  }
  
  // Pattern-based analysis (works without LLM)
  analyzePatterns(quotes, formData = {}) {
    if (!this.config?.categories) return [];
    
    const allText = quotes.map(q => q.text).join(' ') + ' ' + (formData.summary || '');
    const findings = [];
    
    for (const category of this.config.categories) {
      const matchedIndicators = [];
      const matchingQuotes = [];
      let totalWeight = 0;
      
      for (const pattern of category.patterns) {
        const regex = new RegExp(pattern.regex, 'i');
        if (regex.test(allText)) {
          matchedIndicators.push(pattern.indicator);
          totalWeight += pattern.weight;
          
          // Find matching quotes
          quotes.forEach(q => {
            if (regex.test(q.text) && !matchingQuotes.find(mq => mq.id === q.id)) {
              matchingQuotes.push(q);
            }
          });
        }
      }
      
      if (matchedIndicators.length > 0) {
        const thresholds = category.thresholds || { possible: 2, moderate: 4, strong: 6 };
        let strength = 'possible';
        if (totalWeight >= thresholds.strong) strength = 'strong';
        else if (totalWeight >= thresholds.moderate) strength = 'moderate';
        
        findings.push({
          categoryId: category.id,
          categoryName: category.name,
          indicators: matchedIndicators,
          quotes: matchingQuotes,
          legalReference: category.legalReference,
          strength,
          weight: totalWeight
        });
      }
    }
    
    return findings;
  }
  
  // LLM-enhanced analysis (optional, if LLM loaded)
  async analyzeLLM(quotes, prompt) {
    if (!this.llmInstance) {
      throw new Error('LLM not loaded');
    }
    // Use WebLLM for deeper analysis
    // ...
  }
  
  // Generate report
  generateReport(findings) {
    // Build HTML report from findings
    // ...
  }
}
```

### Default AI Configs

We'll provide **default templates** that projects can clone and customize:

1. **Constitutional Rights Analysis** (current ICE Deaths config)
2. **Police Misconduct Analysis** 
3. **Corporate Fraud Analysis**
4. **Environmental Violations Analysis**
5. **Blank Template** (for custom projects)

---

## Part 9: Review & Validation Workflow

### Review Queue Tab

```javascript
async function loadReviewQueue() {
  const { currentProject, reviewFilter } = AppState;
  if (!currentProject) return;
  
  // Map filter to status
  const statusMap = {
    'pending': 'pending_review',
    'validation': 'pending_validation',
    'published': 'published',
    'rejected': 'rejected',
    'all': ''
  };
  
  const records = await api.getRecords(currentProject.slug, {
    status: statusMap[reviewFilter],
    type: AppState.currentRecordType?.slug,
    limit: 50
  });
  
  renderReviewQueue(records);
}

function renderReviewQueue(records) {
  const listEl = document.getElementById('review-queue-list');
  listEl.innerHTML = '';
  
  for (const record of records) {
    const card = document.createElement('div');
    card.className = `review-card status-${record.status}`;
    card.innerHTML = `
      <div class="review-card-header">
        <span class="record-name">${getRecordDisplayName(record)}</span>
        <span class="status-badge">${formatStatus(record.status)}</span>
      </div>
      <div class="review-card-meta">
        ${record.record_type_name} • ${formatDate(record.created_at)}
      </div>
    `;
    card.onclick = () => openRecordForReview(record.id);
    listEl.appendChild(card);
  }
}
```

### Review Mode

When reviewing a record:
1. Load record with all fields, quotes, sources
2. Show form in **review mode** (read-only with verify toggles)
3. Show existing quotes with ability to verify each
4. Allow adding new quotes/sources
5. Field verification checkboxes
6. Status transition buttons (approve, reject, request changes)

---

## Part 10: UI Structure (`sidepanel.html`)

### Tab Structure

```html
<div class="container">
  <!-- Header -->
  <header class="header">
    <h1>Research Platform</h1>
  </header>
  
  <!-- Project Selector -->
  <div class="project-bar">
    <select id="project-select"></select>
    <select id="record-type-select"></select>
  </div>
  
  <!-- Status Bar -->
  <div class="status-bar">
    <span class="connection-status"></span>
    <span class="user-info"></span>
  </div>
  
  <!-- Tabs -->
  <nav class="tabs">
    <button class="tab active" data-tab="record">📝 Record</button>
    <button class="tab" data-tab="quotes">💬 Quotes</button>
    <button class="tab" data-tab="sources">📚 Sources</button>
    <button class="tab" data-tab="review">📋 Review</button>
    <button class="tab" data-tab="analysis">🤖 Analysis</button>
    <button class="tab" data-tab="settings">⚙️ Settings</button>
  </nav>
  
  <!-- Tab Content -->
  <main class="tab-content">
    <!-- Record Tab -->
    <section id="tab-record" class="tab-panel active">
      <div class="toolbar">
        <button id="extract-page-btn">📰 Extract Page</button>
        <button id="duplicate-check-btn">🔍 Check Duplicates</button>
        <button id="save-btn">💾 Save</button>
      </div>
      <div id="dynamic-form-container"></div>
    </section>
    
    <!-- Quotes Tab -->
    <section id="tab-quotes" class="tab-panel">
      <div class="toolbar">
        <button id="add-quote-btn">+ Add Quote</button>
      </div>
      <div id="quotes-list"></div>
    </section>
    
    <!-- Sources Tab -->
    <section id="tab-sources" class="tab-panel">
      <div class="toolbar">
        <button id="add-current-source-btn">+ Current Page</button>
        <button id="add-source-btn">+ Manual</button>
      </div>
      <div id="sources-list"></div>
    </section>
    
    <!-- Review Tab -->
    <section id="tab-review" class="tab-panel">
      <div class="filter-bar">
        <button class="filter-btn active" data-filter="pending">Pending</button>
        <button class="filter-btn" data-filter="validation">Validation</button>
        <button class="filter-btn" data-filter="published">Published</button>
      </div>
      <div id="review-queue-list"></div>
    </section>
    
    <!-- Analysis Tab -->
    <section id="tab-analysis" class="tab-panel">
      <div class="analysis-controls">
        <button id="run-analysis-btn">▶️ Run Analysis</button>
        <button id="load-ai-btn">🤖 Load Local AI</button>
      </div>
      <div id="analysis-results"></div>
    </section>
    
    <!-- Settings Tab -->
    <section id="tab-settings" class="tab-panel">
      <div class="form-group">
        <label>API URL</label>
        <input type="text" id="api-url-input">
      </div>
      <div class="form-group">
        <label>API Key</label>
        <input type="password" id="api-key-input">
      </div>
      <button id="connect-btn">Connect</button>
      <button id="disconnect-btn">Disconnect</button>
    </section>
  </main>
</div>
```

---

## Part 11: Implementation Order

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Create manifest.json with correct permissions
2. ✅ Set up lib/api.js with all endpoints
3. ✅ Set up lib/storage.js for state management
4. ✅ Create basic sidepanel.html structure
5. ✅ Implement Settings tab (connect/disconnect)

### Phase 2: Project & Forms (Week 1-2)
6. ✅ Project selector with API integration
7. ✅ Record type selector
8. ✅ Dynamic form generator (lib/forms.js)
9. ✅ All field type renderers
10. ✅ Form validation

### Phase 3: Quotes & Sources (Week 2)
11. ✅ Quote management (lib/quotes.js)
12. ✅ Source management (lib/sources.js)
13. ✅ Quote linking to fields
14. ✅ Context menu system (background.js)
15. ✅ Page extraction (content.js)

### Phase 4: Save & Review (Week 2-3)
16. ✅ Duplicate checker integration
17. ✅ Save record workflow
18. ✅ Review queue loading
19. ✅ Review mode UI
20. ✅ Field verification

### Phase 5: AI Analysis (Week 3)
21. ✅ AI configuration schema
22. ✅ Pattern-based analysis
23. ✅ Analysis results display
24. ✅ WebLLM integration (optional)
25. ✅ Default analysis templates

### Phase 6: Polish (Week 3-4)
26. ✅ Error handling throughout
27. ✅ Loading states
28. ✅ Toast notifications
29. ✅ Keyboard shortcuts
30. ✅ Testing & bug fixes

---

## Part 12: Migration from Old Extension

### What to Keep
- CSS styles (with cleanup)
- Site-specific selectors
- LEGAL_REFERENCES database (make it loadable config)
- WebLLM bundle

### What to Replace
- All hardcoded forms → Dynamic form generator
- Hardcoded field names → API-driven fields
- Legacy API calls → New API client
- Global state soup → Clean state management
- Hardcoded AI patterns → Configurable categories

### Data Migration
- Export user's saved settings
- Convert any local drafts
- Clear old storage on first run of v2

---

## Appendix A: Platform API Details

### Record Status Values
- `pending_review` - Newly submitted, awaiting first review
- `pending_validation` - Reviewed, awaiting validation
- `published` - Fully approved and public
- `rejected` - Denied
- `archived` - Hidden from public

### Field Types
- `text`, `textarea`, `rich_text`
- `number`, `date`, `datetime`
- `boolean`, `tri_state`
- `select`, `multi_select`, `radio`, `checkbox_group`
- `url`, `email`
- `location`, `person`
- `file`, `media`
- `record_link`, `user_link`
- `violations`, `incident_types` (custom)
- `custom_fields`

### Permissions Required
- `view` - Read records
- `review` - Change status pending→validation
- `validate` - Change status validation→published
- `manage_records` - Create/edit records
- `analyze` - Use AI analysis

---

## Appendix B: AI Analysis Default Template

### Constitutional Rights Analysis (Default)

```json
{
  "id": "constitutional-rights",
  "name": "Constitutional Rights Analysis",
  "description": "Analyzes documentation for potential constitutional rights violations based on established case law",
  "categories": [
    {
      "id": "fourth_amendment",
      "name": "4th Amendment - Unreasonable Seizure / Excessive Force",
      "patterns": [
        { "regex": "pepper\\s*(ball|spray|gas)", "indicator": "Pepper spray/balls used", "weight": 2 },
        { "regex": "rubber\\s*bullet", "indicator": "Rubber bullets used", "weight": 2 },
        { "regex": "tear\\s*gas", "indicator": "Tear gas used", "weight": 2 },
        { "regex": "taser|tased|stun\\s*gun", "indicator": "Taser/stun gun used", "weight": 2 },
        { "regex": "excessive\\s*force", "indicator": "Excessive force allegation", "weight": 3 },
        { "regex": "deadly\\s*force", "indicator": "Deadly force referenced", "weight": 3 },
        { "regex": "unarmed", "indicator": "Victim was unarmed", "weight": 2 },
        { "regex": "no\\s*(immediate\\s*)?threat", "indicator": "No threat present", "weight": 2 }
      ],
      "legalReference": {
        "text": "The right of the people to be secure in their persons...",
        "keyCases": [
          {
            "name": "Graham v. Connor (1989)",
            "citation": "490 U.S. 386",
            "holding": "The reasonableness of a particular use of force must be judged from the perspective of a reasonable officer on the scene..."
          }
        ]
      },
      "thresholds": { "possible": 2, "moderate": 4, "strong": 6 }
    }
    // ... more categories (1st, 5th, 6th, 8th, 14th amendments)
  ]
}
```

---

## Summary

This plan creates a **clean, maintainable, fully generalized extension** that:

1. **Works with any project** - No hardcoded project references
2. **Generates forms dynamically** - No hardcoded field names
3. **Configurable AI analysis** - Projects define their own patterns
4. **Clean architecture** - Modular code with clear responsibilities
5. **Full feature parity** - All existing features, better organized

The implementation follows a logical progression from infrastructure to features to polish, with each phase building on the previous.
