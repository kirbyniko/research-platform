// Research Platform Extension - Project API Module
// Handles all multi-project API interactions

// Default API URL - can be overridden in settings
const DEFAULT_API_URL = 'https://research-platform-beige.vercel.app';

// State
let _apiUrl = DEFAULT_API_URL;
let _apiKey = '';
let _currentProject = null;  // { id, slug, name }
let _currentRecordType = null;  // { id, slug, name }
let _fieldDefinitions = [];
let _fieldGroups = [];
let _projects = [];
let _recordTypes = [];

// ============================================
// INITIALIZATION & AUTH
// ============================================

/**
 * Initialize the project API module
 * Loads settings from storage and fetches initial data
 */
async function initProjectApi() {
  // Load settings from storage
  const settings = await chrome.storage.local.get([
    'apiUrl', 
    'apiKey', 
    'currentProjectSlug', 
    'currentRecordTypeSlug'
  ]);
  
  _apiUrl = settings.apiUrl || DEFAULT_API_URL;
  _apiKey = settings.apiKey || '';
  
  console.log('[ProjectAPI] Initialized with URL:', _apiUrl);
  
  // If we have an API key, try to fetch projects
  if (_apiKey) {
    await refreshProjects();
    
    // Restore selected project/type if saved
    if (settings.currentProjectSlug) {
      const project = _projects.find(p => p.slug === settings.currentProjectSlug);
      if (project) {
        await selectProject(project.slug);
        
        if (settings.currentRecordTypeSlug) {
          await selectRecordType(settings.currentRecordTypeSlug);
        }
      }
    }
  }
  
  return {
    apiUrl: _apiUrl,
    apiKey: _apiKey,
    currentProject: _currentProject,
    currentRecordType: _currentRecordType,
    projects: _projects
  };
}

/**
 * Set the API URL
 */
async function setApiUrl(url) {
  _apiUrl = url;
  await chrome.storage.local.set({ apiUrl: url });
  console.log('[ProjectAPI] API URL set to:', url);
}

/**
 * Set the API key
 */
async function setApiKey(key) {
  _apiKey = key;
  await chrome.storage.local.set({ apiKey: key });
  console.log('[ProjectAPI] API key updated');
}

/**
 * Get auth headers for API requests
 */
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (_apiKey) {
    headers['Authorization'] = `Bearer ${_apiKey}`;
  }
  
  return headers;
}

// ============================================
// PROJECT MANAGEMENT
// ============================================

/**
 * Fetch all projects the user has access to
 */
async function refreshProjects() {
  try {
    const response = await fetch(`${_apiUrl}/api/projects`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('[ProjectAPI] Not authenticated');
        _projects = [];
        return [];
      }
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const data = await response.json();
    _projects = data.projects || [];
    console.log('[ProjectAPI] Loaded', _projects.length, 'projects');
    
    return _projects;
  } catch (error) {
    console.error('[ProjectAPI] Error fetching projects:', error);
    _projects = [];
    return [];
  }
}

/**
 * Select a project and load its record types
 */
async function selectProject(projectSlug) {
  const project = _projects.find(p => p.slug === projectSlug);
  
  if (!project) {
    console.error('[ProjectAPI] Project not found:', projectSlug);
    return null;
  }
  
  _currentProject = project;
  await chrome.storage.local.set({ currentProjectSlug: projectSlug });
  
  // Load record types for this project
  await refreshRecordTypes();
  
  console.log('[ProjectAPI] Selected project:', project.name);
  return project;
}

/**
 * Get current project
 */
function getCurrentProject() {
  return _currentProject;
}

/**
 * Get all projects
 */
function getProjects() {
  return _projects;
}

// ============================================
// RECORD TYPE MANAGEMENT
// ============================================

/**
 * Fetch record types for the current project
 */
