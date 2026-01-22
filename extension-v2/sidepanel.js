/**
 * Research Platform Extension - Side Panel
 * 
 * Tabs:
 * - Submit: Create new records using guest form fields
 * - Review: Queue of pending_review records, click to review
 * - Validate: Queue of pending_validation records, click to validate
 * 
 * AI Analysis is a tool panel shown within Review/Validate detail views
 * when the project has ai_analysis_config defined.
 */

import { ResearchPlatformAPI } from './lib/api.js';
import { StorageManager } from './lib/storage.js';
import { DynamicFormGenerator } from './lib/forms.js';
import { QuoteManager } from './lib/quotes.js';
import { SourceManager } from './lib/sources.js';
import { AIAnalysisEngine } from './lib/ai-analysis.js';
import { showToast, formatDate, escapeHtml } from './lib/utils.js';

// ============================================================================
// Constants
// ============================================================================

const API_URL = 'https://research-platform-beige.vercel.app';

// ============================================================================
// Application State
// ============================================================================

const state = {
  // Connection
  connected: false,
  user: null,
  token: null,
  
  // Project
  project: null,      // { id, slug, name, settings }
  recordTypes: [],    // All record types for project
  
  // Current tab
  activeTab: 'submit',
  
  // Submit tab state
  submitRecordType: null,
  submitFormValues: {},
  
  // Review tab state
  reviewQueue: [],
  reviewingRecord: null,
  reviewFormValues: {},
  reviewQuotes: [],
  reviewSources: [],
  
  // Validate tab state
  validateQueue: [],
  validatingRecord: null,
  validateFormValues: {},
  verifiedFields: {},
  
  // AI Analysis
  aiConfig: null
};

// ============================================================================
// API Instance
// ============================================================================

let api = null;

// ============================================================================
// Module Instances
// ============================================================================

let submitFormGenerator = null;
let reviewFormGenerator = null;
let validateFormGenerator = null;
let quoteManager = null;
let sourceManager = null;
let aiEngine = null;

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  console.log('[Extension] Initializing...');
  
  // Initialize managers
  quoteManager = new QuoteManager({
    onQuotesChange: (quotes) => {
      state.reviewQuotes = quotes;
      updateQuoteCount();
    }
  });
  
  sourceManager = new SourceManager({
    onSourcesChange: (sources) => {
      state.reviewSources = sources;
      updateSourceCount();
    }
  });
  
  aiEngine = new AIAnalysisEngine({
    onAnalysisComplete: (results) => renderAIResults(results)
  });
  
  // Try to restore session
  await tryRestoreSession();
  
  // Setup event listeners
  setupEventListeners();
  
  console.log('[Extension] Initialized');
}

// ============================================================================
// Authentication
// ============================================================================

async function tryRestoreSession() {
  try {
    const settings = await StorageManager.loadSettings();
    if (settings.token) {
      api = new ResearchPlatformAPI(API_URL, settings.token);
      
      // Verify token still works
      const projects = await api.getProjects();
      
      state.connected = true;
      state.token = settings.token;
      state.user = settings.user;
      
      updateConnectionUI(true);
      populateProjects(projects);
      
      // If we had a project selected, restore it
      if (settings.lastProjectSlug) {
        document.getElementById('select-project').value = settings.lastProjectSlug;
        await handleProjectChange();
      }
      
      showPanel('submit');
      console.log('[Extension] Session restored');
    }
  } catch (err) {
    console.log('[Extension] No valid session, need to sign in');
  }
}

