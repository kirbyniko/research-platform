const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function scrapeGuardianDeathTimeline() {
  console.log('🔍 Scraping The Guardian ICE 2025 Deaths Timeline...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.theguardian.com/us-news/ng-interactive/2026/jan/04/ice-2025-deaths-timeline';
    console.log('Loading:', url);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(5000);
    
    // Scroll to load all content
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollBy(0, 1000);
        await new Promise(r => setTimeout(r, 500));
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Get the full article content
    const articleContent = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log('Article length:', articleContent.length);
    fs.writeFileSync(path.join(__dirname, 'guardian-deaths-timeline.txt'), articleContent);
    
    // Try to extract structured death data
    const deathData = await page.evaluate(() => {
      const deaths = [];
      
      // Look for death entries - common patterns in timeline articles
      const entries = document.querySelectorAll('[class*="timeline"], [class*="death"], [class*="case"], article section, .content-wrapper p');
      
      entries.forEach(entry => {
        const text = entry.innerText;
        // Look for patterns like "Name, age, from Country, died on Date at Facility"
        if (text.length > 20 && text.length < 2000) {
          // Check if it contains death-related keywords
          if (text.match(/died|death|custody|detained|facility|ICE/i)) {
            deaths.push(text.trim());
          }
        }
      });
      
      return deaths;
    });
    
    console.log(`\nFound ${deathData.length} potential death entries`);
    
    // Also get all the HTML to parse offline
    const html = await page.content();
    fs.writeFileSync(path.join(__dirname, 'guardian-deaths-timeline.html'), html);
    
    // Parse for specific patterns
    console.log('\n--- Extracting death information ---\n');
    
    // Look for name + age + country patterns
    const namePatterns = articleContent.match(/([A-Z][a-zñ]+ (?:[A-Z][a-zñ\-]+(?:\s|$))+),?\s*(\d{1,2})[,\s]+(?:from\s+)?([A-Za-z]+)/gm) || [];
    
    console.log('Name patterns found:', namePatterns.length);
    namePatterns.forEach(p => console.log('  -', p));
    
    // Look for date patterns
    const datePatterns = articleContent.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+202[4-6]/gi) || [];
    console.log('\nDate patterns found:', datePatterns.length);
    
    // Look for facility patterns
    const facilityPatterns = articleContent.match(/([\w\s]+(?:Detention|Processing|Correctional|ICE)\s*(?:Center|Facility|Complex))/gi) || [];
    console.log('Facility patterns found:', facilityPatterns.length);
    
    // Save all extracted data
    const extractedData = {
      names: namePatterns,
      dates: datePatterns,
      facilities: [...new Set(facilityPatterns)],
      rawDeathEntries: deathData
    };
    
    fs.writeFileSync(path.join(__dirname, 'guardian-extracted-data.json'), JSON.stringify(extractedData, null, 2));
    console.log('\nSaved extracted data to guardian-extracted-data.json');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

async function scrapeAmericanImmigrationCouncil() {
  console.log('\n🔍 Scraping American Immigration Council...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.americanimmigrationcouncil.org/blog/trump-deadlier-for-ice-detainees-than-covid-19-pandemic/';
    console.log('Loading:', url);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(3000);
    
    const articleContent = await page.evaluate(() => {
      const article = document.querySelector('article') || document.querySelector('.post-content') || document.body;
      return article.innerText;
    });
    
    console.log('Article length:', articleContent.length);
    fs.writeFileSync(path.join(__dirname, 'aic-deaths-article.txt'), articleContent);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

async function scrapeNewJerseyMonitor() {
  console.log('\n🔍 Scraping New Jersey Monitor - Newark death...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    const url = 'https://newjerseymonitor.com/2025/12/19/ice-detainee-newark-jail-died/';
    console.log('Loading:', url);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(3000);
    
    const articleContent = await page.evaluate(() => {
      const article = document.querySelector('article') || document.querySelector('.entry-content') || document.body;
      return article.innerText;
    });
    
    console.log('Article length:', articleContent.length);
    fs.writeFileSync(path.join(__dirname, 'nj-monitor-article.txt'), articleContent);
    
    // Extract quotes
    const quotes = articleContent.match(/"[^"]{20,}"/g) || [];
    console.log('Quotes found:', quotes.length);
    quotes.forEach(q => console.log('  -', q.substring(0, 100)));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

async function scrapeNOTUSArticle() {
  console.log('\n🔍 Reading NOTUS article from previous scrape...\n');
  
  const notusPath = path.join(__dirname, 'notus-article.txt');
  if (fs.existsSync(notusPath)) {
    const content = fs.readFileSync(notusPath, 'utf-8');
    console.log('NOTUS content preview:\n');
    console.log(content.substring(0, 3000));
    
    // Extract names and details
    const nameMatches = content.match(/([A-Z][a-zñ]+ (?:[A-Z][a-zñ\-]+\s*)+),?\s*(?:a\s+)?(\d+)(?:-year-old)?/g) || [];
    console.log('\nExtracted names:', nameMatches);
  }
}

async function main() {
  await scrapeGuardianDeathTimeline();
  await scrapeAmericanImmigrationCouncil();
  await scrapeNewJerseyMonitor();
  await scrapeNOTUSArticle();
  
  console.log('\n✅ All scraping complete!');
}

main();
