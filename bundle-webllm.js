/**
 * Bundle WebLLM for Chrome Extension
 * This creates a browser-compatible bundle that can be loaded directly
 */
const { build } = require('esbuild');
const path = require('path');

async function bundle() {
  try {
    await build({
      entryPoints: [path.join(__dirname, 'webllm-entry.js')],
      bundle: true,
      outfile: path.join(__dirname, 'extension', 'webllm.bundle.js'),
      format: 'iife',
      globalName: 'webllm',
      platform: 'browser',
      target: ['chrome100'],
      minify: false,
      sourcemap: false,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      external: [],
      // Handle dynamic imports
      splitting: false,
    });
    console.log('WebLLM bundled successfully to extension/webllm.bundle.js');
  } catch (error) {
    console.error('Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