async function signIn() {
  const authUrl = `${API_URL}/auth/extension?return=message`;
  const width = 500;
  const height = 600;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;
  
  const popup = window.open(
    authUrl,
    'Research Platform Sign In',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  const handleMessage = async (event) => {
    const expectedOrigin = new URL(API_URL).origin;
    if (event.origin !== expectedOrigin) return;

    if (event.data?.type === 'RESEARCH_PLATFORM_AUTH') {
      window.removeEventListener('message', handleMessage);
      
      if (event.data.success) {
        await handleAuthSuccess(event.data);
      } else {
        showToast('Sign in failed', 'error');
      }
      
      if (popup && !popup.closed) {
        popup.close();
      }
    }
  };

  window.addEventListener('message', handleMessage);
}

async function handleAuthSuccess(authData) {
  const { token, user } = authData;
  
  state.connected = true;
  state.token = token;
  state.user = user;
  
  await StorageManager.saveSettings({ token, user });
  
  api = new ResearchPlatformAPI(API_URL, token);
  
  updateConnectionUI(true);
  
  try {
    const projects = await api.getProjects();
    populateProjects(projects);
    showPanel('submit');
    showToast(`Signed in as ${user.email}`, 'success');
  } catch (err) {
    console.error('Failed to load projects:', err);
    showToast('Signed in but failed to load projects', 'error');
  }
}

async function signOut() {
  state.connected = false;
  state.token = null;
  state.user = null;
  state.project = null;
  
  await StorageManager.saveSettings({ token: null, user: null });
  
  api = null;
  
  updateConnectionUI(false);
  showPanel('settings');
  showToast('Signed out', 'info');
}

function updateConnectionUI(connected) {
  const indicator = document.getElementById('status-indicator');
  const title = document.getElementById('header-title');
  
  if (connected) {
    indicator.classList.add('connected');
    title.textContent = state.user?.name || 'Connected';
    
    document.getElementById('project-bar').classList.remove('hidden');
    document.getElementById('tab-nav').classList.remove('hidden');
    document.getElementById('signin-section').classList.add('hidden');
    document.getElementById('connected-section').classList.remove('hidden');
    
    // Update user card
    document.getElementById('user-name').textContent = state.user?.name || state.user?.email;
    document.getElementById('user-email').textContent = state.user?.email || '';
    document.getElementById('user-role').textContent = `Role: ${state.user?.role || 'user'}`;
    
    const initials = (state.user?.name || state.user?.email || '?')
      .split(/[\s@]/)
      .slice(0, 2)
      .map(s => s[0]?.toUpperCase() || '')
      .join('');
    document.getElementById('user-avatar').textContent = initials;
  } else {
    indicator.classList.remove('connected');
    title.textContent = 'Research Platform';
    
    document.getElementById('project-bar').classList.add('hidden');
    document.getElementById('tab-nav').classList.add('hidden');
    document.getElementById('signin-section').classList.remove('hidden');
    document.getElementById('connected-section').classList.add('hidden');
  }
}

// ============================================================================
// Project Selection
// ============================================================================

function populateProjects(projects) {
  const select = document.getElementById('select-project');
  select.innerHTML = '<option value="">Select Project...</option>';
  
  for (const item of projects) {
    const project = item.project || item;
    const option = document.createElement('option');
    option.value = project.slug;
    option.textContent = project.name;
    select.appendChild(option);
  }
}

async function handleProjectChange() {
  const slug = document.getElementById('select-project').value;
  
  if (!slug) {
    state.project = null;
    state.recordTypes = [];
    return;
  }
  
  try {
    // Get project details
    const project = await api.getProject(slug);
    state.project = project;
    
    // Get record types
    const recordTypes = await api.getRecordTypes(slug);
    state.recordTypes = recordTypes;
    
    // Load AI config if available
    if (project.settings?.ai_analysis_config) {
      state.aiConfig = project.settings.ai_analysis_config;
      aiEngine.loadConfig(state.aiConfig);
    } else {
      state.aiConfig = null;
    }
    
    // Populate record type dropdowns in each tab
    populateRecordTypeSelects();
    
    // Save selection
    await StorageManager.saveSettings({ lastProjectSlug: slug });
    
    // Refresh current tab data
    await refreshCurrentTab();
    
  } catch (err) {
    console.error('Failed to load project:', err);
    showToast('Failed to load project', 'error');
  }
}

function populateRecordTypeSelects() {
  const selects = [
    document.getElementById('select-record-type-submit'),
    document.getElementById('filter-record-type-review'),
    document.getElementById('filter-record-type-validate')
  ];
  
  for (const select of selects) {
    const isFilter = select.id.startsWith('filter');
    select.innerHTML = isFilter 
      ? '<option value="">All Record Types</option>'
      : '<option value="">Select Record Type...</option>';
    
    for (const rt of state.recordTypes) {
      const option = document.createElement('option');
      option.value = rt.slug;
      option.textContent = rt.name;
      select.appendChild(option);
    }
  }
}

// ============================================================================
// Tab Navigation
// ============================================================================

function showPanel(panelName) {
  // Hide all panels
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  
  // Show target panel
  const panel = document.getElementById(`panel-${panelName}`);
  if (panel) {
    panel.classList.add('active');
    panel.classList.remove('hidden');
  }
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === panelName);
  });
  
  state.activeTab = panelName;
}