async function refreshRecordTypes() {
  if (!_currentProject) {
    _recordTypes = [];
    return [];
  }
  
  try {
    const response = await fetch(
      `${_apiUrl}/api/projects/${_currentProject.slug}/record-types`,
      { headers: getAuthHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch record types: ${response.status}`);
    }
    
    const data = await response.json();
    _recordTypes = data.recordTypes || [];
    console.log('[ProjectAPI] Loaded', _recordTypes.length, 'record types');
    
    return _recordTypes;
  } catch (error) {
    console.error('[ProjectAPI] Error fetching record types:', error);
    _recordTypes = [];
    return [];
  }
}

/**
 * Select a record type and load its field definitions
 */
async function selectRecordType(recordTypeSlug) {
  if (!_currentProject) {
    console.error('[ProjectAPI] No project selected');
    return null;
  }
  
  const recordType = _recordTypes.find(rt => rt.slug === recordTypeSlug);
  
  if (!recordType) {
    console.error('[ProjectAPI] Record type not found:', recordTypeSlug);
    return null;
  }
  
  _currentRecordType = recordType;
  await chrome.storage.local.set({ currentRecordTypeSlug: recordTypeSlug });
  
  // Load field definitions
  await refreshFieldDefinitions();
  
  console.log('[ProjectAPI] Selected record type:', recordType.name);
  return recordType;
}

/**
 * Get current record type
 */
function getCurrentRecordType() {
  return _currentRecordType;
}

/**
 * Get all record types for current project
 */
function getRecordTypes() {
  return _recordTypes;
}

// ============================================
// FIELD DEFINITIONS
// ============================================

/**
 * Fetch field definitions for the current record type
 */
async function refreshFieldDefinitions() {
  if (!_currentProject || !_currentRecordType) {
    _fieldDefinitions = [];
    _fieldGroups = [];
    return { fields: [], groups: [] };
  }
  
  try {
    const response = await fetch(
      `${_apiUrl}/api/projects/${_currentProject.slug}/record-types/${_currentRecordType.slug}`,
      { headers: getAuthHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch field definitions: ${response.status}`);
    }
    
    const data = await response.json();
    _fieldDefinitions = data.fields || [];
    _fieldGroups = data.groups || [];
    
    console.log('[ProjectAPI] Loaded', _fieldDefinitions.length, 'fields in', _fieldGroups.length, 'groups');
    
    return { fields: _fieldDefinitions, groups: _fieldGroups };
  } catch (error) {
    console.error('[ProjectAPI] Error fetching field definitions:', error);
    _fieldDefinitions = [];
    _fieldGroups = [];
    return { fields: [], groups: [] };
  }
}

/**
 * Get field definitions
 */
function getFieldDefinitions() {
  return _fieldDefinitions;
}

/**
 * Get field groups
 */
function getFieldGroups() {
  return _fieldGroups;
}

/**
 * Get fields organized by group
 */
function getFieldsByGroup() {
  const grouped = {};
  const ungrouped = [];
  
  // Create group buckets
  for (const group of _fieldGroups) {
    grouped[group.id] = {
      group,
      fields: []
    };
  }
  
  // Sort fields into groups
  for (const field of _fieldDefinitions) {
    if (field.field_group_id && grouped[field.field_group_id]) {
      grouped[field.field_group_id].fields.push(field);
    } else {
      ungrouped.push(field);
    }
  }
  
  return { grouped, ungrouped };
}

/**
 * Build context menu structure from field definitions
 */
function buildFieldMenuCategories() {
  const { grouped, ungrouped } = getFieldsByGroup();
  const categories = [];
  
  // Add grouped fields
  for (const [groupId, { group, fields }] of Object.entries(grouped)) {
    if (fields.length === 0) continue;
    
    categories.push({
      id: `group-${group.id}`,
      title: group.name,
      fields: fields.map(f => ({
        key: f.key,
        label: f.name
      }))
    });
  }
  
  // Add ungrouped fields if any
  if (ungrouped.length > 0) {
    categories.push({
      id: 'ungrouped',
      title: '📋 Other Fields',
      fields: ungrouped.map(f => ({
        key: f.key,
        label: f.name
      }))
    });
  }
  
  return categories;
}

// ============================================
// RECORD OPERATIONS
// ============================================

/**
 * Create a new record
 */
