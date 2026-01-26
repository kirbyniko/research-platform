'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Users, User, Bus, School, Home, Building2 } from 'lucide-react';
import { 
  ScrollytellingEngine, 
  ScrollytellingResponsive,
  Scene, 
  ScrollytellingConfig,
  DataBinding
} from './engine/ScrollytellingEngine';
import {
  ScrollytellingEngineV2,
  ScrollytellingImmersive
} from './engine/ScrollytellingEngineV2';
import { ImmersiveEngine } from './engine/ImmersiveEngine';
import { EnhancedDotGrid, EnhancedCounter, HumanGrid } from './visualizations/EnhancedVisualizations';
import { InfographicAIAssistant, AIGeneratedInfographic, AIDataBinding } from './ai/InfographicAIAssistant';
import { resolveSceneData, resolveDataBinding } from './utils/resolveDataBindings';

// ============================================================================
// Types
// ============================================================================

interface InfographicViewerProps {
  infographic?: {
    id: number;
    title: string;
    description?: string;
    config: ScrollytellingConfig;
    verification_status?: string;
    theme?: 'light' | 'dark';
  };
  data: Record<string, unknown>[];
  projectSlug?: string;
  recordTypeId?: number;
  isEditMode?: boolean;
  onConfigChange?: (config: ScrollytellingConfig) => void;
  variant?: 'default' | 'immersive' | 'legacy';
}

interface InfographicCreatorProps {
  projectSlug: string;
  recordTypeId?: number;
  data: Record<string, unknown>[];
  onSave: (infographic: { title: string; description: string; config: ScrollytellingConfig }) => void;
}

// ============================================================================
// Visualization Renderer (Enhanced with data bindings and click handlers)
// ============================================================================

