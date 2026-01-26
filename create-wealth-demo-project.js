/**
 * Create Wealth Inequality Demo Project
 * 
 * This script creates a project that can demonstrate infographics
 * similar to "One Pixel Wealth" - using real, verifiable data
 * with proper source citations.
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// The owner user ID (you - nikow)
const OWNER_USER_ID = 1; // Adjust if needed

async function createProject() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create the project
    const projectResult = await client.query(`
      INSERT INTO projects (name, slug, description, created_by, is_public, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (slug) DO UPDATE SET 
        name = EXCLUDED.name,
        description = EXCLUDED.description
      RETURNING id
    `, [
      'Wealth Shown To Scale',
      'wealth-to-scale',
      'A documentation project visualizing extreme wealth inequality using real, verifiable data. Inspired by mkorostoff\'s "One Pixel Wealth" project. Every figure has citations to primary sources.',
      OWNER_USER_ID,
      true,
      JSON.stringify({
        theme: 'dark',
        allowPublicViewing: true
      })
    ]);
    
    const projectId = projectResult.rows[0].id;
    console.log(`✓ Created/updated project with ID: ${projectId}`);
    
    // 2. Create record types (simplified - no schema column exists)
    const recordTypes = [
      {
        name: 'Wealth Data Point',
        slug: 'wealth-data-point',
        description: 'Individual wealth figures for billionaires, companies, or economic metrics',
        color: '#FFD700', // Gold
        icon: 'dollar-sign'
      },
      {
        name: 'Social Program Cost',
        slug: 'social-program-cost',
        description: 'Costs of social programs, humanitarian efforts, or public services',
        color: '#22C55E', // Green
        icon: 'heart'
      },
      {
        name: 'Comparison',
        slug: 'comparison',
        description: 'Pre-calculated comparisons between wealth and costs',
        color: '#EF4444', // Red
        icon: 'scale'
      },
      {
        name: 'Source Document',
        slug: 'source-document',
        description: 'Primary source documentation with full citations',
        color: '#3B82F6', // Blue
        icon: 'file-text'
      }
    ];
    
    const recordTypeIds = {};
    
    for (const rt of recordTypes) {
      const result = await client.query(`
        INSERT INTO record_types (project_id, name, slug, description, color, icon)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (project_id, slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          color = EXCLUDED.color
        RETURNING id
      `, [projectId, rt.name, rt.slug, rt.description, rt.color, rt.icon]);
      
      recordTypeIds[rt.slug] = result.rows[0].id;
      console.log(`✓ Created record type: ${rt.name} (ID: ${result.rows[0].id})`);
    }
    
    // 3. Create sample records with REAL, VERIFIABLE data
    
    // Wealth Data Points - Using Forbes data and public filings
    const wealthRecords = [
      {
        name: 'Elon Musk',
        category: 'Individual Billionaire',
        value_usd: 251000000000, // $251 billion
        as_of_date: '2024-01-15',
        source_name: 'Forbes Real-Time Billionaires List',
        source_url: 'https://www.forbes.com/real-time-billionaires/',
        source_accessed: '2024-01-15',
        notes: 'Net worth fluctuates with Tesla and SpaceX valuations'
      },
      {
        name: 'Jeff Bezos',
        category: 'Individual Billionaire',
        value_usd: 177000000000, // $177 billion
        as_of_date: '2024-01-15',
        source_name: 'Forbes Real-Time Billionaires List',
        source_url: 'https://www.forbes.com/real-time-billionaires/',
        source_accessed: '2024-01-15',
        notes: 'Primarily Amazon stock and Blue Origin'
      },
      {
        name: 'Bernard Arnault',
        category: 'Individual Billionaire',
        value_usd: 196000000000, // $196 billion
        as_of_date: '2024-01-15',
        source_name: 'Forbes Real-Time Billionaires List',
        source_url: 'https://www.forbes.com/real-time-billionaires/',
        source_accessed: '2024-01-15',
        notes: 'LVMH luxury goods conglomerate'
      },
      {
        name: 'Top 10 Richest Americans Combined',
        category: 'Economic Metric',
        value_usd: 1400000000000, // $1.4 trillion
        as_of_date: '2024-01-15',
        source_name: 'Forbes 400',
        source_url: 'https://www.forbes.com/forbes-400/',
        source_accessed: '2024-01-15',
        notes: 'Musk, Bezos, Zuckerberg, Ellison, Page, Brin, Gates, Ballmer, Bloomberg, Dell'
      },
      {
        name: 'All 735 US Billionaires Combined',
        category: 'Economic Metric',
        value_usd: 4500000000000, // $4.5 trillion
        as_of_date: '2024-01-15',
        source_name: 'Americans for Tax Fairness / Forbes',
        source_url: 'https://americansfortaxfairness.org/billionaire-wealth-tracker/',
        source_accessed: '2024-01-15',
        notes: 'Combined net worth has more than doubled since 2020'
      },
      {
        name: 'Median US Household Net Worth',
        category: 'Comparison Reference',
        value_usd: 192900, // $192,900
        as_of_date: '2022-01-01',
        source_name: 'Federal Reserve Survey of Consumer Finances',
        source_url: 'https://www.federalreserve.gov/publications/files/scf23.pdf',
        source_accessed: '2024-01-15',
        notes: '2022 Survey of Consumer Finances'
      },
      {
        name: 'Median Annual US Household Income',
        category: 'Comparison Reference',
        value_usd: 74580, // $74,580
        as_of_date: '2023-01-01',
        source_name: 'US Census Bureau',
        source_url: 'https://www.census.gov/library/publications/2023/demo/p60-279.html',
        source_accessed: '2024-01-15',
        notes: '2022 median household income'
      }
    ];
    
    // Social Program Costs - Real government and NGO data
    const programRecords = [
      {
        program_name: 'End Child Hunger in America (Annual)',
        category: 'Food Security',
        cost_usd: 25000000000, // $25 billion
        beneficiaries: 13000000,
        duration: 'Annual',
        scope: 'National',
        source_name: 'Feeding America',
        source_url: 'https://www.feedingamerica.org/hunger-in-america',
        quote: 'Approximately 13 million children in the United States live in food-insecure households.',
        notes: 'Cost estimate based on expanding existing programs to full coverage'
      },
      {
        program_name: 'Make All Public College Free (Annual)',
        category: 'Education',
        cost_usd: 79000000000, // $79 billion
        beneficiaries: 20000000,
        duration: 'Annual',
        scope: 'National',
        source_name: 'Department of Education / Georgetown University',
        source_url: 'https://cew.georgetown.edu/cew-reports/freecollegecost/',
        quote: 'Free tuition at public colleges would cost approximately $79 billion annually.',
        notes: 'Covers tuition and fees at all public 2-year and 4-year institutions'
      },
      {
        program_name: 'Provide Clean Water Access Globally',
        category: 'Global Aid',
        cost_usd: 114000000000, // $114 billion (one-time)
        beneficiaries: 2000000000,
        duration: 'One-time',
        scope: 'Global',
        source_name: 'World Health Organization',
        source_url: 'https://www.who.int/news/item/12-07-2017-2-1-billion-people-lack-safe-drinking-water-at-home-more-than-twice-as-many-lack-safe-sanitation',
        quote: '2.1 billion people lack access to safe drinking water at home.',
        notes: 'Infrastructure investment to provide universal access'
      },
      {
        program_name: 'House Every Homeless American (Annual)',
        category: 'Housing',
        cost_usd: 20000000000, // $20 billion
        beneficiaries: 653000,
        duration: 'Annual',
        scope: 'National',
        source_name: 'HUD / National Alliance to End Homelessness',
        source_url: 'https://endhomelessness.org/homelessness-in-america/homelessness-statistics/state-of-homelessness/',
        quote: 'On a single night in 2023, roughly 653,100 people experienced homelessness in the United States.',
        notes: 'Supportive housing model costs ~$30,000/person/year vs $40,000+ for emergency services'
      },
      {
        program_name: 'Universal Pre-K for All 3-4 Year Olds',
        category: 'Education',
        cost_usd: 45000000000, // $45 billion
        beneficiaries: 8000000,
        duration: 'Annual',
        scope: 'National',
        source_name: 'Brookings Institution',
        source_url: 'https://www.brookings.edu/articles/the-current-state-of-scientific-knowledge-on-pre-kindergarten-effects/',
        quote: 'High-quality pre-K programs produce lasting benefits in educational achievement.',
        notes: 'Full-day, high-quality programs for all children ages 3-4'
      },
      {
        program_name: 'Eradicate Malaria Globally',
        category: 'Global Aid',
        cost_usd: 100000000000, // $100 billion over 15 years
        beneficiaries: 400000, // lives saved per year
        duration: 'Multi-year',
        scope: 'Global',
        source_name: 'The Lancet / WHO',
        source_url: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(19)31139-0/fulltext',
        quote: 'Malaria eradication is feasible and would prevent hundreds of thousands of deaths annually.',
        notes: '$6-7 billion per year for 15 years could achieve global eradication'
      },
      {
        program_name: 'Provide Healthcare to All Uninsured Americans (Annual)',
        category: 'Healthcare',
        cost_usd: 300000000000, // $300 billion
        beneficiaries: 27000000,
        duration: 'Annual',
        scope: 'National',
        source_name: 'Kaiser Family Foundation',
        source_url: 'https://www.kff.org/uninsured/issue-brief/key-facts-about-the-uninsured-population/',
        quote: 'About 27 million people were uninsured in 2021.',
        notes: 'Based on average healthcare spending per person and existing subsidy structures'
      }
    ];
    
    // Insert wealth records
    for (const record of wealthRecords) {
      await client.query(`
        INSERT INTO records (record_type_id, project_id, data, status, submitted_by)
        VALUES ($1, $2, $3, 'published', $4)
      `, [recordTypeIds['wealth-data-point'], projectId, JSON.stringify(record), OWNER_USER_ID]);
    }
    console.log(`✓ Created ${wealthRecords.length} wealth data records`);
    
    // Insert program records
    for (const record of programRecords) {
      await client.query(`
        INSERT INTO records (record_type_id, project_id, data, status, submitted_by)
        VALUES ($1, $2, $3, 'published', $4)
      `, [recordTypeIds['social-program-cost'], projectId, JSON.stringify(record), OWNER_USER_ID]);
    }
    console.log(`✓ Created ${programRecords.length} social program records`);
    
    // Create comparison records that pre-calculate key insights
    const comparisons = [
      {
        title: 'Musk\'s Wealth vs Ending Child Hunger',
        wealth_source: 'Elon Musk Net Worth',
        wealth_amount: 251000000000,
        program_name: 'End Child Hunger in America (10 years)',
        program_cost: 250000000000,
        percentage_of_wealth: 99.6,
        impact_statement: 'Elon Musk\'s wealth could fund 10 years of eliminating child hunger in America—feeding 13 million children—and he would still have $1 billion left over.',
        visualization_type: 'scroll-distance'
      },
      {
        title: 'Top 10 Billionaires vs Free College Forever',
        wealth_source: 'Top 10 Richest Americans',
        wealth_amount: 1400000000000,
        program_name: 'Free Public College (17 years)',
        program_cost: 1343000000000,
        percentage_of_wealth: 95.9,
        impact_statement: 'The combined wealth of just 10 Americans could make all public colleges free for 17 years—an entire generation of students.',
        visualization_type: 'scroll-distance'
      },
      {
        title: 'US Billionaire Wealth vs GDP of Countries',
        wealth_source: 'All 735 US Billionaires',
        wealth_amount: 4500000000000,
        program_name: 'GDP of United Kingdom',
        program_cost: 3100000000000,
        percentage_of_wealth: 68.9,
        impact_statement: '735 Americans control more wealth than the entire annual economic output of the United Kingdom, the world\'s 6th largest economy.',
        visualization_type: 'bar-comparison'
      },
      {
        title: 'Bezos Wealth vs Housing All Homeless',
        wealth_source: 'Jeff Bezos Net Worth',
        wealth_amount: 177000000000,
        program_name: 'House Every Homeless American (8 years)',
        program_cost: 160000000000,
        percentage_of_wealth: 90.4,
        impact_statement: 'Jeff Bezos alone could provide housing for every homeless person in America for 8 years and still be a billionaire.',
        visualization_type: 'scroll-distance'
      },
      {
        title: '3% of Billionaire Wealth vs Malaria Eradication',
        wealth_source: '3% of US Billionaire Wealth',
        wealth_amount: 135000000000,
        program_name: 'Eradicate Malaria Globally',
        program_cost: 100000000000,
        percentage_of_wealth: 74.1,
        impact_statement: 'Just 3% of US billionaire wealth could completely eradicate malaria—a disease that kills over 600,000 people per year, mostly children.',
        visualization_type: 'percentage-circle'
      }
    ];
    
    for (const record of comparisons) {
      await client.query(`
        INSERT INTO records (record_type_id, project_id, data, status, submitted_by)
        VALUES ($1, $2, $3, 'published', $4)
      `, [recordTypeIds['comparison'], projectId, JSON.stringify(record), OWNER_USER_ID]);
    }
    console.log(`✓ Created ${comparisons.length} comparison records`);
    
    // Create source document records
    const sources = [
      {
        title: 'Forbes Real-Time Billionaires List',
        author: 'Forbes Media',
        publication_date: '2024-01-15',
        url: 'https://www.forbes.com/real-time-billionaires/',
        document_type: 'Data Portal',
        key_quotes: ['Net worth is calculated using stock prices and exchange rates from the close of the previous trading day.'],
        summary: 'Real-time tracker of billionaire wealth based on public stock holdings and known assets.'
      },
      {
        title: 'Survey of Consumer Finances 2022',
        author: 'Federal Reserve Board',
        publication_date: '2023-10-01',
        url: 'https://www.federalreserve.gov/publications/files/scf23.pdf',
        archive_url: 'https://web.archive.org/web/20240115000000*/https://www.federalreserve.gov/publications/files/scf23.pdf',
        document_type: 'Government Report',
        key_quotes: ['The median net worth of all families rose 37 percent, from $141,100 in 2019 to $192,900 in 2022.'],
        summary: 'Triennial survey of household wealth and income distribution in the United States.'
      },
      {
        title: 'Hunger in America Study',
        author: 'Feeding America',
        publication_date: '2023-01-01',
        url: 'https://www.feedingamerica.org/hunger-in-america',
        document_type: 'Data Portal',
        key_quotes: ['In 2022, 44.2 million people lived in food-insecure households.', '13 million children live in food-insecure households.'],
        summary: 'Comprehensive data on food insecurity rates and the populations served by food banks.'
      },
      {
        title: 'State of Homelessness Report',
        author: 'National Alliance to End Homelessness',
        publication_date: '2024-01-01',
        url: 'https://endhomelessness.org/homelessness-in-america/homelessness-statistics/state-of-homelessness/',
        document_type: 'Data Portal',
        key_quotes: ['On a single night in 2023, roughly 653,100 people experienced homelessness.'],
        summary: 'Annual analysis of homelessness data from HUD\'s Point-in-Time Count.'
      }
    ];
    
    for (const record of sources) {
      await client.query(`
        INSERT INTO records (record_type_id, project_id, data, status, submitted_by)
        VALUES ($1, $2, $3, 'published', $4)
      `, [recordTypeIds['source-document'], projectId, JSON.stringify(record), OWNER_USER_ID]);
    }
    console.log(`✓ Created ${sources.length} source document records`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Demo project created successfully!');
    console.log(`\nProject: Wealth Shown To Scale`);
    console.log(`Slug: wealth-to-scale`);
    console.log(`URL: /projects/wealth-to-scale`);
    console.log(`\nRecord Types:`);
    for (const [slug, id] of Object.entries(recordTypeIds)) {
      console.log(`  - ${slug}: ${id}`);
    }
    console.log(`\nTotal Records Created: ${wealthRecords.length + programRecords.length + comparisons.length + sources.length}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating demo project:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createProject();
