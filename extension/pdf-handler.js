// ICE Deaths Research Assistant - PDF Handler
// Uses PDF.js to extract text from PDFs viewed in browser

// PDF.js is loaded from CDN when needed
let pdfjsLib = null;

// Initialize PDF.js library
async function initPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  
  return new Promise((resolve, reject) => {
    // Load PDF.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      pdfjsLib = window.pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

// Extract text from PDF with page numbers
async function extractPdfText(pdfUrl) {
  try {
    await initPdfJs();
    
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    const pages = [];
    const sentences = [];
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items into page text
      let pageText = '';
      let lastY = null;
      
      textContent.items.forEach(item => {
        // Add newline if Y position changed significantly
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        lastY = item.transform[5];
      });
      
      pages.push({
        pageNumber: pageNum,
        text: pageText.trim()
      });
      
      // Split page text into sentences with page number
      const pageSentences = splitIntoSentences(pageText);
      pageSentences.forEach(sentence => {
        sentences.push({
          text: sentence,
          pageNumber: pageNum
        });
      });
    }
    
    return {
      pageCount,
      pages,
      sentences,
      url: pdfUrl,
      title: getPdfTitle(pdfUrl)
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}

// Split text into sentences
function splitIntoSentences(text) {
  if (!text) return [];
  
  return text
    .replace(/\n\n+/g, ' ')
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter out short fragments
}

// Get PDF title from URL
function getPdfTitle(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    return decodeURIComponent(filename.replace('.pdf', '').replace(/-/g, ' '));
  } catch {
    return 'PDF Document';
  }
}

// Check if current page is viewing a PDF
function isPdfViewer() {
  const url = window.location.href.toLowerCase();
  
  // Direct PDF URL
  if (url.endsWith('.pdf')) return true;
  
  // Chrome PDF viewer
  if (document.querySelector('embed[type="application/pdf"]')) return true;
  
  // PDF.js viewer
  if (document.querySelector('#viewer.pdfViewer')) return true;
  
  // Firefox PDF viewer
  if (document.contentType === 'application/pdf') return true;
  
  return false;
}

// Get the PDF URL from current page
function getPdfUrl() {
  const url = window.location.href;
  
  // Direct PDF URL
  if (url.toLowerCase().endsWith('.pdf')) return url;
  
  // Chrome PDF viewer embed
  const embed = document.querySelector('embed[type="application/pdf"]');
  if (embed && embed.src) return embed.src;
  
  // PDF.js viewer - check for download link or data attribute
  const downloadLink = document.querySelector('a[download][href$=".pdf"]');
  if (downloadLink) return downloadLink.href;
  
  return url;
}

// Get text selection from PDF viewer
function getPdfSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const text = selection.toString().trim();
  if (!text) return null;
  
  // Try to determine page number from selection
  let pageNumber = null;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  
  // Look for page container
  let pageElement = container.nodeType === 1 ? container : container.parentElement;
  while (pageElement && !pageElement.dataset.pageNumber) {
    pageElement = pageElement.parentElement;
  }
  
  if (pageElement && pageElement.dataset.pageNumber) {
    pageNumber = parseInt(pageElement.dataset.pageNumber);
  }
  
  return {
    text,
    pageNumber,
    isPdf: true
  };
}

// Export functions for use by content script
window.ICEDeathsPdfHandler = {
  isPdfViewer,
  getPdfUrl,
  extractPdfText,
  getPdfSelection
};
