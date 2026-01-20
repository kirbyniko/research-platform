# AI Legal Analyst Assistant - Implementation Plan

## Executive Summary

This document outlines the implementation of a local, privacy-preserving AI assistant for legal analysis of ICE incident cases. The assistant runs entirely in-browser using WebGPU, requiring no server-side API calls, ensuring data privacy and zero ongoing costs.

## Core Requirements

### 1. Use Cases
- **Rights Violation Analysis**: "Could this potentially be a 4th Amendment violation?"
- **Case Law Matching**: "What Supreme Court precedent applies to these facts?"
- **Argument Construction**: "Help me build an argument for why this is a due process violation"
- **Quote Selection**: "Which quotes from this case support an 8th Amendment claim?"
- **Field Assistance**: "What criteria must be met to classify this as 'deliberate indifference'?"
- **Pattern Detection**: "Does this case match other medical neglect cases in our database?"

### 2. Context Requirements
The AI must have access to:
- **Current Case Data**: All incident details, quotes, timeline, sources, agencies, violations
- **Legal Framework**: Constitutional amendments, case law holdings, application notes
- **Classification Rubric**: Our documented standards for classification (alleged vs potential)
- **Field Definitions**: What each field means, when it applies, validation criteria
- **Similar Cases** (optional): Pattern matching with other cases in the database

### 3. Privacy & Cost Constraints
- ✅ Must run locally (no API calls with case data)
- ✅ Must work offline after initial model download
- ✅ Zero ongoing costs
- ✅ No data leaves the user's device

---

## Technical Architecture

### Option Analysis: WebGPU LLM Solutions

| Solution | Model Size | Quality | Browser Support | Complexity |
|----------|------------|---------|-----------------|------------|
| **WebLLM** | 1B-7B params | Good-Excellent | Chrome/Edge | Medium |
| **Transformers.js** | 100M-1B | Moderate | All browsers | Low |
| **llama.cpp WASM** | 1B-7B | Good | All browsers | High |
| **ONNX Web** | 100M-500M | Moderate | All browsers | Medium |

### Recommended: WebLLM with Phi-3-mini or Qwen2-1.5B

**Why WebLLM:**
- Mature library with active development
- Supports high-quality small models (Phi-3, Qwen2, Llama-3.2)
- Built specifically for WebGPU
- Good documentation and examples
- Handles model caching automatically

**Recommended Models:**
1. **Phi-3-mini-4k-instruct (3.8B)** - Best quality, requires ~8GB VRAM
2. **Qwen2-1.5B-Instruct** - Good balance, requires ~4GB VRAM
3. **TinyLlama-1.1B** - Smallest, runs on integrated GPUs

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Extension/Website)               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │  AI Chat UI     │  │       Context Builder             │  │
│  │  - Input box    │  │  - Case data serializer          │  │
│  │  - Response     │  │  - Legal framework injector      │  │
│  │  - Actions      │  │  - Quote selector                │  │
│  └────────┬────────┘  └──────────────┬───────────────────┘  │
│           │                          │                       │
│           ▼                          ▼                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Prompt Engineering Layer                    │ │
│  │  - System prompt with legal knowledge                   │ │
│  │  - Case context formatting                              │ │
│  │  - Query classification & routing                       │ │
│  │  - Response parsing & actions                           │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    WebLLM Engine                         │ │
│  │  - Model loading & caching (IndexedDB)                  │ │
│  │  - WebGPU inference                                     │ │
│  │  - Streaming response                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                         WebGPU                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Context Engineering Strategy

### Challenge: Limited Context Window
Small models have 2K-4K token context windows. We must be strategic about what context to include.

### Solution: Tiered Context System

**Tier 1: Always Include (~500 tokens)**
- Current query
- Core case facts (victim name, date, location, incident type)
- Primary violations (alleged/potential)
- Summary of circumstances

**Tier 2: Query-Relevant (~1000 tokens)**
- Relevant legal framework based on query classification
- Applicable case law holdings
- Relevant quotes from the case
- Field definitions for questioned fields

