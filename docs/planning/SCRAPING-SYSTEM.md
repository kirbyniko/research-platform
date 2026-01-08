# Intelligent Web Scraping System

## Purpose

Automate the discovery and collection of news articles, government reports, and legal documents related to ICE custody deaths. The system must handle the reality that most search results are garbage.

---

## The Problem with Web Scraping

```
Google Search: "ICE detention death 2024"
                    │
                    ▼
┌────────────────────────────────────────────────────────────────┐
│  Results (100 items)                                           │
├────────────────────────────────────────────────────────────────┤
│  ✗ 40% - Opinion pieces / advocacy sites (no new facts)        │
│  ✗ 25% - Aggregator sites copying same AP story                │
│  ✗ 15% - Paywalled articles (can't access)                     │
│  ✗ 10% - Completely unrelated (ICE = frozen water)             │
│  ✓ 10% - Actual useful sources with new information            │
└────────────────────────────────────────────────────────────────┘
```

**Our job: Find that 10% as fast as possible.**

---

## Scraping Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCRAPING PIPELINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 1: DISCOVERY                                                   │   │
│  │                                                                       │   │
│  │ Sources:                                                             │   │
│  │ - Google News API / SerpAPI                                          │   │
│  │ - Known news site RSS feeds                                          │   │
│  │ - Government press release pages                                     │   │
│  │ - FOIA document repositories                                         │   │
│  │ - Court document databases (PACER)                                   │   │
│  │                                                                       │   │
│  │ Output: List of URLs with basic metadata                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 2: URL FILTERING (Fast, No Fetch)                              │   │
│  │                                                                       │   │
│  │ Reject immediately:                                                  │   │
│  │ - Already in database (by URL or URL hash)                           │   │
│  │ - Blocklisted domains (known bad sources)                            │   │
│  │ - Non-article patterns (/tag/, /category/, /author/)                 │   │
│  │                                                                       │   │
│  │ Score remaining:                                                     │   │
│  │ - Trusted domain? +20                                                │   │
│  │ - Has date in URL? +5                                                │   │
│  │ - Contains keywords? +10                                             │   │
│  │                                                                       │   │
│  │ Output: Prioritized URL queue                                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 3: CONTENT FETCH                                               │   │
│  │                                                                       │   │
│  │ Using Playwright:                                                    │   │
│  │ - Render JavaScript (many sites need it)                             │   │
│  │ - Handle cookie banners                                              │   │
│  │ - Respect rate limits per domain                                     │   │
│  │ - Rotate user agents                                                 │   │
│  │ - Screenshot for visual verification                                 │   │
│  │                                                                       │   │
│  │ Output: Raw HTML + screenshot                                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 4: CONTENT EXTRACTION                                          │   │
│  │                                                                       │   │
│  │ Domain-specific extractors for known sites:                          │   │
│  │ - nytimes.com → NYTimesExtractor                                     │   │
│  │ - washingtonpost.com → WaPoExtractor                                 │   │
│  │ - ice.gov → ICEGovExtractor                                          │   │
│  │                                                                       │   │
│  │ Fallback: Mozilla Readability                                        │   │
│  │                                                                       │   │
│  │ Extract:                                                             │   │
│  │ - Title                                                              │   │
│  │ - Author(s)                                                          │   │
│  │ - Publication date                                                   │   │
│  │ - Body text (cleaned)                                                │   │
│  │ - Embedded media URLs                                                │   │
│  │                                                                       │   │
│  │ Output: Structured article object                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 5: RELEVANCE SCORING (LLM)                                     │   │
│  │                                                                       │   │
│  │ Quick check (first 1000 chars):                                      │   │
│  │ "Does this article describe a death in ICE/immigration custody?"     │   │
│  │                                                                       │   │
│  │ If YES, deeper analysis:                                             │   │
│  │ - Person's name                                                      │   │
│  │ - Date of death                                                      │   │
│  │ - Facility name                                                      │   │
│  │ - New information vs. rehash                                         │   │
│  │                                                                       │   │
│  │ Output: Relevance score + extracted entities                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 6: DEDUPLICATION                                               │   │
│  │                                                                       │   │
│  │ Check if this is new information:                                    │   │
│  │ - Same story from different outlet? (headline similarity)            │   │
│  │ - Update to existing story? (same person, new facts)                 │   │
│  │ - Completely new case?                                               │   │
│  │                                                                       │   │
│  │ Actions:                                                             │   │
│  │ - NEW_CASE: Create new case record                                   │   │
│  │ - NEW_SOURCE: Add as source to existing case                         │   │
│  │ - DUPLICATE: Link to existing source, don't create new               │   │
│  │ - UPDATE: Flag existing case for review with new info                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ STAGE 7: QUEUE FOR VERIFICATION                                      │   │
│  │                                                                       │   │
│  │ Add to human review queue:                                           │   │
│  │ - Article content                                                    │   │
│  │ - Extracted quotes/timeline                                          │   │
│  │ - Suggested case linkage                                             │   │
│  │ - Confidence score                                                   │   │
│  │                                                                       │   │
│  │ Priority based on:                                                   │   │
│  │ - Source credibility                                                 │   │
│  │ - Recency                                                            │   │
│  │ - Information novelty                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Domain Configuration

