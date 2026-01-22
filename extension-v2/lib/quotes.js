/**
 * Quote Manager
 * Handles quote creation, linking to fields, and rendering
 */

class QuoteManager {
  constructor(options = {}) {
    this.quotes = [];
    this.fieldLinks = {};  // { fieldSlug: [quoteId, ...] }
    this.onQuotesChange = options.onQuotesChange || (() => {});
  }

  /**
   * Load quotes (from API or local state)
   */
  loadQuotes(quotes, fieldLinks = {}) {
    this.quotes = quotes.map(q => ({
      id: q.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: q.quote_text || q.text,
      source: q.source || '',
      sourceUrl: q.source_url || q.sourceUrl || '',
      sourceDate: q.source_date || q.sourceDate || '',
      sourceType: q.source_type || q.sourceType || '',
      linkedFields: q.linked_fields || q.linkedFields || [],
      status: q.status || 'pending',
      addedAt: q.created_at || q.addedAt || new Date().toISOString()
    }));
    
    // Rebuild field links from quotes
    this.fieldLinks = {};
    for (const quote of this.quotes) {
      for (const field of quote.linkedFields || []) {
        if (!this.fieldLinks[field]) this.fieldLinks[field] = [];
        if (!this.fieldLinks[field].includes(quote.id)) {
          this.fieldLinks[field].push(quote.id);
        }
      }
    }
    
    // Merge any additional field links
    for (const [field, ids] of Object.entries(fieldLinks)) {
      if (!this.fieldLinks[field]) this.fieldLinks[field] = [];
      for (const id of ids) {
        if (!this.fieldLinks[field].includes(id)) {
          this.fieldLinks[field].push(id);
        }
      }
    }
  }

  /**
   * Add a new quote
   */
  addQuote(quote) {
    const newQuote = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: quote.text,
      source: quote.source || '',
      sourceUrl: quote.sourceUrl || '',
      sourceDate: quote.sourceDate || '',
      sourceType: quote.sourceType || '',
      linkedFields: quote.linkedFields || [],
      status: 'pending',
      addedAt: new Date().toISOString()
    };
    
    this.quotes.push(newQuote);
    
    // Add field links
    for (const field of newQuote.linkedFields) {
      this.linkToField(newQuote.id, field);
    }
    
