'use client';

import { useState, useEffect } from 'react';

interface OllamaStatus {
  available: boolean;
  installedModels?: Array<{ name: string; size: number; modified: string }>;
  recommendations?: string[];
  error?: string;
  installUrl?: string;
}

interface AnalysisResult {
  timeline?: Array<{
    date: string;
    event: string;
    quote: string;
    quote_context: string;
  }>;
  quotes?: Array<{
    quote: string;
    quote_context: string;
    category: string;
  }>;
  error?: string;
}

interface DocumentAnalyzerProps {
  caseId: string;
  onComplete?: (result: AnalysisResult) => void;
}

export default function DocumentAnalyzer({ caseId, onComplete }: DocumentAnalyzerProps) {
  const [document, setDocument] = useState('');
  const [analysisType, setAnalysisType] = useState<'timeline' | 'quotes' | 'both'>('both');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [vram, setVram] = useState<number>(8);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfMeta, setPdfMeta] = useState<{ pages: number; chars: number } | null>(null);

  console.log('[DocumentAnalyzer] Rendering for case ID:', caseId);

  useEffect(() => {
    checkOllamaStatus();
  }, [vram]);

  const checkOllamaStatus = async () => {
    try {
      const response = await fetch(`/api/ollama?vram=${vram}`);

      if (response.ok) {
        const data = await response.json();
        setOllamaStatus(data);
        
        // Auto-select first installed model if available
        if (data.installedModels && data.installedModels.length > 0 && !selectedModel) {
          setSelectedModel(data.installedModels[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to check Ollama status:', err);
    }
  };

  const handleDownloadModel = async (model: string) => {
    setDownloading(true);
    setError('');

    try {
      const response = await fetch('/api/ollama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'pull', model }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setTimeout(checkOllamaStatus, 5000); // Refresh after 5s
      } else {
        const data = await response.json();
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!document.trim()) {
      setError('Please paste the document text');
      return;
    }

    setAnalyzing(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document,
          caseId,
          analysisType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
      
      if (onComplete) {
        onComplete(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Handle PDF files
    if (file.type === 'application/pdf') {
      setAnalyzing(true);
      setError('');
      
      try {
        const formData = new FormData();
        formData.append('file', file);

        const url = URL.createObjectURL(file);
        setPdfUrl(url);

        console.log('[DocumentAnalyzer] Uploading PDF');

        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload PDF');
        }

        const data = await response.json();
        setDocument(data.text);
        setPdfMeta({ pages: data.pages || 0, chars: data.text?.length || 0 });
        console.log(`PDF parsed: ${data.pages} pages, ${data.text.length} characters`);
      } catch (err: any) {
        setError(err.message || 'Failed to parse PDF');
      } finally {
        setAnalyzing(false);
      }
      return;
    }

    // Handle text files
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDocument(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h3 className="font-medium">AI Document Analyzer</h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload or paste a death report document. AI will extract quotes and timeline events.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Ollama Status */}
        {ollamaStatus && (
          <div className={`p-3 border rounded ${ollamaStatus.available ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
            {ollamaStatus.available ? (
              <div>
                <p className="text-sm font-medium text-green-800">✓ Ollama Running Locally</p>
                <p className="text-xs text-green-700 mt-1">
                  {ollamaStatus.installedModels?.length || 0} models installed
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-yellow-800">⚠ Ollama Not Running</p>
                <p className="text-xs text-yellow-700 mt-1">{ollamaStatus.error}</p>
                <div className="mt-3 p-3 bg-white/50 rounded text-xs space-y-2">
                  <p className="font-medium text-yellow-900">To use AI document analysis:</p>
                  <ol className="list-decimal list-inside space-y-1 text-yellow-800">
                    <li>
                      <a 
                        href="https://ollama.ai/download" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-yellow-900"
                      >
                        Download & install Ollama
                      </a>
                      {' '}(free, runs locally)
                    </li>
                    <li>Open a terminal and run: <code className="bg-yellow-100 px-1 rounded">ollama pull llama3.2</code></li>
                    <li>Keep Ollama running in the background</li>
                    <li>Refresh this page</li>
                  </ol>
                  <p className="text-yellow-700 mt-2">
                    💡 Ollama runs AI models on your own computer — your documents stay private and it&apos;s completely free.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VRAM Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Your VRAM (GB)</label>
          <input
            type="number"
            value={vram}
            onChange={(e) => setVram(Number(e.target.value))}
            min="4"
            max="48"
            step="4"
            className="w-full border border-gray-300 p-2 text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            This helps recommend models that will run on your GPU
          </p>
        </div>

        {/* Model Selection */}
        {ollamaStatus?.available && (
          <div>
            <label className="block text-sm font-medium mb-2">Select Model</label>
            
            {/* Installed Models */}
            {ollamaStatus.installedModels && ollamaStatus.installedModels.length > 0 ? (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-1">Installed:</p>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-sm"
                >
                  {ollamaStatus.installedModels.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name} ({(model.size / 1024 / 1024 / 1024).toFixed(1)} GB)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-3">No models installed yet</p>
            )}

            {/* Recommended Models */}
            {ollamaStatus.recommendations && ollamaStatus.recommendations.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-2">
                  Recommended for {vram}GB VRAM:
                </p>
                <div className="space-y-2">
                  {ollamaStatus.recommendations.map((model) => {
                    const isInstalled = ollamaStatus.installedModels?.some(m => m.name === model);
                    return (
                      <div key={model} className="flex items-center justify-between bg-gray-50 p-2 text-sm">
                        <span className="font-mono">{model}</span>
                        {isInstalled ? (
                          <span className="text-xs text-green-600">✓ Installed</span>
                        ) : (
                          <button
                            onClick={() => handleDownloadModel(model)}
                            disabled={downloading}
                            className="text-xs underline hover:no-underline disabled:opacity-50"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Upload Death Report Document</label>
          <input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
            disabled={analyzing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:text-sm file:bg-gray-50 hover:file:bg-gray-100 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepts PDF, TXT, or MD files. PDFs will be automatically extracted.
          </p>
          {pdfMeta && (
            <p className="text-xs text-gray-600 mt-1">Parsed {pdfMeta.pages} pages, {pdfMeta.chars.toLocaleString()} characters</p>
          )}
        </div>

        {/* PDF Preview */}
        {pdfUrl && (
          <div className="border border-gray-200">
            <div className="bg-gray-50 text-xs text-gray-600 px-3 py-2">PDF Preview</div>
            <div className="h-96">
              <iframe src={pdfUrl} title="PDF Preview" className="w-full h-full" />
            </div>
          </div>
        )}
        

        {/* Text Area */}
        <div>
          <label className="block text-sm font-medium mb-2">Or Paste Document Text</label>
          <textarea
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="Paste the death report text here..."
            rows={10}
            className="w-full border border-gray-300 p-3 text-sm font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            {document.length.toLocaleString()} characters
          </p>
        </div>

        {/* Analysis Type */}
        <div>
          <label className="block text-sm font-medium mb-2">What to Extract</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="timeline"
                checked={analysisType === 'timeline'}
                onChange={(e) => setAnalysisType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Timeline Events Only</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="quotes"
                checked={analysisType === 'quotes'}
                onChange={(e) => setAnalysisType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Quotes Only</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="both"
                checked={analysisType === 'both'}
                onChange={(e) => setAnalysisType(e.target.value as any)}
                className="mr-2"
              />
              <span className="text-sm">Both Timeline & Quotes</span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !document.trim()}
          className="w-full bg-black text-white py-2 px-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {analyzing ? 'Analyzing...' : 'Analyze Document'}
        </button>

        {/* Results */}
        {result && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h4 className="font-medium mb-3">Analysis Results</h4>
            
            {result.timeline && result.timeline.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium mb-2">Timeline Events ({result.timeline.length})</h5>
                <div className="space-y-3">
                  {result.timeline.map((event, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 text-sm">
                      <p className="font-medium">{event.date}</p>
                      <p className="mt-1">{event.event}</p>
                      {event.quote && event.quote.trim().length > 0 && (
                        <blockquote className="mt-2 pl-3 border-l-2 border-gray-300 text-gray-600 italic">
                          "{event.quote}"
                        </blockquote>
                      )}
                      {event.quote_context && (
                        <p className="mt-1 text-xs text-gray-500">{event.quote_context}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.quotes && result.quotes.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Extracted Quotes ({result.quotes.length})</h5>
                <div className="space-y-3">
                  {result.quotes.filter(q => q.quote && q.quote.trim().length > 0).map((quote, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 text-sm">
                      <blockquote className="italic text-gray-700">
                        "{quote.quote}"
                      </blockquote>
                      <p className="mt-1 text-xs text-gray-600">{quote.quote_context}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.error && (
              <p className="text-sm text-red-600">{result.error}</p>
            )}

            <p className="text-xs text-gray-500 mt-4 border-t border-gray-200 pt-3">
              ⚠️ AI-extracted data must be manually verified before publishing. Review each quote and date for accuracy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
