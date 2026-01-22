/**
 * Content Script
 * Handles page extraction and context menu text selection
 */

(function() {
  'use strict';

  // Track current selection for context menus
  let currentSelection = '';

  /**
   * Listen for selection changes
   */
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    currentSelection = selection ? selection.toString().trim() : '';
  });

  /**
   * Message handler for communication with background/sidepanel
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'getSelection':
        sendResponse({ selection: currentSelection });
        break;

      case 'getPageInfo':
        sendResponse(extractPageInfo());
        break;

      case 'extractContent':
        sendResponse(extractContent(request.options));
        break;

      case 'highlightText':
        highlightText(request.text);
        sendResponse({ success: true });
        break;

      case 'ping':
        sendResponse({ status: 'alive' });
        break;

      default:
        sendResponse({ error: 'Unknown action' });
    }
    return true; // Keep message channel open for async
  });

  /**
   * Extract basic page information
   */
  function extractPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract page content with various strategies
   */
  function extractContent(options = {}) {
    const result = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      timestamp: new Date().toISOString(),
      content: '',
      contentType: 'unknown',
      metadata: {}
    };

    // Try to detect content type and use appropriate extractor
    const domain = window.location.hostname.toLowerCase();
    
    // Site-specific extractors
    if (domain.includes('nytimes.com')) {
      Object.assign(result, extractNYTimes());
    } else if (domain.includes('washingtonpost.com')) {
      Object.assign(result, extractWashingtonPost());
    } else if (domain.includes('cnn.com')) {
      Object.assign(result, extractCNN());
    } else if (domain.includes('bbc.com') || domain.includes('bbc.co.uk')) {
      Object.assign(result, extractBBC());
    } else if (domain.includes('theguardian.com')) {
      Object.assign(result, extractGuardian());
    } else if (domain.includes('reuters.com')) {
      Object.assign(result, extractReuters());
    } else if (domain.includes('apnews.com')) {
      Object.assign(result, extractAPNews());
    } else if (domain.includes('.gov')) {
      Object.assign(result, extractGovSite());
    } else {
      // Generic extraction
      Object.assign(result, extractGeneric());
    }

    // Extract metadata
    result.metadata = extractMetadata();

    // Split into sentences if requested
    if (options.splitSentences) {
      result.sentences = splitIntoSentences(result.content);
    }

    return result;
  }

  /**
   * Generic content extraction
   */
  function extractGeneric() {
    // Try common article selectors
    const selectors = [
      'article',
      '[role="main"]',
      'main',
      '.article-content',
      '.article-body',
      '.post-content',
      '.entry-content',
      '.story-body',
      '.content-body',
      '#article-body',
      '.article__body'
    ];

    let content = '';
    let contentType = 'generic';

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = cleanText(element);
        contentType = 'article';
        break;
      }
    }

    // Fallback to body content
    if (!content) {
      content = cleanText(document.body);
      contentType = 'page';
    }

    return { content, contentType };
  }

  /**
   * NYTimes extractor
   */
  function extractNYTimes() {
    const article = document.querySelector('article[data-testid="article"]') ||
                   document.querySelector('article');
    
    if (article) {
      // Get paragraphs
      const paragraphs = article.querySelectorAll('p[class*="paragraph"]');
      const content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(t => t.length > 0)
        .join('\n\n');
      
      return { content, contentType: 'news-article' };
    }
    
    return extractGeneric();
  }

  /**
   * Washington Post extractor
   */
  function extractWashingtonPost() {
    const article = document.querySelector('[data-qa="article-body"]') ||
                   document.querySelector('article');
    
    if (article) {
      const paragraphs = article.querySelectorAll('p');
      const content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(t => t.length > 20)
        .join('\n\n');
      
      return { content, contentType: 'news-article' };
    }
    
    return extractGeneric();
  }

  /**
   * CNN extractor
   */
  function extractCNN() {
    const article = document.querySelector('.article__content') ||
                   document.querySelector('[data-zone="content"]');
    
    if (article) {
      const paragraphs = article.querySelectorAll('p.paragraph');
      const content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(t => t.length > 0)
        .join('\n\n');
      
      return { content, contentType: 'news-article' };
    }
    
    return extractGeneric();
  }

  /**
   * BBC extractor
   */
  function extractBBC() {
    const article = document.querySelector('[data-component="text-block"]')?.closest('article') ||
                   document.querySelector('article');
    
    if (article) {
      const textBlocks = article.querySelectorAll('[data-component="text-block"]');
      if (textBlocks.length > 0) {
        const content = Array.from(textBlocks)
          .map(block => block.textContent.trim())
          .join('\n\n');
        return { content, contentType: 'news-article' };
      }
    }
    
    return extractGeneric();
  }

  /**
   * Guardian extractor
   */
  function extractGuardian() {
    const article = document.querySelector('.article-body-commercial-selector') ||
                   document.querySelector('[data-gu-name="body"]');
    
    if (article) {
      const paragraphs = article.querySelectorAll('p');
      const content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(t => t.length > 20)
        .join('\n\n');
      
      return { content, contentType: 'news-article' };
    }
    
    return extractGeneric();
  }

  /**
   * Reuters extractor
   */
  function extractReuters() {
    const article = document.querySelector('[data-testid="article-body"]') ||
                   document.querySelector('article');
    
    if (article) {
      const paragraphs = article.querySelectorAll('[data-testid^="paragraph-"]');
      const content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .join('\n\n');
      
      return { content, contentType: 'news-article' };
    }
    
    return extractGeneric();
  }

  /**
   * AP News extractor
   */
  function extractAPNews() {
    const article = document.querySelector('.RichTextStoryBody') ||
                   document.querySelector('article');
    
    if (article) {
      const paragraphs = article.querySelectorAll('p');
      const content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(t => t.length > 20)
        .join('\n\n');
      
      return { content, contentType: 'news-article' };
    }
    
    return extractGeneric();
  }

  /**
   * Government site extractor
   */
  function extractGovSite() {
    // Try common government site patterns
    const mainContent = document.querySelector('[role="main"]') ||
                       document.querySelector('main') ||
                       document.querySelector('.main-content') ||
                       document.querySelector('#main-content');
    
    if (mainContent) {
      return { 
        content: cleanText(mainContent), 
        contentType: 'government'
      };
    }
    
    return extractGeneric();
  }

  /**
   * Extract page metadata
   */
  function extractMetadata() {
    const metadata = {};

    // Open Graph
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:type', 'og:site_name', 'og:url'];
    for (const tag of ogTags) {
      const el = document.querySelector(`meta[property="${tag}"]`);
      if (el) {
        metadata[tag.replace('og:', '')] = el.getAttribute('content');
      }
    }

    // Twitter Card
    const twitterTags = ['twitter:title', 'twitter:description', 'twitter:image'];
    for (const tag of twitterTags) {
      const el = document.querySelector(`meta[name="${tag}"]`);
      if (el) {
        metadata[tag.replace('twitter:', 'twitter_')] = el.getAttribute('content');
      }
    }

    // Article metadata
    const articleMeta = ['author', 'article:author', 'article:published_time', 'article:modified_time'];
    for (const tag of articleMeta) {
      const el = document.querySelector(`meta[name="${tag}"], meta[property="${tag}"]`);
      if (el) {
        const key = tag.replace('article:', '').replace(':', '_');
        metadata[key] = el.getAttribute('content');
      }
    }

    // Publication date from JSON-LD
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.textContent);
        if (data.datePublished) metadata.datePublished = data.datePublished;
        if (data.dateModified) metadata.dateModified = data.dateModified;
        if (data.author) {
          metadata.author = typeof data.author === 'string' 
            ? data.author 
            : data.author.name || data.author[0]?.name;
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return metadata;
  }

  /**
   * Clean extracted text
   */
  function cleanText(element) {
    // Clone to avoid modifying the actual page
    const clone = element.cloneNode(true);

    // Remove unwanted elements
    const unwanted = clone.querySelectorAll(
      'script, style, nav, header, footer, aside, .ad, .advertisement, ' +
      '.social-share, .related-articles, .comments, [role="navigation"], ' +
      '[role="complementary"], .sidebar, #sidebar'
    );
    unwanted.forEach(el => el.remove());

    // Get text content
    let text = clone.textContent || clone.innerText || '';

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return text;
  }

  /**
   * Split text into sentences
   */
  function splitIntoSentences(text) {
    if (!text) return [];

    // Common abbreviations to avoid splitting on
    const abbreviations = [
      'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'vs', 'etc', 'Inc',
      'Ltd', 'Corp', 'Co', 'Gen', 'Sen', 'Rep', 'Gov', 'Pres', 'Rev',
      'Capt', 'Col', 'Lt', 'Sgt', 'U.S', 'U.N'
    ];

    // Replace abbreviations with placeholders
    let processed = text;
    const placeholders = {};
    abbreviations.forEach((abbr, i) => {
      const regex = new RegExp(`\\b${abbr}\\.`, 'g');
      const placeholder = `__ABBR${i}__`;
      placeholders[placeholder] = `${abbr}.`;
      processed = processed.replace(regex, placeholder);
    });

    // Split on sentence-ending punctuation
    const sentences = processed.split(/(?<=[.!?])\s+/);

    // Restore abbreviations and clean up
    return sentences
      .map(s => {
        let restored = s.trim();
        Object.entries(placeholders).forEach(([ph, orig]) => {
          restored = restored.replace(new RegExp(ph, 'g'), orig);
        });
        return restored;
      })
      .filter(s => s.length > 10); // Filter out very short fragments
  }

  /**
   * Highlight specific text on the page
   */
  function highlightText(text) {
    if (!text) return;

    // Remove existing highlights
    document.querySelectorAll('.research-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });

    // Add styles if not present
    if (!document.getElementById('research-highlight-styles')) {
      const style = document.createElement('style');
      style.id = 'research-highlight-styles';
      style.textContent = `
        .research-highlight {
          background-color: #fff59d !important;
          padding: 2px 0 !important;
          border-radius: 2px !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Find and highlight
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (const node of textNodes) {
      const idx = node.textContent.indexOf(text);
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + text.length);

        const highlight = document.createElement('span');
        highlight.className = 'research-highlight';
        range.surroundContents(highlight);

        // Scroll into view
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  }

  // Signal that content script is loaded
  console.log('[Research Platform] Content script loaded');
})();
