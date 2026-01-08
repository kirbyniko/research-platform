const { chromium } = require('playwright');
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ice_deaths',
  user: 'postgres',
  password: 'password',
});

async function scrapeGuardian() {
  console.log('🔍 Scraping The Guardian 2025 ICE Deaths Timeline...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set a realistic user agent
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  try {
    // Try the Guardian article
    console.log('Loading Guardian article...');
    await page.goto('https://www.theguardian.com/us-news/ng-interactive/2026/jan/04/ice-2025-deaths-timeline', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for content
    await page.waitForTimeout(5000);
    
    // Get all text content
    const content = await page.evaluate(() => document.body.innerText);
    
    console.log(`Page content length: ${content.length}`);
    console.log('\n--- First 5000 chars of content ---\n');
    console.log(content.substring(0, 5000));
    
    // Save full content
    fs.writeFileSync('C:\\Users\\nikow\\IceDeaths\\scripts\\guardian-full-content.txt', content);
    
  } catch (error) {
    console.log('Guardian failed:', error.message);
    
    // Try alternative: scrape web.archive.org version
    console.log('\nTrying web.archive.org snapshot...');
    try {
      await page.goto('https://web.archive.org/web/2026/https://www.theguardian.com/us-news/ng-interactive/2026/jan/04/ice-2025-deaths-timeline', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForTimeout(3000);
      
      const archiveContent = await page.evaluate(() => document.body.innerText);
      console.log(`Archive content length: ${archiveContent.length}`);
      fs.writeFileSync('C:\\Users\\nikow\\IceDeaths\\scripts\\guardian-archive-content.txt', archiveContent);
      
    } catch (e) {
      console.log('Archive also failed:', e.message);
    }
  }
  
  await browser.close();
}

async function scrapeReuters() {
  console.log('\n🔍 Scraping Reuters ICE Deaths Article...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.reuters.com/world/us/four-died-ice-custody-this-week-2025-deaths-reach-20-year-high-2025-12-19/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    
    const content = await page.evaluate(() => {
      const article = document.querySelector('article');
      return article ? article.innerText : document.body.innerText;
    });
    
    console.log(`Reuters content length: ${content.length}`);
    console.log('\n--- First 3000 chars ---\n');
    console.log(content.substring(0, 3000));
    
    fs.writeFileSync('C:\\Users\\nikow\\IceDeaths\\scripts\\reuters-full-content.txt', content);
    
  } catch (error) {
    console.log('Reuters failed:', error.message);
  }
  
  await browser.close();
}

async function scrapeDetentionKills() {
  console.log('\n🔍 Scraping Detention Kills Substack...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://detentionkills.substack.com/archive', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    
    // Get list of articles
    const articles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));
      return links.map(l => ({
        title: l.innerText.trim(),
        url: l.href
      })).filter(a => a.title.length > 10);
    });
    
    console.log(`Found ${articles.length} articles`);
    articles.slice(0, 15).forEach((a, i) => {
      console.log(`${i+1}. ${a.title.substring(0, 80)}`);
    });
    
    fs.writeFileSync('C:\\Users\\nikow\\IceDeaths\\scripts\\detention-kills-articles.json', JSON.stringify(articles, null, 2));
    
    // Try to load the first few articles about deaths
    for (const article of articles.slice(0, 5)) {
      if (article.title.toLowerCase().includes('death') || article.title.toLowerCase().includes('died')) {
        console.log(`\nLoading: ${article.title}`);
        try {
          await page.goto(article.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForTimeout(2000);
          
          const content = await page.evaluate(() => {
            const body = document.querySelector('.body') || document.querySelector('article');
            return body ? body.innerText : '';
          });
          
          if (content.length > 500) {
            console.log(`Content length: ${content.length}`);
            const filename = article.title.replace(/[^a-z0-9]/gi, '-').substring(0, 50) + '.txt';
            fs.writeFileSync(`C:\\Users\\nikow\\IceDeaths\\scripts\\detention-kills-${filename}`, content);
          }
        } catch (e) {
          console.log(`  Failed: ${e.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log('Detention Kills failed:', error.message);
  }
  
  await browser.close();
}

async function main() {
  await scrapeGuardian();
  await scrapeReuters();
  await scrapeDetentionKills();
  
  console.log('\n✅ Scraping complete!');
}

main();