### Trusted Domains (High Priority)
```typescript
const TRUSTED_DOMAINS = {
  // Major news
  'nytimes.com': { priority: 10, rateLimit: 2000, needsJS: true },
  'washingtonpost.com': { priority: 10, rateLimit: 2000, needsJS: true },
  'reuters.com': { priority: 10, rateLimit: 1500, needsJS: false },
  'apnews.com': { priority: 10, rateLimit: 1500, needsJS: false },
  
  // Immigration-focused
  'theguardian.com': { priority: 9, rateLimit: 1500, needsJS: false },
  'propublica.org': { priority: 9, rateLimit: 2000, needsJS: true },
  'theintercept.com': { priority: 8, rateLimit: 2000, needsJS: true },
  
  // Government
  'ice.gov': { priority: 10, rateLimit: 3000, needsJS: false },
  'dhs.gov': { priority: 10, rateLimit: 3000, needsJS: false },
  'gao.gov': { priority: 9, rateLimit: 3000, needsJS: false },
  
  // Legal
  'courtlistener.com': { priority: 8, rateLimit: 2000, needsJS: false },
  'law.justia.com': { priority: 7, rateLimit: 2000, needsJS: false },
  
  // Local news (valuable for details)
  'local_news': { priority: 6, rateLimit: 2000, needsJS: true }
};
```

### Blocklisted Domains
```typescript
const BLOCKED_DOMAINS = [
  // Aggregators (no original reporting)
  'news.google.com',
  'news.yahoo.com',
  'msn.com',
  
  // Social media (not primary sources)
  'twitter.com',
  'facebook.com',
  'reddit.com',
  
  // Known low-quality
  'infowars.com',
  'naturalnews.com',
  
  // Paywalled with no workaround
  'wsj.com',
  
  // Non-news
  'wikipedia.org',  // Good for research, not primary source
  'amazon.com',
  'ebay.com'
];
```

---

## Domain-Specific Extractors

### Example: ICE.gov Extractor
```typescript
class ICEGovExtractor implements DomainExtractor {
  domain = 'ice.gov';
  
  async extract(html: string, url: string): Promise<ArticleContent> {
    const $ = cheerio.load(html);
    
    // ICE press releases have specific structure
    const title = $('h1.page-title').text().trim();
    const date = $('time.date').attr('datetime');
    const body = $('.field--name-body').text().trim();
    
    // Extract facility names mentioned
    const facilities = this.extractFacilities(body);
    
    // Check for death announcement patterns
    const isDeathRelated = this.checkDeathPatterns(title, body);
    
    return {
      title,
      date,
      body,
      author: 'ICE Public Affairs',
      facilities,
      isDeathRelated,
      sourceType: 'government_statement'
    };
  }
  
  private checkDeathPatterns(title: string, body: string): boolean {
    const patterns = [
      /death.*custody/i,
      /died.*detention/i,
      /passing.*detainee/i,
      /deceased.*custody/i
    ];
    const text = `${title} ${body}`;
    return patterns.some(p => p.test(text));
  }
}
```