async function refreshCurrentTab() {
  switch (state.activeTab) {
    case 'submit':
      // Nothing to refresh, user selects record type manually
      break;
    case 'review':
      await loadReviewQueue();
      break;
    case 'validate':
      await loadValidateQueue();
      break;
  }
}

// ============================================================================
// Submit Tab
// ============================================================================

async function handleSubmitRecordTypeChange() {
  const slug = document.getElementById('select-record-type-submit').value;
  const container = document.getElementById('submit-form-container');
  const actions = document.getElementById('submit-actions');
  
  if (!slug) {
    container.innerHTML = '<p class="empty-state">Select a record type to start creating a new record.</p>';
    actions.classList.add('hidden');
    state.submitRecordType = null;
    return;
  }
  
  try {
    // Get record type with fields
    const recordType = await api.getRecordType(state.project.slug, slug);
    state.submitRecordType = recordType;
    
    // Filter to guest form fields only
    const guestFields = (recordType.fields || []).filter(f => f.show_in_guest_form);
    
    if (guestFields.length === 0) {
      container.innerHTML = '<p class="empty-state">This record type has no guest submission fields configured.</p>';
      actions.classList.add('hidden');
      return;
    }
    
    // Generate form
    if (!submitFormGenerator) {
      submitFormGenerator = new DynamicFormGenerator(container, {
        onFieldChange: (slug, value) => {
          state.submitFormValues[slug] = value;
        }
      });
    }
    
    submitFormGenerator.setSchema(guestFields, recordType.field_groups || [], 'guest');
    actions.classList.remove('hidden');
    
  } catch (err) {
    console.error('Failed to load record type:', err);
    container.innerHTML = '<p class="error">Failed to load form.</p>';
  }
}

async function submitRecord() {
  if (!state.submitRecordType || !state.project) {
    showToast('Select a record type first', 'error');
    return;
  }
  
  const values = submitFormGenerator?.getValues() || {};
  
  try {
    await api.createRecord(state.project.slug, {
      record_type_slug: state.submitRecordType.slug,
      data: values,
      is_guest: true
    });
    
    showToast('Record submitted successfully', 'success');
    
    // Reset form by setting empty values
    submitFormGenerator?.setValues({});
    state.submitFormValues = {};
    
  } catch (err) {
    console.error('Failed to submit record:', err);
    showToast(err.message || 'Failed to submit record', 'error');
  }
}

// ============================================================================
// Review Tab
// ============================================================================

async function loadReviewQueue() {
  const container = document.getElementById('review-queue');
  const filterType = document.getElementById('filter-record-type-review').value;
  
  if (!state.project) {
    container.innerHTML = '<p class="empty-state">Select a project first.</p>';
    return;
  }
  
  container.innerHTML = '<p class="loading">Loading...</p>';
  
  try {
    const records = await api.getRecords(state.project.slug, {
      status: 'pending_review',
      type: filterType || undefined,
      limit: 50
    });
    
    state.reviewQueue = records;
    renderReviewQueue();
    
  } catch (err) {
    console.error('Failed to load review queue:', err);
    container.innerHTML = '<p class="error">Failed to load queue.</p>';
  }
}

