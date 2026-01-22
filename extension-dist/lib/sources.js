/**
 * Source Manager
 * Handles source/reference management for records
 */

class SourceManager {
  constructor(options = {}) {
    this.sources = [];
    this.onSourcesChange = options.onSourcesChange || (() => {});
  }

  /**
   * Load sources (from API or local state)
   */
  loadSources(sources) {
    this.sources = sources.map(s => ({
      id: s.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: s.url,
      title: s.title || '',
      sourceType: s.source_type || s.sourceType || 'article',
      accessedDate: s.accessed_date || s.accessedDate || new Date().toISOString().split('T')[0],
      archivedUrl: s.archived_url || s.archivedUrl || '',
      notes: s.notes || '',
      linkedFields: s.linked_fields || s.linkedFields || [],
      addedAt: s.created_at || s.addedAt || new Date().toISOString()
    }));
  }

  /**
   * Add a new source
   */
  addSource(source) {
    // Check for duplicate URL
    if (this.sources.find(s => s.url === source.url)) {
      return null;
    }
    
    const newSource = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: source.url,
      title: source.title || '',
      sourceType: source.sourceType || this.detectSourceType(source.url),
      accessedDate: source.accessedDate || new Date().toISOString().split('T')[0],
      archivedUrl: source.archivedUrl || '',
      notes: source.notes || '',
      linkedFields: source.linkedFields || [],
      addedAt: new Date().toISOString()
    };
    
    this.sources.push(newSource);
    this.onSourcesChange(this.sources);
    return newSource;
  }

  /**
   * Update an existing source
   */
  updateSource(sourceId, updates) {
    const source = this.sources.find(s => s.id === sourceId);
    if (!source) return null;
    
    Object.assign(source, updates);
    this.onSourcesChange(this.sources);
    return source;
  }

  /**
   * Remove a source
   */
  removeSource(sourceId) {
    this.sources = this.sources.filter(s => s.id !== sourceId);
    this.onSourcesChange(this.sources);
  }

  /**
   * Get source by ID
   */
  getSource(sourceId) {
    return this.sources.find(s => s.id === sourceId);
  }

  /**
   * Get source by URL
   */
  getSourceByUrl(url) {
    return this.sources.find(s => s.url === url);
  }

  /**
   * Get all sources
   */
  getAllSources() {
    return [...this.sources];
  }

  /**
   * Clear all sources
   */
  clear() {
    this.sources = [];
    this.onSourcesChange(this.sources);
  }

  /**
   * Detect source type from URL
   */
  detectSourceType(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      if (hostname.includes('.gov')) return 'government';
      if (hostname.includes('court') || hostname.includes('law.cornell')) return 'legal';
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'social_media';
      if (hostname.includes('facebook.com')) return 'social_media';
      if (hostname.includes('youtube.com')) return 'video';
      if (hostname.includes('wikipedia.org')) return 'reference';
      if (hostname.includes('arxiv.org') || hostname.includes('pubmed')) return 'academic';
      
      return 'news';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get source type icon
   */
  getSourceTypeIcon(type) {
    const icons = {
      'news': '📰',
      'government': '🏛️',
      'legal': '⚖️',
      'social_media': '💬',
      'video': '🎬',
      'reference': '📚',
      'academic': '🎓',
      'unknown': '🔗'
    };
    return icons[type] || icons['unknown'];
  }

  /**
   * Convert to API format for saving
   */
  toAPIFormat() {
    return this.sources.map(s => ({
      url: s.url,
      title: s.title,
      source_type: s.sourceType,
      accessed_date: s.accessedDate || null,
      archived_url: s.archivedUrl || null,
      notes: s.notes,
      linked_fields: s.linkedFields
    }));
  }

  /**
   * Render sources list
   */
  render(container, options = {}) {
    container.innerHTML = '';
    
    if (this.sources.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No sources added yet.</p>
          <p class="hint">Click "Add Current Page" to add this page as a source.</p>
        </div>
      `;
      return;
    }
    
    for (const source of this.sources) {
      const card = this.renderSourceCard(source, options);
      container.appendChild(card);
    }
  }

  /**
   * Render a single source card
   */
  renderSourceCard(source, options = {}) {
    const card = document.createElement('div');
    card.className = 'source-card';
    card.dataset.sourceId = source.id;
    
    const icon = this.getSourceTypeIcon(source.sourceType);
    const domain = this.getDomain(source.url);
    
    card.innerHTML = `
      <div class="source-header">
        <span class="source-icon">${icon}</span>
        <span class="source-type">${source.sourceType}</span>
      </div>
      <div class="source-title">${this.escapeHtml(source.title || domain)}</div>
      <div class="source-url">
        <a href="${this.escapeHtml(source.url)}" target="_blank">${this.escapeHtml(domain)}</a>
      </div>
      <div class="source-meta">
        ${source.accessedDate ? `<span>Accessed: ${source.accessedDate}</span>` : ''}
        ${source.archivedUrl ? `<a href="${this.escapeHtml(source.archivedUrl)}" target="_blank">Archive ↗</a>` : ''}
      </div>
      ${source.notes ? `<div class="source-notes">${this.escapeHtml(source.notes)}</div>` : ''}
      <div class="source-actions">
        ${options.onEditClick ? `<button class="btn-sm btn-edit" data-action="edit">✏️ Edit</button>` : ''}
        <button class="btn-sm btn-delete" data-action="delete">🗑️</button>
      </div>
    `;
    
    // Event listeners
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      this.removeSource(source.id);
      card.remove();
    });
    
    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      if (options.onEditClick) options.onEditClick(source);
    });
    
    return card;
  }

  getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.SourceManager = SourceManager;
}

export { SourceManager };
