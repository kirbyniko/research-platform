// ICE Incident Tracker Research Assistant - Background Service Worker

const API_BASE = 'https://ice-deaths.vercel.app/api';

// Extension state
let currentCase = null;
let pendingQuotes = [];
let verifiedQuotes = [];
let sources = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('ICE Incident Tracker Research Assistant installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'add-quote',
    title: 'Add Quote to Case',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'add-quote-timeline',
    title: 'Add as Timeline Event',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'add-quote-official',
    title: 'Add as Official Statement',
    contexts: ['selection']
  });
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'add-quote' || 
      info.menuItemId === 'add-quote-timeline' ||
      info.menuItemId === 'add-quote-official') {
    
    const category = info.menuItemId === 'add-quote-timeline' ? 'timeline' :
                     info.menuItemId === 'add-quote-official' ? 'official' : 
                     'uncategorized';
    
    const quote = {
      id: crypto.randomUUID(),
      text: info.selectionText,
      sourceUrl: tab.url,
      sourceTitle: tab.title,
      category: category,
      status: 'verified',
      createdAt: new Date().toISOString()
    };
    
    // Add to verified quotes (user-selected quotes go directly to verified)
    verifiedQuotes.unshift(quote);
    
    // Notify sidebar
    chrome.runtime.sendMessage({
      type: 'QUOTE_VERIFIED',
      quote: quote
    });
    
    // Show notification
    notifyContentScript(tab.id, {
      type: 'SHOW_TOAST',
      message: 'Quote added to case'
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'add-quote') {
    // Request selected text from content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (response) => {
      if (response && response.text) {
        const quote = {
          id: crypto.randomUUID(),
          text: response.text,
          sourceUrl: tab.url,
          sourceTitle: tab.title,
          category: 'uncategorized',
          status: 'verified',
          createdAt: new Date().toISOString(),
          pageNumber: response.pageNumber
        };
        
        // Add to verified quotes (user-selected quotes go directly to verified)
        verifiedQuotes.unshift(quote);
        
        chrome.runtime.sendMessage({
          type: 'QUOTE_VERIFIED',
          quote: quote
        });
        
        notifyContentScript(tab.id, {
          type: 'SHOW_TOAST',
          message: 'Quote added (Alt+Q)'
        });
      }
    });
  } else if (command === 'extract-article') {
    // Trigger extraction via sidebar
    chrome.runtime.sendMessage({ type: 'TRIGGER_EXTRACT' });
    notifyContentScript(tab.id, {
      type: 'SHOW_TOAST',
      message: 'Extracting content...'
    });
  } else if (command === 'save-case') {
    // Trigger save via sidebar
    chrome.runtime.sendMessage({ type: 'TRIGGER_SAVE' });
  } else if (command === 'toggle-overlay') {
    // Toggle the page overlay
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' }, (response) => {
      if (response && response.success) {
        notifyContentScript(tab.id, {
          type: 'SHOW_TOAST',
          message: response.visible ? 'Overlay opened' : 'Overlay closed',
          duration: 1000
        });
      }
    });
  }
});