**Tier 3: On-Demand (~500 tokens)**
- Full quote text when analyzing sourcing
- Timeline entries when analyzing sequence
- Agency details when analyzing responsibility

### Query Classification

Before building context, classify the user's query:

```javascript
const QUERY_TYPES = {
  RIGHTS_ANALYSIS: {
    keywords: ['violation', 'amendment', 'constitutional', 'rights', 'legal'],
    context: ['legal_framework', 'case_law', 'violations_section'],
    system_prompt: 'rights_analysis_prompt'
  },
  CASE_LAW_LOOKUP: {
    keywords: ['precedent', 'case law', 'supreme court', 'ruling', 'holding'],
    context: ['case_law_full', 'similar_facts'],
    system_prompt: 'case_law_prompt'
  },
  ARGUMENT_BUILDING: {
    keywords: ['argue', 'argument', 'support', 'evidence', 'prove'],
    context: ['quotes', 'timeline', 'legal_framework'],
    system_prompt: 'argument_prompt'
  },
  QUOTE_SELECTION: {
    keywords: ['quote', 'source', 'citation', 'evidence'],
    context: ['all_quotes', 'quote_sources'],
    system_prompt: 'quote_selection_prompt'
  },
  FIELD_HELP: {
    keywords: ['field', 'criteria', 'classify', 'definition', 'mean'],
    context: ['field_definitions', 'rubric_section'],
    system_prompt: 'field_help_prompt'
  },
  GENERAL: {
    keywords: [],
    context: ['case_summary', 'basic_legal'],
    system_prompt: 'general_prompt'
  }
};
```

---

## System Prompts

### Base System Prompt

```
You are a legal research assistant for the ICE Deaths Documentation Project. You help analysts classify incidents, identify potential constitutional violations, and find supporting evidence.

CRITICAL GUIDELINES:
1. You do NOT determine guilt - you help document and analyze
2. Use "alleged" when someone else claimed it, "potential" when facts match case law
3. Always cite specific case law holdings, not just case names
4. Never editorialize - present facts and legal frameworks
5. When suggesting violations, explain WHY based on documented facts
6. Always distinguish between what IS documented and what MIGHT apply

Your role is to help analysts:
- Identify which constitutional amendments may apply
- Find relevant Supreme Court holdings
- Select supporting quotes from the case
- Understand classification criteria
- Build legally defensible arguments
```

### Rights Analysis Prompt Addition

```
CONSTITUTIONAL FRAMEWORK:

4th Amendment - Unreasonable Search & Seizure
- Tennessee v. Garner: Deadly force to prevent escape is unconstitutional unless suspect poses immediate threat
- Graham v. Connor: Force must be "objectively reasonable" under the circumstances
- Applies to: arrests, searches, use of force BEFORE custody

5th Amendment - Due Process (Federal)
- Zadvydas v. Davis: Due Process applies to ALL persons in US, including undocumented
- Mathews v. Eldridge: Due process is flexible, situation-dependent
- Applies to: federal detention, deportation proceedings, denial of hearings

8th Amendment - Cruel & Unusual Punishment
- Estelle v. Gamble: Deliberate indifference to serious medical needs violates 8th Amendment
- Farmer v. Brennan: Official must know of and disregard substantial risk
- Applies to: conditions in custody, medical care, treatment of detainees

14th Amendment - Due Process & Equal Protection (State)
- Plyler v. Doe: Even undocumented aliens are "persons" under 14th Amendment
- Applies to: state/local actors, county jails, discrimination

When analyzing, always:
1. Identify which actors are involved (federal vs state)
2. Determine if person was in custody or being apprehended
3. Match documented facts to case law holdings
4. State the legal standard and how facts meet/don't meet it
```

### Argument Building Prompt Addition

