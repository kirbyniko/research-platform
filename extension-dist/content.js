// ICE Incident Tracker - Content Script
console.log('ICE Incident Tracker content script loaded');

// Default CSS selectors for major news sites
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
    date: ".date-display-single, time"
  },
  "cnn.com": {
    article: ".article__content, .zn-body__paragraph",
    headline: "h1.headline__text, h1",
    date: ".timestamp, time",
    author: ".byline__name"
  },
  "nbcnews.com": {
    article: ".article-body, .body-content",
    headline: "h1",
    date: "time",
    author: ".byline-name"
  },
  "*": {
    article: "article, main, [role='main'], .article, .post, .content, .story",
    headline: "h1",
    date: "time[datetime], .date, .published, .timestamp",
    author: ".author, .byline, [rel='author']"
  }
};

// Toast notification element
let toastElement = null;

// Initialize
function init() {
  createToastElement();
  setupSelectionListener();
}

// Create toast notification element
function createToastElement() {
  toastElement = document.createElement('div');
  toastElement.id = 'ice-deaths-toast';
  toastElement.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: #1a1a1a;
    color: white;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 999999;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(toastElement);
}

// Show toast notification
function showToast(message, duration = 2000) {
  if (!toastElement) createToastElement();
  
  toastElement.textContent = message;
  toastElement.style.opacity = '1';
  
  setTimeout(() => {
    toastElement.style.opacity = '0';
  }, duration);
}

// Setup selection listener for highlighting
function setupSelectionListener() {
  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      // Could add floating button here for quick add
    }
  });
}

// Get current text selection
function getTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }
  
  const text = selection.toString().trim();
  if (!text) return null;
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  return {
    text: text,
    position: {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    }
  };
}

// Get selectors for current domain
function getSelectorsForDomain() {
  const hostname = window.location.hostname;
  
  // Check for exact domain match
  for (const domain of Object.keys(DEFAULT_SELECTORS)) {
    if (domain !== '*' && hostname.includes(domain)) {
      return DEFAULT_SELECTORS[domain];
    }
  }
  
  // Fall back to generic selectors
  return DEFAULT_SELECTORS['*'];
}

// Extract article content using CSS selectors
function extractArticle() {
  const selectors = getSelectorsForDomain();
  return extractArticleWithSelectors(selectors);
}

// Extract article with specific selectors
function extractArticleWithSelectors(selectors) {
  // Extract headline
  let headline = '';
  if (selectors.headline) {
    const headlineEl = document.querySelector(selectors.headline);
    if (headlineEl) {
      headline = headlineEl.textContent.trim();
    }
  }
  
  // Extract date
  let date = '';
  if (selectors.date) {
    const dateEl = document.querySelector(selectors.date);
    if (dateEl) {
      date = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
    }
  }
  
  // Extract author
  let author = '';
  if (selectors.author) {
    const authorEl = document.querySelector(selectors.author);
    if (authorEl) {
      author = authorEl.textContent.trim();
    }
  }
  
  // Extract article body
  let body = '';
  if (selectors.article) {
    const articleSelectors = selectors.article.split(',').map(s => s.trim());
    
    for (const selector of articleSelectors) {
      try {
        const articleEl = document.querySelector(selector);
        if (articleEl) {
          // Get all paragraph text
          const paragraphs = articleEl.querySelectorAll('p');
          if (paragraphs.length > 0) {
            body = Array.from(paragraphs)
              .map(p => p.textContent.trim())
              .filter(t => t.length > 0)
              .join('\n\n');
            break;
          } else {
            body = articleEl.textContent.trim();
            break;
          }
        }
      } catch (e) {
        console.error('Selector error:', selector, e);
      }
    }
  }
  
  // Split body into sentences
  const sentences = splitIntoSentences(body);
  
  return {
    headline,
    date,
    author,
    body,
    sentences,
    url: window.location.href,
    title: document.title
  };
}

// Split text into sentences
function splitIntoSentences(text) {
  if (!text) return [];
  
  // Split on sentence-ending punctuation followed by space or newline
  const rawSentences = text
    .replace(/\n\n+/g, '\n')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10); // Filter out very short fragments
  
  return rawSentences;
}

// Track pinned highlights
const pinnedHighlightElements = new Map();

