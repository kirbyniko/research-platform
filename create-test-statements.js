/**
 * Create test statements with all fields populated and quotes for every quotable field
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Use PRODUCTION_DATABASE_URL to match the migration
const pool = new Pool({
  connectionString: process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const testStatements = [
  {
    // Denunciation from a politician
    statement_type: 'denunciation',
    statement_date: '2025-06-15',
    headline: 'Test Denunciation: Senator Calls for ICE Accountability',
    key_quote: 'This is an outrage that cannot stand. We demand immediate investigation and accountability.',
    speaker_name: 'Test Senator Jane Doe',
    speaker_title: 'U.S. Senator',
    speaker_organization: 'U.S. Senate',
    speaker_type: 'politician',
    political_affiliation: 'democrat',
    speaker_credentials: '20 years in public service, former prosecutor',
    speaker_wikipedia_url: 'https://en.wikipedia.org/wiki/Test_Senator',
    platform: 'press_conference',
    platform_url: 'https://example.com/press-conference-video',
    full_text: 'Full statement text goes here. This is the complete text of the statement as delivered. It includes multiple paragraphs.\n\nSecond paragraph with more details about the situation.\n\nFinal paragraph with call to action.',
    context: 'This statement was made in response to a recent report documenting conditions at a detention facility.',
    impact_level: 'high',
    media_coverage: 'national',
    engagement_likes: 150000,
    engagement_shares: 45000,
    engagement_views: 2500000,
    previously_supported: false,
    party_typically_supports: false,
    breaking_ranks: false,
    ice_response: 'ICE declined to comment on the specific allegations.',
    notable_responses: 'Other lawmakers have expressed support. Several advocacy groups amplified the message.',
    verification_status: 'pending',
    is_guest_submission: false,
    field_quote_map: {
      key_quote: [{ text: 'This is an outrage that cannot stand.', source: 'Press conference transcript', verified: false }],
      headline: [{ text: 'Senator calls for accountability', source: 'News article', verified: false }],
      speaker_name: [{ text: 'Senator Jane Doe', source: 'Official bio', verified: false }],
      speaker_title: [{ text: 'United States Senator', source: 'Senate.gov', verified: false }],
      speaker_credentials: [{ text: 'Former federal prosecutor', source: 'Wikipedia', verified: false }],
      full_text: [{ text: 'Multiple paragraphs of text...', source: 'Full transcript', verified: false }],
      context: [{ text: 'Response to detention report', source: 'News coverage', verified: false }],
    },
    sources: [
      { url: 'https://example.com/news-article-1', title: 'Senator Demands ICE Investigation', priority: 'primary' },
      { url: 'https://example.com/video-link', title: 'Full Press Conference Video', priority: 'primary' },
      { url: 'https://example.com/follow-up', title: 'Follow-up Coverage', priority: 'secondary' },
    ],
    quotes: [
      { text: 'This is an outrage that cannot stand.', source_url: 'https://example.com/transcript', source_title: 'Press Conference Transcript', verified: false },
      { text: 'We demand immediate investigation and accountability.', source_url: 'https://example.com/transcript', source_title: 'Press Conference Transcript', verified: false },
      { text: 'No family should fear for their loved ones in government custody.', source_url: 'https://example.com/interview', source_title: 'Morning News Interview', verified: false },
    ],
  },
  {
    // Support statement from a celebrity
    statement_type: 'support',
    statement_date: '2025-06-10',
    headline: 'Test Support: Celebrity Advocates for Immigration Reform',
    key_quote: 'These families deserve dignity and a path forward. I stand with immigrants.',
    speaker_name: 'Test Celebrity John Smith',
    speaker_title: 'Academy Award-Winning Actor',
    speaker_organization: 'Hollywood',
    speaker_type: 'celebrity',
    political_affiliation: 'independent',
    speaker_credentials: '30+ films, UN Goodwill Ambassador, immigration advocate since 2010',
    speaker_wikipedia_url: 'https://en.wikipedia.org/wiki/Test_Celebrity',
    platform: 'instagram',
    platform_url: 'https://instagram.com/p/test123',
    full_text: 'Just visited the border communities and met with families. Their stories are heartbreaking but their resilience is inspiring.\n\nWe can do better as a nation.\n\n#ImmigrationReform #HumanRights',
    context: 'Posted after a visit to border communities as part of a documentary project.',
    impact_level: 'high',
    media_coverage: 'viral',
    engagement_likes: 5000000,
    engagement_shares: 800000,
    engagement_views: 25000000,
    previously_supported: false,
    party_typically_supports: false,
    breaking_ranks: false,
    ice_response: null,
    notable_responses: 'Post went viral with responses from other celebrities and politicians.',
    verification_status: 'verified',
    is_guest_submission: false,
    field_quote_map: {
      key_quote: [{ text: 'These families deserve dignity', source: 'Instagram post', verified: true }],
      headline: [{ text: 'Celebrity advocates for reform', source: 'Entertainment news', verified: true }],
      speaker_name: [{ text: 'John Smith', source: 'IMDb', verified: true }],
      speaker_title: [{ text: 'Oscar winner', source: 'Academy Awards', verified: true }],
      full_text: [{ text: 'Just visited border communities...', source: 'Instagram', verified: true }],
    },
    sources: [
      { url: 'https://example.com/instagram-post', title: 'Original Instagram Post', priority: 'primary' },
      { url: 'https://example.com/entertainment-news', title: 'Entertainment Coverage', priority: 'secondary' },
    ],
    quotes: [
      { text: 'These families deserve dignity and a path forward.', source_url: 'https://instagram.com/p/test123', source_title: 'Instagram Post', verified: true },
      { text: 'I stand with immigrants.', source_url: 'https://instagram.com/p/test123', source_title: 'Instagram Post', verified: true },
    ],
  },
  {
    // Legal analysis from an expert
    statement_type: 'legal_analysis',
    statement_date: '2025-06-01',
    headline: 'Test Legal Analysis: Constitutional Scholar Questions ICE Authority',
    key_quote: 'The legal basis for these detention practices is on shaky constitutional ground.',
    speaker_name: 'Professor Test Expert',
    speaker_title: 'Professor of Constitutional Law',
    speaker_organization: 'Harvard Law School',
    speaker_type: 'legal_expert',
    political_affiliation: 'nonpartisan',
    speaker_credentials: 'Supreme Court clerk, author of 5 books on constitutional law, argued before SCOTUS',
    speaker_wikipedia_url: 'https://en.wikipedia.org/wiki/Test_Professor',
    platform: 'op_ed',
    platform_url: 'https://example.com/nytimes-oped',
    full_text: 'In my analysis of recent ICE detention practices, several constitutional concerns emerge.\n\nFirst, the Fourth Amendment...\n\nSecond, due process requirements...\n\nThird, equal protection implications...\n\nConclusion: These practices require urgent judicial review.',
    context: 'Written in response to a series of legal challenges to ICE detention policies.',
    impact_level: 'medium',
    media_coverage: 'national',
    engagement_likes: 25000,
    engagement_shares: 12000,
    engagement_views: 500000,
    previously_supported: false,
    party_typically_supports: false,
    breaking_ranks: false,
    ice_response: 'DHS maintains that all operations are conducted within legal authority.',
    notable_responses: 'Cited by multiple legal scholars and in ongoing litigation.',
    verification_status: 'pending',
    is_guest_submission: true,
    field_quote_map: {
      key_quote: [{ text: 'shaky constitutional ground', source: 'NYT Op-Ed', verified: false }],
      speaker_credentials: [{ text: 'Supreme Court clerk', source: 'Harvard bio', verified: false }],
      full_text: [{ text: 'Fourth Amendment concerns...', source: 'Op-Ed full text', verified: false }],
      context: [{ text: 'Legal challenges', source: 'Court documents', verified: false }],
    },
    sources: [
      { url: 'https://example.com/nytimes-oped', title: 'New York Times Op-Ed', priority: 'primary' },
      { url: 'https://example.com/harvard-bio', title: 'Harvard Law Faculty Bio', priority: 'secondary' },
      { url: 'https://example.com/court-case', title: 'Related Court Filing', priority: 'secondary' },
    ],
    quotes: [
      { text: 'The legal basis for these detention practices is on shaky constitutional ground.', source_url: 'https://example.com/nytimes-oped', source_title: 'NYT Op-Ed', verified: false },
      { text: 'These practices require urgent judicial review.', source_url: 'https://example.com/nytimes-oped', source_title: 'NYT Op-Ed', verified: false },
    ],
  },
  {
    // Official response from former official
    statement_type: 'official_response',
    statement_date: '2025-05-20',
    headline: 'Test Official Response: Former ICE Director Breaks Silence',
    key_quote: 'What I witnessed during my tenure cannot be reconciled with American values.',
    speaker_name: 'Test Former Director',
    speaker_title: 'Former ICE Director',
    speaker_organization: 'Former U.S. Immigration and Customs Enforcement',
    speaker_type: 'former_official',
    political_affiliation: 'republican',
    speaker_credentials: 'Served as ICE Director 2018-2021, 30 years in federal law enforcement',
    speaker_wikipedia_url: 'https://en.wikipedia.org/wiki/Test_Director',
    platform: 'interview',
    platform_url: 'https://example.com/60-minutes-interview',
    full_text: 'During my three years leading ICE, I saw practices that troubled me deeply.\n\nI tried to reform from within, but the institutional resistance was overwhelming.\n\nI feel obligated to speak now because the American people deserve to know the truth.',
    context: 'First public interview since leaving office, breaking a self-imposed silence.',
    impact_level: 'high',
    media_coverage: 'national',
    engagement_likes: 350000,
    engagement_shares: 120000,
    engagement_views: 8000000,
    previously_supported: true,
    party_typically_supports: true,
    breaking_ranks: true,
    ice_response: 'Current leadership declined to comment on statements by former officials.',
    notable_responses: 'Bipartisan reactions in Congress. Calls for congressional testimony.',
    verification_status: 'pending',
    is_guest_submission: false,
    field_quote_map: {
      key_quote: [{ text: 'cannot be reconciled with American values', source: '60 Minutes transcript', verified: false }],
      headline: [{ text: 'Former Director Breaks Silence', source: 'News headline', verified: false }],
      speaker_name: [{ text: 'Former Director', source: 'Official records', verified: false }],
      speaker_title: [{ text: 'ICE Director 2018-2021', source: 'Government archives', verified: false }],
      speaker_credentials: [{ text: '30 years federal law enforcement', source: 'Official bio', verified: false }],
      full_text: [{ text: 'institutional resistance was overwhelming', source: '60 Minutes', verified: false }],
      context: [{ text: 'breaking self-imposed silence', source: 'Interview intro', verified: false }],
    },
    sources: [
      { url: 'https://example.com/60-minutes-interview', title: '60 Minutes Interview', priority: 'primary' },
      { url: 'https://example.com/official-bio', title: 'Official Biography', priority: 'secondary' },
      { url: 'https://example.com/congress-response', title: 'Congressional Response', priority: 'secondary' },
      { url: 'https://example.com/fact-check', title: 'Fact Check Analysis', priority: 'secondary' },
    ],
    quotes: [
      { text: 'What I witnessed during my tenure cannot be reconciled with American values.', source_url: 'https://example.com/60-minutes-interview', source_title: '60 Minutes Interview', verified: false },
      { text: 'I tried to reform from within, but the institutional resistance was overwhelming.', source_url: 'https://example.com/60-minutes-interview', source_title: '60 Minutes Interview', verified: false },
      { text: 'The American people deserve to know the truth.', source_url: 'https://example.com/60-minutes-interview', source_title: '60 Minutes Interview', verified: false },
    ],
  },
];

async function createTestStatements() {
  const client = await pool.connect();
  
  try {
    console.log('Starting test statement creation...\n');
    
    for (const stmt of testStatements) {
      await client.query('BEGIN');
      
      try {
        // Generate a unique statement_id
        const slug = stmt.speaker_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        const statement_id = `${stmt.statement_date}-${slug}`;
        
        // Insert statement
        const result = await client.query(`
          INSERT INTO statements (
            statement_id,
            statement_type,
            statement_date,
            headline,
            key_quote,
            speaker_name,
            speaker_title,
            speaker_organization,
            speaker_type,
            political_affiliation,
            speaker_credentials,
            speaker_wikipedia_url,
            platform,
            platform_url,
            full_text,
            context,
            impact_level,
            media_coverage,
            engagement_likes,
            engagement_shares,
            engagement_views,
            previously_supported,
            party_typically_supports,
            breaking_ranks,
            ice_response,
            notable_responses,
            verification_status,
            is_guest_submission,
            field_quote_map
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
          RETURNING id
        `, [
          statement_id,
          stmt.statement_type,
          stmt.statement_date,
          stmt.headline,
          stmt.key_quote,
          stmt.speaker_name,
          stmt.speaker_title,
          stmt.speaker_organization,
          stmt.speaker_type,
          stmt.political_affiliation,
          stmt.speaker_credentials,
          stmt.speaker_wikipedia_url,
          stmt.platform,
          stmt.platform_url,
          stmt.full_text,
          stmt.context,
          stmt.impact_level,
          stmt.media_coverage,
          stmt.engagement_likes,
          stmt.engagement_shares,
          stmt.engagement_views,
          stmt.previously_supported,
          stmt.party_typically_supports,
          stmt.breaking_ranks,
          stmt.ice_response,
          stmt.notable_responses,
          stmt.verification_status,
          stmt.is_guest_submission,
          stmt.field_quote_map ? JSON.stringify(stmt.field_quote_map) : null
        ]);
        
        const statementId = result.rows[0].id;
        console.log(`✓ Created statement ${statementId}: ${stmt.headline}`);
        
        // Insert sources
        for (const source of stmt.sources) {
          await client.query(`
            INSERT INTO statement_sources (statement_id, url, title, priority)
            VALUES ($1, $2, $3, $4)
          `, [statementId, source.url, source.title, source.priority]);
        }
        console.log(`  - Added ${stmt.sources.length} sources`);
        
        // Insert quotes
        for (const quote of stmt.quotes) {
          await client.query(`
            INSERT INTO statement_quotes (statement_id, text, source_url, source_title, verified)
            VALUES ($1, $2, $3, $4, $5)
          `, [statementId, quote.text, quote.source_url, quote.source_title, quote.verified]);
        }
        console.log(`  - Added ${stmt.quotes.length} quotes`);
        console.log(`  - Field quote map has ${Object.keys(stmt.field_quote_map || {}).length} field mappings`);
        
        await client.query('COMMIT');
        console.log('');
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to create statement: ${stmt.headline}`);
        console.error(`  Error: ${error.message}`);
        console.log('');
      }
    }
    
    // Show summary
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified
      FROM statements
      WHERE speaker_name LIKE 'Test%'
    `);
    
    console.log('='.repeat(50));
    console.log('Summary:');
    console.log(`  Total test statements: ${countResult.rows[0].total}`);
    console.log(`  Pending: ${countResult.rows[0].pending}`);
    console.log(`  Verified: ${countResult.rows[0].verified}`);
    console.log('='.repeat(50));
    
  } finally {
    client.release();
    await pool.end();
  }
}

createTestStatements().catch(console.error);
