/**
 * State Management for Research Platform Extension
 * Handles Chrome storage and application state
 */

// Application State - Single source of truth
const AppState = {
  // Connection
  connection: {
    apiUrl: '',
    token: '',
    connected: false,
    user: null
  },
  
  // Project Context
  project: {
    id: null,
    name: '',
    slug: '',
    description: ''
  },
  
  recordType: {
    id: null,
    name: '',
    slug: '',
    fields: []
  },
  
  // Current Work
  currentRecord: null,
  isEditMode: false,
  isReviewMode: false,
  recordId: null,
  
  // Form Data
  formValues: {},
  
  // Quotes & Sources
  quotes: [],
  sources: [],
  fieldQuoteLinks: {},
  
  // Review Queue
  reviewQueue: [],
  reviewFilter: 'pending_review',
  
  // UI State
  activeTab: 'record',
  activePanel: 'settings',
  isLoading: false,
  
  // Page Extraction
  extractedData: null,
  extractedSentences: [],
  
  // AI Analysis
  aiConfig: null,
  analysisResults: null
};

// Storage keys
const STORAGE_KEYS = {
  SETTINGS: 'rp_settings',
  CACHE: 'rp_cache',
  DRAFT: 'rp_draft'
};

/**
 * Storage Manager - Handles Chrome storage operations
 */
const StorageManager = {
  // Load settings from storage
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
        const settings = result[STORAGE_KEYS.SETTINGS] || {};
        resolve(settings);
      });
    });
  },

  // Save settings to storage
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
        resolve(settings);
      });
    });
  },

  // Load cached data
  async loadCache() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.CACHE], (result) => {
        resolve(result[STORAGE_KEYS.CACHE] || {});
      });
    });
  },

  // Save to cache
  async saveCache(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: data }, resolve);
    });
  },

  // Load draft (work in progress)
  async loadDraft() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.DRAFT], (result) => {
        const draft = result[STORAGE_KEYS.DRAFT] || null;
        if (draft) {
          AppState.formData = draft.formData || {};
          AppState.quotes = draft.quotes || [];
          AppState.sources = draft.sources || [];
          AppState.fieldQuoteLinks = draft.fieldQuoteLinks || {};
        }
        resolve(draft);
      });
    });
  },

  // Save draft
  async saveDraft() {
    const draft = {
      projectSlug: AppState.currentProject?.slug,
      recordTypeSlug: AppState.currentRecordType?.slug,
      formData: AppState.formData,
      quotes: AppState.quotes,
      sources: AppState.sources,
      fieldQuoteLinks: AppState.fieldQuoteLinks,
      savedAt: new Date().toISOString()
    };
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.DRAFT]: draft }, resolve);
    });
  },

  // Clear draft
  async clearDraft() {
    AppState.formData = {};
    AppState.quotes = [];
    AppState.sources = [];
    AppState.fieldQuoteLinks = {};
    
    return new Promise((resolve) => {
      chrome.storage.local.remove([STORAGE_KEYS.DRAFT], resolve);
    });
  },

  // Clear all extension data
  async clearAll() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }
};

/**
 * State helpers
 */