// Message handling from content script and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type, 'from:', sender);
  
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({
        currentCase: currentCase,
        pendingQuotes: pendingQuotes,
        verifiedQuotes: verifiedQuotes,
        sources: sources
      });
      return true;
      
    case 'SET_CURRENT_CASE':
      currentCase = message.case;
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'CLEAR_QUOTES':
      pendingQuotes = [];
      verifiedQuotes = [];
      saveState();
      sendResponse({ success: true });
      break;
    
    case 'CLEAR_ALL':
      pendingQuotes = [];
      verifiedQuotes = [];
      sources = [];
      currentCase = null;
      saveState();
      chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
      sendResponse({ success: true });
      break;
      
    case 'SYNC_QUOTES':
      pendingQuotes = message.quotes || [];
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'REMOVE_QUOTE':
      pendingQuotes = pendingQuotes.filter(q => q.id !== message.quoteId);
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'UPDATE_QUOTE':
      const idx = pendingQuotes.findIndex(q => q.id === message.quote.id);
      if (idx !== -1) {
        pendingQuotes[idx] = { ...pendingQuotes[idx], ...message.quote };
      }
      saveState();
      sendResponse({ success: true });
      break;
    
    case 'ACCEPT_QUOTE':
      // Move quote from pending to verified
      const acceptIdx = pendingQuotes.findIndex(q => q.id === message.quoteId);
      if (acceptIdx !== -1) {
        const quote = pendingQuotes[acceptIdx];
        quote.status = 'verified';
        verifiedQuotes.push(quote);
        pendingQuotes.splice(acceptIdx, 1);
      }
      saveState();
      // Notify sidepanel to refresh
      chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
      sendResponse({ success: true });
      break;
    
    case 'REJECT_QUOTE':
      // Remove quote from pending
      pendingQuotes = pendingQuotes.filter(q => q.id !== message.quoteId);
      saveState();
      chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
      sendResponse({ success: true });
      break;
    
    case 'REMOVE_VERIFIED_QUOTE':
      // Remove from verified quotes
      verifiedQuotes = verifiedQuotes.filter(q => q.id !== message.quoteId);
      saveState();
      chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
      sendResponse({ success: true });
      break;
    
    case 'ADD_SOURCE':
      // Store sources in state
      if (message.source) {
        sources.push(message.source);
        saveState();
      }
      chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
      sendResponse({ success: true });
      break;
    
    case 'REMOVE_SOURCE':
      // Remove source by id
      sources = sources.filter(s => s.id !== message.sourceId);
      saveState();
      chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
      sendResponse({ success: true });
      break;
    
    case 'SYNC_STATE':
      // Sync all state from sidepanel
      if (message.pendingQuotes !== undefined) pendingQuotes = message.pendingQuotes;
      if (message.verifiedQuotes !== undefined) verifiedQuotes = message.verifiedQuotes;
      if (message.sources !== undefined) sources = message.sources;
      if (message.currentCase !== undefined) currentCase = message.currentCase;
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'ARTICLE_EXTRACTED':
      // Content script extracted article, classify sentences
      classifySentences(message.sentences).then(classified => {
        chrome.runtime.sendMessage({
          type: 'SENTENCES_CLASSIFIED',
          sentences: classified
        });
      });
      break;
      
    case 'SAVE_CASE':
      saveCase(message.caseData).then(result => {
        sendResponse(result);
      });
      return true; // Keep channel open for async response
      
    case 'CLASSIFY_TEXT':
      classifySentences(message.sentences).then(result => {
        sendResponse(result);
      });
      return true;
    
    case 'LOAD_DOCUMENT_DATA':
      // External page (website) wants to load document data into extension
      if (message.documentData) {
        const doc = message.documentData;
        
        // Set up case from document
        currentCase = {
          incidentType: doc.incidentType || 'death_in_custody',
          name: doc.name || '',
          dateOfDeath: doc.dateOfDeath || '',
          age: doc.age || '',
          country: doc.country || '',
          facility: doc.facility || '',
          location: doc.location || '',
          causeOfDeath: doc.causeOfDeath || '',
          summary: doc.summary || ''
        };
        
        // Load extracted quotes if any
        if (doc.quotes && Array.isArray(doc.quotes)) {
          // Split quotes into pending and verified based on status
          const allQuotes = doc.quotes.map(q => ({
            id: crypto.randomUUID(),
            text: q.text || q,
            category: q.category || 'context',
            status: q.status || 'pending',
            sourceUrl: doc.sourceUrl || '',
            sourceTitle: doc.sourceTitle || doc.title || ''
          }));
          
          pendingQuotes = allQuotes.filter(q => q.status !== 'verified');
          verifiedQuotes = allQuotes.filter(q => q.status === 'verified');
        }
        
        // Load source
        if (doc.sourceUrl || doc.url) {
          sources = [{
            id: crypto.randomUUID(),
            url: doc.sourceUrl || doc.url,
            title: doc.sourceTitle || doc.title || '',
            type: doc.sourceType || 'article',
            date: doc.date || '',
            author: doc.author || ''
          }];
        }
        
        saveState();
        
        // Notify sidepanel to refresh
        chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
        chrome.runtime.sendMessage({ type: 'DOCUMENT_LOADED', documentData: doc });
        
        sendResponse({ success: true, message: 'Document loaded into extension' });
      } else {
        sendResponse({ success: false, error: 'No document data provided' });
      }
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Handle messages from external websites (localhost pages)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('External message received:', message.type, 'from:', sender.url);
  
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({
        currentCase: currentCase,
        pendingQuotes: pendingQuotes,
        verifiedQuotes: verifiedQuotes,
        sources: sources
      });
      return true;
    
    case 'LOAD_DOCUMENT_DATA':
      if (message.documentData) {
        const doc = message.documentData;
        
        currentCase = {
          incidentType: doc.incidentType || 'death_in_custody',
          name: doc.name || '',
          dateOfDeath: doc.dateOfDeath || '',
          age: doc.age || '',
          country: doc.country || '',
          facility: doc.facility || '',
          location: doc.location || '',
          causeOfDeath: doc.causeOfDeath || '',
          summary: doc.summary || ''
        };
        
        if (doc.quotes && Array.isArray(doc.quotes)) {
          // Split quotes into pending and verified based on status
          const allQuotes = doc.quotes.map(q => ({
            id: crypto.randomUUID(),
            text: q.text || q,
            category: q.category || 'context',
            status: q.status || 'pending',
            sourceUrl: doc.sourceUrl || '',
            sourceTitle: doc.sourceTitle || doc.title || ''
          }));
          
          pendingQuotes = allQuotes.filter(q => q.status !== 'verified');
          verifiedQuotes = allQuotes.filter(q => q.status === 'verified');
        }
        
        if (doc.sourceUrl || doc.url) {
          sources = [{
            id: crypto.randomUUID(),
            url: doc.sourceUrl || doc.url,
            title: doc.sourceTitle || doc.title || '',
            type: doc.sourceType || 'article',
            date: doc.date || '',
            author: doc.author || ''
          }];
        }
        
        saveState();
        chrome.runtime.sendMessage({ type: 'REFRESH_QUOTES' });
        chrome.runtime.sendMessage({ type: 'DOCUMENT_LOADED', documentData: doc });
        
        sendResponse({ success: true, message: 'Document loaded into extension' });
      } else {
        sendResponse({ success: false, error: 'No document data provided' });
      }
      return true;
    
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
      return true;
  }
});

