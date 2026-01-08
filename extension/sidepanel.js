// ICE Deaths Research Assistant - Sidebar Panel Script

// State
let currentCase = {
  name: '',
  dateOfDeath: '',
  age: '',
  country: '',
  facility: '',
  location: '',
  causeOfDeath: ''
};
let verifiedQuotes = [];
let pendingQuotes = [];
let sources = [];
let isConnected = false;
let apiUrl = 'http://localhost:3001';
let currentSelectors = {};
let isExtracting = false;

// Default CSS selectors
const DEFAULT_SELECTORS = {
  "nytimes.com": {
    article: "article[data-testid='story-body'], section[name='articleBody']",
    headline: "h1[data-testid='headline']",
    date: "time[datetime]",
    author: "[data-testid='byline']"
  },
  "washingtonpost.com": {
    article: "article.paywall, .article-body",
    headline: "h1[data-qa='headline'], h1",
    date: "span.display-date, time",
    author: ".author-name, .byline"
  },
  "theguardian.com": {
    article: "div[data-gu-name='body'], .article-body-commercial-selector",
    headline: "h1",
    date: "time[datetime]",
    author: "a[rel='author']"
  },
  "reuters.com": {
    article: "article, .article-body__content",
    headline: "h1[data-testid='Heading'], h1",
    date: "time[datetime]",
    author: "[data-testid='AuthorName'], .author-name"
  },
  "apnews.com": {
    article: "div.RichTextStoryBody, .Article",
    headline: "h1",
    date: "span.Timestamp, time",
    author: ".CardHeadline-By, .byline"
  },
  "ice.gov": {
    article: "article, .main-content, .field--name-body",
    headline: "h1",
    date: ".date-display-single, time",
    author: ""
  },
  "*": {
    article: "article, main, [role='main'], .article, .post, .content, .story",
    headline: "h1",
    date: "time[datetime], .date, .published, .timestamp",
    author: ".author, .byline, [rel='author']"
  }
};

// DOM Elements
const elements = {};

// Initialize
async function init() {
  cacheElements();
  await loadSettings();
  await loadState();
  setupEventListeners();
  setupTabs();
  checkConnection();
  updatePageInfo();
}

// Cache DOM elements
function cacheElements() {
  elements.statusDot = document.getElementById('statusDot');
  elements.statusText = document.getElementById('statusText');
  elements.pageInfo = document.getElementById('pageInfo');
  elements.caseName = document.getElementById('caseName');
  elements.caseDod = document.getElementById('caseDod');
  elements.caseAge = document.getElementById('caseAge');
  elements.caseCountry = document.getElementById('caseCountry');
  elements.caseFacility = document.getElementById('caseFacility');
  elements.caseLocation = document.getElementById('caseLocation');
  elements.caseCause = document.getElementById('caseCause');
  elements.quoteList = document.getElementById('quoteList');
  elements.quoteCount = document.getElementById('quoteCount');
  elements.pendingList = document.getElementById('pendingList');
  elements.pendingCount = document.getElementById('pendingCount');
  elements.sourceList = document.getElementById('sourceList');
  elements.sourceCount = document.getElementById('sourceCount');
  elements.extractBtn = document.getElementById('extractBtn');
  elements.extractProgress = document.getElementById('extractProgress');
  elements.progressFill = document.getElementById('progressFill');
  elements.progressText = document.getElementById('progressText');
  elements.bulkActions = document.getElementById('bulkActions');
  elements.saveCaseBtn = document.getElementById('saveCaseBtn');
  elements.newCaseBtn = document.getElementById('newCaseBtn');
  elements.clearCaseBtn = document.getElementById('clearCaseBtn');
  elements.addSourceBtn = document.getElementById('addSourceBtn');
  elements.settingsBtn = document.getElementById('settingsBtn');
  elements.acceptAllBtn = document.getElementById('acceptAllBtn');
  elements.rejectAllBtn = document.getElementById('rejectAllBtn');
  elements.manualAddHeader = document.getElementById('manualAddHeader');
  elements.manualAddContent = document.getElementById('manualAddContent');
  elements.manualQuoteText = document.getElementById('manualQuoteText');
  elements.manualQuoteCategory = document.getElementById('manualQuoteCategory');
  elements.addManualQuoteBtn = document.getElementById('addManualQuoteBtn');
  // Custom selector elements
  elements.customSelectorHeader = document.getElementById('customSelectorHeader');
  elements.customSelectorContent = document.getElementById('customSelectorContent');
  elements.customSelector = document.getElementById('customSelector');
  elements.pickElementBtn = document.getElementById('pickElementBtn');
  elements.testSelectorBtn = document.getElementById('testSelectorBtn');
  elements.extractCustomBtn = document.getElementById('extractCustomBtn');
  elements.selectorTestResult = document.getElementById('selectorTestResult');
  // Settings elements
  elements.apiUrl = document.getElementById('apiUrl');
  elements.testConnectionBtn = document.getElementById('testConnectionBtn');
  elements.exportJsonBtn = document.getElementById('exportJsonBtn');
  elements.exportMdBtn = document.getElementById('exportMdBtn');
  elements.copyAllQuotesBtn = document.getElementById('copyAllQuotesBtn');
  elements.caseSearchInput = document.getElementById('caseSearchInput');
  elements.caseSearchResults = document.getElementById('caseSearchResults');
  elements.clearAllDataBtn = document.getElementById('clearAllDataBtn');
}

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiUrl', 'customSelectors'], (result) => {
      if (result.apiUrl) {
        apiUrl = result.apiUrl;
        elements.apiUrl.value = apiUrl;
      }
      if (result.customSelectors) {
        currentSelectors = result.customSelectors;
      }
      resolve();
    });
  });
}

