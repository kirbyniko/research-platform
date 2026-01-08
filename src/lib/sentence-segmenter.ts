// Sentence segmentation with character offsets
// Splits text into sentences while preserving exact positions

export interface Sentence {
  text: string;
  startChar: number;
  endChar: number;
  index: number;
}

// Common abbreviations that don't end sentences
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'inc', 'ltd', 'corp',
  'st', 'ave', 'blvd', 'rd', 'apt', 'no', 'vol', 'rev', 'gen', 'col', 'lt', 'sgt',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  'i.e', 'e.g', 'cf', 'al', 'u.s', 'u.s.a', 'a.m', 'p.m'
]);

// Regex patterns for sentence boundaries
const SENTENCE_ENDERS = /[.!?]+/;
const QUOTE_PATTERN = /["'"']/;

export function segmentSentences(text: string): Sentence[] {
  const sentences: Sentence[] = [];
  let currentStart = 0;
  let index = 0;
  
  // Skip leading whitespace
  while (currentStart < text.length && /\s/.test(text[currentStart])) {
    currentStart++;
  }
  
  let i = currentStart;
  
  while (i < text.length) {
    const char = text[i];
    
    // Check for sentence-ending punctuation
    if (SENTENCE_ENDERS.test(char)) {
      // Look back to check for abbreviation
      const beforePunct = text.slice(Math.max(0, i - 10), i);
      const wordMatch = beforePunct.match(/\b(\w+)\.?$/);
      const lastWord = wordMatch ? wordMatch[1].toLowerCase() : '';
      
      // Check if this is an abbreviation
      if (ABBREVIATIONS.has(lastWord) || ABBREVIATIONS.has(lastWord + '.')) {
        i++;
        continue;
      }
      
      // Check for multiple punctuation (e.g., "..." or "?!")
      let punctEnd = i + 1;
      while (punctEnd < text.length && SENTENCE_ENDERS.test(text[punctEnd])) {
        punctEnd++;
      }
      
      // Check for closing quote after punctuation
      if (punctEnd < text.length && QUOTE_PATTERN.test(text[punctEnd])) {
        punctEnd++;
      }
      
      // Check if followed by space and capital letter (or end of text)
      const afterPunct = text.slice(punctEnd, punctEnd + 5);
      const isEndOfSentence = 
        punctEnd >= text.length ||
        /^\s+[A-Z"']/.test(afterPunct) ||
        /^\s*\n/.test(afterPunct);
      
      if (isEndOfSentence) {
        // Found sentence boundary
        const sentenceText = text.slice(currentStart, punctEnd).trim();
        
        if (sentenceText.length > 0) {
          sentences.push({
            text: sentenceText,
            startChar: currentStart,
            endChar: punctEnd,
            index: index++
          });
        }
        
        // Move to start of next sentence
        currentStart = punctEnd;
        while (currentStart < text.length && /\s/.test(text[currentStart])) {
          currentStart++;
        }
        i = currentStart;
        continue;
      }
    }
    
    // Check for paragraph break (double newline)
    if (char === '\n' && i + 1 < text.length && text[i + 1] === '\n') {
      const sentenceText = text.slice(currentStart, i).trim();
      
      if (sentenceText.length > 0) {
        sentences.push({
          text: sentenceText,
          startChar: currentStart,
          endChar: i,
          index: index++
        });
      }
      
      // Skip whitespace
      currentStart = i + 2;
      while (currentStart < text.length && /\s/.test(text[currentStart])) {
        currentStart++;
      }
      i = currentStart;
      continue;
    }
    
    i++;
  }
  
  // Handle remaining text
  const remaining = text.slice(currentStart).trim();
  if (remaining.length > 0) {
    sentences.push({
      text: remaining,
      startChar: currentStart,
      endChar: text.length,
      index: index++
    });
  }
  
  return sentences;
}

// Get surrounding context for a sentence
export function getSurroundingContext(
  sentences: Sentence[],
  sentenceIndex: number,
  contextSentences: number = 2
): { before: string; after: string } {
  const beforeSentences = sentences
    .slice(Math.max(0, sentenceIndex - contextSentences), sentenceIndex)
    .map(s => s.text)
    .join(' ');
  
  const afterSentences = sentences
    .slice(sentenceIndex + 1, sentenceIndex + 1 + contextSentences)
    .map(s => s.text)
    .join(' ');
  
  return {
    before: beforeSentences,
    after: afterSentences
  };
}

// Merge consecutive sentences (for expanding quote boundaries)
export function mergeSentences(sentences: Sentence[], startIndex: number, endIndex: number): Sentence {
  const start = sentences[startIndex];
  const end = sentences[endIndex];
  
  return {
    text: sentences.slice(startIndex, endIndex + 1).map(s => s.text).join(' '),
    startChar: start.startChar,
    endChar: end.endChar,
    index: startIndex
  };
}
