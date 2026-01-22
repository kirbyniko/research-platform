const fs = require('fs');
const path = require('path');

const srcDir = 'c:/Users/nikow/research-platform/extension-v2';
const destDir = 'c:/Users/nikow/research-platform/extension-dist';

// Ensure dest directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Copy directory recursively
function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy all files from extension-v2 to extension-dist
copyDir(srcDir, destDir);

console.log('Files copied successfully');
