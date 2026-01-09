// ICE Deaths Research - Page Overlay
// Injects a floating panel directly onto the page
console.log('ICE Deaths overlay script loaded');

let overlayVisible = false;
let overlayMinimized = false;
let overlayElement = null;
let currentTab = 'quotes';
let overlayData = {
  pendingQuotes: [],
  verifiedQuotes: [],
  currentCase: {},
  sources: []
};

// Inject overlay styles
function injectOverlayStyles() {
  if (document.getElementById('ice-deaths-overlay-styles')) return;
  
  try {
    const styles = document.createElement('style');
    styles.id = 'ice-deaths-overlay-styles';
  styles.textContent = `
    #ice-deaths-overlay {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 420px;
      max-height: calc(100vh - 40px);
      background: #fafafa;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.1);
      z-index: 2147483647;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    
    #ice-deaths-overlay.minimized {
      width: 56px;
      height: 56px;
      border-radius: 28px;
      cursor: pointer;
    }
    
    #ice-deaths-overlay.minimized .overlay-content,
    #ice-deaths-overlay.minimized .overlay-tabs,
    #ice-deaths-overlay.minimized .overlay-header-actions {
      display: none;
    }
    
    #ice-deaths-overlay.minimized .overlay-header {
      padding: 0;
      justify-content: center;
      height: 56px;
      border-radius: 28px;
    }
    
    #ice-deaths-overlay.minimized .overlay-title {
      display: none;
    }
    
    #ice-deaths-overlay.minimized .overlay-minimize-icon {
      font-size: 24px;
    }
    
    .overlay-header {
      background: #1a1a1a;
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move;
      border-radius: 12px 12px 0 0;
      flex-shrink: 0;
    }
    
    .overlay-title {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .overlay-header-actions {
      display: flex;
      gap: 4px;
    }
    
    .overlay-header-btn {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .overlay-header-btn:hover {
      background: rgba(255,255,255,0.15);
    }
    
    .overlay-tabs {
      display: flex;
      background: white;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
    }
    
    .overlay-tab {
      flex: 1;
      padding: 10px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      color: #666;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }
    
    .overlay-tab:hover {
      background: #f5f5f5;
    }
    
    .overlay-tab.active {
      color: #1a1a1a;
      border-bottom-color: #1a1a1a;
    }
    
    .overlay-content {
      flex: 1;
      overflow-y: auto;
      max-height: 500px;
    }
    
    .overlay-tab-content {
      display: none;
      padding: 12px;
    }
    
    .overlay-tab-content.active {
      display: block;
    }
    
    .overlay-section {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    
    .overlay-section-title {
      font-weight: 600;
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .overlay-quote-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .overlay-quote {
      background: #f9f9f9;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 10px;
      font-size: 12px;
    }
    
    .overlay-quote-text {
      color: #333;
      line-height: 1.5;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .overlay-quote-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }
    
    .overlay-quote-category {
      background: #e0e0e0;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
    }
    
    .overlay-quote-category.timeline { background: #dbeafe; color: #1e40af; }
    .overlay-quote-category.official { background: #fef3c7; color: #92400e; }
    .overlay-quote-category.medical { background: #dcfce7; color: #166534; }
    .overlay-quote-category.legal { background: #f3e8ff; color: #6b21a8; }
    .overlay-quote-category.context { background: #fce7f3; color: #9d174d; }
    
    .overlay-quote-source {
      font-size: 10px;
      color: #666;
      margin-bottom: 6px;
    }
    
    .overlay-quote-source a {
      color: #6366f1;
      text-decoration: none;
    }
    
    .overlay-quote-source a:hover {
      text-decoration: underline;
    }
    
    .overlay-quote-actions {
      display: flex;
      gap: 4px;
    }
    
    .overlay-btn {
      padding: 4px 8px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.2s;
    }
    
    .overlay-btn:hover {
      background: #f0f0f0;
    }
    
    .overlay-btn.success {
      background: #10b981;
      color: white;
      border-color: #10b981;
    }
    
    .overlay-btn.danger {
      background: #ef4444;
      color: white;
      border-color: #ef4444;
    }
    
    .overlay-btn.primary {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    
    .overlay-empty {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
    }
    
    .overlay-form-group {
      margin-bottom: 10px;
    }
    
    .overlay-form-label {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: #666;
      margin-bottom: 4px;
    }
    
    .overlay-form-input {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 12px;
    }
    
    .overlay-form-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
    
    .overlay-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .overlay-badge {
      background: #ef4444;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      margin-left: 4px;
    }
    
    .overlay-resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 50%, #ccc 50%);
      border-radius: 0 0 12px 0;
    }
    
    .overlay-toast {
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #1a1a1a;
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 12px;
      z-index: 2147483648;
      animation: overlayToastIn 0.3s ease;
    }
    
    @keyframes overlayToastIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
    document.head.appendChild(styles);
    console.log('Overlay styles injected');
  } catch (error) {
    console.error('Failed to inject overlay styles:', error);
  }
}

// Create the overlay element
function createOverlay() {
  if (overlayElement) return overlayElement;
  
  try {
    injectOverlayStyles();
    
    overlayElement = document.createElement('div');
    overlayElement.id = 'ice-deaths-overlay';
  overlayElement.innerHTML = `
    <div class="overlay-header" id="overlay-drag-handle">
      <div class="overlay-title">
        <span class="overlay-minimize-icon">📋</span>
        <span>ICE Documentation</span>
      </div>
      <div class="overlay-header-actions">
        <button class="overlay-header-btn" id="overlay-sync" title="Sync with sidepanel">↻</button>
        <button class="overlay-header-btn" id="overlay-refresh" title="Refresh data">🔄</button>
        <button class="overlay-header-btn" id="overlay-clear-highlights" title="Clear highlights">🧹</button>
        <button class="overlay-header-btn" id="overlay-minimize" title="Minimize">➖</button>
        <button class="overlay-header-btn" id="overlay-close" title="Close">✕</button>
      </div>
    </div>
    
    <div class="overlay-tabs">
      <button class="overlay-tab active" data-tab="quotes">
        📝 Quotes <span class="overlay-badge" id="overlay-quote-count">0</span>
      </button>
      <button class="overlay-tab" data-tab="form">📄 Case</button>
      <button class="overlay-tab" data-tab="sources">🔗 Sources</button>
    </div>
    
    <div class="overlay-content">
      <!-- Quotes Tab -->
      <div class="overlay-tab-content active" id="overlay-tab-quotes">
        <div class="overlay-section">
          <div class="overlay-section-title">📋 Pending Review</div>
          <div class="overlay-quote-list" id="overlay-pending-quotes"></div>
        </div>
        <div class="overlay-section">
          <div class="overlay-section-title">✓ Verified Quotes</div>
          <div class="overlay-quote-list" id="overlay-verified-quotes"></div>
        </div>
      </div>
      
      <!-- Form Tab -->
      <div class="overlay-tab-content" id="overlay-tab-form">
        <div class="overlay-section">
          <div class="overlay-section-title">📌 Case Information</div>
          <div class="overlay-form-group">
            <label class="overlay-form-label">Subject Name</label>
            <input type="text" class="overlay-form-input" id="overlay-case-name" placeholder="Last name, First name">
          </div>
          <div class="overlay-form-row">
            <div class="overlay-form-group">
              <label class="overlay-form-label">Date</label>
              <input type="date" class="overlay-form-input" id="overlay-case-date">
            </div>
            <div class="overlay-form-group">
              <label class="overlay-form-label">Age</label>
              <input type="number" class="overlay-form-input" id="overlay-case-age" placeholder="Age">
            </div>
          </div>
          <div class="overlay-form-row">
            <div class="overlay-form-group">
              <label class="overlay-form-label">Location</label>
              <input type="text" class="overlay-form-input" id="overlay-case-location" placeholder="City, State">
            </div>
            <div class="overlay-form-group">
              <label class="overlay-form-label">Nationality</label>
              <input type="text" class="overlay-form-input" id="overlay-case-country" placeholder="Country">
            </div>
          </div>
          <div class="overlay-form-group">
            <label class="overlay-form-label">Facility</label>
            <input type="text" class="overlay-form-input" id="overlay-case-facility" placeholder="Facility name">
          </div>
          <div class="overlay-form-group">
            <label class="overlay-form-label">Summary</label>
            <textarea class="overlay-form-input" id="overlay-case-summary" rows="3" placeholder="Brief description..."></textarea>
          </div>
          <button class="overlay-btn primary" id="overlay-save-case" style="width: 100%;">💾 Save to Sidepanel</button>
        </div>
      </div>
      
      <!-- Sources Tab -->
      <div class="overlay-tab-content" id="overlay-tab-sources">
        <div class="overlay-section">
          <button class="overlay-btn primary" id="overlay-add-source" style="width: 100%; margin-bottom: 12px;">
            ➕ Add Current Page as Source
          </button>
          <div class="overlay-quote-list" id="overlay-sources-list"></div>
        </div>
      </div>
    </div>
    
    <div class="overlay-resize-handle" id="overlay-resize"></div>
  `;
    
    document.body.appendChild(overlayElement);
    console.log('Overlay element created and appended');
    
    // Set up event listeners
    setupOverlayEvents();
    
    // Load initial data
    loadOverlayData();
    
    return overlayElement;
  } catch (error) {
    console.error('Failed to create overlay:', error);
    return null;
  }
}

// Set up overlay event listeners
function setupOverlayEvents() {
  // Tab switching
  overlayElement.querySelectorAll('.overlay-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlayElement.querySelectorAll('.overlay-tab').forEach(t => t.classList.remove('active'));
      overlayElement.querySelectorAll('.overlay-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`overlay-tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
  
  // Close button
  document.getElementById('overlay-close').addEventListener('click', hideOverlay);
  
  // Minimize button
  document.getElementById('overlay-minimize').addEventListener('click', toggleMinimize);
  
  // Clicking minimized overlay expands it
  overlayElement.addEventListener('click', (e) => {
    if (overlayMinimized && e.target.closest('.overlay-header')) {
      toggleMinimize();
    }
  });
  
  // Refresh button
  document.getElementById('overlay-refresh').addEventListener('click', loadOverlayData);
  
  // Sync button - opens sync direction modal
  document.getElementById('overlay-sync').addEventListener('click', () => {
    // Request sidepanel to show sync modal
    chrome.runtime.sendMessage({ type: 'SHOW_SYNC_MODAL' });
  });
  
  // Clear highlights
  document.getElementById('overlay-clear-highlights').addEventListener('click', () => {
    removeHighlights(true);
    showOverlayToast('Highlights cleared');
  });
  
  // Dragging
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  
  const dragHandle = document.getElementById('overlay-drag-handle');
  dragHandle.addEventListener('mousedown', (e) => {
    if (overlayMinimized) return;
    isDragging = true;
    dragOffset.x = e.clientX - overlayElement.offsetLeft;
    dragOffset.y = e.clientY - overlayElement.offsetTop;
    overlayElement.style.transition = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    overlayElement.style.left = (e.clientX - dragOffset.x) + 'px';
    overlayElement.style.top = (e.clientY - dragOffset.y) + 'px';
    overlayElement.style.right = 'auto';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    overlayElement.style.transition = 'all 0.3s ease';
  });
  
  // Resizing
  let isResizing = false;
  const resizeHandle = document.getElementById('overlay-resize');
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const rect = overlayElement.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;
    const newHeight = e.clientY - rect.top;
    if (newWidth > 320) overlayElement.style.width = newWidth + 'px';
    if (newHeight > 200) {
      overlayElement.querySelector('.overlay-content').style.maxHeight = (newHeight - 100) + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    isResizing = false;
  });
  
  // Add source button
  document.getElementById('overlay-add-source').addEventListener('click', addCurrentPageAsSource);
  
  // Save case button
  document.getElementById('overlay-save-case').addEventListener('click', saveCaseToSidepanel);
  
  // Form inputs sync
  ['overlay-case-name', 'overlay-case-date', 'overlay-case-age', 'overlay-case-location', 
   'overlay-case-country', 'overlay-case-facility', 'overlay-case-summary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', syncCaseToBackground);
    }
  });
}

