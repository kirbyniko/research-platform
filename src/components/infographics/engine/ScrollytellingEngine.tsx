'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Data binding defines how a visualization gets its data from the actual records.
 * This ensures visualizations always reflect real, up-to-date data.
 */
export interface DataBinding {
  /** What type of data to display */
  type: 'count' | 'sum' | 'average' | 'field' | 'groupBy' | 'records';
  /** Which field to use for the binding (for sum/average/groupBy) */
  field?: string;
  /** Optional filter to apply to records before aggregation */
  filter?: Record<string, unknown>;
  /** For type='records', limit how many to show */
  limit?: number;
  /** For groupBy, which field to count/sum */
  aggregateField?: string;
}

export interface Scene {
  id: string;
  narrativeText: string;
  narrativeSubtext?: string;
  visualizationType: 'dotGrid' | 'humanGrid' | 'counter' | 'comparison' | 'timeline' | 'barChart' | 'pieChart' | 'humanScale';
  visualizationConfig: Record<string, unknown>;
  /** 
   * Data binding - how to get values from actual records.
   * When present, values are computed from real data, not hardcoded.
   */
  dataBinding?: DataBinding;
  filterRecords?: Record<string, unknown>;
  highlightRecordIds?: number[];
  transition?: 'fade' | 'morph' | 'zoom' | 'slide';
  transitionDuration?: number;
  backgroundColor?: string;
  textColor?: string;
}

export interface ScrollytellingConfig {
  scenes: Scene[];
  stickyContent: 'visualization' | 'narrative';
  transitionDuration?: number;
  showProgress?: boolean;
  progressPosition?: 'left' | 'right';
  theme?: 'light' | 'dark';
}

interface ScrollytellingEngineProps {
  config: ScrollytellingConfig;
  data: Record<string, unknown>[];
  renderVisualization: (
    scene: Scene,
    data: Record<string, unknown>[],
    progress: number,
    isTransitioning?: boolean,
    theme?: 'light' | 'dark'
  ) => React.ReactNode;
  className?: string;
}

// ============================================================================
// Scroll Progress Indicator
// ============================================================================

