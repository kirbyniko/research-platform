// ICE Incident Documentation - Sidebar Panel Script

// State
let currentCase = {
  incidentType: 'death_in_custody',
  name: '',
  dateOfDeath: '',
  age: '',
  country: '',
  occupation: '',
  facility: '',
  location: '',
  causeOfDeath: '',
  agencies: [],
  violations: [],
  // Death-specific
  deathCause: '',
  deathManner: '',
  deathCustodyDuration: '',
  deathMedicalDenied: false,
  // Injury-specific
  injuryType: '',
  injurySeverity: 'moderate',
  injuryWeapon: '',
  injuryCause: '',
  // Arrest-specific
  arrestReason: '',
  arrestContext: '',
  arrestCharges: '',
  arrestTimingSuspicious: false,
  arrestPretext: false,
  arrestSelective: false,
  // Violation-specific
  violationJournalism: false,
  violationProtest: false,
  violationActivism: false,
  violationSpeech: '',
  violationRuling: '',
  // Shooting-specific
  shootingFatal: false,
  shotsFired: '',
  weaponType: '',
  bodycamAvailable: false,
  victimArmed: false,
  warningGiven: false,
  shootingContext: '',
  // Excessive force-specific
  forceTypes: [],
  victimRestrained: false,
  victimComplying: false,
  videoEvidence: false,
  // Protest-specific
  protestTopic: '',
  protestSize: '',
  protestPermitted: false,
  dispersalMethod: '',
  arrestsMade: ''
};
let verifiedQuotes = [];
let pendingQuotes = [];
let sources = [];
let isConnected = false;
let apiUrl = 'http://localhost:3001';
let apiKey = '';
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
  // Incident type
  elements.incidentType = document.getElementById('incidentType');
  // Basic case fields
  elements.caseName = document.getElementById('caseName');
  elements.caseDod = document.getElementById('caseDod');
  elements.caseAge = document.getElementById('caseAge');
  elements.caseCountry = document.getElementById('caseCountry');
  elements.caseOccupation = document.getElementById('caseOccupation');
  elements.caseFacility = document.getElementById('caseFacility');
  elements.caseLocation = document.getElementById('caseLocation');
  elements.caseCause = document.getElementById('caseCause');
  // Sections that show/hide based on type
  elements.violationsSection = document.getElementById('violationsSection');
  elements.deathFields = document.getElementById('deathFields');
  elements.injuryFields = document.getElementById('injuryFields');
  elements.arrestFields = document.getElementById('arrestFields');
  elements.violationFields = document.getElementById('violationFields');
  // Death-specific fields
  elements.deathCause = document.getElementById('deathCause');
  elements.deathManner = document.getElementById('deathManner');
  elements.deathCustodyDuration = document.getElementById('deathCustodyDuration');
  elements.deathMedicalDenied = document.getElementById('deathMedicalDenied');
  // Injury-specific fields
  elements.injuryType = document.getElementById('injuryType');
  elements.injurySeverity = document.getElementById('injurySeverity');
  elements.injuryWeapon = document.getElementById('injuryWeapon');
  elements.injuryCause = document.getElementById('injuryCause');
  // Arrest-specific fields
  elements.arrestReason = document.getElementById('arrestReason');
  elements.arrestContext = document.getElementById('arrestContext');
  elements.arrestCharges = document.getElementById('arrestCharges');
  elements.arrestTimingSuspicious = document.getElementById('arrestTimingSuspicious');
  elements.arrestPretext = document.getElementById('arrestPretext');
  elements.arrestSelective = document.getElementById('arrestSelective');
  // Violation-specific fields
  elements.violationJournalism = document.getElementById('violationJournalism');
  elements.violationProtest = document.getElementById('violationProtest');
  elements.violationActivism = document.getElementById('violationActivism');
  elements.violationSpeech = document.getElementById('violationSpeech');
  elements.violationRuling = document.getElementById('violationRuling');
  // Quote/source lists
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
  elements.apiKey = document.getElementById('apiKey');
  elements.testConnectionBtn = document.getElementById('testConnectionBtn');
  elements.exportJsonBtn = document.getElementById('exportJsonBtn');
  elements.exportMdBtn = document.getElementById('exportMdBtn');
  elements.copyAllQuotesBtn = document.getElementById('copyAllQuotesBtn');
  elements.caseSearchInput = document.getElementById('caseSearchInput');
  elements.caseSearchResults = document.getElementById('caseSearchResults');
  elements.clearAllDataBtn = document.getElementById('clearAllDataBtn');
  // Overlay and highlight controls
  elements.openOverlayBtn = document.getElementById('openOverlayBtn');
  elements.clearHighlightsBtn = document.getElementById('clearHighlightsBtn');
  // Agency collapsible
  elements.agenciesHeader = document.getElementById('agenciesHeader');
  elements.agenciesContent = document.getElementById('agenciesContent');
  elements.violationsHeader = document.getElementById('violationsHeader');
  elements.violationsContent = document.getElementById('violationsContent');
  // New sections for shooting/force/protest details
  elements.shootingSection = document.getElementById('shootingSection');
  elements.shootingHeader = document.getElementById('shootingHeader');
  elements.shootingContent = document.getElementById('shootingContent');
  elements.excessiveForceSection = document.getElementById('excessiveForceSection');
  elements.excessiveForceHeader = document.getElementById('excessiveForceHeader');
  elements.excessiveForceContent = document.getElementById('excessiveForceContent');
  elements.protestSection = document.getElementById('protestSection');
  elements.protestHeader = document.getElementById('protestHeader');
  elements.protestContent = document.getElementById('protestContent');
  // Shooting detail fields
  elements.shootingFatal = document.getElementById('shootingFatal');
  elements.shotsFired = document.getElementById('shotsFired');
  elements.weaponType = document.getElementById('weaponType');
  elements.bodycamAvailable = document.getElementById('bodycamAvailable');
  elements.victimArmed = document.getElementById('victimArmed');
  elements.warningGiven = document.getElementById('warningGiven');
  elements.shootingContext = document.getElementById('shootingContext');
  // Excessive force detail fields
  elements.victimRestrained = document.getElementById('victimRestrained');
  elements.victimComplying = document.getElementById('victimComplying');
  elements.videoEvidence = document.getElementById('videoEvidence');
  // Protest detail fields
  elements.protestTopic = document.getElementById('protestTopic');
  elements.protestSize = document.getElementById('protestSize');
  elements.protestPermitted = document.getElementById('protestPermitted');
  elements.dispersalMethod = document.getElementById('dispersalMethod');
  elements.arrestsMade = document.getElementById('arrestsMade');
}

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiUrl', 'apiKey', 'customSelectors'], (result) => {
      if (result.apiUrl) {
        apiUrl = result.apiUrl;
        elements.apiUrl.value = apiUrl;
      }
      if (result.apiKey) {
        apiKey = result.apiKey;
        elements.apiKey.value = apiKey;
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
        // Use verifiedQuotes array if available, otherwise filter from pendingQuotes
        if (response.verifiedQuotes && response.verifiedQuotes.length > 0) {
          verifiedQuotes = response.verifiedQuotes;
        } else if (response.pendingQuotes) {
          verifiedQuotes = response.pendingQuotes.filter(q => q.status === 'verified');
        }
        if (response.pendingQuotes) {
          pendingQuotes = response.pendingQuotes.filter(q => q.status !== 'verified');
        }
        if (response.sources) {
          sources = response.sources;
        }
        renderQuotes();
        renderPendingQuotes();
        renderSources();
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
  // Incident type selector - show/hide relevant fields
  elements.incidentType.addEventListener('change', handleIncidentTypeChange);
  
  // Form inputs - save on change
  ['caseName', 'caseDod', 'caseAge', 'caseCountry', 'caseOccupation', 'caseFacility', 'caseLocation', 'caseCause'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', () => {
        updateCaseFromForm();
      });
    }
  });
  
  // Death-specific fields
  ['deathCause', 'deathManner', 'deathCustodyDuration'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  if (elements.deathMedicalDenied) {
    elements.deathMedicalDenied.addEventListener('change', updateCaseFromForm);
  }
  
  // Injury-specific fields
  ['injuryType', 'injurySeverity', 'injuryWeapon', 'injuryCause'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  
  // Arrest-specific fields
  ['arrestReason', 'arrestContext', 'arrestCharges'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  ['arrestTimingSuspicious', 'arrestPretext', 'arrestSelective'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  
  // Violation-specific fields
  ['violationJournalism', 'violationProtest', 'violationActivism'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  ['violationSpeech', 'violationRuling'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  
  // Agency checkboxes
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateCaseFromForm);
  });
  
  // Violation checkboxes
  document.querySelectorAll('[id^="violation-"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateCaseFromForm);
  });
  
  // Agencies collapsible
  if (elements.agenciesHeader) {
    elements.agenciesHeader.addEventListener('click', () => {
      elements.agenciesHeader.classList.toggle('open');
      elements.agenciesContent.classList.toggle('open');
    });
  }
  
  // Violations collapsible
  if (elements.violationsHeader) {
    elements.violationsHeader.addEventListener('click', () => {
      elements.violationsHeader.classList.toggle('open');
      elements.violationsContent.classList.toggle('open');
    });
  }
  
  // Shooting section collapsible
  if (elements.shootingHeader) {
    elements.shootingHeader.addEventListener('click', () => {
      elements.shootingHeader.classList.toggle('open');
      elements.shootingContent.classList.toggle('open');
    });
  }
  
  // Excessive force section collapsible
  if (elements.excessiveForceHeader) {
    elements.excessiveForceHeader.addEventListener('click', () => {
      elements.excessiveForceHeader.classList.toggle('open');
      elements.excessiveForceContent.classList.toggle('open');
    });
  }
  
  // Protest section collapsible
  if (elements.protestHeader) {
    elements.protestHeader.addEventListener('click', () => {
      elements.protestHeader.classList.toggle('open');
      elements.protestContent.classList.toggle('open');
    });
  }
  
  // Shooting-specific field listeners
  ['shotsFired', 'weaponType', 'shootingContext'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  ['shootingFatal', 'bodycamAvailable', 'victimArmed', 'warningGiven'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  
  // Force type checkboxes
  document.querySelectorAll('[id^="force-"]').forEach(checkbox => {
    checkbox.addEventListener('change', updateCaseFromForm);
  });
  
  // Excessive force field listeners
  ['victimRestrained', 'victimComplying', 'videoEvidence'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('change', updateCaseFromForm);
    }
  });
  
  // Protest-specific field listeners
  ['protestTopic', 'protestSize', 'dispersalMethod', 'arrestsMade'].forEach(id => {
    if (elements[id]) {
      elements[id].addEventListener('input', updateCaseFromForm);
    }
  });
  if (elements.protestPermitted) {
    elements.protestPermitted.addEventListener('change', updateCaseFromForm);
  }
  
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
  
  // Open overlay button - opens the floating panel on the page
  if (elements.openOverlayBtn) {
    elements.openOverlayBtn.addEventListener('click', openOverlayOnPage);
  }
  
  // Clear highlights button
  if (elements.clearHighlightsBtn) {
    elements.clearHighlightsBtn.addEventListener('click', clearAllHighlights);
  }
  
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
  
  // API Key change
  elements.apiKey.addEventListener('change', () => {
    apiKey = elements.apiKey.value;
    chrome.storage.local.set({ apiKey });
  });
  
  // Settings tab event listeners
  elements.exportJsonBtn.addEventListener('click', exportAsJson);
  elements.exportMdBtn.addEventListener('click', exportAsMarkdown);
  elements.copyAllQuotesBtn.addEventListener('click', copyAllQuotes);
  elements.caseSearchInput.addEventListener('input', debounce(searchCases, 300));
  elements.clearAllDataBtn.addEventListener('click', clearAllData);
}

// Open the overlay panel on the current page
function openOverlayOnPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      const tab = tabs[0];
      
      // Check if tab URL is loaded
      if (!tab.url) {
        showNotification('Page not loaded yet - wait a moment', 'error');
        return;
      }
      
      // Check if we can access the page (not chrome:// or extension pages)
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
        showNotification('Overlay cannot run on browser system pages. Navigate to a website.', 'error');
        return;
      }
      
      chrome.tabs.sendMessage(tab.id, { type: 'SHOW_OVERLAY' }, (response) => {
        if (chrome.runtime.lastError) {
          showNotification('Overlay not available - refresh the page or wait a moment', 'error');
          console.log('Content script not ready:', chrome.runtime.lastError.message);
        } else if (response && response.success) {
          showNotification('Overlay opened (Alt+O to toggle)', 'success');
        } else {
          showNotification('Could not open overlay', 'error');
        }
      });
    }
  });
}