// Highlight text on page (clears non-pinned highlights first)
function highlightText(searchText, category = '', flash = false) {
  // Remove existing non-pinned highlights
  removeHighlights(false);
  
  if (!searchText) return;
  
  // Normalize search text (trim and collapse whitespace)
  const normalizedSearch = searchText.trim().replace(/\s+/g, ' ');
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const matches = [];
  let node;
  
  // Try exact match first
  while (node = walker.nextNode()) {
    const normalizedText = node.textContent.replace(/\s+/g, ' ');
    if (normalizedText.includes(normalizedSearch)) {
      matches.push({ node, search: normalizedSearch });
    }
  }
  
  // If no exact match, try partial match (first 50 chars)
  if (matches.length === 0 && normalizedSearch.length > 50) {
    const partialSearch = normalizedSearch.substring(0, 50);
    const walker2 = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    while (node = walker2.nextNode()) {
      const normalizedText = node.textContent.replace(/\s+/g, ' ');
      if (normalizedText.includes(partialSearch)) {
        matches.push({ node, search: partialSearch });
      }
    }
  }
  
  let firstMatch = null;
  
  matches.forEach(({ node: textNode, search }) => {
    const text = textNode.textContent;
    const normalizedText = text.replace(/\s+/g, ' ');
    const index = normalizedText.indexOf(search);
    
    if (index !== -1) {
      // Find the actual position in original text
      let actualIndex = 0;
      let normalizedPos = 0;
      while (normalizedPos < index && actualIndex < text.length) {
        if (text[actualIndex] !== ' ' || normalizedText[normalizedPos] === ' ') {
          normalizedPos++;
        }
        actualIndex++;
      }
      
      const span = document.createElement('span');
      span.className = 'ice-deaths-highlight';
      
      const before = document.createTextNode(text.substring(0, actualIndex));
      const match = document.createElement('mark');
      match.className = `ice-deaths-highlight-mark ${category}`;
      match.textContent = text.substring(actualIndex, actualIndex + search.length);
      const after = document.createTextNode(text.substring(actualIndex + search.length));
      
      span.appendChild(before);
      span.appendChild(match);
      span.appendChild(after);
      
      textNode.parentNode.replaceChild(span, textNode);
      
      if (!firstMatch) {
        firstMatch = match;
      }
    }
  });
  
  // Scroll to first match with a slight delay for animation
  if (firstMatch) {
    setTimeout(() => {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Flash effect if requested
      if (flash) {
        firstMatch.style.transition = 'all 0.3s ease';
        firstMatch.style.transform = 'scale(1.05)';
        firstMatch.style.boxShadow = '0 0 20px rgba(255, 200, 0, 0.8)';
        setTimeout(() => {
          firstMatch.style.transform = 'scale(1)';
          firstMatch.style.boxShadow = '';
        }, 500);
      }
    }, 100);
  }
  
  return matches.length > 0;
}

// Pin highlight (doesn't get cleared automatically)
function pinHighlightText(searchText, category = '', quoteId = '') {
  if (!searchText) return false;
  
  const normalizedSearch = searchText.trim().replace(/\s+/g, ' ');
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  let found = false;
  
  while (node = walker.nextNode()) {
    const normalizedText = node.textContent.replace(/\s+/g, ' ');
    if (normalizedText.includes(normalizedSearch)) {
      const text = node.textContent;
      const index = normalizedText.indexOf(normalizedSearch);
      
      // Find actual position
      let actualIndex = 0;
      let normalizedPos = 0;
      while (normalizedPos < index && actualIndex < text.length) {
        if (text[actualIndex] !== ' ' || normalizedText[normalizedPos] === ' ') {
          normalizedPos++;
        }
        actualIndex++;
      }
      
      const span = document.createElement('span');
      span.className = 'ice-deaths-highlight ice-deaths-pinned';
      span.dataset.quoteId = quoteId;
      
      const before = document.createTextNode(text.substring(0, actualIndex));
      const match = document.createElement('mark');
      match.className = `ice-deaths-highlight-mark pinned ${category}`;
      match.textContent = text.substring(actualIndex, actualIndex + normalizedSearch.length);
      const after = document.createTextNode(text.substring(actualIndex + normalizedSearch.length));
      
      span.appendChild(before);
      span.appendChild(match);
      span.appendChild(after);
      
      node.parentNode.replaceChild(span, node);
      
      // Store reference for removal
      pinnedHighlightElements.set(quoteId, searchText);
      
      // Scroll to it
      match.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      found = true;
      break; // Only highlight first occurrence for pins
    }
  }
  
  return found;
}