// Load state from background
async function loadState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (response) {
        if (response.currentCase) {
          currentCase = response.currentCase;
          populateCaseForm();
        }
        if (response.pendingQuotes) {
          // Separate verified and pending
          verifiedQuotes = response.pendingQuotes.filter(q => q.status === 'verified');
          pendingQuotes = response.pendingQuotes.filter(q => q.status !== 'verified');
          renderQuotes();
          renderPendingQuotes();
        }
      }
      resolve();
    });
  });
}

// Setup tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      const tabId = `tab-${tab.dataset.tab}`;
      document.getElementById(tabId).classList.add('active');
      
      // Update selectors when config tab is opened
      if (tab.dataset.tab === 'config') {
        loadSelectorsForCurrentDomain();
      }
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Form inputs - save on change
  ['caseName', 'caseDod', 'caseAge', 'caseCountry', 'caseFacility', 'caseLocation', 'caseCause'].forEach(id => {
    elements[id].addEventListener('input', () => {
      updateCaseFromForm();
    });
  });
  
  // Extract button
  elements.extractBtn.addEventListener('click', extractArticle);
  
  // Save button
  elements.saveCaseBtn.addEventListener('click', saveCase);
  
  // New case button
  elements.newCaseBtn.addEventListener('click', newCase);
  
  // Clear case button
  elements.clearCaseBtn.addEventListener('click', clearCase);
  
  // Add source button
  elements.addSourceBtn.addEventListener('click', addCurrentPageAsSource);
  
  // Settings button - switch to settings tab
  elements.settingsBtn.addEventListener('click', () => {
    document.querySelector('.tab[data-tab="settings"]').click();
  });
  
  // Bulk actions
  elements.acceptAllBtn.addEventListener('click', acceptAllPending);
  elements.rejectAllBtn.addEventListener('click', rejectAllPending);
  
  // Manual add collapsible
  elements.manualAddHeader.addEventListener('click', () => {
    elements.manualAddHeader.classList.toggle('open');
    elements.manualAddContent.classList.toggle('open');
  });
  
  // Add manual quote
  elements.addManualQuoteBtn.addEventListener('click', addManualQuote);
  
  // Custom selector collapsible
  elements.customSelectorHeader.addEventListener('click', () => {
    elements.customSelectorHeader.classList.toggle('open');
    elements.customSelectorContent.classList.toggle('open');
  });
  
  // Element picker and custom selector
  elements.pickElementBtn.addEventListener('click', startElementPicker);
  elements.testSelectorBtn.addEventListener('click', testCustomSelector);
  elements.extractCustomBtn.addEventListener('click', extractFromCustomSelector);
  
  // Test connection
  elements.testConnectionBtn.addEventListener('click', testConnection);
  
  // API URL change
  elements.apiUrl.addEventListener('change', () => {
    apiUrl = elements.apiUrl.value;
    chrome.storage.local.set({ apiUrl });
  });
  
  // Settings tab event listeners
  elements.exportJsonBtn.addEventListener('click', exportAsJson);
  elements.exportMdBtn.addEventListener('click', exportAsMarkdown);
  elements.copyAllQuotesBtn.addEventListener('click', copyAllQuotes);
  elements.caseSearchInput.addEventListener('input', debounce(searchCases, 300));
  elements.clearAllDataBtn.addEventListener('click', clearAllData);
}

