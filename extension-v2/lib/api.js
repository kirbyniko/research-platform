/**
 * Research Platform API Client
 * Handles all communication with the platform API
 */

class ResearchPlatformAPI {
  constructor(baseUrl = '', apiKey = '') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  // Update credentials
  setCredentials(baseUrl, apiKey) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  // Build headers for requests
  getHeaders(includeContentType = true) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Key': this.apiKey,
      'Cache-Control': 'no-cache'
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  // Generic fetch wrapper with error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.method !== 'GET'),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error || `Request failed: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(`Network error: ${error.message}`, 0, null);
    }
  }

  // ==================== Authentication ====================

  async validateConnection() {
    try {
      const data = await this.request('/api/auth/me');
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // ==================== Projects ====================

  async getProjects() {
    const response = await this.request('/api/projects');
    return response.projects || [];
  }

  async getProject(slug) {
    const response = await this.request(`/api/projects/${slug}`);
    return response.project || response;
  }

  // ==================== Record Types ====================

  async getRecordTypes(projectSlug) {
    const response = await this.request(`/api/projects/${projectSlug}/record-types`);
    return response.recordTypes || [];
  }

  async getRecordType(projectSlug, typeSlug) {
    return this.request(`/api/projects/${projectSlug}/record-types/${typeSlug}`);
  }

  // ==================== Records ====================

  async getRecords(projectSlug, options = {}) {
    const params = new URLSearchParams();
    if (options.status) params.set('status', options.status);
    if (options.type) params.set('type', options.type);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.page) params.set('page', options.page.toString());
    if (options.search) params.set('search', options.search);
    
    const query = params.toString();
    const response = await this.request(`/api/projects/${projectSlug}/records${query ? `?${query}` : ''}`);
    return response.records || [];
  }

  async getRecord(projectSlug, recordId) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}`);
  }

  async createRecord(projectSlug, data) {
    return this.request(`/api/projects/${projectSlug}/records`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateRecord(projectSlug, recordId, data) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteRecord(projectSlug, recordId) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}`, {
      method: 'DELETE'
    });
  }

  async verifyField(projectSlug, recordId, fieldKey, verified = true) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}/verify-field`, {
      method: 'POST',
      body: JSON.stringify({ field_key: fieldKey, verified })
    });
  }

  // ==================== Quotes ====================

  async getQuotes(projectSlug, recordId) {
    const response = await this.request(`/api/projects/${projectSlug}/records/${recordId}/quotes`);
    return response.quotes || [];
  }

  async addQuote(projectSlug, recordId, quote) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}/quotes`, {
      method: 'POST',
      body: JSON.stringify(quote)
    });
  }

  async deleteQuote(projectSlug, recordId, quoteId) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}/quotes/${quoteId}`, {
      method: 'DELETE'
    });
  }

  // ==================== Sources ====================

  async getSources(projectSlug, recordId) {
    const response = await this.request(`/api/projects/${projectSlug}/records/${recordId}/sources`);
    return response.sources || [];
  }

  async addSource(projectSlug, recordId, source) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}/sources`, {
      method: 'POST',
      body: JSON.stringify(source)
    });
  }

  async deleteSource(projectSlug, recordId, sourceId) {
    return this.request(`/api/projects/${projectSlug}/records/${recordId}/sources/${sourceId}`, {
      method: 'DELETE'
    });
  }

  // ==================== Duplicate Check ====================

  async checkDuplicates(projectSlug, typeSlug, searchText) {
    const params = new URLSearchParams({
      project: projectSlug,
      type: typeSlug,
      q: searchText
    });
    return this.request(`/api/duplicate-check?${params}`);
  }

  // ==================== Storage / Files ====================

  async getStorageInfo(projectSlug) {
    return this.request(`/api/projects/${projectSlug}/storage`);
  }

  async getFiles(projectSlug, options = {}) {
    const params = new URLSearchParams();
    if (options.recordId) params.set('record_id', options.recordId.toString());
    const query = params.toString();
    return this.request(`/api/projects/${projectSlug}/files${query ? `?${query}` : ''}`);
  }

  async requestUpload(projectSlug, fileInfo) {
    return this.request(`/api/projects/${projectSlug}/files`, {
      method: 'POST',
      body: JSON.stringify(fileInfo)
    });
  }

  // ==================== AI Analysis Config ====================

  async getAIConfig(projectSlug) {
    const project = await this.getProject(projectSlug);
    return project.project?.settings?.ai_analysis_config || null;
  }
}

// Custom error class for API errors
class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Export for use in extension
if (typeof window !== 'undefined') {
  window.ResearchPlatformAPI = ResearchPlatformAPI;
  window.APIError = APIError;
}

// Export for module usage
export { ResearchPlatformAPI, APIError };
