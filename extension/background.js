// Research Platform - Background Service Worker

// Default API URL - can be configured per-project
let API_BASE = 'https://research-platform-beige.vercel.app/api';

// Extension state
let currentCase = null;
let pendingQuotes = [];
let verifiedQuotes = [];
let sources = [];
let customFields = []; // Custom fields for current incident
let currentContentMode = 'incident'; // 'incident' or 'statement' - controls context menu
let isValidateMode = false; // True when validating existing cases
let currentStatementType = ''; // Current statement type (for conditional menu sections)

// Multi-project state
let currentProjectSlug = null;
let currentRecordTypeSlug = null;
let dynamicFieldDefinitions = [];
let dynamicFieldGroups = [];

// ===========================================
// FIELD MENU DEFINITIONS
// Hierarchical menu structure for quote-to-field linking
// These are DEFAULT fields - will be replaced when project is selected
// ===========================================

const FIELD_MENU_CATEGORIES = [
  {
    id: 'core-fields',
    title: '📋 Core Fields',
    fields: [
      { key: 'victim_name', label: 'Victim Name' },
      { key: 'incident_date', label: 'Date' },
      { key: 'subject_age', label: 'Age' },
      { key: 'subject_nationality', label: 'Nationality' },
      { key: 'subject_gender', label: 'Gender' },
      { key: 'subject_immigration_status', label: 'Immigration Status' },
      { key: 'facility', label: 'Facility' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'summary', label: 'Summary' },
    ]
  },
  {
    id: 'shooting-details',
    title: '🔫 Shooting Details',
    fields: [
      { key: 'shooting_fatal', label: 'Fatal' },
      { key: 'shots_fired', label: 'Shots Fired' },
      { key: 'weapon_type', label: 'Weapon Type' },
      { key: 'bodycam_available', label: 'Bodycam Available' },
      { key: 'victim_armed', label: 'Victim Armed' },
      { key: 'warning_given', label: 'Warning Given' },
      { key: 'shooting_context', label: 'Context' },
    ]
  },
  {
    id: 'death-details',
    title: '💀 Death Details',
    fields: [
      { key: 'cause_of_death', label: 'Cause of Death' },
      { key: 'manner_of_death', label: 'Manner of Death' },
      { key: 'custody_duration', label: 'Custody Duration' },
      { key: 'medical_neglect_alleged', label: 'Medical Neglect Alleged' },
      { key: 'autopsy_available', label: 'Autopsy Available' },
      { key: 'circumstances', label: 'Circumstances' },
    ]
  },
  {
    id: 'arrest-details',
    title: '⚖️ Arrest Details',
    fields: [
      { key: 'arrest_reason', label: 'Stated Reason' },
      { key: 'arrest_context', label: 'Context' },
      { key: 'arrest_charges', label: 'Charges' },
      { key: 'warrant_present', label: 'Warrant Present' },
      { key: 'timing_suspicious', label: 'Timing Suspicious' },
      { key: 'pretext_arrest', label: 'Pretext Arrest' },
      { key: 'selective_enforcement', label: 'Selective Enforcement' },
    ]
  },
  {
    id: 'force-details',
    title: '💥 Excessive Force Details',
    fields: [
      { key: 'force_types', label: 'Force Types' },
      { key: 'victim_restrained', label: 'Victim Restrained' },
      { key: 'victim_complying', label: 'Victim Complying' },
      { key: 'video_evidence', label: 'Video Evidence' },
      { key: 'hospitalization_required', label: 'Hospitalization Required' },
      { key: 'injuries_sustained', label: 'Injuries Sustained' },
    ]
  },
  {
    id: 'injury-details',
    title: '🩹 Injury Details',
    fields: [
      { key: 'injury_type', label: 'Injury Type' },
      { key: 'injury_severity', label: 'Severity' },
      { key: 'injury_weapon', label: 'Weapon Used' },
      { key: 'injury_cause', label: 'Cause/Context' },
    ]
  },
  {
    id: 'medical-neglect-details',
    title: '🏥 Medical Neglect Details',
    fields: [
      { key: 'medical_condition', label: 'Medical Condition' },
      { key: 'treatment_denied', label: 'Treatment Denied' },
      { key: 'requests_documented', label: 'Requests Documented' },
      { key: 'resulted_in_death', label: 'Resulted in Death' },
    ]
  },
  {
    id: 'protest-details',
    title: '📢 Protest Details',
    fields: [
      { key: 'protest_topic', label: 'Protest Topic' },
      { key: 'protest_size', label: 'Estimated Size' },
      { key: 'permitted', label: 'Permitted' },
      { key: 'dispersal_method', label: 'Dispersal Methods' },
      { key: 'arrests_made', label: 'Arrests Made' },
    ]
  },
];