async function createRecord(data, options = {}) {
  if (!_currentProject || !_currentRecordType) {
    throw new Error('No project or record type selected');
  }
  
  const payload = {
    record_type_slug: _currentRecordType.slug,
    data,
    is_guest_submission: options.isGuest || false,
    guest_email: options.guestEmail || null,
    guest_name: options.guestName || null
  };
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create record');
  }
  
  const result = await response.json();
  console.log('[ProjectAPI] Created record:', result.record.id);
  
  return result.record;
}

/**
 * Update an existing record
 */
async function updateRecord(recordId, data) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records/${recordId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ data })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update record');
  }
  
  const result = await response.json();
  console.log('[ProjectAPI] Updated record:', recordId);
  
  return result.record;
}

/**
 * Fetch records with filters
 */
async function fetchRecords(filters = {}) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const params = new URLSearchParams();
  
  if (_currentRecordType) {
    params.set('type', _currentRecordType.slug);
  }
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', filters.page);
  if (filters.limit) params.set('limit', filters.limit);
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records?${params}`,
    { headers: getAuthHeaders() }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch records');
  }
  
  return await response.json();
}

// ============================================
// QUOTE OPERATIONS
// ============================================

/**
 * Add a quote to a record
 */
async function addQuote(recordId, quote) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records/${recordId}/quotes`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(quote)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add quote');
  }
  
  return await response.json();
}

/**
 * Fetch quotes for a record
 */
async function fetchQuotes(recordId) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records/${recordId}/quotes`,
    { headers: getAuthHeaders() }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch quotes');
  }
  
  return await response.json();
}

/**
 * Update a quote
 */
async function updateQuote(recordId, quoteId, updates) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records/${recordId}/quotes/${quoteId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update quote');
  }
  
  return await response.json();
}

/**
 * Delete a quote
 */
async function deleteQuote(recordId, quoteId) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records/${recordId}/quotes/${quoteId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders()
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to delete quote');
  }
  
  return true;
}

// ============================================
// SOURCE OPERATIONS
// ============================================

/**
 * Add a source to a record
 */
async function addSource(recordId, source) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records/${recordId}/sources`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(source)
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add source');
  }
  
  return await response.json();
}

/**
 * Fetch sources for a record
 */
async function fetchSources(recordId) {
  if (!_currentProject) {
    throw new Error('No project selected');
  }
  
  const response = await fetch(
    `${_apiUrl}/api/projects/${_currentProject.slug}/records/${recordId}/sources`,
    { headers: getAuthHeaders() }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch sources');
  }
  
  return await response.json();
}

// ============================================
// AUTH CHECK
// ============================================

/**
 * Check authentication status
 */
async function checkAuth() {
  try {
    const response = await fetch(`${_apiUrl}/api/auth/me`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      return { authenticated: false, user: null };
    }
    
    const data = await response.json();
    return { authenticated: true, user: data.user };
  } catch (error) {
    console.error('[ProjectAPI] Auth check failed:', error);
    return { authenticated: false, user: null };
  }
}

// ============================================
// EXPORTS
// ============================================

// Export for use in other extension scripts
if (typeof window !== 'undefined') {
  window.ProjectAPI = {
    // Init
    init: initProjectApi,
    
    // Config
    setApiUrl,
    setApiKey,
    getApiUrl: () => _apiUrl,
    getApiKey: () => _apiKey,
    
    // Projects
    refreshProjects,
    selectProject,
    getCurrentProject,
    getProjects,
    
    // Record Types
    refreshRecordTypes,
    selectRecordType,
    getCurrentRecordType,
    getRecordTypes,
    
    // Fields
    refreshFieldDefinitions,
    getFieldDefinitions,
    getFieldGroups,
    getFieldsByGroup,
    buildFieldMenuCategories,
    
    // Records
    createRecord,
    updateRecord,
    fetchRecords,
    
    // Quotes
    addQuote,
    fetchQuotes,
    updateQuote,
    deleteQuote,
    
    // Sources
    addSource,
    fetchSources,
    
    // Auth
    checkAuth
  };
}
