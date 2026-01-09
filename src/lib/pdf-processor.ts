import crypto from 'crypto';

// Text item with position from PDF
export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  charStart: number;
  charEnd: number;
}

// Page boundary info
export interface PageOffset {
  page: number;
  startChar: number;
  endChar: number;
}

// Full extraction result
export interface PdfExtractionResult {
  fullText: string;
  pageCount: number;
  pageOffsets: PageOffset[];
  textItems: TextItem[];
  fileHash: string;
}

// Extract text with positions using pdf-parse
// Note: pdf-parse doesn't give us position data, so we'll need to use pdfjs-dist directly
// For now, we'll extract text and calculate approximate positions

export async function extractPdfWithPositions(buffer: Buffer): Promise<PdfExtractionResult> {
  // Calculate file hash for deduplication
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  // Dynamic import to avoid bundling issues
  // pdf-parse 1.x has default export function
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  
  // Parse PDF
  const data = await pdfParse(buffer);
  
  const fullText = data.text;
  const pageCount = data.numpages;
  
  // Since pdf-parse doesn't give us detailed position info,
  // we'll split by common page break patterns and estimate
  const pageTexts = splitByPages(fullText, pageCount);
  
  const pageOffsets: PageOffset[] = [];
  const textItems: TextItem[] = [];
  
  let currentChar = 0;
  
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const pageText = pageTexts[pageNum - 1] || '';
    const startChar = currentChar;
    const endChar = currentChar + pageText.length;
    
    pageOffsets.push({
      page: pageNum,
      startChar,
      endChar
    });
    
    // Create text items for each sentence/line on the page
    const lines = pageText.split(/\n+/);
    let lineChar = startChar;
    let yPosition = 0;
    
    for (const line of lines) {
      if (line.trim()) {
        textItems.push({
          text: line,
          x: 50,  // Default left margin
          y: yPosition,
          width: Math.min(line.length * 6, 500), // Rough estimate
          height: 12,
          page: pageNum,
          charStart: lineChar,
          charEnd: lineChar + line.length
        });
        yPosition += 14; // Line height
      }
      lineChar += line.length + 1; // +1 for newline
    }
    
    currentChar = endChar;
  }
  
  return {
    fullText,
    pageCount,
    pageOffsets,
    textItems,
    fileHash
  };
}

// Split text into pages (best effort since pdf-parse merges everything)
function splitByPages(text: string, pageCount: number): string[] {
  if (pageCount <= 1) {
    return [text];
  }
  
  // Try to find page break markers
  const pageBreakPatterns = [
    /\f/g,  // Form feed
    /Page \d+ of \d+/gi,
    /- \d+ -/g,  // Page numbers like "- 1 -"
  ];
  
  for (const pattern of pageBreakPatterns) {
    const matches = text.split(pattern);
    if (matches.length >= pageCount) {
      return matches.slice(0, pageCount);
    }
  }
  
  // Fall back to roughly equal chunks
  const chunkSize = Math.ceil(text.length / pageCount);
  const chunks: string[] = [];
  
  for (let i = 0; i < pageCount; i++) {
    const start = i * chunkSize;
    const end = Math.min((i + 1) * chunkSize, text.length);
    
    // Try to break at paragraph boundary
    let adjustedEnd = end;
    if (i < pageCount - 1) {
      const nextParagraph = text.indexOf('\n\n', end - 100);
      if (nextParagraph !== -1 && nextParagraph < end + 100) {
        adjustedEnd = nextParagraph;
      }
    }
    
    chunks.push(text.slice(start, adjustedEnd));
  }
  
  return chunks;
}

// Get the page number for a given character offset
export function getPageForChar(charIndex: number, pageOffsets: PageOffset[]): number {
  for (const offset of pageOffsets) {
    if (charIndex >= offset.startChar && charIndex < offset.endChar) {
      return offset.page;
    }
  }
  return 1; // Default to first page
}

// Get bounding boxes for a character range (for highlighting)
export function getBoundingBoxesForRange(
  startChar: number,
  endChar: number,
  textItems: TextItem[]
): Array<{ page: number; x: number; y: number; width: number; height: number }> {
  const boxes: Array<{ page: number; x: number; y: number; width: number; height: number }> = [];
  
  for (const item of textItems) {
    // Check if this text item overlaps with the range
    if (item.charEnd > startChar && item.charStart < endChar) {
      boxes.push({
        page: item.page,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
      });
    }
  }
  
  return boxes;
}