// Statement field menu categories (shown when in statement mode)
// Simplified for major public figure statements
const STATEMENT_FIELD_MENU_CATEGORIES = [
  {
    id: 'statement-core',
    title: '📋 Statement Info',
    fields: [
      { key: 'statement_type', label: 'Statement Type' },
      { key: 'statement_date', label: 'Statement Date' },
      { key: 'headline', label: 'Headline/Summary' },
      { key: 'key_quote', label: 'Key Quote' },
    ]
  },
  {
    id: 'speaker-info',
    title: '👤 Speaker Information',
    fields: [
      { key: 'speaker_name', label: 'Speaker Name' },
      { key: 'speaker_title', label: 'Title/Role' },
      { key: 'speaker_type', label: 'Speaker Type' },
      { key: 'political_affiliation', label: 'Political Affiliation' },
      { key: 'wikipedia_url', label: 'Wikipedia URL' },
    ]
  },
  {
    id: 'statement-context',
    title: '📍 Context & Platform',
    fields: [
      { key: 'platform', label: 'Platform' },
      { key: 'platform_url', label: 'Direct Link' },
      { key: 'context', label: 'What Prompted This?' },
    ]
  },
];

// Validate mode menu categories (simplified for validation)
const VALIDATE_FIELD_MENU_CATEGORIES = [
  {
    id: 'validate-core',
    title: '📋 Core Fields',
    fields: [
      { key: 'victim_name', label: 'Victim Name' },
      { key: 'incident_date', label: 'Date' },
      { key: 'facility', label: 'Facility' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'summary', label: 'Summary' },
    ]
  },
  {
    id: 'validate-details',
    title: '📝 Details',
    fields: [
      { key: 'cause_of_death', label: 'Cause of Death' },
      { key: 'manner_of_death', label: 'Manner of Death' },
      { key: 'circumstances', label: 'Circumstances' },
    ]
  },
];

// Get the appropriate menu categories based on current mode
function getActiveFieldCategories() {
  if (isValidateMode) {
    return VALIDATE_FIELD_MENU_CATEGORIES;
  }
  
  if (currentContentMode === 'statement') {
    return STATEMENT_FIELD_MENU_CATEGORIES;
  }
  
  return FIELD_MENU_CATEGORIES;
}

// Build context menus on install
function buildContextMenus() {
  console.log('Building context menus...');
  
  // Clear existing menus first
  chrome.contextMenus.removeAll(() => {
    console.log('Cleared existing menus, creating new ones...');
    
    try {
      // Root menu: Add Quote to Case
      chrome.contextMenus.create({
        id: 'add-quote-root',
        title: 'Add Quote to Case',
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error creating root menu:', chrome.runtime.lastError);
        } else {
          console.log('Created root menu');
        }
      });
      
      // Add "General (uncategorized)" option
      chrome.contextMenus.create({
        id: 'add-quote-general',
        parentId: 'add-quote-root',
        title: '📝 General (no field link)',
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error creating general menu:', chrome.runtime.lastError);
        }
      });
      
      // Separator
      chrome.contextMenus.create({
        id: 'separator-1',
        parentId: 'add-quote-root',
        type: 'separator',
        contexts: ['selection']
      });
      
      // Create category submenus with field children based on current mode
      const activeCategories = getActiveFieldCategories();
      const modeLabel = isValidateMode ? '(Validating)' : (currentContentMode === 'statement' ? '(Statement)' : '(Incident)');
      
      for (const category of activeCategories) {
        // Category submenu
        chrome.contextMenus.create({
          id: `category-${category.id}`,
          parentId: 'add-quote-root',
          title: category.title,
          contexts: ['selection']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error(`Error creating category ${category.id}:`, chrome.runtime.lastError);
          }
        });
        
        // Fields within category
        for (const field of category.fields) {
          chrome.contextMenus.create({
            id: `field-${field.key}`,
            parentId: `category-${category.id}`,
            title: field.label,
            contexts: ['selection']
          }, () => {
            if (chrome.runtime.lastError) {
              console.error(`Error creating field ${field.key}:`, chrome.runtime.lastError);
            }
          });
        }
      }
      
      // Separator before custom fields
      chrome.contextMenus.create({
        id: 'separator-2',
        parentId: 'add-quote-root',
        type: 'separator',
        contexts: ['selection']
      });
      
      // Custom fields category (always shown, but items added dynamically)
      chrome.contextMenus.create({
        id: 'category-custom-fields',
        parentId: 'add-quote-root',
        title: '🔧 Custom Fields',
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error creating custom fields category:', chrome.runtime.lastError);
        }
      });
      
      // Add "Add New" option
      chrome.contextMenus.create({
        id: 'custom-field-add-new',
        parentId: 'category-custom-fields',
        title: '➕ Add New Custom Field...',
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error adding custom-field-add-new:', chrome.runtime.lastError);
        }
      });
      
      // Separator before timeline
      chrome.contextMenus.create({
        id: 'separator-3',
        parentId: 'add-quote-root',
        type: 'separator',
        contexts: ['selection']
      });
      
      // Timeline event option
      chrome.contextMenus.create({
        id: 'add-quote-timeline',
        parentId: 'add-quote-root',
        title: '📅 Add as Timeline Event',
        contexts: ['selection']
      });
      
      console.log('Context menus creation initiated');
    } catch (error) {
      console.error('Error building menus:', error);
    }
  });
}