// Remove highlight by text content
function removeHighlightByText(searchText) {
  const normalizedSearch = searchText.trim().replace(/\s+/g, ' ');
  const highlights = document.querySelectorAll('.ice-deaths-highlight');
  
  highlights.forEach(span => {
    const spanText = span.textContent.replace(/\s+/g, ' ');
    if (spanText.includes(normalizedSearch)) {
      const parent = span.parentNode;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    }
  });
}

// Remove all highlights (optionally preserve pinned)
function removeHighlights(includesPinned = true) {
  const selector = includesPinned ? '.ice-deaths-highlight' : '.ice-deaths-highlight:not(.ice-deaths-pinned)';
  const highlights = document.querySelectorAll(selector);
  highlights.forEach(span => {
    const parent = span.parentNode;
    parent.replaceChild(document.createTextNode(span.textContent), span);
    parent.normalize();
  });
  
  if (includesPinned) {
    pinnedHighlightElements.clear();
  }
}

// Check if current page is a PDF
function isPdfPage() {
  return window.location.href.toLowerCase().endsWith('.pdf') ||
         document.contentType === 'application/pdf' ||
         document.querySelector('embed[type="application/pdf"]') !== null ||
         document.querySelector('#viewer.pdfViewer') !== null;
}

// Get PDF URL from current page
function getPdfUrl() {
  const url = window.location.href;
  
  // Direct PDF URL
  if (url.toLowerCase().endsWith('.pdf')) return url;
  
  // Chrome PDF viewer embed
  const embed = document.querySelector('embed[type="application/pdf"]');
  if (embed && embed.src) return embed.src;
  
  return url;
}

// Extract text from PDF using PDF.js
async function extractPdfText() {
  const pdfUrl = getPdfUrl();
  
  // For Chrome's built-in PDF viewer, try to get text from the embed element
  const embed = document.querySelector('embed[type="application/pdf"]');
  if (embed) {
    try {
      // Chrome's PDF viewer exposes text through the embed
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      
      // Simple text extraction - read as text
      const text = await blob.text();
      
      // If it's actually PDF binary, we'll need PDF.js
      if (text.includes('%PDF-')) {
        // Try to load and use PDF handler
        if (window.ICEDeathsPdfHandler) {
          return await window.ICEDeathsPdfHandler.extractPdfText(pdfUrl);
        } else {
          throw new Error('PDF handler not available. Please refresh the page.');
        }
      }
      
      // If we got readable text, split it into sentences
      const sentences = text
        .split(/[.!?]+\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 20)
        .map((text, i) => ({ text, pageNumber: Math.floor(i / 10) + 1 }));
      
      return {
        pageCount: Math.ceil(sentences.length / 10),
        pages: [{ pageNumber: 1, text }],
        sentences,
        url: pdfUrl,
        title: getPdfTitle(pdfUrl)
      };
    } catch (err) {
      console.error('Failed to extract from embed:', err);
    }
  }
  
  // Check if PDF handler is loaded
  if (!window.ICEDeathsPdfHandler) {
    throw new Error('PDF handler not available. Please refresh the page and try again.');
  }
  
  return await window.ICEDeathsPdfHandler.extractPdfText(pdfUrl);
}