function ScrollProgressIndicator({ 
  scenes, 
  activeSceneIndex, 
  progress,
  position = 'right' 
}: { 
  scenes: Scene[]; 
  activeSceneIndex: number; 
  progress: number;
  position?: 'left' | 'right';
}) {
  return (
    <div 
      className={`fixed top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 ${
        position === 'left' ? 'left-4' : 'right-4'
      }`}
    >
      {scenes.map((scene, index) => {
        const isActive = index === activeSceneIndex;
        const isPast = index < activeSceneIndex;
        const sceneProgress = isActive ? progress : (isPast ? 1 : 0);
        
        return (
          <div key={scene.id} className="relative group">
            {/* Dot indicator */}
            <div 
              className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                isActive 
                  ? 'border-blue-500 bg-blue-500 scale-125' 
                  : isPast 
                    ? 'border-blue-400 bg-blue-400' 
                    : 'border-gray-300 bg-white'
              }`}
            >
              {/* Progress fill for active scene */}
              {isActive && (
                <div 
                  className="absolute inset-0 rounded-full bg-blue-300 origin-bottom"
                  style={{ 
                    transform: `scaleY(${sceneProgress})`,
                    opacity: 0.5
                  }}
                />
              )}
            </div>
            
            {/* Tooltip on hover */}
            <div 
              className={`absolute top-1/2 -translate-y-1/2 ${
                position === 'left' ? 'left-6' : 'right-6'
              } bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap
              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
            >
              Scene {index + 1}
            </div>
          </div>
        );
      })}
      
      {/* Connecting line */}
      <div 
        className={`absolute top-0 bottom-0 w-0.5 bg-gray-200 -z-10 ${
          position === 'left' ? 'left-[5px]' : 'right-[5px]'
        }`}
      >
        <div 
          className="w-full bg-blue-400 transition-all duration-300"
          style={{ 
            height: `${((activeSceneIndex + progress) / (scenes.length - 1)) * 100}%` 
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Narrative Block
// ============================================================================

function NarrativeBlock({ 
  scene, 
  isActive, 
  progress 
}: { 
  scene: Scene; 
  isActive: boolean; 
  progress: number;
}) {
  const opacity = isActive ? 1 : 0.3;
  const scale = isActive ? 1 : 0.95;
  const blur = isActive ? 0 : 2;
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center px-8 py-20 transition-all duration-500"
      style={{ 
        backgroundColor: scene.backgroundColor || 'transparent',
        color: scene.textColor || 'inherit'
      }}
    >
      <div 
        className="max-w-lg transition-all duration-500"
        style={{ 
          opacity, 
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`
        }}
      >
        <p className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6">
          {scene.narrativeText}
        </p>
        {scene.narrativeSubtext && (
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            {scene.narrativeSubtext}
          </p>
        )}
        
        {/* Progress indicator for this scene */}
        {isActive && (
          <div className="mt-8 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sticky Visualization Container
// ============================================================================

function StickyVisualization({ 
  children,
  theme = 'light'
}: { 
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}) {
  return (
    <div 
      className={`sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-white'
      }`}
    >
      <div className="w-full h-full max-w-6xl mx-auto p-8">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Main Engine
// ============================================================================

export function ScrollytellingEngine({
  config,
  data,
  renderVisualization,
  className = ''
}: ScrollytellingEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [globalProgress, setGlobalProgress] = useState(0);
  
  // Calculate which data to show based on active scene
  const filteredData = useMemo(() => {
    const activeScene = config.scenes[activeSceneIndex];
    if (!activeScene) return data;
    
    let result = [...data];
    
    // Apply filters if specified
    if (activeScene.filterRecords) {
      result = result.filter(record => {
        return Object.entries(activeScene.filterRecords!).every(([key, value]) => {
          if (Array.isArray(value)) {
            return value.includes(record[key]);
          }
          return record[key] === value;
        });
      });
    }
    
    return result;
  }, [data, config.scenes, activeSceneIndex]);
  
  // Highlight specific records
  const highlightedIds = useMemo(() => {
    const activeScene = config.scenes[activeSceneIndex];
    return activeScene?.highlightRecordIds || [];
  }, [config.scenes, activeSceneIndex]);
  
  // Set up intersection observers for each scene
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    sceneRefs.current.forEach((ref, index) => {
      if (!ref) return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Calculate how far through this scene we are
              const rect = entry.boundingClientRect;
              const viewportHeight = window.innerHeight;
              const sceneHeight = rect.height;
              
              // Progress from 0 (just entered) to 1 (about to leave)
              const scrolledIntoScene = viewportHeight - rect.top;
              const progress = Math.max(0, Math.min(1, scrolledIntoScene / sceneHeight));
              
              setActiveSceneIndex(index);
              setSceneProgress(progress);
            }
          });
        },
        {
          threshold: Array.from({ length: 100 }, (_, i) => i / 100),
          rootMargin: '-10% 0px -10% 0px'
        }
      );
      
      observer.observe(ref);
      observers.push(observer);
    });
    
    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [config.scenes.length]);
  
  // Track global scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const scrollableHeight = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableHeight));
      
      setGlobalProgress(progress);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const activeScene = config.scenes[activeSceneIndex];
  
  // Merge scene config with highlight data
  const enhancedConfig = useMemo(() => ({
    ...activeScene?.visualizationConfig,
    highlightedIds,
    transitionProgress: sceneProgress
  }), [activeScene, highlightedIds, sceneProgress]);
  
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Progress indicator */}
      {config.showProgress !== false && (
        <ScrollProgressIndicator 
          scenes={config.scenes}
          activeSceneIndex={activeSceneIndex}
          progress={sceneProgress}
          position={config.progressPosition}
        />
      )}
      
      {/* Layout: sticky visualization + scrolling narrative */}
      <div className="flex">
        {/* Visualization (sticky) */}
        <div className="w-1/2 relative">
          <StickyVisualization theme={config.theme}>
            {activeScene && renderVisualization(
              { ...activeScene, visualizationConfig: enhancedConfig },
              filteredData,
              sceneProgress,
              false,
              config.theme || 'dark'
            )}
          </StickyVisualization>
        </div>
        
        {/* Narrative (scrolling) */}
        <div className="w-1/2">
          {config.scenes.map((scene, index) => (
            <div
              key={scene.id}
              ref={el => { sceneRefs.current[index] = el; }}
            >
              <NarrativeBlock
                scene={scene}
                isActive={index === activeSceneIndex}
                progress={index === activeSceneIndex ? sceneProgress : 0}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* End spacer */}
      <div className="h-[50vh]" />
    </div>
  );
}

// ============================================================================
// Mobile-First Variant (stacked layout)
// ============================================================================

export function ScrollytellingEngineMobile({
  config,
  data,
  renderVisualization,
  className = ''
}: ScrollytellingEngineProps) {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    sceneRefs.current.forEach((ref, index) => {
      if (!ref) return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              setActiveSceneIndex(index);
            }
          });
        },
        { threshold: 0.5 }
      );
      
      observer.observe(ref);
      observers.push(observer);
    });
    
    return () => observers.forEach(o => o.disconnect());
  }, [config.scenes.length]);
  
  return (
    <div className={className}>
      {config.scenes.map((scene, index) => (
        <div
          key={scene.id}
          ref={el => { sceneRefs.current[index] = el; }}
          className="min-h-screen flex flex-col"
          style={{ backgroundColor: scene.backgroundColor }}
        >
          {/* Visualization */}
          <div className="h-[60vh] flex items-center justify-center p-4">
            {renderVisualization(scene, data, index === activeSceneIndex ? 1 : 0, false, config.theme || 'dark')}
          </div>
          
          {/* Narrative */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center">
              <p className="text-2xl font-bold mb-4" style={{ color: scene.textColor }}>
                {scene.narrativeText}
              </p>
              {scene.narrativeSubtext && (
                <p className="text-gray-600">{scene.narrativeSubtext}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Responsive Wrapper
// ============================================================================

export function ScrollytellingResponsive(props: ScrollytellingEngineProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile 
    ? <ScrollytellingEngineMobile {...props} />
    : <ScrollytellingEngine {...props} />;
}

export default ScrollytellingEngine;