// Build context menus from dynamically fetched field definitions
function buildContextMenusFromDynamicFields() {
  console.log('[Background] Building context menus from dynamic fields...');
  console.log('[Background] Fields:', dynamicFieldDefinitions.length, 'Groups:', dynamicFieldGroups.length);
  
  // If no dynamic fields, fall back to default menus
  if (dynamicFieldDefinitions.length === 0) {
    console.log('[Background] No dynamic fields, using default menus');
    buildContextMenus();
    return;
  }
  
  // Clear existing menus first
  chrome.contextMenus.removeAll(() => {
    console.log('[Background] Cleared existing menus, creating from dynamic fields...');
    
    try {
      // Root menu: Add Quote to Record
      chrome.contextMenus.create({
        id: 'add-quote-root',
        title: 'Add Quote to Record',
        contexts: ['selection']
      });
      
      // Add "General (uncategorized)" option
      chrome.contextMenus.create({
        id: 'add-quote-general',
        parentId: 'add-quote-root',
        title: '📝 General (no field link)',
        contexts: ['selection']
      });
      
      // Separator
      chrome.contextMenus.create({
        id: 'separator-1',
        parentId: 'add-quote-root',
        type: 'separator',
        contexts: ['selection']
      });
      
      // Organize fields by group
      const groupedFields = {};
      const ungroupedFields = [];
      
      for (const group of dynamicFieldGroups) {
        groupedFields[group.id] = {
          group: group,
          fields: []
        };
      }
      
      for (const field of dynamicFieldDefinitions) {
        if (field.field_group_id && groupedFields[field.field_group_id]) {
          groupedFields[field.field_group_id].fields.push(field);
        } else {
          ungroupedFields.push(field);
        }
      }
      
      // Create menu items for each group
      for (const [groupId, { group, fields }] of Object.entries(groupedFields)) {
        if (fields.length === 0) continue;
        
        // Group submenu
        chrome.contextMenus.create({
          id: `group-${groupId}`,
          parentId: 'add-quote-root',
          title: group.name,
          contexts: ['selection']
        });
        
        // Fields within group
        for (const field of fields) {
          chrome.contextMenus.create({
            id: `field-${field.key}`,
            parentId: `group-${groupId}`,
            title: field.name,
            contexts: ['selection']
          });
        }
      }
      
      // Add ungrouped fields if any
      if (ungroupedFields.length > 0) {
        chrome.contextMenus.create({
          id: 'group-ungrouped',
          parentId: 'add-quote-root',
          title: '📋 Other Fields',
          contexts: ['selection']
        });
        
        for (const field of ungroupedFields) {
          chrome.contextMenus.create({
            id: `field-${field.key}`,
            parentId: 'group-ungrouped',
            title: field.name,
            contexts: ['selection']
          });
        }
      }
      
      // Separator before timeline
      chrome.contextMenus.create({
        id: 'separator-3',
        parentId: 'add-quote-root',
        type: 'separator',
        contexts: ['selection']
      });
      
      // Timeline event option
      chrome.contextMenus.create({
        id: 'add-quote-timeline',
        parentId: 'add-quote-root',
        title: '📅 Add as Timeline Event',
        contexts: ['selection']
      });
      
      console.log('[Background] Dynamic context menus created successfully');
    } catch (error) {
      console.error('[Background] Error building dynamic menus:', error);
    }
  });
}