// Check API connection
async function checkConnection() {
  try {
    const response = await fetch(`${apiUrl}/api/cases`, {
      method: 'HEAD'
    });
    isConnected = response.ok;
  } catch {
    isConnected = false;
  }
  
  updateConnectionStatus();
}

// Update connection status UI
function updateConnectionStatus() {
  elements.statusDot.className = `status-dot ${isConnected ? '' : 'disconnected'}`;
  elements.statusText.textContent = isConnected ? 'Connected' : 'Disconnected';
}

// Update page info
async function updatePageInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      try {
        const url = new URL(tabs[0].url);
        const isPdf = tabs[0].url.toLowerCase().endsWith('.pdf') || 
                      tabs[0].url.includes('application/pdf');
        
        elements.pageInfo.textContent = isPdf ? 
          `📄 ${url.hostname} (PDF)` : 
          url.hostname;
        elements.currentDomain.value = url.hostname;
        
        // Update extract button text based on page type
        elements.extractBtn.textContent = isPdf ? 
          'Extract PDF Content' : 
          'Extract Article Content';
      } catch {
        elements.pageInfo.textContent = '-';
      }
    }
  });
}

// === ELEMENT PICKER FUNCTIONS ===

// Start element picker mode
function startElementPicker() {
  elements.pickElementBtn.textContent = 'Picking...';
  elements.pickElementBtn.disabled = true;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'START_ELEMENT_PICKER' }, (response) => {
      if (response && response.selector) {
        elements.customSelector.value = response.selector;
        elements.selectorTestResult.textContent = `Selected: ${response.selector}`;
        elements.selectorTestResult.style.display = 'block';
        elements.selectorTestResult.style.color = '#22c55e';
      }
      elements.pickElementBtn.textContent = '👆 Pick Element';
      elements.pickElementBtn.disabled = false;
    });
  });
}

// Test custom selector
function testCustomSelector() {
  const selector = elements.customSelector.value.trim();
  
  if (!selector) {
    elements.selectorTestResult.textContent = 'Enter a selector first';
    elements.selectorTestResult.style.display = 'block';
    elements.selectorTestResult.style.color = '#ef4444';
    return;
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'TEST_SELECTOR',
      selector: selector
    }, (response) => {
      if (response && response.count !== undefined) {
        elements.selectorTestResult.textContent = `Found ${response.count} match${response.count !== 1 ? 'es' : ''}`;
        elements.selectorTestResult.style.display = 'block';
        elements.selectorTestResult.style.color = response.count > 0 ? '#22c55e' : '#ef4444';
      } else {
        elements.selectorTestResult.textContent = 'Error testing selector';
        elements.selectorTestResult.style.display = 'block';
        elements.selectorTestResult.style.color = '#ef4444';
      }
    });
  });
}

// Extract from custom selector
async function extractFromCustomSelector() {
  const selector = elements.customSelector.value.trim();
  
  if (!selector) {
    alert('Please enter a CSS selector');
    return;
  }
  
  if (isExtracting) return;
  
  isExtracting = true;
  elements.extractCustomBtn.disabled = true;
  elements.extractCustomBtn.innerHTML = '<div class="spinner white"></div> Extracting...';
  elements.extractProgress.classList.remove('hidden');
  elements.progressFill.style.width = '10%';
  elements.progressText.textContent = 'Extracting from selector...';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'EXTRACT_FROM_SELECTOR',
      selector: selector
    }, async (response) => {
      if (response && response.error) {
        elements.progressText.textContent = `Error: ${response.error}`;
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 3000);
      } else if (response && response.sentences && response.sentences.length > 0) {
        elements.progressFill.style.width = '30%';
        elements.progressText.textContent = `Found ${response.sentences.length} sentences. Classifying...`;
        
        // Add current page as source
        addSourceFromResponse(tabs[0], { headline: response.title || tabs[0].title });
        
        // Classify sentences
        await classifySentences(response.sentences, false);
      } else {
        elements.progressText.textContent = 'No content found with this selector.';
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 2000);
      }
      
      isExtracting = false;
      elements.extractCustomBtn.disabled = false;
      elements.extractCustomBtn.textContent = 'Extract from Selector';
    });
  });
}

// Test connection
async function testConnection() {
  elements.testConnectionBtn.disabled = true;
  elements.testConnectionBtn.innerHTML = '<div class="spinner"></div> Testing...';
  
  await checkConnection();
  
  elements.testConnectionBtn.disabled = false;
  elements.testConnectionBtn.textContent = 'Test Connection';
  
  alert(isConnected ? 'Connection successful!' : 'Connection failed. Is the server running?');
}

