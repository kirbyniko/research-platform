'use client';

import { useState, useRef, useEffect } from 'react';
import { useTemplateAI } from '@/hooks/useTemplateAI';
import { DisplayTemplate } from '@/types/templates';
import { FieldDefinition } from '@/types/platform';

interface TemplateAIAssistantProps {
  fields: FieldDefinition[];
  enabledDataTypes: { quotes: boolean; sources: boolean; media: boolean };
  onTemplateGenerated: (template: DisplayTemplate) => void;
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  'Create a simple layout with the image on the right and details on the left',
  'Make a hero banner with the name and photo, then list other fields below',
  'Two-column grid layout with dates and basic info',
  'Compact layout with minimal spacing',
  'Put the main image at the top, followed by a sidebar layout',
];

export function TemplateAIAssistant({
  fields,
  enabledDataTypes,
  onTemplateGenerated,
  isOpen,
  onClose,
}: TemplateAIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [useAI, setUseAI] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const {
    state,
    isWebGPUSupported,
    generate,
    reset,
  } = useTemplateAI({
    fields,
    enabledDataTypes,
    onTemplateGenerated: (template) => {
      console.log('[AIAssistant] Template generated, calling parent callback');
      onTemplateGenerated(template);
      const itemCount = template.sections.reduce((sum, s) => sum + s.items.length, 0);
      setHistory(h => [...h, {
        role: 'assistant',
        content: `✓ Template created with ${template.sections.length} section(s) and ${itemCount} field(s). The layout has been applied to the editor. Close this window to see the result.`,
      }]);
    },
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || state.status === 'generating' || state.status === 'loading-model') return;

    const userPrompt = prompt.trim();
    setPrompt('');
    setHistory(h => [...h, { role: 'user', content: userPrompt }]);

    try {
      await generate(userPrompt, useAI && isWebGPUSupported === true);
    } catch (error) {
      setHistory(h => [...h, {
        role: 'assistant',
        content: `⚠ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }]);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  const isProcessing = state.status === 'generating' || state.status === 'loading-model' || state.status === 'validating';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">✨</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Template Assistant</h2>
              <p className="text-sm text-gray-500">
                Describe how you want your records to look
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* WebGPU Status / AI Toggle */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isWebGPUSupported === true ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-600">WebGPU available</span>
              </>
            ) : isWebGPUSupported === false ? (
              <>
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-gray-600">WebGPU not available - using smart templates</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                <span className="text-gray-600">Checking GPU support...</span>
              </>
            )}
          </div>
          {isWebGPUSupported && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-gray-600">Use AI (slower but smarter)</span>
            </label>
          )}
        </div>

        {/* Available Fields Summary */}
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <details className="text-sm">
            <summary className="cursor-pointer text-blue-700 font-medium">
              {fields.length} fields available
              {enabledDataTypes.quotes && ', quotes'}
              {enabledDataTypes.sources && ', sources'}
              {enabledDataTypes.media && ', media'}
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1 text-blue-600 text-xs">
              {fields.map(f => (
                <div key={f.id} className="truncate" title={f.help_text || f.name}>
                  <span className="font-mono">{f.slug}</span>
                  <span className="text-blue-400 ml-1">({f.field_type})</span>
                </div>
              ))}
            </div>
          </details>
        </div>

        {/* Chat History */}
        <div ref={historyRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                Describe your ideal layout and I'll create a template for you.
              </p>
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Try these examples:</p>
                {EXAMPLE_PROMPTS.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(example)}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            history.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.content.startsWith('⚠')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{state.message || 'Processing...'}</span>
                </div>
                {state.status === 'loading-model' && (
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your layout... (e.g., 'Put the photo on the right, name large on top')"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isProcessing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                'Generate'
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
