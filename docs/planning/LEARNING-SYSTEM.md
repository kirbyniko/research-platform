# Learning & Improvement System

## Philosophy

Every human action in the system generates training signal. We capture this signal to continuously improve:
- Extraction accuracy
- Relevance scoring
- Confidence calibration
- Entity recognition

**No cloud models** - all learning happens locally with Ollama.

---

## Feedback Loops

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEARNING FEEDBACK LOOPS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LOOP 1: QUOTE VERIFICATION                        │    │
│  │                                                                      │    │
│  │  Human accepts/rejects/edits extracted quotes                       │    │
│  │                     │                                                │    │
│  │                     ▼                                                │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │ Collect:                                                      │   │    │
│  │  │ - Quote text                                                  │   │    │
│  │  │ - Document context (500 chars before/after)                   │   │    │
│  │  │ - AI prediction (category, date, confidence)                  │   │    │
│  │  │ - Human decision (accept/reject/edit)                         │   │    │
│  │  │ - Reason if rejected                                          │   │    │
│  │  │ - Edits made if edited                                        │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                     │                                                │    │
│  │                     ▼                                                │    │
│  │  Update few-shot examples in prompts                                │    │
│  │  Adjust confidence thresholds per category                          │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LOOP 2: ARTICLE RELEVANCE                         │    │
│  │                                                                      │    │
│  │  Human marks articles as relevant/irrelevant                        │    │
│  │                     │                                                │    │
│  │                     ▼                                                │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │ Collect:                                                      │   │    │
│  │  │ - Article URL and domain                                      │   │    │
│  │  │ - Title and first 500 chars                                   │   │    │
│  │  │ - AI relevance prediction                                     │   │    │
│  │  │ - Human verdict                                               │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                     │                                                │    │
│  │                     ▼                                                │    │
│  │  Update domain credibility scores                                   │    │
│  │  Add examples to relevance prompt                                   │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    LOOP 3: ENTITY RECOGNITION                        │    │
│  │                                                                      │    │
│  │  Human corrects facility names, person names                        │    │
│  │                     │                                                │    │
│  │                     ▼                                                │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │ Collect:                                                      │   │    │
│  │  │ - Original text with entity                                   │   │    │
│  │  │ - AI extraction                                               │   │    │
│  │  │ - Human correction                                            │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │                     │                                                │    │
│  │                     ▼                                                │    │
│  │  Build entity dictionary (facilities, names)                        │    │
│  │  Improve entity extraction patterns                                 │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Collection

### Verification Feedback Table
```sql
CREATE TABLE verification_feedback (
  id SERIAL PRIMARY KEY,
  
  -- What was verified
  quote_id INTEGER REFERENCES extracted_quotes(id),
  document_id INTEGER REFERENCES documents(id),
  
  -- AI's prediction
  ai_category TEXT,
  ai_date TEXT,
  ai_confidence DECIMAL,
  
  -- Human's decision
  human_action TEXT,                     -- accepted, rejected, edited
  rejection_reason TEXT,
  
  -- If edited
  edit_category_changed BOOLEAN,
  edit_date_changed BOOLEAN,
  edit_quote_expanded BOOLEAN,
  edit_quote_trimmed BOOLEAN,
  
  -- Context
  quote_text TEXT,
  surrounding_context TEXT,              -- 500 chars before/after
  
  -- Metadata
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_action ON verification_feedback(human_action);
CREATE INDEX idx_feedback_category ON verification_feedback(ai_category);
```

### Relevance Feedback Table
```sql
CREATE TABLE relevance_feedback (
  id SERIAL PRIMARY KEY,
  
  -- Article info
  url TEXT,
  domain TEXT,
  title TEXT,
  excerpt TEXT,                          -- First 500 chars
  
  -- AI prediction
  ai_relevance_score DECIMAL,
  ai_verdict BOOLEAN,
  
  -- Human decision
  human_verdict BOOLEAN,
  
  -- Metadata
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_relevance_domain ON relevance_feedback(domain);
CREATE INDEX idx_relevance_verdict ON relevance_feedback(human_verdict);
```

---

## Few-Shot Prompt Updates

### Dynamic Example Selection
```typescript
async function getQuoteClassificationPrompt(
  sentence: string,
  context: string
): Promise<string> {
  // Get recent verified examples for each category
  const examples = await getVerifiedExamples({
    categories: ['TIMELINE_EVENT', 'MEDICAL', 'OFFICIAL_STATEMENT', 'BACKGROUND'],
    limit: 2,  // 2 examples per category
    recentDays: 30
  });
  
  // Build few-shot prompt
  return `
You are classifying sentences from ICE detention death documents.

Here are examples of correct classifications:

${examples.map(ex => `
Sentence: "${ex.quote_text}"
Classification: ${ex.category}
Date: ${ex.event_date || 'none'}
Reasoning: ${ex.reasoning || 'N/A'}
`).join('\n')}

Now classify this sentence:

Sentence: "${sentence}"
Context: "${context}"

