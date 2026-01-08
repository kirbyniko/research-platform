// ICE Deaths Research Assistant - Background Service Worker

const API_BASE = 'http://localhost:3001/api';

// Extension state
let currentCase = null;
let pendingQuotes = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('ICE Deaths Research Assistant installed');
  
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
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    pendingQuotes.push(quote);
    
    // Notify sidebar
    chrome.runtime.sendMessage({
      type: 'QUOTE_ADDED',
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
          status: 'pending',
          createdAt: new Date().toISOString(),
          pageNumber: response.pageNumber
        };
        
        pendingQuotes.push(quote);
        
        chrome.runtime.sendMessage({
          type: 'QUOTE_ADDED',
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
  }
});

// Message handling from content script and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      sendResponse({
        currentCase: currentCase,
        pendingQuotes: pendingQuotes
      });
      break;
      
    case 'SET_CURRENT_CASE':
      currentCase = message.case;
      saveState();
      sendResponse({ success: true });
      break;
      
    case 'CLEAR_QUOTES':
      pendingQuotes = [];
      saveState();
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
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Save state to storage
function saveState() {
  chrome.storage.local.set({
    pendingQuotes: pendingQuotes,
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
chrome.storage.local.get(['pendingQuotes', 'currentCase'], (result) => {
  if (result.pendingQuotes) {
    pendingQuotes = result.pendingQuotes;
  }
  if (result.currentCase) {
    currentCase = result.currentCase;
  }
});
