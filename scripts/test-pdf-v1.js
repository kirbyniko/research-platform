// Test PDF parsing with pdf-parse 1.x
const fs = require('fs');
const path = require('path');

async function testPdfParse() {
  try {
    console.log('Testing pdf-parse 1.x...');
    const pdfParse = require('pdf-parse');
    console.log('Type of pdfParse:', typeof pdfParse);
    
    if (typeof pdfParse !== 'function') {
      console.log('❌ pdfParse is not a function');
      return;
    }
    
    console.log('✅ pdf-parse imported as function');
    
    // Create a minimal test with a buffer
    // We can try with an existing PDF if one exists
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
      if (files.length > 0) {
        const testFile = path.join(uploadsDir, files[0]);
        console.log('Testing with:', testFile);
        const buffer = fs.readFileSync(testFile);
        const result = await pdfParse(buffer);
        console.log('✅ PDF parsed successfully!');
        console.log('Pages:', result.numpages);
        console.log('Text length:', result.text.length);
        console.log('First 200 chars:', result.text.substring(0, 200));
      } else {
        console.log('No PDF files in uploads/documents, but import works!');
      }
    } else {
      console.log('uploads/documents dir not found, but import works!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testPdfParse();