```
ARGUMENT STRUCTURE:

When building an argument for a potential violation:

1. STATE THE LEGAL STANDARD
   - Which amendment applies
   - Key case establishing the standard
   - Exact holding quote

2. PRESENT THE FACTS
   - Only documented facts from the case
   - Cite quote IDs when available
   - Note disputed vs undisputed facts

3. APPLY LAW TO FACTS
   - How specific facts meet specific elements
   - Address counterarguments
   - Note official position if available

4. CLASSIFICATION
   - Recommend: "alleged" (if lawsuit/complaint exists)
   - Recommend: "potential" (if facts match but no formal claim)
   - Recommend: "possible" (if facts disputed but would match if true)

Always use our case's quotes to support the argument when possible.
Format quote references as [Quote #X] so analyst can link them.
```

---

## Agentic Capabilities

### Why Agentic?

Some queries require multiple steps:
1. "Find quotes that support an 8th Amendment argument" → Needs to review all quotes, identify relevant ones, explain why each helps
2. "What violation does this look like?" → Needs to analyze facts, compare to multiple legal standards, recommend classification

### Tool System

```javascript
const AI_TOOLS = {
  search_quotes: {
    description: "Search case quotes for content matching a legal concept",
    parameters: {
      query: "string - what to search for",
      amendment: "string? - optional filter by relevant amendment"
    },
    execute: (params, caseData) => {
      // Return matching quotes with relevance scores
    }
  },
  
  get_case_law: {
    description: "Retrieve case law holdings for a specific amendment or concept",
    parameters: {
      amendment: "string - which amendment",
      concept: "string? - specific concept (e.g., 'deadly force', 'medical neglect')"
    },
    execute: (params) => {
      // Return relevant holdings from LEGAL_REFERENCES
    }
  },
  
  check_field_criteria: {
    description: "Get criteria for a specific field classification",
    parameters: {
      field_name: "string - field to check",
      value: "string? - proposed value"
    },
    execute: (params) => {
      // Return field definition and validation criteria
    }
  },
  
  compare_to_precedent: {
    description: "Compare case facts to a specific Supreme Court case",
    parameters: {
      case_name: "string - case to compare to",
      facts: "string[] - facts to compare"
    },
    execute: (params, caseData) => {
      // Return analysis of how facts match/differ
    }
  },
  
  suggest_classification: {
    description: "Suggest violation classification based on analysis",
    parameters: {
      amendment: "string",
      basis: "string - alleged, potential, or possible",
      rationale: "string"
    },
    execute: (params) => {
      // Return formatted classification suggestion
    }
  }
};
```

### Agentic Flow