// Toggle minimize state
function toggleMinimize() {
  overlayMinimized = !overlayMinimized;
  overlayElement.classList.toggle('minimized', overlayMinimized);
}

// Load data from background script
function loadOverlayData() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response) {
      // Filter pending quotes - those without verified status
      overlayData.pendingQuotes = (response.pendingQuotes || []).filter(q => q.status !== 'verified');
      // Use verifiedQuotes array from background, or fall back to filtering pendingQuotes
      overlayData.verifiedQuotes = response.verifiedQuotes || (response.pendingQuotes || []).filter(q => q.status === 'verified');
      overlayData.currentCase = response.currentCase || {};
      overlayData.sources = response.sources || [];
      
      renderOverlayQuotes();
      renderOverlaySources();
      populateOverlayForm();
      updateOverlayBadge();
    }
  });
}

// Render quotes in overlay
function renderOverlayQuotes() {
  const pendingContainer = document.getElementById('overlay-pending-quotes');
  const verifiedContainer = document.getElementById('overlay-verified-quotes');
  
  if (overlayData.pendingQuotes.length === 0) {
    pendingContainer.innerHTML = '<div class="overlay-empty">No pending quotes</div>';
  } else {
    pendingContainer.innerHTML = overlayData.pendingQuotes.map(quote => `
      <div class="overlay-quote" data-id="${quote.id}">
        <div class="overlay-quote-text">"${escapeHtml(quote.text)}"</div>
        <div class="overlay-quote-meta">
          <span class="overlay-quote-category ${quote.category || ''}">${quote.category || 'context'}</span>
          ${quote.confidence ? `<span style="color:#999;font-size:10px">${Math.round(quote.confidence * 100)}%</span>` : ''}
        </div>
        ${quote.sourceUrl ? `<div class="overlay-quote-source"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank">🔗 ${escapeHtml(quote.sourceTitle || 'Source')}</a></div>` : ''}
        <div class="overlay-quote-actions">
          <button class="overlay-btn success" onclick="window.iceOverlay.acceptQuote('${quote.id}')">✓</button>
          <button class="overlay-btn danger" onclick="window.iceOverlay.rejectQuote('${quote.id}')">✗</button>
          <button class="overlay-btn" onclick="window.iceOverlay.highlightQuote('${quote.id}')">🎯</button>
          <button class="overlay-btn" onclick="window.iceOverlay.pinQuote('${quote.id}')">📌</button>
        </div>
      </div>
    `).join('');
  }
  
  if (overlayData.verifiedQuotes.length === 0) {
    verifiedContainer.innerHTML = '<div class="overlay-empty">No verified quotes yet</div>';
  } else {
    verifiedContainer.innerHTML = overlayData.verifiedQuotes.map(quote => `
      <div class="overlay-quote" data-id="${quote.id}">
        <div class="overlay-quote-text">"${escapeHtml(quote.text)}"</div>
        <div class="overlay-quote-meta">
          <span class="overlay-quote-category ${quote.category || ''}">${quote.category || 'context'}</span>
        </div>
        ${quote.sourceUrl ? `<div class="overlay-quote-source"><a href="${escapeHtml(quote.sourceUrl)}" target="_blank">🔗 ${escapeHtml(quote.sourceTitle || 'Source')}</a></div>` : ''}
        <div class="overlay-quote-actions">
          <button class="overlay-btn" onclick="window.iceOverlay.highlightQuote('${quote.id}')">🎯</button>
          <button class="overlay-btn" onclick="window.iceOverlay.copyQuote('${quote.id}')">📋</button>
          <button class="overlay-btn danger" onclick="window.iceOverlay.removeQuote('${quote.id}')">✗</button>
        </div>
      </div>
    `).join('');
  }
}

// Render sources in overlay
function renderOverlaySources() {
  const container = document.getElementById('overlay-sources-list');
  
  if (overlayData.sources.length === 0) {
    container.innerHTML = '<div class="overlay-empty">No sources added</div>';
  } else {
    container.innerHTML = overlayData.sources.map(source => `
      <div class="overlay-quote">
        <div class="overlay-quote-text" style="-webkit-line-clamp: 2;">
          <a href="${escapeHtml(source.url)}" target="_blank" style="color: #333; text-decoration: none;">
            ${escapeHtml(source.title || source.url)}
          </a>
        </div>
        <div class="overlay-quote-meta">
          ${source.date ? `<span style="color:#666;font-size:10px">📅 ${source.date}</span>` : ''}
          ${source.author ? `<span style="color:#666;font-size:10px">✍️ ${source.author}</span>` : ''}
        </div>
      </div>
    `).join('');
  }
}

// Populate form from current case
function populateOverlayForm() {
  const c = overlayData.currentCase;
  setInputValue('overlay-case-name', c.name || '');
  setInputValue('overlay-case-date', c.dateOfDeath || '');
  setInputValue('overlay-case-age', c.age || '');
  setInputValue('overlay-case-location', c.location || '');
  setInputValue('overlay-case-country', c.country || '');
  setInputValue('overlay-case-facility', c.facility || '');
  setInputValue('overlay-case-summary', c.causeOfDeath || '');
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

// Update quote count badge
function updateOverlayBadge() {
  const badge = document.getElementById('overlay-quote-count');
  if (badge) {
    const count = overlayData.pendingQuotes.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';
  }
}

// Sync case data to background
function syncCaseToBackground() {
  const caseData = {
    ...overlayData.currentCase,
    name: getInputValue('overlay-case-name'),
    dateOfDeath: getInputValue('overlay-case-date'),
    age: getInputValue('overlay-case-age'),
    location: getInputValue('overlay-case-location'),
    country: getInputValue('overlay-case-country'),
    facility: getInputValue('overlay-case-facility'),
    causeOfDeath: getInputValue('overlay-case-summary')
  };
  
  chrome.runtime.sendMessage({ type: 'SET_CURRENT_CASE', case: caseData });
  overlayData.currentCase = caseData;
}

// Save case and show confirmation
function saveCaseToSidepanel() {
  syncCaseToBackground();
  showOverlayToast('Case data synced to sidepanel!');
}

// Add current page as source
function addCurrentPageAsSource() {
  const url = window.location.href;
  const title = document.title;
  
  // Check if already added
  if (overlayData.sources.some(s => s.url === url)) {
    showOverlayToast('Source already added');
    return;
  }
  
  const source = {
    url: url,
    title: title,
    addedAt: new Date().toISOString()
  };
  
  overlayData.sources.push(source);
  chrome.runtime.sendMessage({ type: 'ADD_SOURCE', source: source });
  renderOverlaySources();
  showOverlayToast('Source added!');
}

// Show overlay
function showOverlay() {
  try {
    console.log('Showing overlay...');
    const element = createOverlay();
    if (!element) {
      console.error('Failed to create overlay element');
      return;
    }
    overlayElement.style.display = 'flex';
    overlayVisible = true;
    if (overlayMinimized) {
      overlayMinimized = false;
      overlayElement.classList.remove('minimized');
    }
    loadOverlayData();
    console.log('Overlay shown successfully');
  } catch (error) {
    console.error('Error showing overlay:', error);
  }
}

// Hide overlay
function hideOverlay() {
  if (overlayElement) {
    overlayElement.style.display = 'none';
    overlayVisible = false;
  }
}

// Toggle overlay
function toggleOverlay() {
  if (overlayVisible) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

// Show toast notification
function showOverlayToast(message) {
  const existing = document.querySelector('.overlay-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'overlay-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 2000);
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Expose overlay API globally for button clicks
window.iceOverlay = {
  show: showOverlay,
  hide: hideOverlay,
  toggle: toggleOverlay,
  
  acceptQuote: (quoteId) => {
    const idx = overlayData.pendingQuotes.findIndex(q => q.id === quoteId);
    if (idx !== -1) {
      const quote = overlayData.pendingQuotes.splice(idx, 1)[0];
      quote.status = 'verified';
      overlayData.verifiedQuotes.push(quote);
      chrome.runtime.sendMessage({ type: 'ACCEPT_QUOTE', quoteId: quoteId });
      renderOverlayQuotes();
      updateOverlayBadge();
      showOverlayToast('Quote accepted!');
    }
  },
  
  rejectQuote: (quoteId) => {
    const idx = overlayData.pendingQuotes.findIndex(q => q.id === quoteId);
    if (idx !== -1) {
      overlayData.pendingQuotes.splice(idx, 1);
      chrome.runtime.sendMessage({ type: 'REJECT_QUOTE', quoteId: quoteId });
      renderOverlayQuotes();
      updateOverlayBadge();
      showOverlayToast('Quote rejected');
    }
  },
  
  removeQuote: (quoteId) => {
    const idx = overlayData.verifiedQuotes.findIndex(q => q.id === quoteId);
    if (idx !== -1) {
      overlayData.verifiedQuotes.splice(idx, 1);
      chrome.runtime.sendMessage({ type: 'REMOVE_VERIFIED_QUOTE', quoteId: quoteId });
      renderOverlayQuotes();
      showOverlayToast('Quote removed');
    }
  },
  
  highlightQuote: (quoteId) => {
    const allQuotes = [...overlayData.pendingQuotes, ...overlayData.verifiedQuotes];
    const quote = allQuotes.find(q => q.id === quoteId);
    if (quote) {
      highlightText(quote.text, quote.category || '', true);
    }
  },
  
  pinQuote: (quoteId) => {
    const allQuotes = [...overlayData.pendingQuotes, ...overlayData.verifiedQuotes];
    const quote = allQuotes.find(q => q.id === quoteId);
    if (quote) {
      pinHighlightText(quote.text, quote.category || '', quoteId);
      showOverlayToast('Quote pinned on page');
    }
  },
  
  copyQuote: (quoteId) => {
    const allQuotes = [...overlayData.pendingQuotes, ...overlayData.verifiedQuotes];
    const quote = allQuotes.find(q => q.id === quoteId);
    if (quote) {
      navigator.clipboard.writeText(quote.text);
      showOverlayToast('Quote copied!');
    }
  }
};

// Listen for messages from sidepanel/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_OVERLAY') {
    toggleOverlay();
    sendResponse({ success: true, visible: overlayVisible });
  } else if (message.type === 'SHOW_OVERLAY') {
    showOverlay();
    sendResponse({ success: true });
  } else if (message.type === 'HIDE_OVERLAY') {
    hideOverlay();
    sendResponse({ success: true });
  } else if (message.type === 'REFRESH_OVERLAY' || message.type === 'REFRESH_QUOTES') {
    if (overlayVisible) {
      loadOverlayData();
    }
    sendResponse({ success: true });
  } else if (message.type === 'GET_OVERLAY_STATE') {
    // Return current overlay data for syncing to sidepanel
    sendResponse({ 
      success: true, 
      data: overlayData 
    });
  }
  return true;
});