### Example: Generic News Extractor (Fallback)
```typescript
class GenericExtractor implements DomainExtractor {
  domain = '*';
  
  async extract(html: string, url: string): Promise<ArticleContent> {
    // Use Mozilla Readability
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (!article) {
      throw new Error('Could not parse article');
    }
    
    // Try to find date
    const date = this.extractDate(doc, article);
    
    // Try to find author
    const author = this.extractAuthor(doc, article);
    
    return {
      title: article.title,
      date,
      body: article.textContent,
      author,
      sourceType: 'news_article'
    };
  }
}
```

---

## Rate Limiting & Politeness

```typescript
class RateLimiter {
  private lastRequest: Map<string, number> = new Map();
  private requestCount: Map<string, number> = new Map();
  
  async waitForSlot(domain: string): Promise<void> {
    const config = DOMAIN_CONFIG[domain] || { rateLimit: 3000 };
    const last = this.lastRequest.get(domain) || 0;
    const elapsed = Date.now() - last;
    
    if (elapsed < config.rateLimit) {
      await sleep(config.rateLimit - elapsed);
    }
    
    this.lastRequest.set(domain, Date.now());
    this.incrementCount(domain);
  }
  
  // Daily limits to avoid abuse
  private incrementCount(domain: string): void {
    const count = this.requestCount.get(domain) || 0;
    if (count > 100) {
      throw new Error(`Daily limit reached for ${domain}`);
    }
    this.requestCount.set(domain, count + 1);
  }
  
  // Reset daily counts
  resetDailyCounts(): void {
    this.requestCount.clear();
  }
}
```

---

## Search Queries

### Automated Query Generation
```typescript
const QUERY_TEMPLATES = [
  // Death-specific
  '"ICE custody" death {year}',
  '"immigration detention" died {year}',
  '"detention center" death {facility}',
  
  // Facility-specific
  '"{facility}" death',
  '"{facility}" medical emergency',
  
  // Person-specific (for updates)
  '"{person_name}" ICE death',
  '"{person_name}" detention',
  
  // Legal
  '"wrongful death" ICE {year}',
  'lawsuit "immigration detention" death',
  
  // Government
  'site:ice.gov "death" {year}',
  'site:dhs.gov "detention death"'
];

function generateQueries(params: QueryParams): string[] {
  return QUERY_TEMPLATES.map(template => {
    return template
      .replace('{year}', params.year || new Date().getFullYear().toString())
      .replace('{facility}', params.facility || '')
      .replace('{person_name}', params.personName || '');
  }).filter(q => !q.includes('{'));  // Remove templates with unfilled params
}
```

---

## Content Quality Scoring

```typescript
interface QualityScore {
  overall: number;        // 0-100
  factors: {
    sourceCredibility: number;    // Based on domain
    contentLength: number;        // Longer usually better
    hasQuotes: number;            // Direct quotes = good
    hasNames: number;             // Named individuals
    hasDates: number;             // Specific dates
    hasNewInfo: number;           // Info not in our DB
    recency: number;              // How recent
  };
}

function scoreArticleQuality(article: ArticleContent): QualityScore {
  const factors = {
    sourceCredibility: getDomainScore(article.domain),
    contentLength: Math.min(article.body.length / 50, 20),  // Max 20 pts
    hasQuotes: countQuotes(article.body) * 5,               // 5 pts per quote
    hasNames: countProperNouns(article.body) * 2,           // 2 pts per name
    hasDates: countDates(article.body) * 3,                 // 3 pts per date
    hasNewInfo: calculateNovelty(article),                  // 0-20 pts
    recency: calculateRecencyScore(article.date)            // 0-10 pts
  };
  
  const overall = Object.values(factors).reduce((a, b) => a + b, 0);
  
  return { overall: Math.min(overall, 100), factors };
}
```

---

## Deduplication Strategy

### URL-Based (Fast)
```typescript
function isDuplicateUrl(url: string): boolean {
  const normalized = normalizeUrl(url);
  const hash = sha256(normalized);
  return db.sources.exists({ urlHash: hash });
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  // Remove tracking params
  ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'].forEach(p => {
    parsed.searchParams.delete(p);
  });
  // Lowercase
  return parsed.toString().toLowerCase();
}
```