// Get PDF title from URL
function getPdfTitle(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    return decodeURIComponent(filename.replace('.pdf', '').replace(/-/g, ' '));
  } catch {
    return 'PDF Document';
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PING':
      // Simple availability check
      console.log('Content script PING received');
      sendResponse({ ready: true });
      return true;
      
    case 'GET_SELECTION':
      // Check if we're in a PDF viewer
      if (isPdfPage() && window.ICEDeathsPdfHandler) {
        const pdfSelection = window.ICEDeathsPdfHandler.getPdfSelection();
        sendResponse(pdfSelection || { text: '' });
      } else {
        const selection = getTextSelection();
        sendResponse(selection || { text: '' });
      }
      break;
      
    case 'EXTRACT_ARTICLE':
      // Check if this is a PDF
      if (isPdfPage()) {
        console.log('Detected PDF page, extracting PDF text...');
        console.log('PDF URL:', getPdfUrl());
        extractPdfText()
          .then(result => {
            console.log('PDF extraction successful:', result.sentences.length, 'sentences');
            sendResponse({
              ...result,
              isPdf: true,
              headline: result.title,
              date: '',
              author: '',
              body: result.pages.map(p => p.text).join('\n\n')
            });
          })
          .catch(err => {
            console.error('PDF extraction failed:', err);
            sendResponse({ 
              error: err.message || 'PDF extraction failed. Try refreshing the page.',
              sentences: [],
              isPdf: true 
            });
          });
        return true; // Keep channel open for async response
      } else {
        console.log('Extracting article content...');
        const article = extractArticleWithSelectors(message.selectors);
        sendResponse(article);
      }
      break;
      
    case 'EXTRACT_PDF':
      extractPdfText()
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ error: err.message }));
      return true; // Keep channel open for async response
      
    case 'TEST_SELECTOR':
      try {
        const matches = document.querySelectorAll(message.selector);
        sendResponse({ count: matches.length });
      } catch (e) {
        sendResponse({ count: 0, error: e.message });
      }
      break;
      
    case 'HIGHLIGHT_TEXT':
      const found = highlightText(message.text, message.category || '');
      sendResponse({ success: true, found: found });
      break;
      
    case 'HIGHLIGHT_AND_SCROLL':
      const foundAndScrolled = highlightText(message.text, message.category || '', message.flash);
      sendResponse({ success: true, found: foundAndScrolled });
      break;
      
    case 'PIN_HIGHLIGHT':
      const pinned = pinHighlightText(message.text, message.category || '', message.quoteId);
      sendResponse({ success: true, found: pinned });
      break;
      
    case 'REMOVE_HIGHLIGHT_BY_TEXT':
      removeHighlightByText(message.text);
      sendResponse({ success: true });
      break;
      
    case 'REMOVE_HIGHLIGHTS':
      removeHighlights();
      sendResponse({ success: true });
      break;
      
    case 'SHOW_TOAST':
      showToast(message.message, message.duration);
      sendResponse({ success: true });
      break;
      
    case 'GET_PAGE_INFO':
      sendResponse({
        url: window.location.href,
        title: document.title,
        isPdf: isPdfPage()
      });
      break;
      
    case 'SCROLL_TO_PAGE':
      scrollToPdfPage(message.pageNumber);
      sendResponse({ success: true });
      break;
      
    case 'START_ELEMENT_PICKER':
      startElementPicker().then(selector => {
        sendResponse({ selector: selector });
      });
      return true; // Keep channel open for async
      
    case 'EXTRACT_FROM_SELECTOR':
      const customContent = extractFromSelector(message.selector);
      sendResponse(customContent);
      break;
      
    case 'START_QUOTE_CAPTURE':
      activateCaptureMode(message.field);
      sendResponse({success: true});
      break;
      
    case 'CANCEL_QUOTE_CAPTURE':
      deactivateCaptureMode();
      sendResponse({success: true});
      break;
      
    default:
      console.log('Unknown message:', message.type);
  }
  
  return true; // Keep channel open
});

// === ELEMENT PICKER ===

let pickerOverlay = null;
let pickerResolve = null;

