'use client';

import React, { useState, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FieldAnalysis {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  uniqueValues?: number;
  sampleValues?: unknown[];
  min?: number;
  max?: number;
  dateRange?: { earliest: string; latest: string };
  nullCount: number;
  totalCount: number;
}

export interface DataAnalysis {
  totalRecords: number;
  fields: FieldAnalysis[];
  suggestedVisualizations: VisualizationSuggestion[];
  dataStory?: string;
}

export interface VisualizationSuggestion {
  type: 'dotGrid' | 'humanGrid' | 'counter' | 'timeline' | 'comparison' | 'barChart';
  title: string;
  description: string;
  config: Record<string, unknown>;
  score: number; // 0-100 confidence score
  rationale: string;
}

export interface AIGeneratedInfographic {
  title: string;
  description: string;
  scenes: AIGeneratedScene[];
  theme: 'light' | 'dark';
  estimatedImpact: string;
}

/**
 * Data binding defines how a visualization gets its data from the actual records.
 */
export interface AIDataBinding {
  type: 'count' | 'sum' | 'average' | 'field' | 'groupBy' | 'records';
  field?: string;
  filter?: Record<string, unknown>;
  limit?: number;
}

export interface AIGeneratedScene {
  id: string;
  narrativeText: string;
  narrativeSubtext?: string;
  visualizationType: string;
  visualizationConfig: Record<string, unknown>;
  /** Data binding - how this scene gets data from actual records */
  dataBinding?: AIDataBinding;
  filterRecords?: Record<string, unknown>;
  highlightRecordIds?: number[];
  emotionalTone: 'neutral' | 'somber' | 'urgent' | 'hopeful';
}

// ============================================================================
// Data Analysis Utilities
// ============================================================================

export function analyzeData(data: Record<string, unknown>[]): DataAnalysis {
  if (!data.length) {
    return { totalRecords: 0, fields: [], suggestedVisualizations: [] };
  }
  
  const fields: FieldAnalysis[] = [];
  const sampleRecord = data[0];
  
  // Analyze each field
  Object.keys(sampleRecord).forEach(fieldName => {
    const values = data.map(r => r[fieldName]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    
    // Determine type
    const sampleValue = nonNullValues[0];
    let type: FieldAnalysis['type'] = 'string';
    
    if (typeof sampleValue === 'number') {
      type = 'number';
    } else if (typeof sampleValue === 'boolean') {
      type = 'boolean';
    } else if (Array.isArray(sampleValue)) {
      type = 'array';
    } else if (typeof sampleValue === 'object') {
      type = 'object';
    } else if (typeof sampleValue === 'string') {
      // Check if date
      const datePattern = /^\d{4}-\d{2}-\d{2}/;
      if (datePattern.test(sampleValue)) {
        type = 'date';
      }
    }
    
    const analysis: FieldAnalysis = {
      name: fieldName,
      type,
      nullCount: values.length - nonNullValues.length,
      totalCount: values.length
    };
    
    // Type-specific analysis
    if (type === 'number') {
      const nums = nonNullValues as number[];
      analysis.min = Math.min(...nums);
      analysis.max = Math.max(...nums);
    } else if (type === 'date') {
      const dates = nonNullValues as string[];
      const sorted = dates.sort();
      analysis.dateRange = {
        earliest: sorted[0],
        latest: sorted[sorted.length - 1]
      };
    } else if (type === 'string') {
      const uniqueSet = new Set(nonNullValues as string[]);
      analysis.uniqueValues = uniqueSet.size;
      analysis.sampleValues = Array.from(uniqueSet).slice(0, 5);
    }
    
    fields.push(analysis);
  });
  
  // Generate visualization suggestions based on data shape
  const suggestions = generateVisualizationSuggestions(data, fields);
  
  return {
    totalRecords: data.length,
    fields,
    suggestedVisualizations: suggestions
  };
}

function generateVisualizationSuggestions(
  data: Record<string, unknown>[],
  fields: FieldAnalysis[]
): VisualizationSuggestion[] {
  const suggestions: VisualizationSuggestion[] = [];
  
  // Find categorical fields (good for coloring)
  const categoricalFields = fields.filter(
    f => f.type === 'string' && f.uniqueValues && f.uniqueValues < 15
  );
  
  // Find date fields (good for timeline)
  const dateFields = fields.filter(f => f.type === 'date');
  
  // Find numeric fields (good for counters)
  const numericFields = fields.filter(f => f.type === 'number');
  
  // 1. Always suggest a dot grid for any dataset
  const colorField = categoricalFields[0];
  suggestions.push({
    type: 'dotGrid',
    title: 'Dot Grid Overview',
    description: `Each dot represents one record (${data.length} total)`,
    config: {
      dotsPerRow: Math.min(25, Math.ceil(Math.sqrt(data.length))),
      dotSize: data.length > 500 ? 6 : data.length > 100 ? 10 : 14,
      colorBy: colorField?.name,
      colorMap: colorField ? generateColorMap(colorField.sampleValues as string[]) : undefined
    },
    score: 90,
    rationale: 'Dot grids effectively show scale and allow grouping by category'
  });
  
  // 2. Human grid if data represents people
  const hasPersonIndicators = fields.some(f => 
    ['name', 'person', 'individual', 'victim', 'patient', 'user', 'member']
      .some(indicator => f.name.toLowerCase().includes(indicator))
  );
  
  if (hasPersonIndicators) {
    suggestions.push({
      type: 'humanGrid',
      title: 'Human Impact Visualization',
      description: 'Each person icon represents an individual affected',
      config: {
        dotsPerRow: Math.min(20, Math.ceil(Math.sqrt(data.length))),
        dotSize: 18,
        colorBy: categoricalFields[0]?.name
      },
      score: 95,
      rationale: 'Human icons create stronger emotional connection when data represents people'
    });
  }
  
  // 3. Counter for total
  suggestions.push({
    type: 'counter',
    title: 'Total Count',
    description: `Animated counter showing ${data.length} records`,
    config: {
      value: data.length,
      duration: 2500,
      fontSize: '7rem'
    },
    score: 80,
    rationale: 'Large animated numbers create immediate impact'
  });
  
  // 4. Timeline if date field exists
  if (dateFields.length > 0) {
    const dateField = dateFields[0];
    suggestions.push({
      type: 'timeline',
      title: 'Timeline View',
      description: `Records over time from ${dateField.dateRange?.earliest} to ${dateField.dateRange?.latest}`,
      config: {
        dateField: dateField.name,
        groupBy: 'month'
      },
      score: 85,
      rationale: 'Timelines show trends and patterns over time'
    });
  }
  
  // 5. Comparison if there are multiple categories
  if (categoricalFields.length > 0 && categoricalFields[0].uniqueValues && categoricalFields[0].uniqueValues > 1) {
    const field = categoricalFields[0];
    suggestions.push({
      type: 'comparison',
      title: `Comparison by ${field.name}`,
      description: `Compare ${field.uniqueValues} different ${field.name} categories`,
      config: {
        groupBy: field.name
      },
      score: 75,
      rationale: 'Comparisons highlight differences between groups'
    });
  }
  
  // Sort by score
  return suggestions.sort((a, b) => b.score - a.score);
}

function generateColorMap(values: string[] | undefined): Record<string, string> {
  if (!values || values.length === 0) return {};
  
  // Predefined color palette
  const colors = [
    '#3B82F6', // blue
    '#EF4444', // red
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#6366F1', // indigo
    '#84CC16', // lime
  ];
  
  const map: Record<string, string> = {};
  values.forEach((value, index) => {
    map[value] = colors[index % colors.length];
  });
  
  return map;
}

// ============================================================================
// AI Integration Component
// ============================================================================

interface InfographicAIAssistantProps {
  projectSlug: string;
  recordTypeId?: number;
  data: Record<string, unknown>[];
  onGenerateInfographic: (result: AIGeneratedInfographic) => void;
}

// Model pricing per 1K tokens (approximate)
const MODEL_OPTIONS = [
  { 
    id: 'gpt-4o-mini', 
    name: 'GPT-4o Mini', 
    description: 'Fast & affordable',
    inputPrice: 0.00015, // per 1K tokens
    outputPrice: 0.0006,
    badge: 'Recommended'
  },
  { 
    id: 'gpt-4o', 
    name: 'GPT-4o', 
    description: 'Most capable',
    inputPrice: 0.005,
    outputPrice: 0.015,
    badge: 'Premium'
  },
  { 
    id: 'gpt-4-turbo', 
    name: 'GPT-4 Turbo', 
    description: 'Strong reasoning',
    inputPrice: 0.01,
    outputPrice: 0.03,
    badge: ''
  }
];

export function InfographicAIAssistant({
  projectSlug,
  recordTypeId,
  data,
  onGenerateInfographic
}: InfographicAIAssistantProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [costEstimate, setCostEstimate] = useState<{ input: number; output: number; total: number } | null>(null);
  const [generationStats, setGenerationStats] = useState<{ 
    tokensUsed?: number; 
    cost?: number; 
    timeMs?: number 
  } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Update cost estimate when model or analysis changes
  useEffect(() => {
    if (!analysis) return;
    
    const model = MODEL_OPTIONS.find(m => m.id === selectedModel) || MODEL_OPTIONS[0];
    const estimatedInputTokens = Math.ceil((JSON.stringify(analysis).length + 2000) / 4);
    const estimatedOutputTokens = 2000;
    
    setCostEstimate({
      input: (estimatedInputTokens / 1000) * model.inputPrice,
      output: (estimatedOutputTokens / 1000) * model.outputPrice,
      total: ((estimatedInputTokens / 1000) * model.inputPrice) + ((estimatedOutputTokens / 1000) * model.outputPrice)
    });
  }, [analysis, selectedModel]);
  
  // Analyze data when component mounts or data changes
  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = analyzeData(data);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze data');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [data]);
  
  // Generate infographic with AI
  const handleGenerate = useCallback(async () => {
    if (!analysis) return;
    
    setIsGenerating(true);
    setError(null);
    setGenerationStats(null);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`/api/projects/${projectSlug}/infographics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          dataAnalysis: analysis,
          recordTypeId,
          sampleData: data.slice(0, 10), // Send sample for context
          model: selectedModel
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate');
      }
      
      const result = await response.json();
      
      // Track stats if returned
      const timeMs = Date.now() - startTime;
      setGenerationStats({
        tokensUsed: result.usage?.total_tokens,
        cost: result.usage?.cost,
        timeMs
      });
      
      onGenerateInfographic(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [analysis, userPrompt, projectSlug, recordTypeId, data, onGenerateInfographic, selectedModel]);
  
  // Use a suggestion directly
  const handleUseSuggestion = useCallback((suggestion: VisualizationSuggestion) => {
    const infographic: AIGeneratedInfographic = {
      title: suggestion.title,
      description: suggestion.description,
      theme: 'light',
      estimatedImpact: suggestion.rationale,
      scenes: [
        {
          id: 'scene-1',
          narrativeText: suggestion.description,
          visualizationType: suggestion.type,
          visualizationConfig: suggestion.config,
          emotionalTone: 'neutral'
        }
      ]
    };
    
    onGenerateInfographic(infographic);
  }, [onGenerateInfographic]);
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        {/* AI Icon */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">AI Infographic Assistant</h3>
          <p className="text-sm text-gray-500">Describe what you want to visualize</p>
        </div>
      </div>
      
      {/* Model selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
        <div className="grid grid-cols-3 gap-2">
          {MODEL_OPTIONS.map(model => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                selectedModel === model.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{model.name}</span>
                {model.badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    model.badge === 'Recommended' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {model.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{model.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                ${(model.inputPrice * 1000).toFixed(2)}/1M in • ${(model.outputPrice * 1000).toFixed(2)}/1M out
              </p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Cost estimate display */}
      {costEstimate && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700">Estimated cost for generation:</span>
          <span className="font-mono text-blue-900">
            ~${costEstimate.total.toFixed(4)}
          </span>
        </div>
      )}
      
      {/* Generation stats (after generation) */}
      {generationStats && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-700">✓ Generated successfully</span>
            <span className="font-mono text-green-900">
              {generationStats.timeMs ? `${(generationStats.timeMs / 1000).toFixed(1)}s` : ''}
              {generationStats.tokensUsed && ` • ${generationStats.tokensUsed.toLocaleString()} tokens`}
              {generationStats.cost && ` • $${generationStats.cost.toFixed(4)}`}
            </span>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Data analysis section */}
      {!analysis && (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || data.length === 0}
          className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium
                     transition-colors disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : `Analyze ${data.length} records`}
        </button>
      )}
      
      {analysis && (
        <>
          {/* Analysis summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Data Analysis</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Records:</span>
                <span className="ml-2 font-semibold">{analysis.totalRecords.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-500">Fields:</span>
                <span className="ml-2 font-semibold">{analysis.fields.length}</span>
              </div>
            </div>
            
            {/* Field summary */}
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.fields.slice(0, 6).map(field => (
                <span
                  key={field.name}
                  className="px-2 py-1 bg-white rounded text-xs border"
                >
                  {field.name}
                  <span className="text-gray-400 ml-1">({field.type})</span>
                </span>
              ))}
              {analysis.fields.length > 6 && (
                <span className="px-2 py-1 text-xs text-gray-400">
                  +{analysis.fields.length - 6} more
                </span>
              )}
            </div>
          </div>
          
          {/* Suggestions */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Suggested Visualizations</h4>
            <div className="space-y-2">
              {analysis.suggestedVisualizations.slice(0, 4).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleUseSuggestion(suggestion)}
                  className="w-full p-3 border rounded-lg text-left hover:border-blue-500 
                             hover:bg-blue-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{suggestion.title}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                        {suggestion.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-blue-500">
                      {suggestion.score}% match
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{suggestion.description}</p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom prompt */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Or describe your vision</h4>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {showHelp ? 'Hide' : 'Show'} examples
              </button>
            </div>
            
            {showHelp && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-2">
                <p className="font-medium text-blue-900">What the AI can customize:</p>
                <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                  <li><strong>Narrative flow</strong>: 4-5 scenes telling a story</li>
                  <li><strong>Visualization types</strong>: dots, people icons, charts, timelines</li>
                  <li><strong>Color coding</strong>: grouping by any field (region, status, type, etc.)</li>
                  <li><strong>Text & insights</strong>: finding patterns, comparisons, surprises</li>
                  <li><strong>Human-scale comparisons</strong>: "X buses full" or "Y classrooms"</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Tip:</strong> Be specific! Mention which fields to use, what story to tell, and what to emphasize.
                </p>
              </div>
            )}
            
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Example: Create an emotional scrollytelling experience that shows the human toll over time, with each person represented individually. Start with the total number, then break down by year, highlighting the youngest victims."
              className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500"
            />
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !userPrompt.trim()}
              className="mt-3 w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 
                         text-white rounded-lg font-medium hover:from-purple-600 hover:to-blue-600
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating with AI...
                </span>
              ) : (
                '✨ Generate with AI'
              )}
            </button>
          </div>
        </>
      )}
      
      {/* Example prompts */}
      <div className="mt-6 pt-6 border-t">
        <p className="text-xs text-gray-400 mb-2">Example prompts:</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Show me the human impact',
            'Create a timeline story',
            'Compare categories visually',
            'Make it emotionally impactful'
          ].map((example, i) => (
            <button
              key={i}
              onClick={() => setUserPrompt(example)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded 
                         transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InfographicAIAssistant;