const StateHelpers = {
  // Reset form state for new record
  resetFormState() {
    AppState.currentRecord = null;
    AppState.isEditMode = false;
    AppState.isReviewMode = false;
    AppState.recordId = null;
    AppState.formData = {};
    AppState.quotes = [];
    AppState.sources = [];
    AppState.fieldQuoteLinks = {};
    AppState.extractedData = null;
    AppState.extractedSentences = [];
  },

  // Set current project
  setProject(project) {
    AppState.currentProject = project;
    AppState.recordTypes = [];
    AppState.currentRecordType = null;
    AppState.fieldDefinitions = [];
    AppState.fieldGroups = [];
    this.resetFormState();
    
    StorageManager.saveCache({ 
      lastProjectSlug: project?.slug 
    });
  },

  // Set current record type
  setRecordType(recordType, fields = [], groups = []) {
    AppState.currentRecordType = recordType;
    AppState.fieldDefinitions = fields;
    AppState.fieldGroups = groups;
    this.resetFormState();
    
    StorageManager.saveCache({ 
      lastRecordTypeSlug: recordType?.slug 
    });
  },

  // Set record for editing/reviewing
  setCurrentRecord(record, quotes = [], sources = []) {
    AppState.currentRecord = record;
    AppState.recordId = record.id;
    AppState.formData = record.data || {};
    AppState.quotes = quotes;
    AppState.sources = sources;
    
    // Build field quote links from quotes
    AppState.fieldQuoteLinks = {};
    quotes.forEach(q => {
      if (q.linked_fields) {
        q.linked_fields.forEach(field => {
          if (!AppState.fieldQuoteLinks[field]) {
            AppState.fieldQuoteLinks[field] = [];
          }
          AppState.fieldQuoteLinks[field].push(q.id);
        });
      }
    });
  },

  // Update form field value
  setFieldValue(fieldSlug, value) {
    AppState.formData[fieldSlug] = value;
    StorageManager.saveDraft();
  },

  // Add a quote
  addQuote(quote) {
    const newQuote = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: quote.text,
      source: quote.source || '',
      sourceUrl: quote.sourceUrl || '',
      sourceDate: quote.sourceDate || '',
      linkedFields: quote.linkedFields || [],
      status: 'pending',
      addedAt: new Date().toISOString()
    };
    AppState.quotes.push(newQuote);
    StorageManager.saveDraft();
    return newQuote;
  },

  // Link quote to field
  linkQuoteToField(quoteId, fieldSlug) {
    if (!AppState.fieldQuoteLinks[fieldSlug]) {
      AppState.fieldQuoteLinks[fieldSlug] = [];
    }
    if (!AppState.fieldQuoteLinks[fieldSlug].includes(quoteId)) {
      AppState.fieldQuoteLinks[fieldSlug].push(quoteId);
    }
    
    // Also update the quote's linkedFields
    const quote = AppState.quotes.find(q => q.id === quoteId);
    if (quote && !quote.linkedFields?.includes(fieldSlug)) {
      quote.linkedFields = quote.linkedFields || [];
      quote.linkedFields.push(fieldSlug);
    }
    
    StorageManager.saveDraft();
  },

  // Unlink quote from field
  unlinkQuoteFromField(quoteId, fieldSlug) {
    if (AppState.fieldQuoteLinks[fieldSlug]) {
      AppState.fieldQuoteLinks[fieldSlug] = AppState.fieldQuoteLinks[fieldSlug]
        .filter(id => id !== quoteId);
    }
    
    const quote = AppState.quotes.find(q => q.id === quoteId);
    if (quote && quote.linkedFields) {
      quote.linkedFields = quote.linkedFields.filter(f => f !== fieldSlug);
    }
    
    StorageManager.saveDraft();
  },

  // Get quotes for a field
  getQuotesForField(fieldSlug) {
    const ids = AppState.fieldQuoteLinks[fieldSlug] || [];
    return AppState.quotes.filter(q => ids.includes(q.id));
  },

  // Add a source
  addSource(source) {
    // Check for duplicate URL
    if (AppState.sources.find(s => s.url === source.url)) {
      return null;
    }
    
    const newSource = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: source.url,
      title: source.title || '',
      sourceType: source.sourceType || 'article',
      accessedDate: source.accessedDate || new Date().toISOString().split('T')[0],
      archivedUrl: source.archivedUrl || '',
      notes: source.notes || '',
      linkedFields: source.linkedFields || []
    };
    AppState.sources.push(newSource);
    StorageManager.saveDraft();
    return newSource;
  },

  // Remove a source
  removeSource(sourceId) {
    AppState.sources = AppState.sources.filter(s => s.id !== sourceId);
    StorageManager.saveDraft();
  },

  // Remove a quote
  removeQuote(quoteId) {
    AppState.quotes = AppState.quotes.filter(q => q.id !== quoteId);
    
    // Remove from all field links
    for (const field of Object.keys(AppState.fieldQuoteLinks)) {
      AppState.fieldQuoteLinks[field] = AppState.fieldQuoteLinks[field]
        .filter(id => id !== quoteId);
    }
    
    StorageManager.saveDraft();
  }
};

// Export for use
if (typeof window !== 'undefined') {
  window.AppState = AppState;
  window.StorageManager = StorageManager;
  window.StateHelpers = StateHelpers;
}

export { AppState, StorageManager, StateHelpers, STORAGE_KEYS };