function renderVisualization(
  scene: Scene,
  data: Record<string, unknown>[],
  progress: number,
  isTransitioning: boolean = false,
  theme: 'light' | 'dark' = 'dark',
  onRecordClick?: (records: Record<string, unknown>[]) => void
): React.ReactNode {
  // Resolve data bindings if present
  const { resolvedConfig, sourceRecords, totalCount } = resolveSceneData(scene, data);
  const config = resolvedConfig;
  
  // Type for legend positions
  type LegendPosition = 'left' | 'right' | 'bottom' | 'top' | 'overlay-bottom' | 'overlay-top' | 'top-right' | 'top-left';
  
  // Wrap click handler to show source records
  const handleClick = onRecordClick 
    ? () => onRecordClick(sourceRecords) 
    : undefined;
  
  switch (scene.visualizationType) {
    case 'dotGrid':
      return (
        <div onClick={handleClick} className={onRecordClick ? 'cursor-pointer' : ''}>
          <EnhancedDotGrid
            data={sourceRecords}
            config={{
              dotsPerRow: (config.dotsPerRow as number) || 20,
              dotSize: (config.dotSize as number) || 12,
              dotGap: (config.dotGap as number) || 4,
              colorBy: config.colorBy as string,
              colorMap: config.colorMap as Record<string, string>,
              colorLegend: config.colorLegend as Array<{ label: string; color: string; count?: number; description?: string }>,
              highlightedIds: config.highlightedIds as number[],
              interactive: true,
              showLegend: config.showLegend as boolean ?? true,
              legendPosition: (config.legendPosition as LegendPosition) || 'top-right',
              animationStagger: 3,
              theme
            }}
          />
        </div>
      );
      
    case 'humanGrid':
      return (
        <div onClick={handleClick} className={onRecordClick ? 'cursor-pointer' : ''}>
          <HumanGrid
            data={sourceRecords}
            config={{
              dotsPerRow: (config.dotsPerRow as number) || 15,
              dotSize: (config.dotSize as number) || 20,
              dotGap: (config.dotGap as number) || 8,
              colorBy: config.colorBy as string,
              colorMap: config.colorMap as Record<string, string>,
              colorLegend: config.colorLegend as Array<{ label: string; color: string; count?: number; description?: string }>,
              highlightedIds: config.highlightedIds as number[],
              showLegend: config.showLegend as boolean ?? true,
              legendPosition: (config.legendPosition as LegendPosition) || 'top-right',
              theme
            }}
          />
        </div>
      );
      
    case 'counter':
      // Use bound value or fall back to totalCount
      const counterValue = (config.value as number) ?? totalCount;
      return (
        <div 
          className={`flex items-center justify-center h-full ${onRecordClick ? 'cursor-pointer' : ''}`}
          onClick={handleClick}
          title={onRecordClick ? `Click to see ${counterValue} records` : undefined}
        >
          <EnhancedCounter
            config={{
              value: counterValue,
              prefix: config.prefix as string,
              suffix: config.suffix as string,
              duration: (config.duration as number) || 2500,
              fontSize: (config.fontSize as string) || '6rem',
              color: theme === 'dark' ? '#ffffff' : '#111827',
              format: config.format as 'number' | 'currency' | 'percent'
            }}
          />
        </div>
      );
      
    case 'timeline':
      return (
        <div onClick={handleClick} className={onRecordClick ? 'cursor-pointer' : ''}>
          <TimelineVisualization 
            data={sourceRecords} 
            dateField={config.dateField as string}
            groupBy={config.groupBy as 'day' | 'month' | 'year'}
            theme={theme}
          />
        </div>
      );
      
    case 'comparison':
      return (
        <div onClick={handleClick} className={onRecordClick ? 'cursor-pointer' : ''}>
          <ComparisonVisualization 
            data={sourceRecords} 
            groupBy={config.groupBy as string}
            theme={theme}
          />
        </div>
      );
      
    case 'barChart':
      return (
        <div onClick={handleClick} className={onRecordClick ? 'cursor-pointer' : ''}>
          <BarChartVisualization 
            data={sourceRecords}
            groupBy={config.groupBy as string}
            valueField={config.valueField as string}
            theme={theme}
          />
        </div>
      );
    
    case 'pieChart':
      return (
        <div onClick={handleClick} className={onRecordClick ? 'cursor-pointer' : ''}>
          <PieChartVisualization 
            data={sourceRecords}
            groupBy={config.groupBy as string}
            colorMap={config.colorMap as Record<string, string>}
            theme={theme}
          />
        </div>
      );
    
    case 'humanScale':
      const humanScaleValue = (config.value as number) ?? totalCount;
      return (
        <div onClick={handleClick} className={onRecordClick ? 'cursor-pointer' : ''}>
          <HumanScaleComparison
            value={humanScaleValue}
            comparison={config.comparison as string}
            icon={config.icon as string}
            theme={theme}
          />
        </div>
      );
      
    default:
      return (
        <div className={`flex items-center justify-center h-full ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Unknown visualization type: {scene.visualizationType}
        </div>
      );
  }
}

// ============================================================================
// Additional Visualization Components
// ============================================================================

function TimelineVisualization({ 
  data, 
  dateField,
  groupBy = 'month',
  theme = 'dark'
}: { 
  data: Record<string, unknown>[]; 
  dateField?: string;
  groupBy?: 'day' | 'month' | 'year';
  theme?: 'light' | 'dark';
}) {
  const groupedData = useMemo(() => {
    if (!dateField) return [];
    
    const groups: Record<string, number> = {};
    
    data.forEach(record => {
      const dateValue = record[dateField];
      if (!dateValue) return;
      
      const date = new Date(dateValue as string);
      let key: string;
      
      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
        default:
          key = String(date.getFullYear());
      }
      
      groups[key] = (groups[key] || 0) + 1;
    });
    
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, count]) => ({ label, count }));
  }, [data, dateField, groupBy]);
  
  const maxCount = Math.max(...groupedData.map(g => g.count), 1);
  const textColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-500';
  
  return (
    <div className="w-full h-full flex flex-col justify-end p-4 md:p-8">
      <div className="flex items-end justify-around h-[80%] gap-1">
        {groupedData.map((group, index) => (
          <div 
            key={group.label}
            className="flex-1 flex flex-col items-center"
          >
            <div 
              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500 shadow-lg"
              style={{ 
                height: `${(group.count / maxCount) * 100}%`,
                animationDelay: `${index * 50}ms`
              }}
            />
            <span className={`text-xs mt-1 transform -rotate-45 origin-top-left ${textColor}`}>
              {group.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonVisualization({ 
  data, 
  groupBy,
  theme = 'dark'
}: { 
  data: Record<string, unknown>[]; 
  groupBy?: string;
  theme?: 'light' | 'dark';
}) {
  const groupedData = useMemo(() => {
    if (!groupBy) return [];
    
    const groups: Record<string, number> = {};
    
    data.forEach(record => {
      const value = String(record[groupBy] || 'Unknown');
      groups[value] = (groups[value] || 0) + 1;
    });
    
    return Object.entries(groups)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));
  }, [data, groupBy]);
  
  const total = groupedData.reduce((sum, g) => sum + g.count, 0);
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const mutedColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const barBg = theme === 'dark' ? 'bg-white/10' : 'bg-gray-100';
  
  return (
    <div className="w-full h-full flex flex-col justify-center p-8 md:p-12 lg:p-16">
      <div className="space-y-4 max-w-4xl mx-auto w-full">
        {groupedData.slice(0, 8).map((group, index) => (
          <div key={group.label} className="flex items-center gap-4">
            <span className={`w-40 text-right text-sm font-medium truncate ${textColor}`}>
              {group.label}
            </span>
            <div className={`flex-1 ${barBg} rounded-full h-10 overflow-hidden`}>
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full flex items-center justify-end px-4 transition-all duration-700"
                style={{ 
                  width: `${Math.max((group.count / groupedData[0].count) * 100, 10)}%`,
                  animationDelay: `${index * 100}ms`
                }}
              >
                <span className="text-white text-sm font-bold drop-shadow">
                  {group.count.toLocaleString()}
                </span>
              </div>
            </div>
            <span className={`w-16 text-sm font-medium ${mutedColor}`}>
              {((group.count / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartVisualization({ 
  data, 
  groupBy,
  valueField,
  theme = 'dark'
}: { 
  data: Record<string, unknown>[]; 
  groupBy?: string;
  valueField?: string;
  theme?: 'light' | 'dark';
}) {
  const chartData = useMemo(() => {
    if (!groupBy) return [];
    
    const groups: Record<string, number> = {};
    
    data.forEach(record => {
      const label = String(record[groupBy] || 'Unknown');
      const value = valueField 
        ? Number(record[valueField] || 0)
        : 1; // Count if no value field
      
      groups[label] = (groups[label] || 0) + value;
    });
    
    return Object.entries(groups)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));
  }, [data, groupBy, valueField]);
  
  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const mutedColor = theme === 'dark' ? 'text-gray-300' : 'text-gray-500';
  
  return (
    <div className="w-full h-full flex items-end justify-center p-8 md:p-12 gap-3 md:gap-6">
      {chartData.map((item, index) => (
        <div 
          key={item.label}
          className="flex flex-col items-center flex-1 max-w-24"
        >
          <span className={`text-sm font-bold mb-2 ${textColor}`}>
            {item.value.toLocaleString()}
          </span>
          <div 
            className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-700 shadow-lg"
            style={{ 
              height: `${Math.max((item.value / maxValue) * 300, 20)}px`,
              animationDelay: `${index * 100}ms`
            }}
          />
          <span className={`text-xs mt-3 text-center truncate w-full font-medium ${mutedColor}`}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Pie Chart Visualization
// ============================================================================

function PieChartVisualization({
  data,
  groupBy,
  colorMap,
  theme = 'dark'
}: {
  data: Record<string, unknown>[];
  groupBy?: string;
  colorMap?: Record<string, string>;
  theme?: 'light' | 'dark';
}) {
  const chartData = useMemo(() => {
    if (!groupBy) return [];
    
    const groups: Record<string, number> = {};
    
    data.forEach(record => {
      const value = String(record[groupBy] || 'Unknown');
      groups[value] = (groups[value] || 0) + 1;
    });
    
    return Object.entries(groups)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));
  }, [data, groupBy]);
  
  const total = chartData.reduce((sum, d) => sum + d.count, 0);
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const mutedColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  
  // Default color palette
  const defaultColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#84CC16'
  ];
  
  // Calculate pie segments
  let cumulativePercent = 0;
  const segments = chartData.map((item, index) => {
    const percent = (item.count / total) * 100;
    const color = colorMap?.[item.label] || defaultColors[index % defaultColors.length];
    const startAngle = cumulativePercent * 3.6; // 360 / 100
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 3.6;
    
    return { ...item, percent, color, startAngle, endAngle };
  });
  
  // Create SVG arc path
  const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = 150 + radius * Math.cos(startRad);
    const y1 = 150 + radius * Math.sin(startRad);
    const x2 = 150 + radius * Math.cos(endRad);
    const y2 = 150 + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };
  
  return (
    <div className="w-full h-full flex items-center justify-center gap-8 p-6">
      {/* Pie chart */}
      <div className="relative">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {segments.map((segment, index) => (
            <path
              key={segment.label}
              d={createArcPath(segment.startAngle, segment.endAngle, 140)}
              fill={segment.color}
              className="transition-all duration-500 hover:opacity-80"
              style={{ 
                transformOrigin: '150px 150px',
                animation: `pieSlice 0.5s ease-out ${index * 0.1}s both`
              }}
            />
          ))}
          {/* Center circle for donut effect */}
          <circle 
            cx="150" 
            cy="150" 
            r="60" 
            fill={theme === 'dark' ? '#030712' : '#ffffff'}
          />
          {/* Total in center */}
          <text 
            x="150" 
            y="145" 
            textAnchor="middle" 
            className={`text-3xl font-bold ${textColor}`}
            fill={theme === 'dark' ? '#ffffff' : '#111827'}
          >
            {total.toLocaleString()}
          </text>
          <text 
            x="150" 
            y="170" 
            textAnchor="middle" 
            className={`text-sm ${mutedColor}`}
            fill={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
          >
            total
          </text>
        </svg>
      </div>
      
      {/* Legend */}
      <div className="flex flex-col gap-3">
        {segments.slice(0, 6).map(segment => (
          <div key={segment.label} className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-sm flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className={`text-sm font-medium ${textColor}`}>
              {segment.label}
            </span>
            <span className={`text-sm ${mutedColor}`}>
              {segment.count.toLocaleString()} ({segment.percent.toFixed(1)}%)
            </span>
          </div>
        ))}
        {segments.length > 6 && (
          <span className={`text-sm ${mutedColor}`}>
            +{segments.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Human Scale Comparison - Makes numbers relatable (with professional icons)
// ============================================================================

function HumanScaleComparison({
  value,
  comparison,
  theme = 'dark'
}: {
  value: number;
  comparison?: string;
  icon?: string;
  theme?: 'light' | 'dark';
}) {
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const mutedColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const iconColor = theme === 'dark' ? 'text-red-400' : 'text-red-600';
  
  // Human-scale comparisons with Lucide icon components
  const comparisons = [
    { 
      unit: 'school bus', 
      count: 72, 
      Icon: Bus, 
      plural: 'school buses',
      description: 'Standard school buses (72 capacity)'
    },
    { 
      unit: 'classroom', 
      count: 30, 
      Icon: School, 
      plural: 'classrooms',
      description: 'Average classroom size'
    },
    { 
      unit: 'family', 
      count: 4, 
      Icon: Users, 
      plural: 'families',
      description: 'Average family of 4'
    },
    { 
      unit: 'neighborhood block', 
      count: 150, 
      Icon: Home, 
      plural: 'neighborhood blocks',
      description: 'Homes per city block'
    },
    { 
      unit: 'apartment building', 
      count: 200, 
      Icon: Building2, 
      plural: 'apartment buildings',
      description: 'Large apartment complex'
    },
  ];
  
  // Find the best comparison that gives a reasonable number
  const bestComparison = comparisons.find(c => {
    const result = value / c.count;
    return result >= 2 && result <= 100;
  }) || comparisons[2]; // Default to families
  
  const comparisonValue = Math.round(value / bestComparison.count);
  const iconRepeat = Math.min(comparisonValue, 80); // Cap visual at 80
  const IconComp = bestComparison.Icon;
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
      {/* Main number */}
      <div className={`text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold ${textColor} mb-2 md:mb-4`}>
        {value.toLocaleString()}
      </div>
      
      {/* Comparison text */}
      <div className={`text-lg sm:text-xl md:text-2xl lg:text-3xl ${mutedColor} mb-4 md:mb-8 text-center px-4`}>
        {comparison || `That's about ${comparisonValue.toLocaleString()} ${comparisonValue === 1 ? bestComparison.unit : bestComparison.plural}`}
      </div>
      
      {/* Visual representation - fills available space */}
      <div className="flex-1 w-full max-w-5xl flex items-center justify-center">
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 lg:gap-4 p-2">
          {Array.from({ length: iconRepeat }).map((_, i) => (
            <div 
              key={i} 
              className={`${iconColor} transition-all duration-300`}
              style={{ 
                animation: `fadeIn 0.3s ease-out ${Math.min(i * 0.02, 1)}s both`
              }}
            >
              <IconComp className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12" strokeWidth={1.5} />
            </div>
          ))}
          {comparisonValue > 80 && (
            <span className={`text-base md:text-lg ${mutedColor} ml-2`}>
              +{(comparisonValue - 80).toLocaleString()} more
            </span>
          )}
        </div>
      </div>
      
      {/* Key insight */}
      <div className={`mt-4 md:mt-8 text-xs md:text-sm ${mutedColor} text-center max-w-md px-4`}>
        Each icon represents {bestComparison.count.toLocaleString()} people ({bestComparison.description})
      </div>
    </div>
  );
}

// ============================================================================
// Main Infographic Viewer Component
// ============================================================================

export function InfographicViewer({
  infographic,
  data,
  projectSlug,
  recordTypeId,
  isEditMode = false,
  onConfigChange,
  variant = 'default'
}: InfographicViewerProps) {
  if (!infographic?.config?.scenes?.length) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-xl font-medium">No scenes configured</p>
          <p className="text-sm mt-2">Generate an infographic using the AI assistant</p>
        </div>
      </div>
    );
  }
  
  const theme = infographic.theme || infographic.config.theme || 'dark'; // Default to dark for impact
  
  // Always use the new ImmersiveEngine for best experience
  // Other variants available for backwards compatibility
  const useImmersive = variant !== 'legacy';
  
  if (useImmersive) {
    return (
      <ImmersiveEngine
        config={{
          ...infographic.config,
          theme,
          title: infographic.title
        }}
        data={data}
        renderVisualization={renderVisualization}
        showFeedback={isEditMode}
      />
    );
  }
  
  // Legacy fallback
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-white'}`}>
      <ScrollytellingResponsive
        config={{
          ...infographic.config,
          theme
        }}
        data={data}
        renderVisualization={renderVisualization}
      />
    </div>
  );
}

