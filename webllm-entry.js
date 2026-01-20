/**
 * WebLLM Entry Point for Bundling
 * Exports WebLLM to window.webllm for use in Chrome extension
 */
import * as WebLLM from '@mlc-ai/web-llm';

// Export to window for extension access
if (typeof window !== 'undefined') {
  window.webllm = WebLLM;
}

export * from '@mlc-ai/web-llm';
export default WebLLM;