// Populate case form from state
function populateCaseForm() {
  elements.caseName.value = currentCase.name || '';
  elements.caseDod.value = currentCase.dateOfDeath || '';
  elements.caseAge.value = currentCase.age || '';
  elements.caseCountry.value = currentCase.country || '';
  elements.caseFacility.value = currentCase.facility || '';
  elements.caseLocation.value = currentCase.location || '';
  elements.caseCause.value = currentCase.causeOfDeath || '';
}

// Update case from form
function updateCaseFromForm() {
  currentCase = {
    name: elements.caseName.value,
    dateOfDeath: elements.caseDod.value,
    age: elements.caseAge.value,
    country: elements.caseCountry.value,
    facility: elements.caseFacility.value,
    location: elements.caseLocation.value,
    causeOfDeath: elements.caseCause.value
  };
  
  // Save to background
  chrome.runtime.sendMessage({ type: 'SET_CURRENT_CASE', case: currentCase });
}

// Render verified quotes list
function renderQuotes() {
  elements.quoteCount.textContent = verifiedQuotes.length;
  
  if (verifiedQuotes.length === 0) {
    elements.quoteList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>No verified quotes yet</p>
        <p style="font-size: 11px; margin-top: 4px;">
          Go to Extract tab to pull quotes from the page
        </p>
      </div>
    `;
    return;
  }
  
  elements.quoteList.innerHTML = verifiedQuotes.map(quote => `
    <div class="quote-card verified" data-id="${quote.id}">
      <div class="quote-text ${quote.text.length > 200 ? 'truncated' : ''}">"${escapeHtml(quote.text)}"</div>
      <div class="quote-meta">
        <span class="quote-category ${quote.category}">${quote.category}</span>
        ${quote.pageNumber ? `<span class="quote-page" onclick="goToPage(${quote.pageNumber})" title="Go to page">📄 Page ${quote.pageNumber}</span>` : ''}
      </div>
      <div class="quote-actions">
        <button class="btn btn-sm btn-icon" onclick="copyQuote('${quote.id}', true)" title="Copy">📋</button>
        <button class="btn btn-sm btn-icon" onclick="highlightQuote('${quote.id}', true)" title="Find on page">🔍</button>
        <button class="btn btn-sm btn-danger" onclick="removeVerifiedQuote('${quote.id}')" title="Remove">✗</button>
      </div>
    </div>
  `).join('');
}

// Render pending quotes list
function renderPendingQuotes() {
  elements.pendingCount.textContent = pendingQuotes.length;
  
  // Show/hide bulk actions
  elements.bulkActions.classList.toggle('hidden', pendingQuotes.length === 0);
  
  if (pendingQuotes.length === 0) {
    elements.pendingList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No pending quotes</p>
        <p style="font-size: 11px; margin-top: 4px;">
          Click "Extract Article Content" to find quotes
        </p>
      </div>
    `;
    return;
  }
  
  elements.pendingList.innerHTML = pendingQuotes.map(quote => `
    <div class="quote-card pending" data-id="${quote.id}">
      <div class="quote-text ${quote.text.length > 200 ? 'truncated' : ''}">"${escapeHtml(quote.text)}"</div>
      <div class="quote-meta">
        <span class="quote-category ${quote.category}">${quote.category}</span>
        ${quote.confidence ? `<span class="quote-confidence">${Math.round(quote.confidence * 100)}%</span>` : ''}
        ${quote.pageNumber ? `<span class="quote-page" onclick="goToPage(${quote.pageNumber})" title="Go to page">📄 Page ${quote.pageNumber}</span>` : ''}
      </div>
      <div class="quote-actions">
        <button class="btn btn-sm btn-success" onclick="acceptQuote('${quote.id}')" title="Accept">✓</button>
        <button class="btn btn-sm btn-danger" onclick="rejectQuote('${quote.id}')" title="Reject">✗</button>
        <button class="btn btn-sm btn-icon" onclick="copyQuote('${quote.id}', false)" title="Copy">📋</button>
        <button class="btn btn-sm btn-icon" onclick="highlightQuote('${quote.id}', false)" title="Find on page">🔍</button>
      </div>
    </div>
  `).join('');
}

