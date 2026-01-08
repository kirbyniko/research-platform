// Test PDF parsing with PDFParse class
const fs = require('fs');
const path = require('path');

async function testPdfParse() {
  try {
    console.log('Testing pdf-parse PDFParse class...');
    const pdfParseModule = await import('pdf-parse');
    const PDFParse = pdfParseModule.PDFParse;
    
    console.log('PDFParse:', typeof PDFParse);
    
    if (!PDFParse) {
      console.log('❌ PDFParse class not found');
      return;
    }
    
    const parser = new PDFParse();
    console.log('✅ Created parser instance');
    console.log('Parser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
    
    // Check if loadPDF exists
    if (typeof parser.loadPDF !== 'function') {
      console.log('❌ loadPDF is not a function');
      console.log('Available methods:', Object.keys(parser));
      return;
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPdfParse();
