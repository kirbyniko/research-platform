const fs = require('fs');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/sidepanel.js', 'c:/Users/nikow/IceDeaths/extension-dist/sidepanel.js');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/sidepanel.html', 'c:/Users/nikow/IceDeaths/extension-dist/sidepanel.html');
console.log('Files copied successfully');