```
User: "Could this be a 4th Amendment violation?"

AI: [Thinking: Need to analyze facts against 4th Amendment standards]
    → Tool call: get_case_law("4th_amendment", "deadly_force")
    → Tool call: search_quotes("force", "4th_amendment")
    
AI: Based on the case facts and Tennessee v. Garner standard:

    LEGAL STANDARD:
    Under Tennessee v. Garner, deadly force to prevent escape violates the 
    4th Amendment unless the suspect poses an immediate threat.
    
    RELEVANT CASE FACTS:
    - Subject was fleeing in vehicle
    - No weapon was observed
    - [Quote #3]: "Agent fired 5 rounds at the vehicle"
    
    ANALYSIS:
    The documented facts appear consistent with a 4th Amendment violation.
    Per Garner, fleeing alone does not justify deadly force.
    
    RECOMMENDATION:
    Classification: "violations_potential": ["4th_amendment"]
    (Use "potential" rather than "alleged" since no lawsuit has been filed)
    
    Would you like me to:
    1. Find more supporting quotes?
    2. Check for counterarguments?
    3. Draft the violations_potential_basis entry?
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

**1.1 WebLLM Integration**
- [ ] Add WebLLM dependency to extension/website
- [ ] Create model loader with progress UI
- [ ] Implement model caching in IndexedDB
- [ ] Test on various GPU configurations
- [ ] Create fallback for non-WebGPU browsers

**1.2 Context Builder**
- [ ] Create case data serializer
- [ ] Build legal framework context generator
- [ ] Implement query classifier
- [ ] Create tiered context system

### Phase 2: Core Features (Week 2-3)

**2.1 Basic Chat Interface**
- [ ] Add AI tab to extension sidepanel
- [ ] Create chat message UI component
- [ ] Implement streaming response display
- [ ] Add loading states and error handling

**2.2 System Prompts**
- [ ] Write and test base system prompt
- [ ] Create specialized prompts for each query type
- [ ] Test prompt effectiveness with real cases
- [ ] Iterate based on output quality

### Phase 3: Agentic Features (Week 3-4)

**3.1 Tool System**
- [ ] Implement tool definitions
- [ ] Create tool execution layer
- [ ] Build tool result formatting
- [ ] Test tool chaining

**3.2 Actions**
- [ ] Quote linking (AI suggests, human confirms)
- [ ] Field suggestions (AI recommends, human applies)
- [ ] Classification assistance (AI analyzes, human decides)

### Phase 4: Website Integration (Week 4-5)

**4.1 Validation Page AI**
- [ ] Add AI assistant to validation page
- [ ] Share context builder with extension
- [ ] Implement chat persistence

**4.2 Shared Components**
- [ ] Extract common AI components
- [ ] Create shared prompt library
- [ ] Unify tool implementations

---

## Technical Specifications

### Browser Requirements
- Chrome 113+ or Edge 113+ (WebGPU required)
- 4GB+ VRAM recommended (integrated GPU possible with smaller models)
- 2GB+ free storage for model cache

### Model Selection Logic

```javascript
async function selectOptimalModel() {
  const gpu = navigator.gpu;
  if (!gpu) return null; // No WebGPU
  
  const adapter = await gpu.requestAdapter();
  const info = await adapter.requestAdapterInfo();
  
  // Estimate VRAM (heuristic)
  const limits = adapter.limits;
  const maxBufferSize = limits.maxBufferSize;
  
  if (maxBufferSize >= 8 * 1024 * 1024 * 1024) {
    return "Phi-3-mini-4k-instruct-q4f16_1-MLC"; // 8GB+ VRAM
  } else if (maxBufferSize >= 4 * 1024 * 1024 * 1024) {
    return "Qwen2-1.5B-Instruct-q4f16_1-MLC"; // 4GB+ VRAM
  } else {
    return "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC"; // Fallback
  }
}
```

### Context Token Budget

| Component | Estimated Tokens | Priority |
|-----------|------------------|----------|
| System Prompt | 400 | Required |
| Case Summary | 200 | Required |
| Legal Framework (relevant) | 300 | Required |
| Quotes (relevant) | 400 | High |
| Timeline | 200 | Medium |
| User Query | 100 | Required |
| Response Budget | 400 | Required |
| **Total Budget** | ~2000 | |

### Response Actions

AI responses can include structured actions:

```json
{
  "response_text": "Based on the analysis...",
  "suggested_actions": [
    {
      "type": "link_quote",
      "quote_id": 3,
      "field": "violations_potential",
      "rationale": "This quote documents the use of force"
    },
    {
      "type": "add_violation",
      "amendment": "4th_amendment",
      "classification": "potential",
      "basis": "Tennessee v. Garner standard for deadly force"
    },
    {
      "type": "update_field",
      "field": "force_types",
      "value": ["firearm"],
      "source_quote": 3
    }
  ]
}
```

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Model quality insufficient | Medium | High | Test multiple models; allow user selection |
| WebGPU not supported | Low | High | Graceful degradation with informative message |
| Context too limited | Medium | Medium | Smart context selection; iterative queries |
| Slow inference | Medium | Medium | Streaming; progress indicators |

### Quality Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hallucinated case law | Medium | Critical | Include only verified holdings in context |
| Incorrect legal analysis | Medium | High | Require human verification of all suggestions |
| Overconfident output | High | Medium | Tune prompts for hedged language |
| Missing relevant precedent | Medium | Medium | Comprehensive legal framework context |

### Mitigations

1. **All AI suggestions are suggestions** - Human analyst makes final decisions
2. **No auto-apply** - Actions require human confirmation
3. **Audit trail** - Track AI-assisted changes separately
4. **Clear labeling** - UI clearly shows "AI suggests" vs "analyst confirmed"

---

## Success Metrics

### Quantitative
- Model loads in <30 seconds on recommended hardware
- Response latency <5 seconds for simple queries
- >80% of suggestions deemed "helpful" by analysts
- <5% of legal citations require correction

### Qualitative
- Analysts report faster violation classification
- More consistent use of proper legal terminology
- Better sourcing of claims to quotes
- Reduced training time for new analysts

---

## Future Enhancements

### Phase 2 (Future)
- Similar case search across database
- Pattern detection across multiple cases
- Automatic draft of legal analysis section
- Integration with habeas corpus helper

### Phase 3 (Future)
- Fine-tuned model on immigration law corpus
- Multi-turn conversation memory
- Collaborative analysis (multiple users + AI)
- Export analysis to legal brief format

---

## Appendix A: Model Comparison Tests

To be populated with actual test results comparing:
- Phi-3-mini-4k
- Qwen2-1.5B
- TinyLlama-1.1B

On sample queries:
1. "Is this a 4th Amendment violation?"
2. "Find quotes supporting medical neglect"
3. "What's the difference between alleged and potential?"
4. "Help me classify this death"

---

## Appendix B: Sample Prompts and Expected Outputs

### Query: Rights Violation Analysis

**Input:**
```
Case context: [Victim shot while fleeing in vehicle, no weapon present]
User query: "Could this be a 4th Amendment violation?"
```

**Expected Output:**
```
ANALYSIS: 4th Amendment Potential Violation