// Update custom fields menu with incident's custom fields
async function updateCustomFieldsMenu(incidentId) {
  console.log('Updating custom fields menu for incident:', incidentId);
  
  // Remove existing custom field items (except add-new)
  for (const field of customFields) {
    try {
      chrome.contextMenus.remove(`custom-field-${field.id}`);
    } catch (e) {
      // Ignore if doesn't exist
    }
  }
  
  // Remove separator if it exists
  try {
    chrome.contextMenus.remove('custom-field-separator');
  } catch (e) {
    // Ignore
  }
  
  if (!incidentId) {
    customFields = [];
    return;
  }
  
  // Fetch custom fields for this incident
  try {
    const response = await fetch(`${API_BASE}/incidents/${incidentId}/custom-fields`);
    if (response.ok) {
      const data = await response.json();
      customFields = data.fields || [];
      
      console.log('Loaded custom fields:', customFields.length);
      
      // Add menu items for each custom field
      for (const field of customFields) {
        chrome.contextMenus.create({
          id: `custom-field-${field.id}`,
          parentId: 'category-custom-fields',
          title: `📌 ${field.field_name}: ${field.field_value?.substring(0, 30) || '(empty)'}...`,
          contexts: ['selection']
        }, () => {
          if (chrome.runtime.lastError) {
            console.log('Error adding custom field menu item:', chrome.runtime.lastError);
          }
        });
      }
      
      // Add separator before "Add New" if we have existing fields
      if (customFields.length > 0) {
        chrome.contextMenus.create({
          id: 'custom-field-separator',
          parentId: 'category-custom-fields',
          type: 'separator',
          contexts: ['selection']
        });
      }
    }
  } catch (err) {
    console.error('Error fetching custom fields:', err);
    customFields = [];
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('ICE Incident Tracker installed');
  buildContextMenus();
});

// Also build menus on startup (when service worker wakes up)
chrome.runtime.onStartup.addListener(() => {
  console.log('ICE Incident Tracker startup');
  buildContextMenus();
});