// Escape HTML for safe rendering
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Extract article from current page
async function extractArticle() {
  if (isExtracting) return;
  
  isExtracting = true;
  elements.extractBtn.disabled = true;
  elements.extractBtn.innerHTML = '<div class="spinner white"></div> Extracting...';
  elements.extractProgress.classList.remove('hidden');
  elements.progressFill.style.width = '10%';
  elements.progressText.textContent = 'Extracting content...';
  
  // Get custom selectors for current domain
  const domain = elements.currentDomain.value;
  let selectors = DEFAULT_SELECTORS['*'];
  
  for (const key of Object.keys(DEFAULT_SELECTORS)) {
    if (key !== '*' && domain.includes(key)) {
      selectors = DEFAULT_SELECTORS[key];
      break;
    }
  }
  
  if (currentSelectors[domain]) {
    selectors = { ...selectors, ...currentSelectors[domain] };
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'EXTRACT_ARTICLE',
      selectors: selectors
    }, async (response) => {
      if (response && response.error) {
        elements.progressText.textContent = `Error: ${response.error}`;
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 3000);
        isExtracting = false;
        elements.extractBtn.disabled = false;
        elements.extractBtn.textContent = response.isPdf ? 'Extract PDF Content' : 'Extract Article Content';
        return;
      }
      
      if (response && response.isPdf) {
        // PDF extraction
        elements.progressText.textContent = 'Extracting PDF content...';
        elements.progressFill.style.width = '20%';
        
        if (response.sentences && response.sentences.length > 0) {
          elements.progressFill.style.width = '30%';
          elements.progressText.textContent = `Found ${response.sentences.length} sentences from PDF. Classifying...`;
          
          // Add current page as source (PDF)
          addSourceFromResponse(tabs[0], {
            headline: response.title || tabs[0].title,
            isPdf: true
          });
          
          // Pass PDF sentences with page numbers
          await classifySentences(response.sentences, true);
        } else {
          elements.progressText.textContent = 'No text extracted from PDF.';
          setTimeout(() => {
            elements.extractProgress.classList.add('hidden');
          }, 2000);
        }
      } else if (response && response.sentences && response.sentences.length > 0) {
        // Regular article extraction
        elements.progressFill.style.width = '30%';
        elements.progressText.textContent = `Found ${response.sentences.length} sentences. Classifying...`;
        
        // Add current page as source
        addSourceFromResponse(tabs[0], response);
        
        // Classify sentences (no page numbers for articles)
        await classifySentences(response.sentences, false);
      } else {
        elements.progressText.textContent = 'No content found. Try adjusting selectors.';
        setTimeout(() => {
          elements.extractProgress.classList.add('hidden');
        }, 2000);
      }
      
      isExtracting = false;
      elements.extractBtn.disabled = false;
      elements.extractBtn.textContent = 'Extract Article Content';
    });
  });
}

// Add source from extraction response
function addSourceFromResponse(tab, response) {
  const existing = sources.find(s => s.url === tab.url);
  if (!existing) {
    sources.push({
      url: tab.url,
      title: response.headline || tab.title,
      date: response.date || '',
      author: response.author || '',
      addedAt: new Date().toISOString()
    });
    renderSources();
  }
}