LEGAL STANDARD:
Tennessee v. Garner (1985) established that using deadly force to prevent 
escape is a "seizure" under the 4th Amendment, constitutional only when:
1. The suspect poses an immediate threat of death/serious injury to officers, OR
2. The suspect poses a threat to others

CASE FACTS:
- Victim was shot while fleeing in vehicle
- No weapon was observed
- [Quote #3 if available] documents the circumstances

APPLICATION:
Under the Garner standard, fleeing alone does not justify deadly force. The 
documented facts show:
✓ Deadly force was used (shooting)
✓ Victim was fleeing (not actively threatening)
✗ No documented weapon or threat to others

RECOMMENDATION:
This appears to meet the criteria for "violations_potential: 4th_amendment"

Classification: POTENTIAL (facts match Garner but no formal allegation filed)

Suggested next steps:
1. Verify no weapon was present from multiple sources
2. Check for official justification statement
3. Link supporting quotes to this classification
```

---

## Appendix C: WebLLM Code Examples

### Basic Integration

```javascript
import * as webllm from "@mlc-ai/web-llm";

class LegalAnalystAI {
  constructor() {
    this.engine = null;
    this.modelId = "Phi-3-mini-4k-instruct-q4f16_1-MLC";
  }
  
  async initialize(progressCallback) {
    this.engine = await webllm.CreateMLCEngine(
      this.modelId,
      {
        initProgressCallback: progressCallback
      }
    );
  }
  
  async analyze(caseContext, query) {
    const messages = [
      { role: "system", content: this.buildSystemPrompt(caseContext) },
      { role: "user", content: query }
    ];
    
    const response = await this.engine.chat.completions.create({
      messages,
      temperature: 0.3, // Lower for more consistent legal analysis
      max_tokens: 500,
      stream: true
    });
    
    return response;
  }
  
  buildSystemPrompt(caseContext) {
    return `${BASE_SYSTEM_PROMPT}
    
CURRENT CASE:
${this.serializeCase(caseContext)}

RELEVANT LEGAL FRAMEWORK:
${this.getRelevantLaw(caseContext)}`;
  }
}
```

---

## Decision Points for Implementation

1. **Model Selection**: Start with Phi-3-mini or offer user choice?
2. **Initial Context**: Include full legal framework or load on demand?
3. **Tool Execution**: Automatic or require user confirmation?
4. **Extension vs Website**: Implement in extension first or parallel?
5. **Offline Support**: Cache legal framework locally or require connectivity?

---

*Document Version: 1.0*
*Created: January 17, 2026*
*Status: Planning*