### Content-Based (For Same Story, Different URL)
```typescript
function findSimilarContent(article: ArticleContent): Source[] {
  // Generate content fingerprint
  const fingerprint = generateFingerprint(article.body);
  
  // Find sources with similar fingerprints
  return db.sources.findSimilar(fingerprint, 0.8);  // 80% similarity threshold
}

function generateFingerprint(text: string): string {
  // Extract key sentences (first, last, quotes)
  const sentences = extractKeySentences(text);
  
  // Hash each sentence
  const hashes = sentences.map(s => simhash(s));
  
  // Combine into fingerprint
  return hashes.join(':');
}
```

### Entity-Based (Same Person)
```typescript
function linkToExistingCase(article: ArticleContent): Case | null {
  // Extract person name from article
  const names = extractPersonNames(article.body);
  
  for (const name of names) {
    // Check against existing cases
    const matches = db.cases.searchByName(name);
    
    for (const match of matches) {
      // Verify with additional context
      if (verifyMatch(article, match)) {
        return match;
      }
    }
  }
  
  return null;
}
```

---

## Scheduler

```typescript
class ScrapingScheduler {
  // Run discovery every 6 hours
  @Cron('0 */6 * * *')
  async runDiscovery(): Promise<void> {
    const queries = generateQueries({ year: '2024' });
    
    for (const query of queries) {
      const urls = await searchGoogle(query);
      await this.queueUrls(urls);
    }
  }
  
  // Process queue continuously
  @Interval(5000)  // Every 5 seconds
  async processQueue(): Promise<void> {
    const url = await this.urlQueue.pop();
    if (!url) return;
    
    try {
      await this.processUrl(url);
    } catch (error) {
      await this.handleError(url, error);
    }
  }
  
  // Check for updates on existing cases
  @Cron('0 0 * * *')  // Daily at midnight
  async checkForUpdates(): Promise<void> {
    const recentCases = await db.cases.findRecent(30);  // Last 30 days
    
    for (const case_ of recentCases) {
      const query = `"${case_.name}" ICE detention`;
      const urls = await searchGoogle(query);
      await this.queueUrls(urls, { caseId: case_.id });
    }
  }
}
```

---

## Error Handling

```typescript
interface ScrapeError {
  url: string;
  errorType: 
    | 'network'        // Connection failed
    | 'timeout'        // Took too long
    | 'blocked'        // 403, captcha
    | 'not_found'      // 404
    | 'parse_error'    // Couldn't extract content
    | 'rate_limited';  // 429
  retryable: boolean;
  retryAfter?: number;  // Milliseconds
}

async function handleScrapeError(error: ScrapeError): Promise<void> {
  await db.scrapeErrors.insert({
    url: error.url,
    errorType: error.errorType,
    timestamp: new Date(),
    retryable: error.retryable
  });
  
  if (error.retryable && error.retryAfter) {
    // Requeue with delay
    await urlQueue.add(error.url, {
      delay: error.retryAfter,
      priority: 'low'
    });
  }
  
  if (error.errorType === 'blocked') {
    // Flag domain for review
    await flagDomainForReview(new URL(error.url).hostname);
  }
}
```

---

## Database Tables

```sql
-- URL queue
CREATE TABLE scrape_queue (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  url_hash TEXT NOT NULL,
  domain TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
  added_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  linked_case_id INTEGER REFERENCES cases(id),
  error_message TEXT
);

-- Scrape results (before human review)
CREATE TABLE scraped_articles (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  title TEXT,
  author TEXT,
  published_date DATE,
  body TEXT,
  quality_score INTEGER,
  relevance_score DECIMAL,
  is_relevant BOOLEAN,
  extracted_entities JSONB,
  scraped_at TIMESTAMP DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE
);

-- Domain statistics
CREATE TABLE domain_stats (
  domain TEXT PRIMARY KEY,
  total_scraped INTEGER DEFAULT 0,
  successful INTEGER DEFAULT 0,
  relevant INTEGER DEFAULT 0,
  avg_quality DECIMAL,
  last_scraped TIMESTAMP,
  is_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT
);
```

---

## Monitoring Dashboard

Track scraping health:

- **Queue depth**: How many URLs waiting
- **Throughput**: URLs processed per hour
- **Success rate**: % that extract successfully
- **Relevance rate**: % that are actually about ICE deaths
- **Quality distribution**: Histogram of quality scores
- **Domain performance**: Success rate by domain
- **Error rates**: By error type