// Classify sentences using API
async function classifySentences(sentences, isPdf = false) {
  try {
    // Handle array of objects (PDF with page numbers) or array of strings
    const sentenceTexts = isPdf ? sentences.map(s => s.text || s) : sentences;
    const total = sentenceTexts.length;
    let processed = 0;
    
    // Process in batches of 5
    const batchSize = 5;
    const results = [];
    
    for (let i = 0; i < sentenceTexts.length; i += batchSize) {
      const batch = sentenceTexts.slice(i, i + batchSize);
      const originalBatch = sentences.slice(i, i + batchSize);
      
      const response = await fetch(`${apiUrl}/api/extension/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sentences: batch })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Merge page numbers from original sentences
        const classifiedWithPages = data.classifications.map((c, idx) => ({
          ...c,
          pageNumber: isPdf && originalBatch[idx] ? originalBatch[idx].pageNumber : undefined
        }));
        results.push(...classifiedWithPages);
      } else {
        // Fallback: add as uncategorized
        results.push(...batch.map((s, idx) => ({
          text: s,
          category: 'context',
          confidence: 0.5,
          pageNumber: isPdf && originalBatch[idx] ? originalBatch[idx].pageNumber : undefined
        })));
      }
      
      processed += batch.length;
      const progress = 30 + (processed / total) * 60;
      elements.progressFill.style.width = `${progress}%`;
      elements.progressText.textContent = `Classified ${processed}/${total} sentences...`;
    }
    
    // Filter and add to pending
    const relevant = results.filter(r => r.category !== 'irrelevant' && r.confidence > 0.3);
    
    relevant.forEach(r => {
      pendingQuotes.push({
        id: crypto.randomUUID(),
        text: r.text,
        category: r.category,
        confidence: r.confidence,
        pageNumber: r.pageNumber,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });
    
    elements.progressFill.style.width = '100%';
    elements.progressText.textContent = `Found ${relevant.length} relevant quotes!`;
    
    renderPendingQuotes();
    syncQuotesToBackground();
    
    setTimeout(() => {
      elements.extractProgress.classList.add('hidden');
    }, 2000);
    
  } catch (error) {
    console.error('Classification error:', error);
    elements.progressText.textContent = 'Classification failed. Using fallback.';
    
    // Add all sentences as uncategorized
    const sentenceTexts = Array.isArray(sentences) && sentences[0]?.text ? sentences : sentences.map(s => ({ text: s }));
    sentenceTexts.forEach(s => {
      const text = s.text || s;
      if (text.length > 30) {
        pendingQuotes.push({
          id: crypto.randomUUID(),
          text: text,
          category: 'context',
          confidence: 0.5,
          pageNumber: s.pageNumber,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    });
    
    renderPendingQuotes();
    syncQuotesToBackground();
    
    setTimeout(() => {
      elements.extractProgress.classList.add('hidden');
    }, 2000);
  }
}

// Sync quotes to background script
function syncQuotesToBackground() {
  const allQuotes = [...verifiedQuotes, ...pendingQuotes];
  chrome.runtime.sendMessage({ type: 'SYNC_QUOTES', quotes: allQuotes });
}

// Accept a pending quote
window.acceptQuote = function(quoteId) {
  const idx = pendingQuotes.findIndex(q => q.id === quoteId);
  if (idx !== -1) {
    const quote = pendingQuotes.splice(idx, 1)[0];
    quote.status = 'verified';
    verifiedQuotes.push(quote);
    renderQuotes();
    renderPendingQuotes();
    syncQuotesToBackground();
  }
};

// Reject a pending quote
window.rejectQuote = function(quoteId) {
  pendingQuotes = pendingQuotes.filter(q => q.id !== quoteId);
  renderPendingQuotes();
  syncQuotesToBackground();
};

// Remove a verified quote
window.removeVerifiedQuote = function(quoteId) {
  verifiedQuotes = verifiedQuotes.filter(q => q.id !== quoteId);
  renderQuotes();
  syncQuotesToBackground();
};

// Accept all pending quotes
function acceptAllPending() {
  pendingQuotes.forEach(q => {
    q.status = 'verified';
    verifiedQuotes.push(q);
  });
  pendingQuotes = [];
  renderQuotes();
  renderPendingQuotes();
  syncQuotesToBackground();
}

// Reject all pending quotes
function rejectAllPending() {
  if (confirm('Clear all pending quotes?')) {
    pendingQuotes = [];
    renderPendingQuotes();
    syncQuotesToBackground();
  }
}

// Copy quote text
window.copyQuote = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => q.id === quoteId);
  if (quote) {
    navigator.clipboard.writeText(quote.text);
  }
};

// Highlight quote on page
window.highlightQuote = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => q.id === quoteId);
  if (quote) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'HIGHLIGHT_TEXT', 
        text: quote.text,
        category: quote.category || ''
      });
    });
  }
};

// Add manual quote
function addManualQuote() {
  const text = elements.manualQuoteText.value.trim();
  const category = elements.manualQuoteCategory.value;
  
  if (!text) {
    alert('Please enter quote text');
    return;
  }
  
  const quote = {
    id: crypto.randomUUID(),
    text: text,
    category: category,
    confidence: 1.0,
    status: 'verified',
    createdAt: new Date().toISOString()
  };
  
  verifiedQuotes.push(quote);
  renderQuotes();
  syncQuotesToBackground();
  
  // Clear form
  elements.manualQuoteText.value = '';
  elements.manualAddHeader.classList.remove('open');
  elements.manualAddContent.classList.remove('open');
}

// Render sources list
function renderSources() {
  elements.sourceCount.textContent = sources.length;
  
  if (sources.length === 0) {
    elements.sourceList.innerHTML = '';
    return;
  }
  
  elements.sourceList.innerHTML = sources.map(source => `
    <a href="${source.url}" class="source-item" target="_blank" title="${source.title}">
      📄 ${truncate(source.title || source.url, 40)}
    </a>
  `).join('');
}

// Truncate text
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Add current page as source
function addCurrentPageAsSource() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const existing = sources.find(s => s.url === tabs[0].url);
      if (!existing) {
        sources.push({
          url: tabs[0].url,
          title: tabs[0].title,
          addedAt: new Date().toISOString()
        });
        renderSources();
      }
    }
  });
}

// Save case to API
async function saveCase() {
  if (!isConnected) {
    alert('Not connected to API. Please ensure the server is running.');
    return;
  }
  
  if (!currentCase.name) {
    alert('Please enter a name for the case.');
    return;
  }
  
  elements.saveCaseBtn.disabled = true;
  elements.saveCaseBtn.innerHTML = '<div class="spinner white"></div> Saving...';
  
  const caseData = {
    ...currentCase,
    quotes: verifiedQuotes,
    sources: sources
  };
  
  try {
    const response = await fetch(`${apiUrl}/api/extension/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(caseData)
    });
    
    if (response.ok) {
      const result = await response.json();
      alert(`Case saved successfully! ID: ${result.id || 'N/A'}`);
    } else {
      throw new Error('Save failed');
    }
  } catch (error) {
    alert('Failed to save case: ' + error.message);
  } finally {
    elements.saveCaseBtn.disabled = false;
    elements.saveCaseBtn.textContent = 'Save Case';
  }
}