// Clear all highlights on the current page
function clearAllHighlights() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'REMOVE_HIGHLIGHTS' }, (response) => {
      if (response && response.success) {
        showNotification('Highlights cleared', 'success');
      }
    });
  });
}

// Show notification toast
function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `notification ${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10000;
    animation: fadeInOut 2s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
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
      const tab = tabs[0];
      
      // Check if tab has URL loaded
      if (!tab.url) {
        elements.pageInfo.textContent = 'Loading...';
        elements.pageInfo.style.color = '#666';
        return;
      }
      
      try {
        const url = new URL(tab.url);
        const isPdf = tab.url.toLowerCase().endsWith('.pdf') || 
                      tab.url.includes('application/pdf');
        
        // Check if extension can run on this page
        const isRestrictedPage = tab.url.startsWith('chrome://') || 
                                 tab.url.startsWith('chrome-extension://') || 
                                 tab.url.startsWith('edge://') ||
                                 tab.url === 'about:blank';
        
        if (isRestrictedPage) {
          elements.pageInfo.textContent = '⚠️ Cannot run on system pages';
          elements.pageInfo.style.color = '#ef4444';
          return;
        }
        
        // Try to ping content script with retries
        let retries = 0;
        const maxRetries = 3;
        
        const tryPing = () => {
          chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (response) => {
            if (chrome.runtime.lastError || !response) {
              retries++;
              if (retries < maxRetries) {
                // Retry after delay
                elements.pageInfo.textContent = isPdf ? 
                  `📄 ${url.hostname} (checking...)` : 
                  `${url.hostname} (checking...)`;
                elements.pageInfo.style.color = '#f59e0b';
                setTimeout(tryPing, 300);
              } else {
                // Max retries reached
                elements.pageInfo.textContent = isPdf ? 
                  `📄 ${url.hostname} (refresh page)` : 
                  `${url.hostname} (refresh page)`;
                elements.pageInfo.style.color = '#f59e0b';
              }
            } else {
              // Success
              elements.pageInfo.textContent = isPdf ? 
                `📄 ${url.hostname} ✓` : 
                `${url.hostname} ✓`;
              elements.pageInfo.style.color = '#22c55e';
            }
          });
        };
        
        tryPing();
        
        // Update extract button text based on page type
        if (elements.extractBtn) {
          elements.extractBtn.textContent = isPdf ? 
            'Extract PDF Content' : 
            'Extract Article Content';
        }
      } catch {
        elements.pageInfo.textContent = '-';
        elements.pageInfo.style.color = '#666';
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
  
  // Populate occupation
  if (elements.caseOccupation) {
    elements.caseOccupation.value = currentCase.occupation || '';
  }
  
  // Populate incident type
  if (elements.incidentType) {
    elements.incidentType.value = currentCase.incidentType || 'death';
    handleIncidentTypeChange();
  }
  
  // Populate agencies
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    const agency = checkbox.value;
    checkbox.checked = currentCase.agencies && currentCase.agencies.includes(agency);
  });
  
  // Populate violations
  document.querySelectorAll('[id^="violation-"]').forEach(checkbox => {
    const violation = checkbox.value;
    checkbox.checked = currentCase.violations && currentCase.violations.includes(violation);
  });
  
  // Populate type-specific fields
  if (elements.deathCause) elements.deathCause.value = currentCase.deathCause || '';
  if (elements.deathManner) elements.deathManner.value = currentCase.deathManner || '';
  if (elements.deathCustodyDuration) elements.deathCustodyDuration.value = currentCase.deathCustodyDuration || '';
  if (elements.deathMedicalDenied) elements.deathMedicalDenied.checked = currentCase.deathMedicalDenied || false;
  
  if (elements.injuryType) elements.injuryType.value = currentCase.injuryType || '';
  if (elements.injurySeverity) elements.injurySeverity.value = currentCase.injurySeverity || 'moderate';
  if (elements.injuryWeapon) elements.injuryWeapon.value = currentCase.injuryWeapon || '';
  if (elements.injuryCause) elements.injuryCause.value = currentCase.injuryCause || '';
  
  if (elements.arrestReason) elements.arrestReason.value = currentCase.arrestReason || '';
  if (elements.arrestContext) elements.arrestContext.value = currentCase.arrestContext || '';
  if (elements.arrestCharges) elements.arrestCharges.value = currentCase.arrestCharges || '';
  if (elements.arrestTimingSuspicious) elements.arrestTimingSuspicious.checked = currentCase.arrestTimingSuspicious || false;
  if (elements.arrestPretext) elements.arrestPretext.checked = currentCase.arrestPretext || false;
  if (elements.arrestSelective) elements.arrestSelective.checked = currentCase.arrestSelective || false;
  
  if (elements.violationJournalism) elements.violationJournalism.checked = currentCase.violationJournalism || false;
  if (elements.violationProtest) elements.violationProtest.checked = currentCase.violationProtest || false;
  if (elements.violationActivism) elements.violationActivism.checked = currentCase.violationActivism || false;
  if (elements.violationSpeech) elements.violationSpeech.value = currentCase.violationSpeech || '';
  if (elements.violationRuling) elements.violationRuling.value = currentCase.violationRuling || '';
  
  // Populate shooting-specific fields
  if (elements.shootingFatal) elements.shootingFatal.checked = currentCase.shootingFatal || false;
  if (elements.shotsFired) elements.shotsFired.value = currentCase.shotsFired || '';
  if (elements.weaponType) elements.weaponType.value = currentCase.weaponType || '';
  if (elements.bodycamAvailable) elements.bodycamAvailable.checked = currentCase.bodycamAvailable || false;
  if (elements.victimArmed) elements.victimArmed.checked = currentCase.victimArmed || false;
  if (elements.warningGiven) elements.warningGiven.checked = currentCase.warningGiven || false;
  if (elements.shootingContext) elements.shootingContext.value = currentCase.shootingContext || '';
  
  // Populate excessive force fields
  document.querySelectorAll('[id^="force-"]').forEach(checkbox => {
    const forceType = checkbox.value;
    checkbox.checked = currentCase.forceTypes && currentCase.forceTypes.includes(forceType);
  });
  if (elements.victimRestrained) elements.victimRestrained.checked = currentCase.victimRestrained || false;
  if (elements.victimComplying) elements.victimComplying.checked = currentCase.victimComplying || false;
  if (elements.videoEvidence) elements.videoEvidence.checked = currentCase.videoEvidence || false;
  
  // Populate protest fields
  if (elements.protestTopic) elements.protestTopic.value = currentCase.protestTopic || '';
  if (elements.protestSize) elements.protestSize.value = currentCase.protestSize || '';
  if (elements.protestPermitted) elements.protestPermitted.checked = currentCase.protestPermitted || false;
  if (elements.dispersalMethod) elements.dispersalMethod.value = currentCase.dispersalMethod || '';
  if (elements.arrestsMade) elements.arrestsMade.value = currentCase.arrestsMade || '';
}

// Handle incident type change - show/hide relevant sections
function handleIncidentTypeChange() {
  const type = elements.incidentType.value;
  
  // Hide all type-specific sections
  [elements.deathFields, elements.injuryFields, elements.arrestFields, elements.violationFields,
   elements.shootingSection, elements.excessiveForceSection, elements.protestSection].forEach(el => {
    if (el) el.classList.add('hidden');
  });
  
  // Show violations section for relevant types
  if (elements.violationsSection) {
    const showViolations = ['rights_violation', 'arrest', 'shooting', 'excessive_force', 
                            'death_in_custody', 'death_during_operation', 'death_at_protest',
                            'protest_suppression', 'retaliation'].includes(type);
    elements.violationsSection.classList.toggle('hidden', !showViolations);
  }
  
  // Show type-specific section
  switch (type) {
    case 'death':
    case 'death_in_custody':
    case 'death_during_operation':
      if (elements.deathFields) elements.deathFields.classList.remove('hidden');
      break;
    case 'death_at_protest':
      if (elements.deathFields) elements.deathFields.classList.remove('hidden');
      if (elements.protestSection) elements.protestSection.classList.remove('hidden');
      break;
    case 'injury':
      if (elements.injuryFields) elements.injuryFields.classList.remove('hidden');
      break;
    case 'shooting':
      if (elements.shootingSection) elements.shootingSection.classList.remove('hidden');
      break;
    case 'excessive_force':
      if (elements.excessiveForceSection) elements.excessiveForceSection.classList.remove('hidden');
      break;
    case 'protest_suppression':
      if (elements.protestSection) elements.protestSection.classList.remove('hidden');
      if (elements.excessiveForceSection) elements.excessiveForceSection.classList.remove('hidden');
      break;
    case 'arrest':
      if (elements.arrestFields) elements.arrestFields.classList.remove('hidden');
      break;
    case 'rights_violation':
    case 'retaliation':
      if (elements.violationFields) elements.violationFields.classList.remove('hidden');
      break;
  }
  
  updateCaseFromForm();
}

// Update case from form
function updateCaseFromForm() {
  // Collect agencies
  const agencies = [];
  document.querySelectorAll('[id^="agency-"]:checked').forEach(checkbox => {
    agencies.push(checkbox.value);
  });
  
  // Collect violations
  const violations = [];
  document.querySelectorAll('[id^="violation-"]:checked').forEach(checkbox => {
    violations.push(checkbox.value);
  });
  
  // Collect force types
  const forceTypes = [];
  document.querySelectorAll('[id^="force-"]:checked').forEach(checkbox => {
    forceTypes.push(checkbox.value);
  });
  
  currentCase = {
    incidentType: elements.incidentType ? elements.incidentType.value : 'death_in_custody',
    name: elements.caseName.value,
    dateOfDeath: elements.caseDod.value,
    age: elements.caseAge.value,
    country: elements.caseCountry.value,
    occupation: elements.caseOccupation ? elements.caseOccupation.value : '',
    facility: elements.caseFacility.value,
    location: elements.caseLocation.value,
    causeOfDeath: elements.caseCause.value,
    agencies: agencies,
    violations: violations,
    // Death-specific
    deathCause: elements.deathCause ? elements.deathCause.value : '',
    deathManner: elements.deathManner ? elements.deathManner.value : '',
    deathCustodyDuration: elements.deathCustodyDuration ? elements.deathCustodyDuration.value : '',
    deathMedicalDenied: elements.deathMedicalDenied ? elements.deathMedicalDenied.checked : false,
    // Injury-specific
    injuryType: elements.injuryType ? elements.injuryType.value : '',
    injurySeverity: elements.injurySeverity ? elements.injurySeverity.value : 'moderate',
    injuryWeapon: elements.injuryWeapon ? elements.injuryWeapon.value : '',
    injuryCause: elements.injuryCause ? elements.injuryCause.value : '',
    // Arrest-specific
    arrestReason: elements.arrestReason ? elements.arrestReason.value : '',
    arrestContext: elements.arrestContext ? elements.arrestContext.value : '',
    arrestCharges: elements.arrestCharges ? elements.arrestCharges.value : '',
    arrestTimingSuspicious: elements.arrestTimingSuspicious ? elements.arrestTimingSuspicious.checked : false,
    arrestPretext: elements.arrestPretext ? elements.arrestPretext.checked : false,
    arrestSelective: elements.arrestSelective ? elements.arrestSelective.checked : false,
    // Violation-specific
    violationJournalism: elements.violationJournalism ? elements.violationJournalism.checked : false,
    violationProtest: elements.violationProtest ? elements.violationProtest.checked : false,
    violationActivism: elements.violationActivism ? elements.violationActivism.checked : false,
    violationSpeech: elements.violationSpeech ? elements.violationSpeech.value : '',
    violationRuling: elements.violationRuling ? elements.violationRuling.value : '',
    // Shooting-specific
    shootingFatal: elements.shootingFatal ? elements.shootingFatal.checked : false,
    shotsFired: elements.shotsFired ? elements.shotsFired.value : '',
    weaponType: elements.weaponType ? elements.weaponType.value : '',
    bodycamAvailable: elements.bodycamAvailable ? elements.bodycamAvailable.checked : false,
    victimArmed: elements.victimArmed ? elements.victimArmed.checked : false,
    warningGiven: elements.warningGiven ? elements.warningGiven.checked : false,
    shootingContext: elements.shootingContext ? elements.shootingContext.value : '',
    // Excessive force-specific
    forceTypes: forceTypes,
    victimRestrained: elements.victimRestrained ? elements.victimRestrained.checked : false,
    victimComplying: elements.victimComplying ? elements.victimComplying.checked : false,
    videoEvidence: elements.videoEvidence ? elements.videoEvidence.checked : false,
    // Protest-specific
    protestTopic: elements.protestTopic ? elements.protestTopic.value : '',
    protestSize: elements.protestSize ? elements.protestSize.value : '',
    protestPermitted: elements.protestPermitted ? elements.protestPermitted.checked : false,
    dispersalMethod: elements.dispersalMethod ? elements.dispersalMethod.value : '',
    arrestsMade: elements.arrestsMade ? elements.arrestsMade.value : ''
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
      ${quote.sourceUrl ? `<div class="quote-source"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank" class="source-link" title="${escapeHtml(quote.sourceUrl)}">🔗 ${escapeHtml(quote.sourceTitle || new URL(quote.sourceUrl).hostname)}</a></div>` : ''}
      <div class="quote-actions">
        <button class="btn btn-sm btn-icon" onclick="copyQuote('${quote.id}', true)" title="Copy quote">📋</button>
        <button class="btn btn-sm btn-icon" onclick="highlightAndScroll('${quote.id}', true)" title="Find & scroll to on page">🎯</button>
        <button class="btn btn-sm btn-icon pin-btn" onclick="togglePinHighlight('${quote.id}', true)" title="Pin highlight on page">📌</button>
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
      ${quote.sourceUrl ? `<div class="quote-source"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank" class="source-link" title="${escapeHtml(quote.sourceUrl)}">🔗 ${escapeHtml(quote.sourceTitle || new URL(quote.sourceUrl).hostname)}</a></div>` : ''}
      <div class="quote-actions">
        <button class="btn btn-sm btn-success" onclick="acceptQuote('${quote.id}')" title="Accept">✓</button>
        <button class="btn btn-sm btn-danger" onclick="rejectQuote('${quote.id}')" title="Reject">✗</button>
        <button class="btn btn-sm btn-icon" onclick="copyQuote('${quote.id}', false)" title="Copy">📋</button>
        <button class="btn btn-sm btn-icon" onclick="highlightAndScroll('${quote.id}', false)" title="Find & scroll to on page">🎯</button>
        <button class="btn btn-sm btn-icon pin-btn" onclick="togglePinHighlight('${quote.id}', false)" title="Pin highlight on page">📌</button>
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
  
  // Get current domain from page info
  const domainText = elements.pageInfo.textContent || '';
  const domain = domainText.replace('📄 ', '').replace(' (PDF)', '');
  
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
          
          // Pass PDF sentences with page numbers and source URL
          await classifySentences(response.sentences, true, tabs[0].url, response.title || tabs[0].title);
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
        
        // Classify sentences (no page numbers for articles) with source URL
        await classifySentences(response.sentences, false, tabs[0].url, response.headline || tabs[0].title);
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
async function classifySentences(sentences, isPdf = false, sourceUrl = '', sourceTitle = '') {
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
        sourceUrl: sourceUrl,
        sourceTitle: sourceTitle,
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
          sourceUrl: sourceUrl,
          sourceTitle: sourceTitle,
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

// Sync quotes to background script and notify overlay
function syncQuotesToBackground() {
  // Sync all state to background
  chrome.runtime.sendMessage({ 
    type: 'SYNC_STATE', 
    pendingQuotes: pendingQuotes,
    verifiedQuotes: verifiedQuotes,
    sources: sources,
    currentCase: currentCase
  });
  
  // Notify overlay to refresh if it's open
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'REFRESH_OVERLAY' }).catch(() => {});
    }
  });
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
    showNotification('Quote copied!', 'success');
  }
};

