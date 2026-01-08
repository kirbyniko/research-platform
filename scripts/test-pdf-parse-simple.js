// Test PDF parsing
const fs = require('fs');
const path = require('path');

async function testPdfParse() {
  try {
    console.log('Testing pdf-parse import...');
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    console.log('✅ pdf-parse imported successfully');
    console.log('Type of pdfParse:', typeof pdfParse);
    
    // Check if it's a function
    if (typeof pdfParse !== 'function') {
      console.log('❌ pdfParse is not a function!');
      console.log('Module keys:', Object.keys(pdfParseModule));
      console.log('pdfParse value:', pdfParse);
      return;
    }
    
    // Try to create a minimal PDF buffer
    console.log('\nTesting with a test file...');
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
    
    if (files.length === 0) {
      console.log('No PDF files found in uploads/documents/');
      console.log('The upload itself may have failed before getting here.');
    } else {
      const testFile = path.join(uploadsDir, files[0]);
      console.log('Testing with:', testFile);
      const buffer = fs.readFileSync(testFile);
      const result = await pdfParse(buffer);
      console.log('✅ PDF parsed successfully!');
      console.log('Pages:', result.numpages);
      console.log('Text length:', result.text.length);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPdfParse();