// Create new case
function newCase() {
  if (verifiedQuotes.length > 0 || currentCase.name) {
    if (!confirm('Start a new case? Current data will be cleared.')) {
      return;
    }
  }
  
  clearCase();
}

// Clear current case
function clearCase() {
  currentCase = {
    name: '',
    dateOfDeath: '',
    age: '',
    country: '',
    facility: '',
    location: '',
    causeOfDeath: ''
  };
  verifiedQuotes = [];
  pendingQuotes = [];
  sources = [];
  
  populateCaseForm();
  renderQuotes();
  renderPendingQuotes();
  renderSources();
  
  chrome.runtime.sendMessage({ type: 'SET_CURRENT_CASE', case: currentCase });
  chrome.runtime.sendMessage({ type: 'CLEAR_QUOTES' });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'QUOTE_ADDED':
      pendingQuotes.push(message.quote);
      renderPendingQuotes();
      break;
      
    case 'EXTRACTION_PROGRESS':
      elements.progressFill.style.width = `${message.progress}%`;
      elements.progressText.textContent = message.text;
      break;
      
    case 'TRIGGER_EXTRACT':
      extractArticle();
      break;
      
    case 'TRIGGER_SAVE':
      saveCase();
      break;
  }
});

// Go to specific page in PDF
window.goToPage = function(pageNumber) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { 
      type: 'SCROLL_TO_PAGE', 
      pageNumber: pageNumber
    });
  });
};

// === EXPORT FUNCTIONS ===