// Highlight quote on page (basic - clears previous)
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

// Highlight and scroll to quote with visual feedback
window.highlightAndScroll = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => q.id === quoteId);
  if (quote) {
    // Flash the quote card to show it was activated
    const card = document.querySelector(`[data-id="${quoteId}"]`);
    if (card) {
      card.classList.add('highlight-flash');
      setTimeout(() => card.classList.remove('highlight-flash'), 300);
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'HIGHLIGHT_AND_SCROLL', 
        text: quote.text,
        category: quote.category || '',
        flash: true
      }, (response) => {
        if (response && response.found) {
          showNotification('Found on page!', 'success');
        } else {
          showNotification('Text not found on this page', 'error');
        }
      });
    });
  }
};

// Track pinned highlights
let pinnedHighlights = new Set();

// Toggle pinned highlight (stays visible until manually cleared)
window.togglePinHighlight = function(quoteId, isVerified) {
  const list = isVerified ? verifiedQuotes : pendingQuotes;
  const quote = list.find(q => q.id === quoteId);
  if (!quote) return;
  
  const btn = document.querySelector(`[data-id="${quoteId}"] .pin-btn`);
  
  if (pinnedHighlights.has(quoteId)) {
    // Unpin - remove this specific highlight
    pinnedHighlights.delete(quoteId);
    if (btn) btn.classList.remove('active');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'REMOVE_HIGHLIGHT_BY_TEXT', 
        text: quote.text
      });
    });
    showNotification('Highlight unpinned', 'info');
  } else {
    // Pin - add persistent highlight
    pinnedHighlights.add(quoteId);
    if (btn) btn.classList.add('active');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        type: 'PIN_HIGHLIGHT', 
        text: quote.text,
        category: quote.category || '',
        quoteId: quoteId
      }, (response) => {
        if (response && response.found) {
          showNotification('Highlight pinned!', 'success');
        } else {
          showNotification('Text not found on this page', 'error');
          pinnedHighlights.delete(quoteId);
          if (btn) btn.classList.remove('active');
        }
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

// Build incident object for API
function buildIncidentObject() {
  const incidentType = currentCase.incidentType || 'death';
  const date = currentCase.dateOfDeath || new Date().toISOString().split('T')[0];
  const nameSlug = (currentCase.name || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  // Parse location
  let city = '', state = '';
  if (currentCase.location) {
    const parts = currentCase.location.split(',').map(p => p.trim());
    city = parts[0] || '';
    state = parts[1] || '';
  }
  
  const incident = {
    incident_id: `${date}-${incidentType === 'death' ? nameSlug : incidentType + '-' + (city || 'unknown').toLowerCase()}`,
    incident_type: incidentType,
    date: date,
    date_precision: 'exact',
    location: {
      city: city,
      state: state,
      country: 'USA',
      facility: currentCase.facility || undefined
    },
    subject: {
      name: currentCase.name || undefined,
      name_public: !!currentCase.name,
      age: currentCase.age ? parseInt(currentCase.age) : undefined,
      nationality: currentCase.country || undefined,
      occupation: currentCase.occupation || undefined
    },
    summary: currentCase.causeOfDeath || '',
    agencies_involved: currentCase.agencies || [],
    violations_alleged: currentCase.violations || [],
    verified: false
  };
  
  // Add type-specific details
  switch (incidentType) {
    case 'death':
      incident.death_details = {
        cause_of_death: currentCase.deathCause || currentCase.causeOfDeath || '',
        cause_source: 'unknown',
        manner_of_death: currentCase.deathManner || undefined,
        custody_duration: currentCase.deathCustodyDuration || undefined,
        medical_requests_denied: currentCase.deathMedicalDenied || false
      };
      break;
      
    case 'injury':
      incident.injury_details = {
        injury_type: currentCase.injuryType || '',
        severity: currentCase.injurySeverity || 'moderate',
        cause: currentCase.injuryCause || '',
        weapon_used: currentCase.injuryWeapon || undefined
      };
      break;
      
    case 'arrest':
      incident.arrest_details = {
        stated_reason: currentCase.arrestReason || '',
        actual_context: currentCase.arrestContext || undefined,
        charges: currentCase.arrestCharges ? currentCase.arrestCharges.split(',').map(c => c.trim()) : [],
        timing_suspicious: currentCase.arrestTimingSuspicious || false,
        pretext_arrest: currentCase.arrestPretext || false,
        selective_enforcement: currentCase.arrestSelective || false
      };
      break;
      
    case 'rights_violation':
      incident.violation_details = {
        violation_types: currentCase.violations || [],
        journalism_related: currentCase.violationJournalism || false,
        protest_related: currentCase.violationProtest || false,
        activism_related: currentCase.violationActivism || false,
        speech_content: currentCase.violationSpeech || undefined,
        court_ruling: currentCase.violationRuling || undefined
      };
      break;
  }
  
  return incident;
}

// Save case to API
async function saveCase() {
  if (!isConnected) {
    alert('Not connected to API. Please ensure the server is running.');
    return;
  }
  
  if (!currentCase.name && currentCase.incidentType === 'death') {
    alert('Please enter a name for the case.');
    return;
  }
  
  if (!apiKey) {
    alert('Please enter an API key in the Settings tab.');
    return;
  }
  
  elements.saveCaseBtn.disabled = true;
  elements.saveCaseBtn.innerHTML = '<div class="spinner white"></div> Saving...';
  
  const incident = buildIncidentObject();
  
  try {
    // First, create the incident
    const response = await fetch(`${apiUrl}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(incident)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create incident');
    }
    
    const result = await response.json();
    const incidentDbId = result.id;
    
    // Then add sources and quotes if we have an ID
    if (incidentDbId && (sources.length > 0 || verifiedQuotes.length > 0)) {
      const patchData = {};
      
      if (sources.length > 0) {
        patchData.sources = sources.map(s => ({
          url: s.url,
          title: s.title,
          publication: s.publication || undefined,
          source_type: 'news_article'
        }));
      }
      
      if (verifiedQuotes.length > 0) {
        patchData.quotes = verifiedQuotes.map(q => ({
          text: q.text,
          category: q.category,
          page_number: q.pageNumber || undefined,
          confidence: q.confidence || undefined,
          verified: false
        }));
      }
      
      await fetch(`${apiUrl}/api/incidents/${incidentDbId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(patchData)
      });
    }
    
    alert(`Incident saved successfully! ID: ${incident.incident_id}`);
  } catch (error) {
    console.error('Save error:', error);
    alert('Failed to save incident: ' + error.message);
  } finally {
    elements.saveCaseBtn.disabled = false;
    elements.saveCaseBtn.textContent = 'Save Incident';
  }
}

// Create new case
function newCase() {
  if (verifiedQuotes.length > 0 || currentCase.name) {
    if (!confirm('Start a new incident? Current data will be cleared.')) {
      return;
    }
  }
  
  clearCase();
}

// Clear current case
function clearCase() {
  currentCase = {
    incidentType: 'death',
    name: '',
    dateOfDeath: '',
    age: '',
    country: '',
    occupation: '',
    facility: '',
    location: '',
    causeOfDeath: '',
    agencies: [],
    violations: [],
    deathCause: '',
    deathManner: '',
    deathCustodyDuration: '',
    deathMedicalDenied: false,
    injuryType: '',
    injurySeverity: 'moderate',
    injuryWeapon: '',
    injuryCause: '',
    arrestReason: '',
    arrestContext: '',
    arrestCharges: '',
    arrestTimingSuspicious: false,
    arrestPretext: false,
    arrestSelective: false,
    violationJournalism: false,
    violationProtest: false,
    violationActivism: false,
    violationSpeech: '',
    violationRuling: ''
  };
  verifiedQuotes = [];
  pendingQuotes = [];
  sources = [];
  
  // Clear agency checkboxes
  document.querySelectorAll('[id^="agency-"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Clear violation checkboxes
  document.querySelectorAll('[id^="violation-"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
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
      
    case 'REFRESH_QUOTES':
      // Reload state from background when overlay makes changes
      loadState();
      break;
    
    case 'DOCUMENT_LOADED':
      // Document loaded from website - refresh all data
      loadState().then(() => {
        showNotification(`Document loaded: ${message.documentData.name || 'Unnamed'}`, 'success');
        // Switch to case tab to show the loaded data
        const caseTab = document.querySelector('[data-tab="case"]');
        if (caseTab) caseTab.click();
      });
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
  const incident = buildIncidentObject();
  const exportData = {
    incident: incident,
    quotes: verifiedQuotes,
    sources: sources,
    exportedAt: new Date().toISOString()
  };
  
  const filename = incident.incident_id || `incident-${new Date().toISOString().split('T')[0]}`;
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Get incident type label
function getIncidentTypeLabel(type) {
  const labels = {
    death: 'Death in Custody',
    injury: 'Injury',
    medical_neglect: 'Medical Neglect',
    arrest: 'Arrest/Detention',
    rights_violation: 'Rights Violation',
    deportation: 'Deportation',
    family_separation: 'Family Separation',
    workplace_raid: 'Workplace Raid',
    other: 'Other'
  };
  return labels[type] || type;
}

// Export as Markdown
function exportAsMarkdown() {
  const incident = buildIncidentObject();
  const incidentType = currentCase.incidentType || 'death';
  
  let md = `# ${currentCase.name || 'Subject Unknown'}\n\n`;
  md += `**Incident Type:** ${getIncidentTypeLabel(incidentType)}\n`;
  
  if (currentCase.dateOfDeath) {
    md += `**Date:** ${currentCase.dateOfDeath}\n`;
  }
  if (currentCase.age) {
    md += `**Age:** ${currentCase.age}\n`;
  }
  if (currentCase.country) {
    md += `**Nationality:** ${currentCase.country}\n`;
  }
  if (currentCase.occupation) {
    md += `**Occupation:** ${currentCase.occupation}\n`;
  }
  if (currentCase.facility) {
    md += `**Facility:** ${currentCase.facility}\n`;
  }
  if (currentCase.location) {
    md += `**Location:** ${currentCase.location}\n`;
  }
  
  // Agencies involved
  if (currentCase.agencies && currentCase.agencies.length > 0) {
    md += `**Agencies Involved:** ${currentCase.agencies.join(', ')}\n`;
  }
  
  // Violations alleged
  if (currentCase.violations && currentCase.violations.length > 0) {
    md += `**Violations Alleged:** ${currentCase.violations.join(', ')}\n`;
  }
  
  if (currentCase.causeOfDeath) {
    md += `\n## Summary\n\n${currentCase.causeOfDeath}\n`;
  }
  
  // Type-specific details
  if (incidentType === 'death' && incident.death_details) {
    md += `\n## Death Details\n\n`;
    if (incident.death_details.cause_of_death) md += `- **Cause:** ${incident.death_details.cause_of_death}\n`;
    if (incident.death_details.manner_of_death) md += `- **Manner:** ${incident.death_details.manner_of_death}\n`;
    if (incident.death_details.custody_duration) md += `- **Custody Duration:** ${incident.death_details.custody_duration}\n`;
    if (incident.death_details.medical_requests_denied) md += `- **Medical Requests Denied:** Yes\n`;
  }
  
  if (incidentType === 'arrest' && incident.arrest_details) {
    md += `\n## Arrest Details\n\n`;
    if (incident.arrest_details.stated_reason) md += `- **Stated Reason:** ${incident.arrest_details.stated_reason}\n`;
    if (incident.arrest_details.actual_context) md += `- **Actual Context:** ${incident.arrest_details.actual_context}\n`;
    if (incident.arrest_details.charges?.length) md += `- **Charges:** ${incident.arrest_details.charges.join(', ')}\n`;
    if (incident.arrest_details.timing_suspicious) md += `- ⚠️ **Timing Suspicious**\n`;
    if (incident.arrest_details.pretext_arrest) md += `- ⚠️ **Pretext Arrest Indicators**\n`;
    if (incident.arrest_details.selective_enforcement) md += `- ⚠️ **Selective Enforcement**\n`;
  }
  
  if (incidentType === 'rights_violation' && incident.violation_details) {
    md += `\n## Violation Details\n\n`;
    if (incident.violation_details.journalism_related) md += `- 📰 **Journalism Related**\n`;
    if (incident.violation_details.protest_related) md += `- ✊ **Protest Related**\n`;
    if (incident.violation_details.activism_related) md += `- 📢 **Activism Related**\n`;
    if (incident.violation_details.speech_content) md += `- **Speech/Activity:** ${incident.violation_details.speech_content}\n`;
    if (incident.violation_details.court_ruling) md += `- **Court Ruling:** ${incident.violation_details.court_ruling}\n`;
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
  
  const filename = incident.incident_id || `incident-${new Date().toISOString().split('T')[0]}`;
  
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
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

// Listen for tab changes to update page info
chrome.tabs.onActivated.addListener(() => {
  // Delay to let content script load on new tab
  setTimeout(() => {
    updatePageInfo();
  }, 500);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    // Small delay to ensure content script is ready
    setTimeout(() => {
      updatePageInfo();
    }, 300);
  }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