Respond with JSON: {"classification": "...", "date": "..." or null, "reasoning": "..."}
`;
}

async function getVerifiedExamples(options: {
  categories: string[],
  limit: number,
  recentDays: number
}): Promise<VerifiedExample[]> {
  return db.query(`
    SELECT 
      eq.quote_text,
      eq.category,
      eq.event_date,
      vf.surrounding_context,
      'Human verified' as reasoning
    FROM extracted_quotes eq
    JOIN verification_feedback vf ON vf.quote_id = eq.id
    WHERE eq.status = 'verified'
      AND eq.category = ANY($1)
      AND vf.created_at > NOW() - INTERVAL '${options.recentDays} days'
    ORDER BY RANDOM()
    LIMIT $2
  `, [options.categories, options.limit * options.categories.length]);
}
```

---

## Confidence Calibration

### Track Calibration Over Time
```typescript
interface CalibrationData {
  category: string;
  confidenceBucket: number;  // 0.0-0.1, 0.1-0.2, etc.
  totalPredictions: number;
  correctPredictions: number;
  actualAccuracy: number;
}

async function getCalibrationData(): Promise<CalibrationData[]> {
  return db.query(`
    WITH bucketed AS (
      SELECT 
        ai_category,
        FLOOR(ai_confidence * 10) / 10 as confidence_bucket,
        CASE WHEN human_action = 'accepted' THEN 1 ELSE 0 END as correct
      FROM verification_feedback
      WHERE human_action IN ('accepted', 'rejected')
    )
    SELECT 
      ai_category as category,
      confidence_bucket,
      COUNT(*) as total_predictions,
      SUM(correct) as correct_predictions,
      SUM(correct)::DECIMAL / COUNT(*) as actual_accuracy
    FROM bucketed
    GROUP BY ai_category, confidence_bucket
    ORDER BY ai_category, confidence_bucket
  `);
}
```

### Adjust Thresholds Based on Calibration
```typescript
interface ConfidenceThresholds {
  autoAccept: number;      // Above this: auto-verify
  showForReview: number;   // Above this: show to human
  // Below showForReview: discard
}

async function getOptimalThresholds(category: string): Promise<ConfidenceThresholds> {
  const calibration = await getCalibrationData();
  const categoryData = calibration.filter(c => c.category === category);
  
  // Find confidence level where accuracy > 95% for auto-accept
  const autoAcceptBucket = categoryData
    .filter(c => c.actualAccuracy >= 0.95 && c.totalPredictions >= 10)
    .sort((a, b) => a.confidenceBucket - b.confidenceBucket)[0];
  
  // Find confidence level where accuracy > 50% for showing
  const showBucket = categoryData
    .filter(c => c.actualAccuracy >= 0.50 && c.totalPredictions >= 10)
    .sort((a, b) => a.confidenceBucket - b.confidenceBucket)[0];
  
  return {
    autoAccept: autoAcceptBucket?.confidenceBucket ?? 0.95,
    showForReview: showBucket?.confidenceBucket ?? 0.50
  };
}
```

---

## Entity Dictionary

### Building from Verified Data
```typescript
// Facility name normalization
interface FacilityAlias {
  canonical: string;        // Official name
  aliases: string[];        // All variations found
  pattern?: RegExp;         // Regex to match variations
}

async function buildFacilityDictionary(): Promise<FacilityAlias[]> {
  // Get all facility names from verified cases
  const facilities = await db.query(`
    SELECT DISTINCT 
      f.name as canonical,
      f.aliases,
      c.facility_name as found_name
    FROM facilities f
    JOIN cases c ON c.facility_id = f.id
    WHERE c.status = 'verified'
  `);
  
  // Group variations
  const dictionary: Map<string, Set<string>> = new Map();
  
  for (const row of facilities) {
    if (!dictionary.has(row.canonical)) {
      dictionary.set(row.canonical, new Set(row.aliases || []));
    }
    dictionary.get(row.canonical)!.add(row.found_name);
  }
  
  // Convert to array with patterns
  return Array.from(dictionary.entries()).map(([canonical, aliases]) => ({
    canonical,
    aliases: Array.from(aliases),
    pattern: buildFacilityPattern(Array.from(aliases))
  }));
}

function buildFacilityPattern(aliases: string[]): RegExp {
  // Build regex that matches any alias
  const escaped = aliases.map(a => 
    a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
}
```

### Person Name Recognition
```typescript
// Common name patterns in documents
const NAME_PATTERNS = [
  // "Mr. LASTNAME" (common in official docs)
  /(?:Mr\.|Ms\.|Mrs\.)\s+([A-Z]{2,})/g,
  
  // "LASTNAME, FIRSTNAME" format
  /([A-Z]{2,}),\s+([A-Za-z]+)/g,
  
  // "Firstname Lastname" with death context
  /([A-Z][a-z]+)\s+([A-Z][a-z]+)(?=.*(?:died|death|deceased))/g,
];

async function extractPersonName(text: string): Promise<string | null> {
  for (const pattern of NAME_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      // Verify against known names in DB
      const normalized = normalizeNme(match[0]);
      const exists = await db.cases.existsByName(normalized);
      if (exists) return normalized;
    }
  }
  return null;
}
```