// Export as JSON
function exportAsJson() {
  const exportData = {
    case: currentCase,
    quotes: verifiedQuotes,
    sources: sources,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ice-case-${currentCase.name || 'unnamed'}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export as Markdown
function exportAsMarkdown() {
  let md = `# ${currentCase.name || 'Unnamed Case'}\n\n`;
  
  if (currentCase.dateOfDeath) {
    md += `**Date of Death:** ${currentCase.dateOfDeath}\n`;
  }
  if (currentCase.age) {
    md += `**Age:** ${currentCase.age}\n`;
  }
  if (currentCase.country) {
    md += `**Country of Origin:** ${currentCase.country}\n`;
  }
  if (currentCase.facility) {
    md += `**Facility:** ${currentCase.facility}\n`;
  }
  if (currentCase.location) {
    md += `**Location:** ${currentCase.location}\n`;
  }
  if (currentCase.causeOfDeath) {
    md += `**Cause of Death:** ${currentCase.causeOfDeath}\n`;
  }
  
  if (verifiedQuotes.length > 0) {
    md += `\n## Verified Quotes (${verifiedQuotes.length})\n\n`;
    
    const byCategory = {};
    verifiedQuotes.forEach(q => {
      if (!byCategory[q.category]) byCategory[q.category] = [];
      byCategory[q.category].push(q);
    });
    
    for (const [category, quotes] of Object.entries(byCategory)) {
      md += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
      quotes.forEach(q => {
        md += `> "${q.text}"\n`;
        if (q.pageNumber) md += `> — Page ${q.pageNumber}\n`;
        md += '\n';
      });
    }
  }
  
  if (sources.length > 0) {
    md += `## Sources (${sources.length})\n\n`;
    sources.forEach((s, i) => {
      md += `${i + 1}. [${s.title || s.url}](${s.url})\n`;
    });
  }
  
  md += `\n---\n*Exported on ${new Date().toLocaleString()}*\n`;
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ice-case-${currentCase.name || 'unnamed'}-${new Date().toISOString().split('T')[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Copy all quotes to clipboard
function copyAllQuotes() {
  if (verifiedQuotes.length === 0) {
    alert('No verified quotes to copy');
    return;
  }
  
  const text = verifiedQuotes.map(q => {
    let line = `"${q.text}"`;
    if (q.pageNumber) line += ` (Page ${q.pageNumber})`;
    line += ` [${q.category}]`;
    return line;
  }).join('\n\n');
  
  navigator.clipboard.writeText(text).then(() => {
    alert(`Copied ${verifiedQuotes.length} quotes to clipboard`);
  });
}

// === SEARCH FUNCTIONS ===

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Search existing cases
async function searchCases() {
  const query = elements.caseSearchInput.value.trim();
  
  if (!query || query.length < 2) {
    elements.caseSearchResults.innerHTML = '<div class="search-empty">Type at least 2 characters to search</div>';
    return;
  }
  
  if (!isConnected) {
    elements.caseSearchResults.innerHTML = '<div class="search-empty">Not connected to API</div>';
    return;
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/extension/cases?search=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    
    const results = await response.json();
    
    if (!results || results.length === 0) {
      elements.caseSearchResults.innerHTML = '<div class="search-empty">No cases found</div>';
      return;
    }
    
    elements.caseSearchResults.innerHTML = results.slice(0, 10).map(c => `
      <div class="search-result-item" data-id="${c.id}">
        <div class="search-result-name">${escapeHtml(c.name)}</div>
        <div class="search-result-meta">
          ${c.date_of_death ? `📅 ${c.date_of_death}` : ''}
          ${c.facility ? `• 🏢 ${c.facility}` : ''}
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    elements.caseSearchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => loadExistingCase(item.dataset.id));
    });
    
  } catch (error) {
    elements.caseSearchResults.innerHTML = `<div class="search-empty">Error: ${error.message}</div>`;
  }
}

// Load existing case from search
async function loadExistingCase(caseId) {
  if (verifiedQuotes.length > 0 || currentCase.name) {
    if (!confirm('Load this case? Current unsaved data will be lost.')) {
      return;
    }
  }
  
  try {
    const response = await fetch(`${apiUrl}/api/extension/cases/${caseId}`);
    if (!response.ok) throw new Error('Failed to load case');
    
    const data = await response.json();
    
    currentCase = {
      name: data.name || '',
      dateOfDeath: data.date_of_death || '',
      age: data.age || '',
      country: data.country_of_origin || '',
      facility: data.facility || '',
      location: data.location || '',
      causeOfDeath: data.cause_of_death || ''
    };
    
    verifiedQuotes = (data.quotes || []).map(q => ({
      id: q.id || crypto.randomUUID(),
      text: q.quote_text,
      category: q.category || 'context',
      pageNumber: q.page_number,
      status: 'verified'
    }));
    
    sources = (data.sources || []).map(s => ({
      url: s.url,
      title: s.title
    }));
    
    pendingQuotes = [];
    
    populateCaseForm();
    renderQuotes();
    renderPendingQuotes();
    renderSources();
    syncQuotesToBackground();
    
    // Switch to case tab
    document.querySelector('.tab[data-tab="case"]').click();
    
    alert('Case loaded successfully');
    
  } catch (error) {
    alert('Failed to load case: ' + error.message);
  }
}

// === DATA MANAGEMENT ===

// Clear all extension data
function clearAllData() {
  if (!confirm('This will remove ALL unsaved data including cases, quotes, and custom selectors.\n\nAre you sure?')) {
    return;
  }
  
  chrome.storage.local.clear(() => {
    currentCase = {
      name: '',
      dateOfDeath: '',
      age: '',
      country: '',
      facility: '',
      location: '',
      causeOfDeath: ''
    };
    verifiedQuotes = [];
    pendingQuotes = [];
    sources = [];
    currentSelectors = {};
    
    populateCaseForm();
    renderQuotes();
    renderPendingQuotes();
    renderSources();
    
    chrome.runtime.sendMessage({ type: 'SET_CURRENT_CASE', case: currentCase });
    chrome.runtime.sendMessage({ type: 'CLEAR_QUOTES' });
    
    alert('All extension data cleared');
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
