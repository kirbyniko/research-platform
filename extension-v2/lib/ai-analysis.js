/**
 * AI Analysis Engine
 * Configurable pattern detection and analysis based on project settings
 * 
 * Each project can define its own:
 * - Analysis patterns (e.g., rights violations, policy failures)
 * - Analysis prompts for AI models
 * - Output format and field mappings
 */

class AIAnalysisEngine {
  constructor(options = {}) {
    this.projectConfig = null;
    this.analysisPatterns = [];
    this.customPrompts = {};
    this.fieldMappings = {};
    this.onAnalysisComplete = options.onAnalysisComplete || (() => {});
  }

  /**
   * Load analysis configuration from project settings
   * Expected format:
   * {
   *   patterns: [
   *     { id: 'pattern1', name: 'Pattern Name', description: '...', keywords: [...], weight: 1 },
   *     ...
   *   ],
   *   prompts: {
   *     analysis: "Analyze this content for...",
   *     summary: "Summarize the key points..."
   *   },
   *   fieldMappings: {
   *     'analysis_result': 'death_details',
   *     ...
   *   }
   * }
   */
  loadConfig(config) {
    if (!config) {
      this.projectConfig = null;
      this.analysisPatterns = [];
      this.customPrompts = {};
      this.fieldMappings = {};
      return;
    }

    this.projectConfig = config;
    this.analysisPatterns = config.patterns || [];
    this.customPrompts = config.prompts || {};
    this.fieldMappings = config.field_mappings || config.fieldMappings || {};
  }

  /**
   * Check if analysis is available for this project
   */
  isAvailable() {
    return this.projectConfig !== null && this.analysisPatterns.length > 0;
  }

  /**
   * Get all configured patterns
   */
  getPatterns() {
    return [...this.analysisPatterns];
  }

  /**
   * Analyze text content for pattern matches
   * Returns structured analysis results
   */
  analyzePatterns(text) {
    if (!text || !this.analysisPatterns.length) {
      return { matches: [], scores: {} };
    }

    const results = {
      matches: [],
      scores: {},
      totalScore: 0
    };

    const normalizedText = text.toLowerCase();

    for (const pattern of this.analysisPatterns) {
      const patternResult = this.checkPattern(normalizedText, pattern);
      if (patternResult.matched) {
        results.matches.push({
          patternId: pattern.id,
          patternName: pattern.name,
          confidence: patternResult.confidence,
          matchedKeywords: patternResult.keywords,
          excerpts: patternResult.excerpts
        });
        results.scores[pattern.id] = patternResult.confidence * (pattern.weight || 1);
        results.totalScore += results.scores[pattern.id];
      }
    }

    // Sort by confidence
    results.matches.sort((a, b) => b.confidence - a.confidence);

    return results;
  }

  /**
   * Check a single pattern against text
   */
  checkPattern(text, pattern) {
    const keywords = pattern.keywords || [];
    const matchedKeywords = [];
    const excerpts = [];

    for (const keyword of keywords) {
      // Support both simple strings and regex patterns
      let regex;
      if (keyword.startsWith('/') && keyword.includes('/', 1)) {
        // Regex pattern
        const parts = keyword.match(/^\/(.*)\/([gimsy]*)$/);
        if (parts) {
          regex = new RegExp(parts[1], parts[2] + 'i');
        }
      } else {
        // Simple keyword - word boundary match
        regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
      }

      if (regex && regex.test(text)) {
        matchedKeywords.push(keyword);
        
        // Extract excerpt around the match
        const match = text.match(regex);
        if (match) {
          const idx = text.indexOf(match[0]);
          const start = Math.max(0, idx - 50);
          const end = Math.min(text.length, idx + match[0].length + 50);
          excerpts.push('...' + text.substring(start, end) + '...');
        }
      }
    }

    const confidence = keywords.length > 0 
      ? matchedKeywords.length / keywords.length 
      : 0;

    return {
      matched: matchedKeywords.length > 0,
      confidence,
      keywords: matchedKeywords,
      excerpts: excerpts.slice(0, 3) // Limit excerpts
    };
  }