function renderReviewQueue() {
  const container = document.getElementById('review-queue');
  
  if (state.reviewQueue.length === 0) {
    container.innerHTML = '<p class="empty-state">No records pending review.</p>';
    return;
  }
  
  container.innerHTML = state.reviewQueue.map(record => `
    <div class="queue-item" data-record-id="${record.id}">
      <div class="queue-item-title">${getRecordTitle(record)}</div>
      <div class="queue-item-meta">
        ${record.record_type_name || 'Unknown Type'} • ${formatDate(record.created_at)}
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', () => openRecordForReview(item.dataset.recordId));
  });
}

async function openRecordForReview(recordId) {
  try {
    // Hide queue, show detail
    document.getElementById('review-queue-view').classList.add('hidden');
    document.getElementById('review-detail-view').classList.remove('hidden');
    
    // Load record
    const response = await api.getRecord(state.project.slug, recordId);
    const record = response.record || response;
    state.reviewingRecord = record;
    
    console.log('Full response:', response);
    console.log('Record data:', record);
    console.log('Record keys:', Object.keys(record));
    
    // Update title
    document.getElementById('review-record-title').textContent = getRecordTitle(record);
    
    // Use fields and groups from the response (already included)
    const allFields = response.fields || [];
    const fieldGroups = response.groups || [];
    
    // Filter to review form fields
    const reviewFields = allFields.filter(f => f.show_in_review_form);
    
    // Generate form
    const container = document.getElementById('review-form-container');
    if (!reviewFormGenerator) {
      reviewFormGenerator = new DynamicFormGenerator(container, {
        isReviewMode: true,
        onFieldChange: (slug, value) => {
          state.reviewFormValues[slug] = value;
        },
        onQuoteLinkClick: (fieldSlug, fieldName) => {
          openQuoteModal('review', fieldSlug, fieldName);
        }
      });
    }
    
    reviewFormGenerator.setSchema(reviewFields, fieldGroups, 'review');
    reviewFormGenerator.setValues(record.data || {});
    
    // Load quotes and sources from response (already included)
    quoteManager.loadQuotes(response.quotes || []);
    sourceManager.loadSources(response.sources || []);
    renderQuotesList('review');
    renderSourcesList('review');
    updateQuoteCount();
    updateSourceCount();
    
    // Show AI panel if configured
    if (state.aiConfig) {
      document.getElementById('review-ai-panel').classList.remove('hidden');
    } else {
      document.getElementById('review-ai-panel').classList.add('hidden');
    }
    
  } catch (err) {
    console.error('Failed to load record for review:', err);
    showToast('Failed to load record', 'error');
  }
}

function closeReviewDetail() {
  document.getElementById('review-detail-view').classList.add('hidden');
  document.getElementById('review-queue-view').classList.remove('hidden');
  state.reviewingRecord = null;
}

async function approveReview() {
  if (!state.reviewingRecord) return;
  
  try {
    // Save any changes first
    await api.updateRecord(state.project.slug, state.reviewingRecord.id, {
      data: reviewFormGenerator?.getValues() || {},
      status: 'pending_validation'
    });
    
    showToast('Record approved and moved to validation', 'success');
    closeReviewDetail();
    await loadReviewQueue();
    
  } catch (err) {
    console.error('Failed to approve record:', err);
    showToast(err.message || 'Failed to approve', 'error');
  }
}

async function rejectReview() {
  if (!state.reviewingRecord) return;
  
  try {
    await api.updateRecord(state.project.slug, state.reviewingRecord.id, {
      status: 'rejected'
    });
    
    showToast('Record rejected', 'info');
    closeReviewDetail();
    await loadReviewQueue();
    
  } catch (err) {
    console.error('Failed to reject record:', err);
    showToast(err.message || 'Failed to reject', 'error');
  }
}

// ============================================================================
// Validate Tab
// ============================================================================

async function loadValidateQueue() {
  const container = document.getElementById('validate-queue');
  const filterType = document.getElementById('filter-record-type-validate').value;
  
  if (!state.project) {
    container.innerHTML = '<p class="empty-state">Select a project first.</p>';
    return;
  }
  
  container.innerHTML = '<p class="loading">Loading...</p>';
  
  try {
    const records = await api.getRecords(state.project.slug, {
      status: 'pending_validation',
      type: filterType || undefined,
      limit: 50
    });
    
    state.validateQueue = records;
    renderValidateQueue();
    
  } catch (err) {
    console.error('Failed to load validate queue:', err);
    container.innerHTML = '<p class="error">Failed to load queue.</p>';
  }
}

function renderValidateQueue() {
  const container = document.getElementById('validate-queue');
  
  if (state.validateQueue.length === 0) {
    container.innerHTML = '<p class="empty-state">No records pending validation.</p>';
    return;
  }
  
  container.innerHTML = state.validateQueue.map(record => `
    <div class="queue-item" data-record-id="${record.id}">
      <div class="queue-item-title">${getRecordTitle(record)}</div>
      <div class="queue-item-meta">
        ${record.record_type_name || 'Unknown Type'} • ${formatDate(record.created_at)}
      </div>
    </div>
  `).join('');
  
  container.querySelectorAll('.queue-item').forEach(item => {
    item.addEventListener('click', () => openRecordForValidation(item.dataset.recordId));
  });
}

async function openRecordForValidation(recordId) {
  try {
    document.getElementById('validate-queue-view').classList.add('hidden');
    document.getElementById('validate-detail-view').classList.remove('hidden');
    
    const response = await api.getRecord(state.project.slug, recordId);
    const record = response.record || response;
    state.validatingRecord = record;
    state.verifiedFields = record.verified_fields || {};
    
    console.log('Full response:', response);
    console.log('Record data:', record);
    console.log('Record keys:', Object.keys(record));
    
    document.getElementById('validate-record-title').textContent = getRecordTitle(record);
    
    // Use fields and groups from the response (already included)
    const allFields = response.fields || [];
    const fieldGroups = response.groups || [];
    
    // Filter to validation form fields
    const validateFields = allFields.filter(f => f.show_in_validation_form);
    
    const container = document.getElementById('validate-form-container');
    if (!validateFormGenerator) {
      validateFormGenerator = new DynamicFormGenerator(container, {
        isReviewMode: true,
        canVerify: true,
        onFieldChange: (slug, value) => {
          state.validateFormValues[slug] = value;
        },
        onVerifyChange: (fieldSlug, verified) => {
          state.verifiedFields[fieldSlug] = verified;
          updateValidationProgress(validateFields);
        },
        onQuoteLinkClick: (fieldSlug, fieldName) => {
          openQuoteModal('validate', fieldSlug, fieldName);
        }
      });
    }
    
    validateFormGenerator.setSchema(validateFields, fieldGroups, 'validation');
    validateFormGenerator.setValues(record.data || {}, state.verifiedFields);
    
    updateValidationProgress(validateFields);
    
    // Show AI panel if configured
    if (state.aiConfig) {
      document.getElementById('validate-ai-panel').classList.remove('hidden');
    } else {
      document.getElementById('validate-ai-panel').classList.add('hidden');
    }
    
  } catch (err) {
    console.error('Failed to load record for validation:', err);
    showToast('Failed to load record', 'error');
  }
}

function closeValidateDetail() {
  document.getElementById('validate-detail-view').classList.add('hidden');
  document.getElementById('validate-queue-view').classList.remove('hidden');
  state.validatingRecord = null;
}

function updateValidationProgress(fields) {
  const required = fields.filter(f => f.is_required);
  const verified = required.filter(f => state.verifiedFields[f.slug]);
  
  const percent = required.length > 0 ? (verified.length / required.length) * 100 : 100;
  
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-text').textContent = `${verified.length} of ${required.length} fields verified`;
  
  // Enable publish button only if all required fields verified
  document.getElementById('btn-publish-validate').disabled = verified.length < required.length;
}

async function publishRecord() {
  if (!state.validatingRecord) return;
  
  try {
    await api.updateRecord(state.project.slug, state.validatingRecord.id, {
      data: validateFormGenerator?.getValues() || {},
      verified_fields: state.verifiedFields,
      status: 'verified'
    });
    
    showToast('Record published!', 'success');
    closeValidateDetail();
    await loadValidateQueue();
    
  } catch (err) {
    console.error('Failed to publish record:', err);
    showToast(err.message || 'Failed to publish', 'error');
  }
}

async function sendBackToReview() {
  if (!state.validatingRecord) return;
  
  try {
    await api.updateRecord(state.project.slug, state.validatingRecord.id, {
      status: 'pending_review'
    });
    
    showToast('Record sent back to review', 'info');
    closeValidateDetail();
    await loadValidateQueue();
    
  } catch (err) {
    console.error('Failed to send back:', err);
    showToast(err.message || 'Failed to send back', 'error');
  }
}

// ============================================================================
// Quotes & Sources
// ============================================================================

async function loadRecordQuotes(recordId) {
  try {
    const quotes = await api.getQuotes(state.project.slug, recordId);
    quoteManager.loadQuotes(quotes);
    renderQuotesList('review');
    updateQuoteCount();
  } catch (err) {
    console.error('Failed to load quotes:', err);
  }
}

async function loadRecordSources(recordId) {
  try {
    const sources = await api.getSources(state.project.slug, recordId);
    sourceManager.loadSources(sources);
    renderSourcesList('review');
    updateSourceCount();
  } catch (err) {
    console.error('Failed to load sources:', err);
  }
}

function updateQuoteCount() {
  const count = quoteManager?.getAllQuotes().length || 0;
  document.getElementById('review-quote-count').textContent = count;
}

function updateSourceCount() {
  const count = sourceManager?.getAllSources().length || 0;
  document.getElementById('review-source-count').textContent = count;
}

function renderQuotesList(context) {
  const container = document.getElementById(`${context}-quotes-list`);
  const quotes = quoteManager?.getAllQuotes() || [];
  
  if (quotes.length === 0) {
    container.innerHTML = '<p class="empty-state">No quotes yet.</p>';
    return;
  }
  
  container.innerHTML = quotes.map(q => `
    <div class="quote-item">
      <div class="quote-text">"${q.text}"</div>
      ${q.speaker ? `<div class="quote-speaker">— ${q.speaker}</div>` : ''}
    </div>
  `).join('');
}

function renderSourcesList(context) {
  const container = document.getElementById(`${context}-sources-list`);
  const sources = sourceManager?.getAllSources() || [];
  
  if (sources.length === 0) {
    container.innerHTML = '<p class="empty-state">No sources yet.</p>';
    return;
  }
  
  container.innerHTML = sources.map(s => `
    <div class="source-item">
      <div class="source-title">${s.title || s.url}</div>
      <div class="source-url">${s.url}</div>
    </div>
  `).join('');
}

// ============================================================================
// AI Analysis
// ============================================================================

async function runAIAnalysis(context) {
  if (!state.aiConfig || !aiEngine?.isAvailable()) {
    showToast('No AI analysis configured for this project', 'info');
    return;
  }
  
  const resultsContainer = document.getElementById(`${context}-ai-results`);
  resultsContainer.innerHTML = '<p class="loading">Analyzing...</p>';
  
  try {
    // Combine quotes and form values into text for analysis
    const quotes = quoteManager?.getAllQuotes() || [];
    const formValues = context === 'review' 
      ? reviewFormGenerator?.getValues() 
      : validateFormGenerator?.getValues();
    
    // Build analysis text from all available content
    let analysisText = '';
    
    // Add form values
    for (const [key, value] of Object.entries(formValues || {})) {
      if (typeof value === 'string' && value.trim()) {
        analysisText += value + '\n\n';
      }
    }
    
    // Add quotes
    for (const quote of quotes) {
      analysisText += (quote.text || quote.quote_text || '') + '\n\n';
    }
    
    const results = aiEngine.analyzePatterns(analysisText);
    renderAIResults(results, context);
    
  } catch (err) {
    console.error('AI analysis failed:', err);
    resultsContainer.innerHTML = '<p class="error">Analysis failed.</p>';
  }
}

function renderAIResults(results, context = 'review') {
  const container = document.getElementById(`${context}-ai-results`);
  
  if (!results || !results.matches || results.matches.length === 0) {
    container.innerHTML = `
      <p class="empty-state">No patterns detected.</p>
      <button id="btn-run-ai-${context}" class="btn btn-sm btn-primary">Run Analysis</button>
    `;
    document.getElementById(`btn-run-ai-${context}`)?.addEventListener('click', () => runAIAnalysis(context));
    return;
  }
  
  container.innerHTML = `
    <div class="ai-summary">
      <span class="total-score">Total Score: ${results.totalScore.toFixed(1)}</span>
    </div>
    <div class="ai-findings">
      ${results.matches.map(m => `
        <div class="ai-finding" data-confidence="${m.confidence}">
          <div class="finding-header">
            <span class="finding-name">${escapeHtml(m.patternName)}</span>
            <span class="finding-confidence">${Math.round(m.confidence * 100)}%</span>
          </div>
          ${m.matchedKeywords.length > 0 ? `
            <div class="finding-keywords">
              Keywords: ${m.matchedKeywords.map(k => `<span class="keyword">${escapeHtml(k)}</span>`).join(', ')}
            </div>
          ` : ''}
          ${m.excerpts.length > 0 ? `
            <div class="finding-excerpts">
              ${m.excerpts.map(e => `<div class="excerpt">${escapeHtml(e)}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    <button id="btn-run-ai-${context}" class="btn btn-sm btn-secondary">Re-run Analysis</button>
  `;
  
  document.getElementById(`btn-run-ai-${context}`)?.addEventListener('click', () => runAIAnalysis(context));
}

// ============================================================================
// Helpers
// ============================================================================

function getRecordTitle(record) {
  // Try common title fields
  const data = record.data || {};
  return data.victim_name || data.name || data.title || `Record #${record.id}`;
}

// ============================================================================
// Quote Modal
// ============================================================================

let currentQuoteField = null;
let currentQuoteContext = null;

function openQuoteModal(context, fieldSlug, fieldName) {
  currentQuoteField = fieldSlug;
  currentQuoteContext = context;
  
  const modal = document.getElementById('modal-quote');
  document.getElementById('quote-text').value = '';
  document.getElementById('quote-speaker').value = '';
  document.getElementById('quote-url').value = '';
  document.getElementById('quote-link-field').value = fieldSlug;
  
  modal.classList.remove('hidden');
}

async function saveQuote() {
  const text = document.getElementById('quote-text').value.trim();
  if (!text) {
    showToast('Quote text is required', 'error');
    return;
  }
  
  const recordId = currentQuoteContext === 'review' ? state.reviewingRecord?.id : state.validatingRecord?.id;
  if (!recordId) return;
  
  try {
    const quoteData = {
      quote_text: text,
      source: document.getElementById('quote-speaker').value.trim(),
      source_url: document.getElementById('quote-url').value.trim(),
      linked_fields: currentQuoteField ? [currentQuoteField] : []
    };
    
    await api.addQuote(state.project.slug, recordId, quoteData);
    
    // Reload quotes
    const response = await api.getRecord(state.project.slug, recordId);
    quoteManager.loadQuotes(response.quotes || []);
    renderQuotesList(currentQuoteContext);
    updateQuoteCount();
    
    // Close modal
    document.getElementById('modal-quote').classList.add('hidden');
    showToast('Quote added', 'success');
    
  } catch (err) {
    console.error('Failed to add quote:', err);
    showToast(err.message || 'Failed to add quote', 'error');
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // Settings
  document.getElementById('btn-settings').addEventListener('click', () => showPanel('settings'));
  document.getElementById('btn-signin').addEventListener('click', signIn);
  document.getElementById('btn-signout').addEventListener('click', signOut);
  
  // Project selection
  document.getElementById('select-project').addEventListener('change', handleProjectChange);
  
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      showPanel(btn.dataset.tab);
      await refreshCurrentTab();
    });
  });
  
  // Submit tab
  document.getElementById('select-record-type-submit').addEventListener('change', handleSubmitRecordTypeChange);
  document.getElementById('btn-submit-record')?.addEventListener('click', submitRecord);
  
  // Review tab
  document.getElementById('btn-refresh-review').addEventListener('click', loadReviewQueue);
  document.getElementById('filter-record-type-review').addEventListener('change', loadReviewQueue);
  document.getElementById('btn-back-review').addEventListener('click', closeReviewDetail);
  document.getElementById('btn-approve-review').addEventListener('click', approveReview);
  document.getElementById('btn-reject-review').addEventListener('click', rejectReview);
  document.getElementById('btn-run-ai-review')?.addEventListener('click', () => runAIAnalysis('review'));
  
  // Validate tab
  document.getElementById('btn-refresh-validate').addEventListener('click', loadValidateQueue);
  document.getElementById('filter-record-type-validate').addEventListener('change', loadValidateQueue);
  document.getElementById('btn-back-validate').addEventListener('click', closeValidateDetail);
  document.getElementById('btn-publish-validate').addEventListener('click', publishRecord);
  document.getElementById('btn-sendback-validate').addEventListener('click', sendBackToReview);
  document.getElementById('btn-run-ai-validate')?.addEventListener('click', () => runAIAnalysis('validate'));
  
  // Modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });
  
  // Save quote button
  document.getElementById('btn-save-quote')?.addEventListener('click', saveQuote);
}

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', init);
