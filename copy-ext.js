const fs = require('fs');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/sidepanel.js', 'c:/Users/nikow/IceDeaths/extension-dist/sidepanel.js');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/sidepanel.html', 'c:/Users/nikow/IceDeaths/extension-dist/sidepanel.html');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/background.js', 'c:/Users/nikow/IceDeaths/extension-dist/background.js');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/content.js', 'c:/Users/nikow/IceDeaths/extension-dist/content.js');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/field-registry.js', 'c:/Users/nikow/IceDeaths/extension-dist/field-registry.js');
fs.copyFileSync('c:/Users/nikow/IceDeaths/extension/type-field-definitions.js', 'c:/Users/nikow/IceDeaths/extension-dist/type-field-definitions.js');
console.log('Files copied successfully');
