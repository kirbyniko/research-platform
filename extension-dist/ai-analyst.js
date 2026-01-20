/**
 * AI Legal Analyst - Core Engine
 * 
 * CRITICAL: This system uses a tool-based citation system where:
 * 1. The AI CANNOT generate quote text - only reference quotes by ID
 * 2. All citations are resolved from actual case data at render time
 * 3. The AI outputs structured references, not summaries
 * 
 * This ensures 100% accuracy of cited content.
 */

// WebLLM is loaded from webllm.bundle.js before this script
// It's available as window.webllm - do NOT redeclare it

// Model options from smallest to largest
const MODEL_OPTIONS = [
  { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama 1.1B', vram: 2 },
  { id: 'Qwen2-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2 1.5B', vram: 4 },
  { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', name: 'Phi-3 Mini', vram: 8 },
];

// Current case data - set by loadCaseContext()
let currentCaseData = null;
let currentQuotes = [];
let currentTimeline = [];
let currentSources = [];

/**
 * Tool definitions for the AI
 * These tools return EXACT data from the case - no AI generation
 */
const AI_TOOLS = {
  /**
   * Get exact quote by ID
   * Returns the verbatim quote text - AI cannot modify
   */
  get_quote: {
    description: 'Get the exact text of a specific quote by its ID. Use this to cite evidence.',
    parameters: {
      type: 'object',
      properties: {
        quote_id: { type: 'number', description: 'The ID of the quote to retrieve' }
      },
      required: ['quote_id']
    },
    execute: (params) => {
      const quote = currentQuotes.find(q => q.id === params.quote_id);
      if (!quote) return { error: `Quote #${params.quote_id} not found` };
      return {
        id: quote.id,
        exact_text: quote.quote_text,
        source: quote.source_title || quote.source_publication || 'Unknown source',
        source_url: quote.source_url,
        linked_fields: quote.linked_fields || []
      };
    }
  },

  /**
   * Search quotes by keyword
   * Returns quote IDs and snippets - AI must use get_quote for full text
   */
  search_quotes: {
    description: 'Search for quotes containing specific keywords. Returns IDs - use get_quote for full text.',
    parameters: {
      type: 'object',
      properties: {
        keywords: { type: 'string', description: 'Keywords to search for in quotes' }
      },
      required: ['keywords']
    },
    execute: (params) => {
      const keywords = params.keywords.toLowerCase().split(/\s+/);
      const matches = currentQuotes.filter(q => {
        const text = (q.quote_text || '').toLowerCase();
        return keywords.some(kw => text.includes(kw));
      }).map(q => ({
        id: q.id,
        preview: q.quote_text.substring(0, 100) + (q.quote_text.length > 100 ? '...' : ''),
        source: q.source_title || q.source_publication || 'Unknown'
      }));
      return { matches, count: matches.length };
    }
  },

  /**
   * Get timeline entry by ID
   */
  get_timeline_entry: {
    description: 'Get exact text of a timeline entry by ID.',
    parameters: {
      type: 'object',
      properties: {
        entry_id: { type: 'number', description: 'The ID of the timeline entry' }
      },
      required: ['entry_id']
    },
    execute: (params) => {
      const entry = currentTimeline.find(t => t.id === params.entry_id);
      if (!entry) return { error: `Timeline entry #${params.entry_id} not found` };
      return {
        id: entry.id,
        date: entry.event_date,
        exact_description: entry.description,
        linked_quote_id: entry.quote_id
      };
    }
  },

  /**
   * Get case law holding
   * Returns exact holding text from our legal reference database
   */
  get_case_law: {
    description: 'Get the exact holding from a Supreme Court case.',
    parameters: {
      type: 'object',
      properties: {
        case_name: { type: 'string', description: 'Name of the case (e.g., "Tennessee v. Garner")' }
      },
      required: ['case_name']
    },
    execute: (params) => {
      // Search through LEGAL_REFERENCES for the case (use getLegalReferences helper)
      const legalRefs = getLegalReferences();
      const searchName = params.case_name.toLowerCase();
      for (const [key, ref] of Object.entries(legalRefs)) {
        for (const caseInfo of ref.cases || []) {
          if (caseInfo.name.toLowerCase().includes(searchName)) {
            return {
              name: caseInfo.name,
              citation: caseInfo.citation,
              exact_holding: caseInfo.holding,
              source_url: caseInfo.sourceUrl,
              amendment: key
            };
          }
        }
      }
      return { error: `Case "${params.case_name}" not found in legal database` };
    }
  },

  /**
   * List all quotes with their IDs
   */
  list_quotes: {
    description: 'List all quotes in the case with their IDs and brief previews.',
    parameters: { type: 'object', properties: {} },
    execute: () => {
      return {
        quotes: currentQuotes.map(q => ({
          id: q.id,
          preview: q.quote_text.substring(0, 80) + (q.quote_text.length > 80 ? '...' : ''),
          source: q.source_title || q.source_publication || 'Unknown',
          linked_to: q.linked_fields || []
        })),
        total: currentQuotes.length
      };
    }
  },

  /**
   * Get case facts summary
   * Returns ONLY documented fields, not AI-generated content
   */
  get_case_facts: {
    description: 'Get documented facts from the case (fields with values).',
    parameters: { type: 'object', properties: {} },
    execute: () => {
      if (!currentCaseData) return { error: 'No case loaded' };
      const facts = {};
      
      // Only include non-null, non-empty values
      const includeFields = [
        'victim_name', 'incident_date', 'death_date', 'location_city', 'location_state',
        'incident_types', 'summary', 'agencies', 'violations_alleged', 'violations_potential',
        'cause_of_death', 'manner_of_death', 'custody_duration', 'circumstances'
      ];
      
      for (const field of includeFields) {
        const value = currentCaseData[field];
        if (value !== null && value !== undefined && value !== '' && 
            !(Array.isArray(value) && value.length === 0)) {
          facts[field] = value;
        }
      }
      
      return { documented_facts: facts };
    }
  },

  /**
   * Cite a quote for a field
   * This creates a citation reference that will be rendered with exact text
   */
  cite_quote: {
    description: 'Create a citation linking a quote to support a claim. The exact quote text will be shown.',
    parameters: {
      type: 'object',
      properties: {
        quote_id: { type: 'number', description: 'ID of the quote to cite' },
        claim: { type: 'string', description: 'Brief description of what this quote supports' },
        field: { type: 'string', description: 'Optional: field this quote supports' }
      },
      required: ['quote_id', 'claim']
    },
    execute: (params) => {
      const quote = currentQuotes.find(q => q.id === params.quote_id);
      if (!quote) return { error: `Quote #${params.quote_id} not found` };
      
      // Return a citation object that the UI will render with exact text
      return {
        type: 'CITATION',
        quote_id: params.quote_id,
        exact_text: quote.quote_text,
        source: quote.source_title || quote.source_publication || 'Unknown source',
        source_url: quote.source_url,
        supports_claim: params.claim,
        for_field: params.field || null
      };
    }
  },

  /**
   * Suggest a violation classification
   */
  suggest_violation: {
    description: 'Suggest a constitutional violation classification based on analysis.',
    parameters: {
      type: 'object',
      properties: {
        amendment: { type: 'string', description: 'Which amendment (e.g., "4th_amendment")' },
        classification: { type: 'string', enum: ['alleged', 'potential', 'possible'], description: 'alleged=lawsuit filed, potential=facts match law, possible=disputed facts' },
        legal_basis: { type: 'string', description: 'Case law basis (e.g., "Tennessee v. Garner")' },
        supporting_quote_ids: { type: 'array', items: { type: 'number' }, description: 'Quote IDs that support this' }
      },
      required: ['amendment', 'classification', 'legal_basis']
    },
    execute: (params) => {
      // Validate that cited quotes exist
      const validQuotes = (params.supporting_quote_ids || []).filter(id => 
        currentQuotes.some(q => q.id === id)
      );
      
      return {
        type: 'SUGGESTION',
        suggestion_type: 'violation',
        amendment: params.amendment,
        classification: params.classification,
        legal_basis: params.legal_basis,
        supporting_quotes: validQuotes.map(id => {
          const q = currentQuotes.find(quote => quote.id === id);
          return { id, exact_text: q.quote_text, source: q.source_title || q.source_publication };
        })
      };
    }
  },

  /**
   * Suggest a field value based on quote analysis
   * This helps auto-fill form fields from verified quotes
   */
  suggest_field_value: {
    description: 'Suggest a value for a form field based on quote content. Returns the exact quote text and suggested extraction.',
    parameters: {
      type: 'object',
      properties: {
        quote_id: { type: 'number', description: 'ID of the quote to extract from' },
        field_name: { type: 'string', description: 'Name of the field to suggest a value for (e.g., "date_of_death", "cause_of_death", "location")' },
        extracted_value: { type: 'string', description: 'The value to suggest for the field, extracted from the quote' }
      },
      required: ['quote_id', 'field_name', 'extracted_value']
    },
    execute: (params) => {
      const quote = currentQuotes.find(q => q.id === params.quote_id);
      if (!quote) return { error: `Quote #${params.quote_id} not found` };
      
      return {
        type: 'FIELD_SUGGESTION',
        quote_id: params.quote_id,
        exact_quote_text: quote.quote_text,
        quote_source: quote.source_title || quote.source_publication || 'Unknown',
        field_name: params.field_name,
        suggested_value: params.extracted_value,
        confidence: 'from_verified_quote'
      };
    }
  },

  /**
   * Auto-analyze quotes for field values
   * Scans all quotes and suggests field values
   */
  analyze_quotes_for_fields: {
    description: 'Analyze all quotes to find potential values for empty form fields. Use this when user asks to auto-fill or extract information.',
    parameters: {
      type: 'object',
      properties: {
        target_fields: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'List of field names to look for (e.g., ["date_of_death", "cause_of_death", "location"])' 
        }
      },
      required: ['target_fields']
    },
    execute: (params) => {
      const suggestions = [];
      const targetFields = params.target_fields || [];
      
      // Return quote info for AI to analyze
      return {
        quotes_to_analyze: currentQuotes.map(q => ({
          id: q.id,
          text: q.quote_text,
          source: q.source_title || q.source_publication,
          already_linked_to: q.linked_fields || []
        })),
        target_fields: targetFields,
        current_values: targetFields.reduce((acc, field) => {
          if (currentCaseData && currentCaseData[field]) {
            acc[field] = currentCaseData[field];
          }
          return acc;
        }, {}),
        instructions: 'Analyze each quote for information matching target fields. Use suggest_field_value tool for each match found.'
      };
    }
  }
};

/**
 * Get legal references - uses the global LEGAL_REFERENCES from sidepanel.js
 * This avoids duplicate declarations
 */
function getLegalReferences() {
  // Check if global LEGAL_REFERENCES exists (from sidepanel.js)
  if (typeof window !== 'undefined' && window.LEGAL_REFERENCES) {
    return window.LEGAL_REFERENCES;
  }
  // Fallback for direct access
  if (typeof LEGAL_REFERENCES !== 'undefined') {
    return LEGAL_REFERENCES;
  }
  // Minimal fallback
  return {
    fourth_amendment: { name: "Fourth Amendment", cases: [] },
    fifth_amendment: { name: "Fifth Amendment", cases: [] },
    eighth_amendment: { name: "Eighth Amendment", cases: [] },
    fourteenth_amendment: { name: "Fourteenth Amendment", cases: [] }
  };
}

/**
 * System prompt - emphasizes tool usage for citations
 */
const SYSTEM_PROMPT = `You are a legal research assistant for the ICE Deaths Documentation Project. You help analysts identify potential constitutional violations and find supporting evidence.

CRITICAL RULES:
1. You MUST use tools to cite quotes and case law - NEVER write quote text yourself
2. When citing evidence, use cite_quote tool with the quote ID
3. When referencing case law, use get_case_law tool to get exact holding
4. Use search_quotes to find relevant quotes, then cite_quote to cite them
5. NEVER paraphrase or summarize quotes - always cite by ID
6. If you don't know a quote ID, use list_quotes or search_quotes first
7. When asked to auto-fill or extract info, use analyze_quotes_for_fields then suggest_field_value

CLASSIFICATION STANDARDS:
- "alleged" = Someone filed a lawsuit or formal complaint claiming this
- "potential" = No lawsuit, but documented facts match established case law
- "possible" = Facts are disputed, but if true would constitute violation

FIELD EXTRACTION:
When extracting information from quotes for form fields:
- Dates should be in YYYY-MM-DD format
- Names should be "First Last" format
- Locations should include city and state when available
- Only suggest values that are DIRECTLY stated in the quote

YOUR WORKFLOW:
1. First, use get_case_facts to understand documented facts
2. Use search_quotes or list_quotes to find relevant evidence
3. Use get_case_law to get exact legal standards
4. Use cite_quote to create citations with exact text
5. Use suggest_violation to recommend classifications
6. When auto-filling, use analyze_quotes_for_fields then suggest_field_value

Remember: You are a research assistant. The human analyst makes all final decisions.`;

/**
 * AI Engine class
 */
class LegalAnalystAI {
  constructor() {
    this.engine = null;
    this.modelId = null;
    this.isLoading = false;
    this.isReady = false;
  }

  /**
   * Check if WebGPU is supported
   */
  static async checkWebGPU() {
    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU not available in this browser' };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: 'No WebGPU adapter found' };
      }
      return { supported: true, adapter };
    } catch (e) {
      return { supported: false, reason: e.message };
    }
  }

  /**
   * Initialize the AI engine
   * Note: WebLLM is bundled with the extension as webllm.bundle.js
   */
  async initialize(modelId, progressCallback) {
    if (this.isLoading) return { success: false, error: 'Already loading' };
    this.isLoading = true;

    try {
      // Check if WebLLM is available from the bundle (window.webllm)
      const webllm = window.webllm;
      
      if (!webllm) {
        this.isLoading = false;
        return { 
          success: false, 
          error: 'WebLLM bundle not loaded. Please ensure webllm.bundle.js is included.',
          needsSetup: true
        };
      }
      
      // Verify CreateMLCEngine is available
      if (typeof webllm.CreateMLCEngine !== 'function') {
        this.isLoading = false;
        return { 
          success: false, 
          error: 'WebLLM loaded but CreateMLCEngine not available. Bundle may be corrupted.',
          needsSetup: true
        };
      }

      this.modelId = modelId || MODEL_OPTIONS[0].id;
      
      if (progressCallback) {
        progressCallback({ progress: 0.1, text: 'Creating ML engine...' });
      }
      
      this.engine = await webllm.CreateMLCEngine(this.modelId, {
        initProgressCallback: (progress) => {
          if (progressCallback) {
            progressCallback({
              progress: progress.progress,
              text: progress.text,
              timeElapsed: progress.timeElapsed
            });
          }
        }
      });

      this.isReady = true;
      this.isLoading = false;
      return { success: true };
    } catch (error) {
      this.isLoading = false;
      console.error('AI initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load case context for analysis
   */
  loadCaseContext(caseData, quotes, timeline, sources) {
    currentCaseData = caseData;
    currentQuotes = quotes || [];
    currentTimeline = timeline || [];
    currentSources = sources || [];
  }

  /**
   * Process a user query with tool support
   */
  async query(userMessage, onToken) {
    if (!this.isReady) {
      return { error: 'AI not initialized' };
    }

    // Build context about available data
    const contextInfo = `
CASE CONTEXT:
- Victim: ${currentCaseData?.victim_name || 'Unknown'}
- Date: ${currentCaseData?.incident_date || 'Unknown'}
- Location: ${currentCaseData?.location_city || ''}, ${currentCaseData?.location_state || ''}
- Types: ${(currentCaseData?.incident_types || []).join(', ')}
- Available quotes: ${currentQuotes.length}
- Timeline entries: ${currentTimeline.length}

Available tools: get_quote, search_quotes, list_quotes, get_timeline_entry, get_case_law, get_case_facts, cite_quote, suggest_violation

Remember: Use tools to cite exact text. Never write quote content yourself.`;

    // Combine system prompt and context into single system message (WebLLM requirement)
    const combinedSystemPrompt = SYSTEM_PROMPT + '\n\n' + contextInfo;

    const messages = [
      { role: 'system', content: combinedSystemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      let fullResponse = '';
      const toolCalls = [];
      
      // First pass - get AI response with potential tool calls
      const response = await this.engine.chat.completions.create({
        messages,
        temperature: 0.3,
        max_tokens: 1000,
        stream: true,
        tools: this.getToolDefinitions(),
        tool_choice: 'auto'
      });

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          fullResponse += delta.content;
          if (onToken) onToken(delta.content);
        }
        
        if (delta?.tool_calls) {
          toolCalls.push(...delta.tool_calls);
        }
      }

      // Process any tool calls
      const toolResults = [];
      for (const call of toolCalls) {
        if (call.function?.name && AI_TOOLS[call.function.name]) {
          const args = JSON.parse(call.function.arguments || '{}');
          const result = AI_TOOLS[call.function.name].execute(args);
          toolResults.push({
            tool: call.function.name,
            args,
            result
          });
        }
      }

      return {
        response: fullResponse,
        toolResults,
        citations: toolResults.filter(r => r.result?.type === 'CITATION'),
        suggestions: toolResults.filter(r => r.result?.type === 'SUGGESTION')
      };

    } catch (error) {
      console.error('AI query error:', error);
      return { error: error.message };
    }
  }

  /**
   * Simple query without streaming (for tool execution)
   */
  async simpleQuery(userMessage) {
    if (!this.isReady) return { error: 'AI not initialized' };

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await this.engine.chat.completions.create({
        messages,
        temperature: 0.3,
        max_tokens: 500
      });

      return { response: response.choices[0]?.message?.content || '' };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get tool definitions in OpenAI format
   */
  getToolDefinitions() {
    return Object.entries(AI_TOOLS).map(([name, tool]) => ({
      type: 'function',
      function: {
        name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Execute a specific tool
   */
  executeTool(toolName, params) {
    if (!AI_TOOLS[toolName]) {
      return { error: `Unknown tool: ${toolName}` };
    }
    return AI_TOOLS[toolName].execute(params);
  }
}

// Export for use in extension
if (typeof window !== 'undefined') {
  window.LegalAnalystAI = LegalAnalystAI;
  window.AI_TOOLS = AI_TOOLS;
  window.getLegalReferences = getLegalReferences;
  window.MODEL_OPTIONS = MODEL_OPTIONS;
}

// Export for Node.js/module bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LegalAnalystAI, AI_TOOLS, getLegalReferences, MODEL_OPTIONS };
}