// Save state to storage
function saveState() {
  chrome.storage.local.set({
    pendingQuotes: pendingQuotes,
    verifiedQuotes: verifiedQuotes,
    sources: sources,
    currentCase: currentCase
  });
}

// Helper to send message to content script
function notifyContentScript(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {
    // Tab might not have content script loaded
  });
}

// API Functions

async function classifySentences(sentences) {
  try {
    const response = await fetch(`${API_BASE}/extract-quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: sentences.join('\n'),
        documentId: 'extension-temp'
      })
    });
    
    if (!response.ok) {
      throw new Error('Classification failed');
    }
    
    const data = await response.json();
    return data.quotes || [];
  } catch (error) {
    console.error('Classification error:', error);
    return sentences.map(s => ({
      text: s,
      category: 'uncategorized',
      confidence: 0
    }));
  }
}

async function saveCase(caseData) {
  try {
    const response = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(caseData)
    });
    
    if (!response.ok) {
      throw new Error('Save failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Save error:', error);
    return { error: error.message };
  }
}

async function saveQuotes(caseId, quotes) {
  try {
    const response = await fetch(`${API_BASE}/quotes/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caseId: caseId,
        quotes: quotes
      })
    });
    
    if (!response.ok) {
      throw new Error('Save quotes failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Save quotes error:', error);
    return { error: error.message };
  }
}

// Store pending quotes in local storage for persistence
chrome.storage.local.get(['pendingQuotes', 'verifiedQuotes', 'sources', 'currentCase'], (result) => {
  if (result.pendingQuotes) {
    pendingQuotes = result.pendingQuotes;
  }
  if (result.verifiedQuotes) {
    verifiedQuotes = result.verifiedQuotes;
  }
  if (result.sources) {
    sources = result.sources;
  }
  if (result.currentCase) {
    currentCase = result.currentCase;
  }
});