    this.onQuotesChange(this.quotes, this.fieldLinks);
    return newQuote;
  }

  /**
   * Update an existing quote
   */
  updateQuote(quoteId, updates) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) return null;
    
    Object.assign(quote, updates);
    this.onQuotesChange(this.quotes, this.fieldLinks);
    return quote;
  }

  /**
   * Remove a quote
   */
  removeQuote(quoteId) {
    this.quotes = this.quotes.filter(q => q.id !== quoteId);
    
    // Remove from all field links
    for (const field of Object.keys(this.fieldLinks)) {
      this.fieldLinks[field] = this.fieldLinks[field].filter(id => id !== quoteId);
    }
    
    this.onQuotesChange(this.quotes, this.fieldLinks);
  }

  /**
   * Link a quote to a field
   */
  linkToField(quoteId, fieldSlug) {
    if (!this.fieldLinks[fieldSlug]) {
      this.fieldLinks[fieldSlug] = [];
    }
    
    if (!this.fieldLinks[fieldSlug].includes(quoteId)) {
      this.fieldLinks[fieldSlug].push(quoteId);
    }
    
    // Also update the quote's linkedFields
    const quote = this.quotes.find(q => q.id === quoteId);
    if (quote && !quote.linkedFields.includes(fieldSlug)) {
      quote.linkedFields.push(fieldSlug);
    }
    
    this.onQuotesChange(this.quotes, this.fieldLinks);
  }

  /**
   * Unlink a quote from a field
   */
  unlinkFromField(quoteId, fieldSlug) {
    if (this.fieldLinks[fieldSlug]) {
      this.fieldLinks[fieldSlug] = this.fieldLinks[fieldSlug].filter(id => id !== quoteId);
    }
    
    const quote = this.quotes.find(q => q.id === quoteId);
    if (quote) {
      quote.linkedFields = quote.linkedFields.filter(f => f !== fieldSlug);
    }
    
    this.onQuotesChange(this.quotes, this.fieldLinks);
  }

  /**
   * Get quotes linked to a specific field
   */
  getQuotesForField(fieldSlug) {
    const ids = this.fieldLinks[fieldSlug] || [];
    return this.quotes.filter(q => ids.includes(q.id));
  }

  /**
   * Get all quotes not linked to any field
   */
  getUnlinkedQuotes() {
    const linkedIds = new Set();
    for (const ids of Object.values(this.fieldLinks)) {
      ids.forEach(id => linkedIds.add(id));
    }
    return this.quotes.filter(q => !linkedIds.has(q.id));
  }

  /**
   * Get quote by ID
   */
  getQuote(quoteId) {
    return this.quotes.find(q => q.id === quoteId);
  }

  /**
   * Get all quotes
   */
  getAllQuotes() {
    return [...this.quotes];
  }

  /**
   * Clear all quotes
   */
  clear() {
    this.quotes = [];
    this.fieldLinks = {};
    this.onQuotesChange(this.quotes, this.fieldLinks);
  }

  /**
   * Convert to API format for saving
   */
  toAPIFormat() {
    return this.quotes.map(q => ({
      quote_text: q.text,
      source: q.source,
      source_url: q.sourceUrl,
      source_date: q.sourceDate || null,
      source_type: q.sourceType,
      linked_fields: this.getLinkedFieldsForQuote(q.id)
    }));
  }

  /**
   * Get all fields a quote is linked to
   */
  getLinkedFieldsForQuote(quoteId) {
    const fields = [];
    for (const [field, ids] of Object.entries(this.fieldLinks)) {
      if (ids.includes(quoteId)) {
        fields.push(field);
      }
    }
    return fields;
  }

  /**
   * Render quotes list
   */
  render(container, options = {}) {
    container.innerHTML = '';
    
    if (this.quotes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No quotes added yet.</p>
          <p class="hint">Select text on a page and right-click to add quotes, or use the Extract Page button.</p>
        </div>
      `;
      return;
    }
    
    for (const quote of this.quotes) {
      const card = this.renderQuoteCard(quote, options);
      container.appendChild(card);
    }
  }

  /**
   * Render a single quote card
   */
  renderQuoteCard(quote, options = {}) {
    const card = document.createElement('div');
    card.className = `quote-card ${quote.status === 'verified' ? 'verified' : ''}`;
    card.dataset.quoteId = quote.id;
    
    const linkedFields = this.getLinkedFieldsForQuote(quote.id);
    
    card.innerHTML = `
      <div class="quote-text">"${this.escapeHtml(quote.text)}"</div>
      <div class="quote-meta">
        ${quote.source ? `<span class="quote-source">${this.escapeHtml(quote.source)}</span>` : ''}
        ${quote.sourceUrl ? `<a href="${this.escapeHtml(quote.sourceUrl)}" target="_blank" class="quote-link">↗</a>` : ''}
        ${quote.sourceDate ? `<span class="quote-date">${quote.sourceDate}</span>` : ''}
      </div>
      ${linkedFields.length > 0 ? `
        <div class="quote-linked-fields">
          <span class="linked-label">Linked to:</span>
          ${linkedFields.map(f => `<span class="linked-field-tag">${f}</span>`).join('')}
        </div>
      ` : ''}
      <div class="quote-actions">
        ${options.onLinkClick ? `<button class="btn-sm btn-link" data-action="link">🔗 Link</button>` : ''}
        <button class="btn-sm btn-delete" data-action="delete">🗑️</button>
      </div>
    `;
    
    // Event listeners
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
      this.removeQuote(quote.id);
      card.remove();
    });
    
    card.querySelector('[data-action="link"]')?.addEventListener('click', () => {
      if (options.onLinkClick) options.onLinkClick(quote);
    });
    
    return card;
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
  window.QuoteManager = QuoteManager;
}

export { QuoteManager };