---

## Domain Learning

### Track Domain Performance
```sql
CREATE TABLE domain_performance (
  domain TEXT PRIMARY KEY,
  
  -- Scraping stats
  total_scraped INTEGER DEFAULT 0,
  successful_scrapes INTEGER DEFAULT 0,
  
  -- Relevance stats
  total_relevant INTEGER DEFAULT 0,
  human_marked_relevant INTEGER DEFAULT 0,
  
  -- Quality stats
  avg_quality_score DECIMAL,
  avg_content_length INTEGER,
  
  -- Derived scores
  scrape_success_rate DECIMAL GENERATED ALWAYS AS 
    (successful_scrapes::DECIMAL / NULLIF(total_scraped, 0)) STORED,
  relevance_rate DECIMAL GENERATED ALWAYS AS 
    (human_marked_relevant::DECIMAL / NULLIF(total_relevant, 0)) STORED,
  
  -- Priority adjustment
  priority_boost INTEGER DEFAULT 0,  -- -10 to +10
  
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Automatic Priority Adjustment
```typescript
async function updateDomainPriorities(): Promise<void> {
  // Boost domains with high relevance rate
  await db.query(`
    UPDATE domain_performance
    SET priority_boost = CASE
      WHEN relevance_rate > 0.8 AND total_relevant > 10 THEN 5
      WHEN relevance_rate > 0.5 AND total_relevant > 10 THEN 2
      WHEN relevance_rate < 0.2 AND total_relevant > 20 THEN -5
      WHEN relevance_rate < 0.1 AND total_relevant > 50 THEN -10
      ELSE 0
    END,
    updated_at = NOW()
  `);
}

// Use in scraping priority
function getScrapePriority(url: string): number {
  const domain = new URL(url).hostname;
  const config = DOMAIN_CONFIG[domain] || { priority: 5 };
  const boost = domainPerformance.get(domain)?.priority_boost || 0;
  return config.priority + boost;
}
```

---

## Quality Metrics Dashboard

### Extraction Quality Over Time
```sql
CREATE VIEW extraction_quality_weekly AS
SELECT 
  DATE_TRUNC('week', vf.created_at) as week,
  vf.ai_category,
  COUNT(*) as total_reviews,
  SUM(CASE WHEN human_action = 'accepted' THEN 1 ELSE 0 END) as accepted,
  SUM(CASE WHEN human_action = 'rejected' THEN 1 ELSE 0 END) as rejected,
  SUM(CASE WHEN human_action = 'edited' THEN 1 ELSE 0 END) as edited,
  AVG(ai_confidence) as avg_confidence,
  SUM(CASE WHEN human_action = 'accepted' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) as accuracy
FROM verification_feedback vf
GROUP BY DATE_TRUNC('week', vf.created_at), vf.ai_category
ORDER BY week DESC, ai_category;
```

### Scraping Efficiency
```sql
CREATE VIEW scraping_efficiency_daily AS
SELECT 
  DATE(scraped_at) as date,
  domain,
  COUNT(*) as scraped,
  SUM(CASE WHEN is_relevant THEN 1 ELSE 0 END) as relevant,
  AVG(quality_score) as avg_quality,
  AVG(relevance_score) as avg_ai_relevance
FROM scraped_articles
GROUP BY DATE(scraped_at), domain
ORDER BY date DESC, scraped DESC;
```

---

## Model Versioning

Track which model version produced each extraction:

```typescript
interface ModelVersion {
  id: string;              // e.g., "llama3.1-8b-q4"
  promptVersion: string;   // e.g., "v2.3"
  deployedAt: Date;
  accuracy?: number;       // Calculated after human reviews
}

// Record with each extraction
interface ExtractionMetadata {
  modelVersion: string;
  promptVersion: string;
  extractedAt: Date;
  processingTimeMs: number;
}

// Compare model versions
async function compareModelVersions(): Promise<void> {
  const results = await db.query(`
    SELECT 
      eq.extracted_by as model_version,
      COUNT(*) as total,
      SUM(CASE WHEN eq.status = 'verified' THEN 1 ELSE 0 END) as accepted,
      AVG(eq.confidence_score) as avg_confidence
    FROM extracted_quotes eq
    WHERE eq.status IN ('verified', 'rejected')
    GROUP BY eq.extracted_by
    ORDER BY accepted::DECIMAL / total DESC
  `);
  
  console.table(results);
}
```

---

## Implementation Phases

### Phase 1: Passive Collection (Week 1-2)
- Add feedback tables
- Log all verification actions
- Don't change behavior yet

### Phase 2: Analysis (Week 3-4)
- Build calibration views
- Identify problem areas
- Manual threshold adjustment

### Phase 3: Dynamic Prompts (Month 2)
- Implement few-shot example selection
- A/B test prompt variations
- Track accuracy changes

### Phase 4: Automated Tuning (Month 3+)
- Automatic threshold adjustment
- Domain priority updates
- Continuous monitoring alerts