  /**
   * Generate analysis report
   */
  generateReport(analysisResults, options = {}) {
    if (!analysisResults.matches.length) {
      return {
        summary: 'No patterns detected in the analyzed content.',
        findings: [],
        recommendations: []
      };
    }

    const findings = analysisResults.matches.map(match => ({
      pattern: match.patternName,
      confidence: Math.round(match.confidence * 100) + '%',
      evidence: match.matchedKeywords.join(', '),
      excerpts: match.excerpts
    }));

    const recommendations = this.generateRecommendations(analysisResults);

    return {
      summary: `Found ${analysisResults.matches.length} pattern(s) in the content.`,
      findings,
      recommendations,
      score: analysisResults.totalScore
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysisResults) {
    const recommendations = [];

    for (const match of analysisResults.matches) {
      const pattern = this.analysisPatterns.find(p => p.id === match.patternId);
      if (pattern?.recommendations) {
        recommendations.push(...pattern.recommendations);
      }
    }

    // Deduplicate
    return [...new Set(recommendations)];
  }

  /**
   * Get the custom prompt for a specific analysis type
   */
  getPrompt(promptType) {
    return this.customPrompts[promptType] || null;
  }

  /**
   * Get field mapping for analysis output
   */
  getFieldMapping(analysisField) {
    return this.fieldMappings[analysisField] || null;
  }

  /**
   * Build system prompt for AI model based on project config
   */
  buildSystemPrompt() {
    if (!this.projectConfig) {
      return 'You are an AI assistant helping to analyze documents.';
    }

    let prompt = this.customPrompts.system || 'You are an AI assistant helping to analyze documents.';
    
    if (this.analysisPatterns.length > 0) {
      prompt += '\n\nYou should look for the following patterns:\n';
      for (const pattern of this.analysisPatterns) {
        prompt += `\n- ${pattern.name}: ${pattern.description || ''}`;
        if (pattern.keywords?.length) {
          prompt += ` (Keywords: ${pattern.keywords.slice(0, 5).join(', ')}...)`;
        }
      }
    }

    return prompt;
  }

  /**
   * Build analysis prompt for specific content
   */
  buildAnalysisPrompt(content, analysisType = 'analysis') {
    const basePrompt = this.customPrompts[analysisType] || 
      'Analyze the following content and identify any relevant patterns, issues, or notable information:';
    
    return `${basePrompt}\n\n---\n\n${content}\n\n---\n\nProvide your analysis in a structured format.`;
  }

  /**
   * Render analysis results UI
   */
  render(container, results) {
    container.innerHTML = '';

    if (!results || !results.matches?.length) {
      container.innerHTML = `
        <div class="analysis-empty">
          <p>No analysis results available.</p>
          <p class="hint">Run analysis on the current content to detect patterns.</p>
        </div>
      `;
      return;
    }

    const report = this.generateReport(results);

    container.innerHTML = `
      <div class="analysis-results">
        <div class="analysis-summary">
          <h4>Analysis Summary</h4>
          <p>${this.escapeHtml(report.summary)}</p>
          <div class="analysis-score">Score: ${report.score.toFixed(2)}</div>
        </div>
        
        <div class="analysis-findings">
          <h4>Findings</h4>
          ${report.findings.map(f => `
            <div class="finding-card">
              <div class="finding-header">
                <span class="finding-pattern">${this.escapeHtml(f.pattern)}</span>
                <span class="finding-confidence">${f.confidence}</span>
              </div>
              <div class="finding-evidence">
                <strong>Evidence:</strong> ${this.escapeHtml(f.evidence)}
              </div>
              ${f.excerpts.length ? `
                <div class="finding-excerpts">
                  ${f.excerpts.map(e => `<blockquote>${this.escapeHtml(e)}</blockquote>`).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        ${report.recommendations.length ? `
          <div class="analysis-recommendations">
            <h4>Recommendations</h4>
            <ul>
              ${report.recommendations.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render pattern configuration UI (for project setup)
   */
  renderPatternConfig(container) {
    container.innerHTML = `
      <div class="pattern-config">
        <h4>Analysis Patterns</h4>
        <div class="patterns-list">
          ${this.analysisPatterns.map(p => `
            <div class="pattern-item" data-pattern-id="${p.id}">
              <div class="pattern-name">${this.escapeHtml(p.name)}</div>
              <div class="pattern-description">${this.escapeHtml(p.description || '')}</div>
              <div class="pattern-keywords">
                Keywords: ${(p.keywords || []).slice(0, 5).map(k => 
                  `<span class="keyword-tag">${this.escapeHtml(k)}</span>`
                ).join('')}
                ${(p.keywords?.length || 0) > 5 ? `<span class="more">+${p.keywords.length - 5} more</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${this.analysisPatterns.length === 0 ? `
          <div class="no-patterns">
            <p>No analysis patterns configured for this project.</p>
            <p class="hint">Analysis patterns can be configured in project settings.</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Default pattern templates that projects can use
const PatternTemplates = {
  // Template for rights-based analysis
  rights: {
    id: 'rights_violation',
    name: 'Rights Violation',
    description: 'Potential violation of legal or constitutional rights',
    keywords: ['rights', 'violation', 'denied', 'refused', 'constitutional', 'illegal'],
    weight: 1.5,
    recommendations: [
      'Document the specific rights affected',
      'Note any legal precedents',
      'Record witness statements'
    ]
  },

  // Template for timeline analysis
  timeline: {
    id: 'timeline_gap',
    name: 'Timeline Discrepancy',
    description: 'Inconsistencies or gaps in reported timeline',
    keywords: ['before', 'after', 'during', 'delay', 'waited', 'hours', 'days'],
    weight: 1.2,
    recommendations: [
      'Cross-reference with official records',
      'Document all timestamps',
      'Note any unexplained delays'
    ]
  },

  // Template for medical analysis
  medical: {
    id: 'medical_issue',
    name: 'Medical Concern',
    description: 'Medical care related issues',
    keywords: ['medical', 'doctor', 'nurse', 'hospital', 'treatment', 'medication', 'condition'],
    weight: 1.3,
    recommendations: [
      'Obtain medical records if available',
      'Document reported symptoms',
      'Note any denied care'
    ]
  }
};

// Export
if (typeof window !== 'undefined') {
  window.AIAnalysisEngine = AIAnalysisEngine;
  window.PatternTemplates = PatternTemplates;
}

export { AIAnalysisEngine, PatternTemplates };
