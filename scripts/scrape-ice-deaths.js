const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Known ICE death data sources
const SOURCES = {
  austinKocher: 'https://austinkocher.substack.com/p/ices-deadly-december-record-setting',
  detentionReports: 'https://detentionreports.com',
  reuters2025Deaths: 'https://www.reuters.com/world/us/four-died-ice-custody-this-week-2025-deaths-reach-20-year-high-2025-12-19/',
  notusDeaths: 'https://www.notus.org/immigration/ice-detention-deaths-december-2025',
};

async function scrapeAustinKocher(browser) {
  console.log('\n📰 Scraping Austin Kocher Substack...');
  const page = await browser.newPage();
  const deaths = [];

  try {
    // Scrape the December deaths article
    await page.goto(SOURCES.austinKocher, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    const content = await page.content();
    console.log('Page loaded, extracting content...');
    
    // Get the full article text
    const articleText = await page.evaluate(() => {
      const article = document.querySelector('.body');
      return article ? article.innerText : document.body.innerText;
    });
    
    console.log('Article length:', articleText.length);
    fs.writeFileSync(path.join(__dirname, 'austin-kocher-article.txt'), articleText);
    console.log('Saved article text to austin-kocher-article.txt');

    // Extract death mentions from the article
    // Look for patterns like "Name, a XX-year-old from Country"
    const deathPatterns = articleText.match(/([A-Z][a-z]+ [A-Z][a-z\-]+(?:\s[A-Z][a-z\-]+)?),?\s+(?:a\s+)?(\d+)-year-old\s+(?:from\s+)?([A-Za-z]+)/g) || [];
    
    console.log('Found death patterns:', deathPatterns.length);
    for (const pattern of deathPatterns) {
      console.log('  -', pattern);
    }
    
  } catch (error) {
    console.error('Error scraping Austin Kocher:', error.message);
  }
  
  await page.close();
  return deaths;
}

async function scrapeReuters(browser) {
  console.log('\n📰 Scraping Reuters ICE Deaths Article...');
  const page = await browser.newPage();
  
  try {
    await page.goto(SOURCES.reuters2025Deaths, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const content = await page.content();
    const articleText = await page.evaluate(() => {
      const article = document.querySelector('article') || document.querySelector('.article-body');
      return article ? article.innerText : document.body.innerText;
    });
    
    console.log('Reuters article length:', articleText.length);
    fs.writeFileSync(path.join(__dirname, 'reuters-article.txt'), articleText);
    console.log('Saved article text to reuters-article.txt');
    
  } catch (error) {
    console.error('Error scraping Reuters:', error.message);
  }
  
  await page.close();
}

async function scrapeNOTUS(browser) {
  console.log('\n📰 Scraping NOTUS Immigration Deaths...');
  const page = await browser.newPage();
  
  try {
    await page.goto(SOURCES.notusDeaths, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const articleText = await page.evaluate(() => {
      const article = document.querySelector('article') || document.querySelector('.article-content');
      return article ? article.innerText : document.body.innerText;
    });
    
    console.log('NOTUS article length:', articleText.length);
    fs.writeFileSync(path.join(__dirname, 'notus-article.txt'), articleText);
    console.log('Saved article text to notus-article.txt');
    
  } catch (error) {
    console.error('Error scraping NOTUS:', error.message);
  }
  
  await page.close();
}

async function scrapeDetentionReports(browser) {
  console.log('\n📰 Scraping Detention Reports...');
  const page = await browser.newPage();
  
  try {
    // First get the list of facilities
    await page.goto(SOURCES.detentionReports, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // Get facility links
    const facilityLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/facility/"]'));
      return links.slice(0, 20).map(l => ({ name: l.innerText, url: l.href }));
    });
    
    console.log(`Found ${facilityLinks.length} facility links`);
    
    // Check a few major detention facilities known for deaths
    const facilitiesWithDeaths = [
      'ADELANTO_ICE_PROCESSING_CENTER',
      'STEWART_DETENTION_CENTER', 
      'KROME_NORTH_SERVICE_PROCESSING_CENTER',
      'ELOY_DETENTION_CENTER',
      'SOUTH_TEXAS_DETENTION_COMPLEX',
      'KARNES_COUNTY_IMMIGRATION_PROCESSING_CENTER',
      'NORTH_LAKE_CORRECTIONAL_F'
    ];
    
    for (const facilityId of facilitiesWithDeaths.slice(0, 3)) {
      try {
        const facilityUrl = `https://detentionreports.com/facility/${facilityId}.html`;
        await page.goto(facilityUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1000);
        
        const facilityData = await page.evaluate(() => {
          return {
            name: document.querySelector('h1')?.innerText || '',
            content: document.body.innerText.substring(0, 5000)
          };
        });
        
        console.log(`\nFacility: ${facilityData.name}`);
      } catch (e) {
        console.log(`Could not load ${facilityId}`);
      }
    }
    
  } catch (error) {
    console.error('Error scraping Detention Reports:', error.message);
  }
  
  await page.close();
}

async function searchGoogleNews(browser) {
  console.log('\n📰 Searching Google News for ICE detention deaths...');
  const page = await browser.newPage();
  
  try {
    // Search for recent ICE detention death news
    const searchUrl = 'https://www.google.com/search?q=ICE+detention+death+2024+2025&tbm=nws&tbs=qdr:y';
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // Extract news results
    const newsResults = await page.evaluate(() => {
      const results = [];
      const articles = document.querySelectorAll('div[data-hveid]');
      articles.forEach(article => {
        const title = article.querySelector('h3')?.innerText || article.querySelector('div[role="heading"]')?.innerText;
        const link = article.querySelector('a')?.href;
        const snippet = article.querySelector('div:not(:has(h3))')?.innerText;
        if (title && link) {
          results.push({ title, link, snippet: snippet?.substring(0, 200) });
        }
      });
      return results;
    });
    
    console.log(`Found ${newsResults.length} news articles`);
    newsResults.slice(0, 10).forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.title}`);
      console.log(`   ${r.link}`);
    });
    
    fs.writeFileSync(path.join(__dirname, 'google-news-results.json'), JSON.stringify(newsResults, null, 2));
    
  } catch (error) {
    console.error('Error searching Google News:', error.message);
  }
  
  await page.close();
}

async function scrapeICEGovArchive(browser) {
  console.log('\n📰 Attempting to access ICE.gov death reports via archive.org...');
  const page = await browser.newPage();
  
  try {
    // Try Wayback Machine for historical ICE death reports
    const archiveUrl = 'https://web.archive.org/web/2024/https://www.ice.gov/detain/detainee-death-reporting';
    await page.goto(archiveUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const pageContent = await page.content();
    const textContent = await page.evaluate(() => document.body.innerText);
    
    console.log('Archive page length:', textContent.length);
    
    // Look for death data tables or lists
    const tables = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      return Array.from(tables).map(t => t.innerText);
    });
    
    console.log(`Found ${tables.length} tables`);
    
    fs.writeFileSync(path.join(__dirname, 'ice-archive-content.txt'), textContent);
    console.log('Saved archive content to ice-archive-content.txt');
    
  } catch (error) {
    console.error('Error accessing archive:', error.message);
  }
  
  await page.close();
}

async function main() {
  console.log('🔍 ICE Detention Death Scraper\n');
  console.log('================================\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Try multiple sources
    await scrapeAustinKocher(browser);
    await scrapeReuters(browser);
    await scrapeNOTUS(browser);
    await scrapeDetentionReports(browser);
    await searchGoogleNews(browser);
    await scrapeICEGovArchive(browser);
    
  } catch (error) {
    console.error('Main error:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n================================');
  console.log('✅ Scraping complete. Check the output files in scripts/ directory.');
}

main();
