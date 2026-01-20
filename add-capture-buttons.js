const fs = require('fs');

let html = fs.readFileSync('extension/sidepanel.html', 'utf8');

// Find all quote-picker-dropdown blocks and add the capture button
const regex = /(<div class="quote-picker-search">[\s\S]*?<\/div>)\s*(<div class="quote-picker-list" data-field="([^"]+)">)/g;

html = html.replace(regex, (match, searchDiv, listDiv, fieldName) => {
  return `${searchDiv}
              <div class="quote-picker-capture">
                <button type="button" class="quote-picker-capture-btn" data-field="${fieldName}">
                  ✨ Capture Quote from Page
                </button>
              </div>
              ${listDiv}`;
});

fs.writeFileSync('extension/sidepanel.html', html);
console.log('Added capture buttons to all quote picker dropdowns');