// ============================================================================
// Infographic Creator Component
// ============================================================================

export function InfographicCreator({
  projectSlug,
  recordTypeId,
  data,
  onSave
}: InfographicCreatorProps) {
  const [step, setStep] = useState<'ai' | 'preview' | 'edit' | 'refine'>('ai');
  const [generatedConfig, setGeneratedConfig] = useState<AIGeneratedInfographic | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  const handleAIGenerate = useCallback((result: AIGeneratedInfographic) => {
    setGeneratedConfig(result);
    setTitle(result.title);
    setDescription(result.description);
    setStep('preview');
  }, []);
  
  // Refine the infographic with AI feedback
  const handleRefine = useCallback(async () => {
    if (!generatedConfig || !refinementFeedback.trim()) return;
    
    setIsRefining(true);
    try {
      const response = await fetch(`/api/projects/${projectSlug}/infographics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: '', // Not needed for refinement
          dataAnalysis: { totalRecords: data.length, fields: [], suggestedVisualizations: [] },
          recordTypeId,
          previousConfig: generatedConfig,
          refinementFeedback: refinementFeedback.trim()
        })
      });
      
      if (!response.ok) throw new Error('Refinement failed');
      
      const result = await response.json();
      setGeneratedConfig(result);
      setTitle(result.title || title);
      setDescription(result.description || description);
      setRefinementFeedback('');
      setStep('preview');
    } catch (error) {
      console.error('Refinement failed:', error);
      alert('Failed to refine. Please try again.');
    } finally {
      setIsRefining(false);
    }
  }, [generatedConfig, refinementFeedback, projectSlug, data.length, recordTypeId, title, description]);
  
  const scrollytellingConfig: ScrollytellingConfig | null = useMemo(() => {
    if (!generatedConfig) return null;
    
    return {
      scenes: generatedConfig.scenes.map(scene => ({
        id: scene.id,
        narrativeText: scene.narrativeText,
        narrativeSubtext: scene.narrativeSubtext,
        visualizationType: scene.visualizationType as Scene['visualizationType'],
        visualizationConfig: scene.visualizationConfig,
        filterRecords: scene.filterRecords,
        highlightRecordIds: scene.highlightRecordIds
      })),
      stickyContent: 'visualization',
      showProgress: true,
      theme: generatedConfig.theme
    };
  }, [generatedConfig]);
  
  const handleSave = useCallback(() => {
    if (!scrollytellingConfig) return;
    
    onSave({
      title,
      description,
      config: scrollytellingConfig
    });
  }, [title, description, scrollytellingConfig, onSave]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Step indicator */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            {['ai', 'preview', 'edit'].map((s, i) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => s !== 'ai' || !generatedConfig ? null : setStep(s as typeof step)}
                  disabled={s !== 'ai' && !generatedConfig}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    step === s 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  } ${s !== 'ai' && !generatedConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">
                    {i + 1}
                  </span>
                  {s === 'ai' ? 'AI Assistant' : s === 'preview' ? 'Preview' : 'Customize'}
                </button>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 ${generatedConfig ? 'bg-blue-200' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {step === 'ai' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Create Your Infographic</h2>
              <p className="text-gray-500">
                Let AI help you turn {data.length.toLocaleString()} records into a powerful visual story.
              </p>
            </div>
            
            <InfographicAIAssistant
              projectSlug={projectSlug}
              recordTypeId={recordTypeId}
              data={data}
              onGenerateInfographic={handleAIGenerate}
            />
          </div>
        )}
        
        {step === 'preview' && scrollytellingConfig && (
          <div>
            <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-2xl font-bold bg-transparent border-b border-transparent 
                             hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                  placeholder="Infographic Title"
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block text-gray-500 bg-transparent border-b border-transparent 
                             hover:border-gray-300 focus:border-blue-500 focus:outline-none mt-1"
                  placeholder="Brief description..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('refine')}
                  className="px-4 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Refine with AI
                </button>
                <button
                  onClick={() => setStep('edit')}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Customize
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Save Infographic
                </button>
              </div>
            </div>
            
            {/* Preview with border */}
            <div className="border rounded-xl overflow-hidden bg-white shadow-lg">
              <InfographicViewer
                infographic={{
                  id: 0,
                  title,
                  description,
                  config: scrollytellingConfig,
                  theme: generatedConfig?.theme
                }}
                data={data}
              />
            </div>
          </div>
        )}
        
        {step === 'refine' && generatedConfig && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Refine with AI</h3>
                  <p className="text-gray-500 text-sm">Describe what you&apos;d like to improve</p>
                </div>
              </div>
              
              <textarea
                value={refinementFeedback}
                onChange={(e) => setRefinementFeedback(e.target.value)}
                placeholder="Example: 'The visualization in scene 2 is too small and squished in the center. Make the icons bigger to fill the available space. Also, the text in scene 3 is hard to read.'"
                className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
              
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">💡 Things you can ask for:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Make visualizations bigger / fill the screen</li>
                  <li>• Change colors or add more contrast</li>
                  <li>• Make text shorter / punchier</li>
                  <li>• Add or remove scenes</li>
                  <li>• Use different visualization types</li>
                  <li>• Make numbers more relatable</li>
                </ul>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('preview')}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefine}
                  disabled={isRefining || !refinementFeedback.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRefining ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Refining...
                    </>
                  ) : (
                    <>Apply Changes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {step === 'edit' && generatedConfig && (
          <div className="max-w-6xl mx-auto">
            <SceneEditor 
              scenes={generatedConfig.scenes}
              onScenesChange={(scenes) => setGeneratedConfig({ ...generatedConfig, scenes })}
              onBack={() => setStep('preview')}
              projectSlug={projectSlug}
              data={data}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Scene Editor with AI Refinement
// ============================================================================

function SceneEditor({
  scenes,
  onScenesChange,
  onBack,
  projectSlug,
  data
}: {
  scenes: AIGeneratedInfographic['scenes'];
  onScenesChange: (scenes: AIGeneratedInfographic['scenes']) => void;
  onBack: () => void;
  projectSlug?: string;
  data?: Record<string, unknown>[];
}) {
  const [selectedScene, setSelectedScene] = useState(0);
  const [sceneRefineMode, setSceneRefineMode] = useState(false);
  const [sceneRefineFeedback, setSceneRefineFeedback] = useState('');
  const [isRefiningScene, setIsRefiningScene] = useState(false);
  
  const updateScene = useCallback((index: number, updates: Partial<AIGeneratedInfographic['scenes'][0]>) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], ...updates };
    onScenesChange(newScenes);
  }, [scenes, onScenesChange]);
  
  const addScene = useCallback(() => {
    const newScene: AIGeneratedInfographic['scenes'][0] = {
      id: `scene-${scenes.length + 1}`,
      narrativeText: 'New scene',
      visualizationType: 'dotGrid',
      visualizationConfig: { dotsPerRow: 20, dotSize: 12 },
      emotionalTone: 'neutral'
    };
    onScenesChange([...scenes, newScene]);
    setSelectedScene(scenes.length);
  }, [scenes, onScenesChange]);
  
  const deleteScene = useCallback((index: number) => {
    if (scenes.length <= 1) return;
    const newScenes = scenes.filter((_, i) => i !== index);
    onScenesChange(newScenes);
    setSelectedScene(Math.min(selectedScene, newScenes.length - 1));
  }, [scenes, selectedScene, onScenesChange]);
  
  // Refine single scene with AI
  const handleRefineScene = useCallback(async () => {
    if (!projectSlug || !sceneRefineFeedback.trim()) return;
    
    setIsRefiningScene(true);
    try {
      const currentScene = scenes[selectedScene];
      
      const response = await fetch(`/api/projects/${projectSlug}/infographics/refine-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene: currentScene,
          feedback: sceneRefineFeedback.trim(),
          dataCount: data?.length || 0,
          allScenes: scenes.map(s => ({ id: s.id, type: s.visualizationType, text: s.narrativeText }))
        })
      });
      
      if (!response.ok) throw new Error('Scene refinement failed');
      
      const refinedScene = await response.json();
      updateScene(selectedScene, refinedScene);
      setSceneRefineMode(false);
      setSceneRefineFeedback('');
    } catch (error) {
      console.error('Scene refinement failed:', error);
      alert('Failed to refine scene. Please try again.');
    } finally {
      setIsRefiningScene(false);
    }
  }, [projectSlug, sceneRefineFeedback, scenes, selectedScene, data?.length, updateScene]);
  
  const currentScene = scenes[selectedScene];
  
  return (
    <div className="flex gap-6">
      {/* Scene list */}
      <div className="w-64 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Scenes</h3>
          <button
            onClick={addScene}
            className="p-1 hover:bg-gray-100 rounded"
            title="Add scene"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-2">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => setSelectedScene(index)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedScene === index 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium truncate">{scene.narrativeText}</div>
              <div className="text-xs text-gray-400 mt-1">{scene.visualizationType}</div>
            </button>
          ))}
        </div>
        
        <button
          onClick={onBack}
          className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Preview
        </button>
      </div>
      
      {/* Scene editor */}
      <div className="flex-1 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold">Scene {selectedScene + 1}</h3>
          <div className="flex items-center gap-3">
            {/* AI Refine button */}
            {projectSlug && (
              <button
                onClick={() => setSceneRefineMode(!sceneRefineMode)}
                className={`text-sm px-3 py-1.5 rounded flex items-center gap-1.5 ${
                  sceneRefineMode 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-purple-600 hover:bg-purple-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Refine
              </button>
            )}
            {scenes.length > 1 && (
              <button
                onClick={() => deleteScene(selectedScene)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete Scene
              </button>
            )}
          </div>
        </div>
        
        {/* AI Refine Panel */}
        {sceneRefineMode && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium text-purple-900">Refine this scene with AI</span>
            </div>
            <textarea
              value={sceneRefineFeedback}
              onChange={(e) => setSceneRefineFeedback(e.target.value)}
              placeholder="Describe what to improve: 'Make the visualization bigger', 'Use different colors', 'Change to a pie chart', 'Make text punchier'..."
              className="w-full h-24 p-3 border border-purple-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setSceneRefineMode(false);
                  setSceneRefineFeedback('');
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRefineScene}
                disabled={isRefiningScene || !sceneRefineFeedback.trim()}
                className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRefiningScene ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Refining...
                  </>
                ) : (
                  'Apply AI Changes'
                )}
              </button>
            </div>
          </div>
        )}
        
        {currentScene && (
          <div className="space-y-6">
            {/* Narrative text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Narrative Text
              </label>
              <textarea
                value={currentScene.narrativeText}
                onChange={(e) => updateScene(selectedScene, { narrativeText: e.target.value })}
                className="w-full p-3 border rounded-lg resize-none h-24"
                placeholder="The main statement for this scene..."
              />
            </div>
            
            {/* Subtext */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supporting Text (optional)
              </label>
              <input
                type="text"
                value={currentScene.narrativeSubtext || ''}
                onChange={(e) => updateScene(selectedScene, { narrativeSubtext: e.target.value })}
                className="w-full p-3 border rounded-lg"
                placeholder="Additional context..."
              />
            </div>
            
            {/* Visualization type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visualization Type
              </label>
              <select
                value={currentScene.visualizationType}
                onChange={(e) => updateScene(selectedScene, { visualizationType: e.target.value })}
                className="w-full p-3 border rounded-lg"
              >
                <option value="dotGrid">Dot Grid</option>
                <option value="humanGrid">Human Grid</option>
                <option value="counter">Counter</option>
                <option value="timeline">Timeline</option>
                <option value="comparison">Comparison</option>
                <option value="barChart">Bar Chart</option>
                <option value="pieChart">Pie Chart</option>
                <option value="humanScale">Human Scale</option>
              </select>
            </div>
            
            {/* DATA BINDING - How this scene gets data from records */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span className="font-medium text-blue-900">Data Binding</span>
                <span className="text-xs text-blue-600 ml-auto">Links to real records</span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-blue-800 mb-1">
                    Binding Type
                  </label>
                  <select
                    value={(currentScene.dataBinding as AIDataBinding | undefined)?.type || 'count'}
                    onChange={(e) => {
                      const newBinding: AIDataBinding = { 
                        type: e.target.value as AIDataBinding['type'],
                        field: (currentScene.dataBinding as AIDataBinding | undefined)?.field
                      };
                      updateScene(selectedScene, { dataBinding: newBinding });
                    }}
                    className="w-full p-2 border border-blue-200 rounded text-sm bg-white"
                  >
                    <option value="count">Count all records</option>
                    <option value="records">Show all records (for grids)</option>
                    <option value="groupBy">Group by field (for charts)</option>
                    <option value="sum">Sum a numeric field</option>
                    <option value="average">Average a numeric field</option>
                  </select>
                </div>
                
                {/* Field selector for groupBy, sum, average */}
                {['groupBy', 'sum', 'average'].includes((currentScene.dataBinding as AIDataBinding | undefined)?.type || '') && (
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">
                      Field to use
                    </label>
                    <input
                      type="text"
                      value={(currentScene.dataBinding as AIDataBinding | undefined)?.field || ''}
                      onChange={(e) => {
                        const newBinding: AIDataBinding = {
                          ...(currentScene.dataBinding as AIDataBinding | undefined),
                          type: (currentScene.dataBinding as AIDataBinding | undefined)?.type || 'groupBy',
                          field: e.target.value
                        };
                        updateScene(selectedScene, { dataBinding: newBinding });
                      }}
                      placeholder="e.g., region, status, facility_type"
                      className="w-full p-2 border border-blue-200 rounded text-sm"
                    />
                  </div>
                )}
                
                {/* Data preview */}
                {data && data.length > 0 && (
                  <div className="text-xs text-blue-700 bg-blue-100 rounded p-2">
                    <strong>Live data:</strong>{' '}
                    {(() => {
                      const binding = currentScene.dataBinding as AIDataBinding | undefined;
                      if (!binding) return `${data.length} records`;
                      const resolved = resolveDataBinding(binding as DataBinding, data);
                      if (resolved.value !== undefined) {
                        return `${resolved.value.toLocaleString()} ${binding.type === 'count' ? 'records' : ''}`;
                      }
                      if (resolved.groups) {
                        return `${resolved.groups.length} groups from ${resolved.totalCount} records`;
                      }
                      return `${resolved.totalCount} records`;
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            {/* Emotional tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emotional Tone
              </label>
              <select
                value={currentScene.emotionalTone}
                onChange={(e) => updateScene(selectedScene, { emotionalTone: e.target.value as typeof currentScene.emotionalTone })}
                className="w-full p-3 border rounded-lg"
              >
                <option value="neutral">Neutral</option>
                <option value="somber">Somber</option>
                <option value="urgent">Urgent</option>
                <option value="hopeful">Hopeful</option>
              </select>
            </div>
            
            {/* Config JSON (advanced) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visualization Config (Advanced)
              </label>
              <textarea
                value={JSON.stringify(currentScene.visualizationConfig, null, 2)}
                onChange={(e) => {
                  try {
                    const config = JSON.parse(e.target.value);
                    updateScene(selectedScene, { visualizationConfig: config });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full p-3 border rounded-lg font-mono text-sm resize-none h-32"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default InfographicViewer;