// Build menus immediately when script loads
buildContextMenus();

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuId = info.menuItemId;
  
  // Handle custom field operations
  if (menuId === 'custom-field-add-new') {
    // Request the sidepanel to show a popup for new custom field name
    chrome.runtime.sendMessage({
      type: 'PROMPT_CUSTOM_FIELD',
      selectedText: info.selectionText,
      sourceUrl: tab.url,
      sourceTitle: tab.title
    });
    return;
  }
  
  if (menuId.startsWith('custom-field-') && menuId !== 'custom-field-separator') {
    // Adding quote to existing custom field
    const fieldId = parseInt(menuId.replace('custom-field-', ''));
    const field = customFields.find(f => f.id === fieldId);
    if (field) {
      // Create quote linked to this custom field
      const quote = {
        id: crypto.randomUUID(),
        text: info.selectionText,
        sourceUrl: tab.url,
        sourceTitle: tab.title,
        category: 'custom',
        linkedField: `custom_${field.field_name}`,
        customFieldId: field.id,
        customFieldName: field.field_name,
        status: 'verified',
        createdAt: new Date().toISOString()
      };
      
      verifiedQuotes.unshift(quote);
      
      chrome.runtime.sendMessage({
        type: 'QUOTE_VERIFIED',
        quote: quote
      });
      
      notifyContentScript(tab.id, {
        type: 'SHOW_TOAST',
        message: `Quote linked to custom field "${field.field_name}"`
      });
    }
    return;
  }
  
  // Determine category and linked field for standard fields
  let category = 'uncategorized';
  let linkedField = null;
  
  // All possible field category sets to search
  const allFieldCategories = [
    ...FIELD_MENU_CATEGORIES,
    ...STATEMENT_FIELD_MENU_CATEGORIES,
    ...VALIDATE_FIELD_MENU_CATEGORIES
  ];
  
  if (menuId === 'add-quote-general') {
    category = 'uncategorized';
  } else if (menuId === 'add-quote-timeline') {
    category = 'timeline';
  } else if (menuId.startsWith('field-')) {
    // Extract field key from menu ID
    linkedField = menuId.replace('field-', '');
    
    // Find the category this field belongs to (search all category sets)
    for (const cat of allFieldCategories) {
      const foundField = cat.fields.find(f => f.key === linkedField);
      if (foundField) {
        // Use a friendly category name based on the category id
        category = cat.id.replace('-details', '').replace(/-/g, '_');
        break;
      }
    }
  } else {
    // Unknown menu item, ignore
    return;
  }
  
  const quote = {
    id: crypto.randomUUID(),
    text: info.selectionText,
    sourceUrl: tab.url,
    sourceTitle: tab.title,
    category: category,
    linkedField: linkedField,
    status: 'verified',
    createdAt: new Date().toISOString()
  };
  
  // Add to verified quotes (user-selected quotes go directly to verified)
  verifiedQuotes.unshift(quote);
  
  // Notify sidebar with field link info
  chrome.runtime.sendMessage({
    type: 'QUOTE_VERIFIED',
    quote: quote
  });
  
  // Build toast message
  let toastMessage = 'Quote added to case';
  if (linkedField) {
    // Find the friendly label for the field (search all category sets)
    for (const cat of allFieldCategories) {
      const foundField = cat.fields.find(f => f.key === linkedField);
      if (foundField) {
        toastMessage = `Quote linked to "${foundField.label}"`;
        break;
      }
    }
  } else if (category === 'timeline') {
    toastMessage = 'Quote added as timeline event';
  }
  
  // Show notification
  notifyContentScript(tab.id, {
    type: 'SHOW_TOAST',
    message: toastMessage
  });
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
        sources: sources,
        customFields: customFields,
        currentContentMode: currentContentMode,
        isValidateMode: isValidateMode,
        // Include project context
        currentProjectSlug: currentProjectSlug,
        currentRecordTypeSlug: currentRecordTypeSlug
      });
      return true;
    
    case 'PROJECT_CHANGED':
      // Update project context
      currentProjectSlug = message.projectSlug;
      console.log('[Background] Project changed to:', currentProjectSlug);
      saveState();
      sendResponse({ success: true });
      break;
    
    case 'RECORD_TYPE_CHANGED':
      // Update record type and rebuild context menus from dynamic fields
      currentProjectSlug = message.projectSlug;
      currentRecordTypeSlug = message.recordTypeSlug;
      dynamicFieldDefinitions = message.fields || [];
      dynamicFieldGroups = message.groups || [];
      console.log('[Background] Record type changed to:', currentRecordTypeSlug);
      console.log('[Background] Received', dynamicFieldDefinitions.length, 'fields,', dynamicFieldGroups.length, 'groups');
      
      // Rebuild context menus with dynamic fields
      buildContextMenusFromDynamicFields();
      saveState();
      sendResponse({ success: true });
      break;
    
    case 'SET_CONTENT_MODE':
      // Update content mode and rebuild context menus
      const newMode = message.mode;
      const newValidateMode = message.isValidateMode || false;
      const newStatementType = message.statementType || '';
      console.log(`Switching content mode from ${currentContentMode} to ${newMode}, validate: ${newValidateMode}, statementType: ${newStatementType}`);
      
      const modeChanged = newMode !== currentContentMode || 
                          newValidateMode !== isValidateMode || 
                          newStatementType !== currentStatementType;
      
      if (modeChanged) {
        currentContentMode = newMode;
        isValidateMode = newValidateMode;
        currentStatementType = newStatementType;
        buildContextMenus();
        saveState();
      }
      sendResponse({ success: true });
      break;
      
    case 'SET_CURRENT_CASE':
      currentCase = message.case;
      saveState();
      // Update custom fields menu for this incident
      if (currentCase && currentCase.id) {
        updateCustomFieldsMenu(currentCase.id);
      } else {
        updateCustomFieldsMenu(null);
      }
      sendResponse({ success: true });
      break;
      
    case 'REFRESH_CUSTOM_FIELDS':
      // Refresh custom fields menu
      if (currentCase && currentCase.id) {
        updateCustomFieldsMenu(currentCase.id);
      }
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
      customFields = [];
      updateCustomFieldsMenu(null);
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
    
    case 'QUOTE_CAPTURED':
      // Forward captured quote to sidepanel
      chrome.runtime.sendMessage({
        type: 'QUOTE_CAPTURED',
        text: message.text,
        field: message.field,
        sourceUrl: message.sourceUrl,
        sourceTitle: message.sourceTitle
      });
      sendResponse({ success: true });
      break;
    
    case 'CAPTURE_CANCELLED':
      // Forward cancel to sidepanel
      chrome.runtime.sendMessage({ type: 'CAPTURE_CANCELLED' });
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