function startElementPicker() {
  return new Promise((resolve) => {
    pickerResolve = resolve;
    
    // Create overlay
    pickerOverlay = document.createElement('div');
    pickerOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.1);
      z-index: 999997;
      cursor: crosshair;
    `;
    
    // Create instruction tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      z-index: 999998;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    tooltip.textContent = 'Click an element to select it (ESC to cancel)';
    document.body.appendChild(tooltip);
    
    let currentHighlight = null;
    
    const handleMouseOver = (e) => {
      if (e.target === pickerOverlay || e.target === tooltip) return;
      
      // Remove previous highlight
      if (currentHighlight) {
        currentHighlight.style.outline = '';
      }
      
      // Highlight current element
      e.target.style.outline = '3px solid #3b82f6';
      currentHighlight = e.target;
      e.stopPropagation();
    };
    
    const handleMouseOut = (e) => {
      if (e.target !== pickerOverlay && e.target !== tooltip) {
        e.target.style.outline = '';
      }
    };
    
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.target === pickerOverlay || e.target === tooltip) return;
      
      // Get selector for clicked element
      const selector = getUniqueSelector(e.target);
      cleanup();
      pickerResolve(selector);
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        pickerResolve(null);
      }
    };
    
    const cleanup = () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleEscape, true);
      if (pickerOverlay) pickerOverlay.remove();
      if (tooltip) tooltip.remove();
      if (currentHighlight) currentHighlight.style.outline = '';
    };
    
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleEscape, true);
    
    document.body.appendChild(pickerOverlay);
  });
}

// Get unique CSS selector for an element
function getUniqueSelector(element) {
  // Try ID first
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Try unique class combination
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      const selector = element.tagName.toLowerCase() + '.' + classes.join('.');
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Build path from parent
  const path = [];
  let current = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    // Add nth-child if needed for uniqueness
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        e => e.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    // Stop if we have a unique selector
    const testSelector = path.join(' > ');
    if (document.querySelectorAll(testSelector).length === 1) {
      return testSelector;
    }
  }
  
  return path.join(' > ');
}

// Extract content from custom selector
function extractFromSelector(selector) {
  try {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) {
      return { error: 'No elements match this selector', sentences: [] };
    }
    
    let fullText = '';
    elements.forEach(el => {
      fullText += el.textContent + '\n\n';
    });
    
    const sentences = splitIntoSentences(fullText);
    
    return {
      sentences: sentences,
      title: document.title,
      matchCount: elements.length
    };
  } catch (error) {
    return { error: error.message, sentences: [] };
  }
}

// Scroll to a specific page in PDF viewer
function scrollToPdfPage(pageNumber) {
  // Try PDF.js viewer
  const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
  if (pageElement) {
    pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  
  // Try Chrome PDF viewer - send message to embed
  const embed = document.querySelector('embed[type="application/pdf"]');
  if (embed) {
    // Chrome PDF viewer uses hash for navigation
    const url = new URL(window.location.href);
    url.hash = `page=${pageNumber}`;
    window.location.href = url.toString();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ===========================================
// QUOTE CAPTURE MODE
// ===========================================

let captureModeActive = false;
let captureField = null;
let captureOverlay = null;

function activateCaptureMode(field) {
  // Cancel any existing capture mode first
  if (captureModeActive) {
    deactivateCaptureMode();
  }
  
  console.log('[CAPTURE MODE] Activating for field:', field);
  captureModeActive = true;
  captureField = field;
  
  // Create a non-blocking indicator bar at top
  captureOverlay = document.createElement('div');
  captureOverlay.id = 'ice-capture-overlay';
  captureOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: white;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  
  // Different instructions for PDF vs regular pages
  const isPdf = isPdfPage();
  captureOverlay.innerHTML = `
    <span>${isPdf ? '📋 Copy text with Ctrl+C (quote will capture automatically)' : '📌 Select text below, then click'}</span>
    ${isPdf ? '' : '<button id="ice-capture-confirm" style="background: #22c55e; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">✓ Capture Selected</button>'}
    <button id="ice-capture-cancel" style="background: #ef4444; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">✗ Cancel</button>
  `;
  
  document.body.appendChild(captureOverlay);
  console.log('[CAPTURE MODE] Overlay bar added');
  
  // Add click handlers for the buttons
  const confirmBtn = document.getElementById('ice-capture-confirm');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', captureCurrentSelection);
  }
  
  document.getElementById('ice-capture-cancel').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CAPTURE_CANCELLED' });
    deactivateCaptureMode();
    showToast('Capture cancelled', 'info', 2000);
  });
  
  // Listen for keyboard events (including Ctrl+C for PDFs)
  document.addEventListener('keydown', handleCaptureKeyDown, true);
  console.log('[CAPTURE MODE] Event listeners attached');
}

function handleCaptureKeyDown(e) {
  console.log('[CAPTURE MODE] Key pressed:', e.key, 'Ctrl:', e.ctrlKey, 'Meta:', e.metaKey);
  
  // Check for Escape
  if (e.key === 'Escape') {
    chrome.runtime.sendMessage({ type: 'CAPTURE_CANCELLED' });
    showToast('Capture cancelled', 'info', 2000);
    deactivateCaptureMode();
    return;
  }
  
  // Check for Ctrl+C or Cmd+C (for PDF auto-capture)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && isPdfPage()) {
    console.log('[CAPTURE MODE] Ctrl+C detected on PDF, will read clipboard');
    // Small delay to ensure clipboard is populated
    setTimeout(() => {
      navigator.clipboard.readText()
        .then(clipboardText => {
          const text = clipboardText.trim();
          console.log('[CAPTURE MODE] Clipboard content length:', text.length);
          console.log('[CAPTURE MODE] Clipboard preview:', text.substring(0, 100));
          
          if (text && text.length > 0) {
            console.log('[CAPTURE MODE] Sending quote from clipboard');
            chrome.runtime.sendMessage({
              type: 'QUOTE_CAPTURED',
              text: text,
              field: captureField,
              sourceUrl: window.location.href,
              sourceTitle: document.title
            });
            deactivateCaptureMode();
            showToast('✓ Quote auto-captured!', 'success', 2000);
          } else {
            console.log('[CAPTURE MODE] Clipboard was empty');
          }
        })
        .catch(err => {
          console.error('[CAPTURE MODE] Clipboard read error:', err);
          showToast('Could not read clipboard. Try again.', 'error', 2000);
        });
    }, 200);
  }
}

function handleCopyEvent(e) {
  console.log('[CAPTURE MODE] Copy event detected');
  // Small delay to ensure clipboard is populated
  setTimeout(() => {
    navigator.clipboard.readText()
      .then(clipboardText => {
        const text = clipboardText.trim();
        console.log('[CAPTURE MODE] Auto-captured from copy:', text.substring(0, 100));
        
        if (text && text.length > 0) {
          chrome.runtime.sendMessage({
            type: 'QUOTE_CAPTURED',
            text: text,
            field: captureField,
            sourceUrl: window.location.href,
            sourceTitle: document.title
          });
          deactivateCaptureMode();
          showToast('✓ Quote auto-captured!', 'success', 2000);
        }
      })
      .catch(err => {
        console.error('[CAPTURE MODE] Clipboard error:', err);
      });
  }, 100);
}

function captureCurrentSelection() {
  console.log('[CAPTURE MODE] Capture button clicked');
  
  // For PDFs, try clipboard first
  if (isPdfPage()) {
    console.log('[CAPTURE MODE] PDF detected, trying clipboard');
    navigator.clipboard.readText()
      .then(clipboardText => {
        const text = clipboardText.trim();
        console.log('[CAPTURE MODE] Clipboard text:', text);
        
        if (text && text.length > 0) {
          console.log('[CAPTURE MODE] Sending captured quote from clipboard');
          chrome.runtime.sendMessage({
            type: 'QUOTE_CAPTURED',
            text: text,
            field: captureField,
            sourceUrl: window.location.href,
            sourceTitle: document.title
          });
          deactivateCaptureMode();
          showToast('Quote captured from clipboard!', 'success', 2000);
        } else {
          showToast('Clipboard is empty! Copy some text first (Ctrl+C).', 'error', 3000);
        }
      })
      .catch(err => {
        console.error('[CAPTURE MODE] Clipboard error:', err);
        showToast('Could not read clipboard. Make sure you copied text first (Ctrl+C).', 'error', 3000);
      });
    return;
  }
  
  // For regular pages, try selection
  let selectedText = '';
  
  // Method 1: Standard window.getSelection()
  const standardSelection = window.getSelection();
  if (standardSelection) {
    selectedText = standardSelection.toString().trim();
    console.log('[CAPTURE MODE] Standard selection:', selectedText);
  }
  
  // Method 2: Try document.getSelection()
  if (!selectedText) {
    const docSelection = document.getSelection();
    if (docSelection) {
      selectedText = docSelection.toString().trim();
      console.log('[CAPTURE MODE] Document selection:', selectedText);
    }
  }
  
  console.log('[CAPTURE MODE] Final selected text:', selectedText);
  
  if (selectedText && selectedText.length > 0) {
    console.log('[CAPTURE MODE] Sending captured quote');
    chrome.runtime.sendMessage({
      type: 'QUOTE_CAPTURED',
      text: selectedText,
      field: captureField,
      sourceUrl: window.location.href,
      sourceTitle: document.title
    });
    deactivateCaptureMode();
    showToast('Quote captured!', 'success', 2000);
  } else {
    showToast('No text selected! Select some text first.', 'error', 2000);
  }
}

function handleTextSelection(e) {
  console.log('[CAPTURE MODE] Selection event fired');
  
  // Check if we're in a PDF
  let selectedText = '';
  if (isPdfPage() && window.ICEDeathsPdfHandler) {
    const pdfSelection = window.ICEDeathsPdfHandler.getPdfSelection();
    selectedText = pdfSelection?.text?.trim() || '';
    console.log('[CAPTURE MODE] PDF selection:', selectedText);
  } else {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    console.log('[CAPTURE MODE] Regular selection:', selectedText);
  }
  
  if (selectedText && selectedText.length > 0) {
    console.log('[CAPTURE MODE] Valid selection found, showing confirmation');
    
    // For PDFs, use a fixed position; for regular pages, use selection rect
    let rect;
    if (isPdfPage()) {
      rect = {
        left: window.innerWidth / 2 - 50,
        bottom: window.innerHeight / 2,
        top: window.innerHeight / 2 - 40
      };
    } else {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = { left: window.innerWidth / 2 - 50, bottom: window.innerHeight / 2, top: window.innerHeight / 2 - 40 };
      }
    }
    
    showCaptureConfirmation(selectedText, rect);
  } else {
    console.log('[CAPTURE MODE] No text selected');
  }
}

function showCaptureConfirmation(text, rect) {
  // Remove any existing confirmation
  const existing = document.getElementById('quote-capture-confirm');
  if (existing) existing.remove();
  
  // Create confirmation popup
  const popup = document.createElement('div');
  popup.id = 'quote-capture-confirm';
  popup.style.cssText = `
    position: fixed;
    left: ${rect.left + window.scrollX}px;
    top: ${rect.bottom + window.scrollY + 5}px;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 8px;
    display: flex;
    gap: 8px;
    z-index: 999999;
    animation: slideIn 0.2s ease-out;
  `;
  
  // Add CSS animation
  if (!document.getElementById('quote-capture-styles')) {
    const style = document.createElement('style');
    style.id = 'quote-capture-styles';
    style.textContent = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Confirm button
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '✓';
  confirmBtn.style.cssText = `
    background: #22c55e;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.15s;
  `;
  confirmBtn.onmouseover = () => confirmBtn.style.background = '#16a34a';
  confirmBtn.onmouseout = () => confirmBtn.style.background = '#22c55e';
  confirmBtn.onclick = (e) => {
    e.stopPropagation();
    // Capture the quote
    chrome.runtime.sendMessage({
      type: 'QUOTE_CAPTURED',
      text: text,
      field: captureField,
      sourceUrl: window.location.href,
      sourceTitle: document.title
    });
    popup.remove();
    deactivateCaptureMode();
  };
  
  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✗';
  cancelBtn.style.cssText = `
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.15s;
  `;
  cancelBtn.onmouseover = () => cancelBtn.style.background = '#dc2626';
  cancelBtn.onmouseout = () => cancelBtn.style.background = '#ef4444';
  cancelBtn.onclick = (e) => {
    e.stopPropagation();
    popup.remove();
    window.getSelection().removeAllRanges();
  };
  
  popup.appendChild(confirmBtn);
  popup.appendChild(cancelBtn);
  document.body.appendChild(popup);
  
  // Position adjustment if off-screen
  const popupRect = popup.getBoundingClientRect();
  if (popupRect.right > window.innerWidth) {
    popup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
  }
  if (popupRect.bottom > window.innerHeight) {
    popup.style.top = `${rect.top + window.scrollY - popupRect.height - 5}px`;
  }
}

function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    chrome.runtime.sendMessage({ type: 'CAPTURE_CANCELLED' });
    showToast('Capture cancelled', 'info', 2000);
    deactivateCaptureMode();
  }
}

function deactivateCaptureMode() {
  if (!captureModeActive) return;
  
  console.log('[CAPTURE MODE] Deactivating');
  captureModeActive = false;
  captureField = null;
  
  // Remove overlay
  const overlay = document.getElementById('ice-capture-overlay');
  if (overlay) overlay.remove();
  captureOverlay = null;
  
  // Remove confirmation popup if exists
  const popup = document.getElementById('quote-capture-confirm');
  if (popup) popup.remove();
  
  // Remove listeners
  document.removeEventListener('keydown', handleCaptureKeyDown, true);
  document.removeEventListener('copy', handleCopyEvent, true);
}
