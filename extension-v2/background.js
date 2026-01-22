/**
 * Background Service Worker
 * Handles context menus, message passing, and side panel management
 */

// State
let currentFieldDefinitions = [];
let contextMenusCreated = false;
let connectedPorts = new Map();

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Research Platform] Extension installed');
  createBaseContextMenus();
});

/**
 * Create base context menus (non-dynamic)
 */
function createBaseContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Base menu items always available
    chrome.contextMenus.create({
      id: 'research-platform-root',
      title: 'Research Platform',
      contexts: ['selection', 'page']
    });

    chrome.contextMenus.create({
      id: 'add-as-quote',
      parentId: 'research-platform-root',
      title: 'Add as Quote',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'add-page-as-source',
      parentId: 'research-platform-root',
      title: 'Add Page as Source',
      contexts: ['page', 'selection']
    });

    chrome.contextMenus.create({
      id: 'extract-page',
      parentId: 'research-platform-root',
      title: 'Extract Page Content',
      contexts: ['page']
    });

    chrome.contextMenus.create({
      id: 'separator-1',
      parentId: 'research-platform-root',
      type: 'separator',
      contexts: ['selection']
    });

    // Dynamic field menus will be added below this
    chrome.contextMenus.create({
      id: 'add-to-field',
      parentId: 'research-platform-root',
      title: 'Add to Field...',
      contexts: ['selection']
    });

    contextMenusCreated = true;
    console.log('[Research Platform] Base context menus created');
  });
}

/**
 * Update context menus with field definitions from the current project/record type
 */
function updateFieldContextMenus(fields) {
  if (!contextMenusCreated) return;

  // Remove old field menus
  for (const field of currentFieldDefinitions) {
    try {
      chrome.contextMenus.remove(`field-${field.name}`);
    } catch (e) {
      // Ignore
    }
  }

  currentFieldDefinitions = fields || [];

  // Add new field menus
  for (const field of currentFieldDefinitions) {
    // Only add text-compatible fields
    if (['text', 'textarea', 'date', 'number'].includes(field.type)) {
      chrome.contextMenus.create({
        id: `field-${field.name}`,
        parentId: 'add-to-field',
        title: field.label || field.name,
        contexts: ['selection']
      });
    }
  }

  console.log(`[Research Platform] Updated context menus with ${currentFieldDefinitions.length} fields`);
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menuId = info.menuItemId;

  if (menuId === 'add-as-quote') {
    sendToSidePanel({
      action: 'addQuote',
      data: {
        text: info.selectionText,
        url: info.pageUrl
      }
    });
  } else if (menuId === 'add-page-as-source') {
    sendToSidePanel({
      action: 'addSource',
      data: {
        url: info.pageUrl,
        title: tab?.title || ''
      }
    });
  } else if (menuId === 'extract-page') {
    // Request content extraction from content script
    chrome.tabs.sendMessage(tab.id, { action: 'extractContent' }, (response) => {
      if (response) {
        sendToSidePanel({
          action: 'pageExtracted',
          data: response
        });
      }
    });
  } else if (menuId.startsWith('field-')) {
    const fieldName = menuId.replace('field-', '');
    sendToSidePanel({
      action: 'addToField',
      data: {
        fieldName,
        text: info.selectionText,
        url: info.pageUrl
      }
    });
  }
});

/**
 * Send message to side panel
 */
function sendToSidePanel(message) {
  // Try to send to connected ports first
  for (const [id, port] of connectedPorts) {
    try {
      port.postMessage(message);
      return;
    } catch (e) {
      connectedPorts.delete(id);
    }
  }

  // Fallback: send to all extension pages
  chrome.runtime.sendMessage(message).catch(() => {
    // No listeners - that's okay
  });
}

/**
 * Handle messages from content scripts and side panel
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'updateFieldMenus':
      updateFieldContextMenus(request.fields);
      sendResponse({ success: true });
      break;

    case 'openSidePanel':
      chrome.sidePanel.open({ windowId: sender.tab?.windowId }).catch(console.error);
      sendResponse({ success: true });
      break;

    case 'getTabInfo':
      if (sender.tab) {
        sendResponse({
          url: sender.tab.url,
          title: sender.tab.title,
          tabId: sender.tab.id
        });
      } else {
        // Get active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            sendResponse({
              url: tabs[0].url,
              title: tabs[0].title,
              tabId: tabs[0].id
            });
          } else {
            sendResponse({ error: 'No active tab' });
          }
        });
        return true; // Keep channel open for async response
      }
      break;

    case 'extractFromTab':
      const tabId = request.tabId;
      if (tabId) {
        // Ensure content script is injected
        injectContentScript(tabId).then(() => {
          chrome.tabs.sendMessage(tabId, { action: 'extractContent' }, sendResponse);
        }).catch(err => {
          sendResponse({ error: err.message });
        });
        return true; // Keep channel open
      }
      break;

    case 'getSelection':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelection' }, sendResponse);
        } else {
          sendResponse({ selection: '' });
        }
      });
      return true; // Keep channel open

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Inject content script into tab if not already present
 */
async function injectContentScript(tabId) {
  try {
    // Check if content script is already loaded
    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' }).catch(() => null);
    if (response?.status === 'alive') {
      return; // Already loaded
    }
  } catch (e) {
    // Not loaded
  }

  // Inject content script
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
}

/**
 * Handle long-lived connections (for side panel)
 */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    const portId = Date.now().toString();
    connectedPorts.set(portId, port);
    console.log('[Research Platform] Side panel connected');

    port.onMessage.addListener((msg) => {
      if (msg.action === 'updateFieldMenus') {
        updateFieldContextMenus(msg.fields);
      }
    });

    port.onDisconnect.addListener(() => {
      connectedPorts.delete(portId);
      console.log('[Research Platform] Side panel disconnected');
    });
  }
});

/**
 * Handle side panel behavior
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

/**
 * Handle action click (toolbar icon)
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

console.log('[Research Platform] Background service worker loaded');
