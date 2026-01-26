'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Scene {
  id: string;
  narrativeText: string;
  narrativeSubtext?: string;
  visualizationType: 'dotGrid' | 'humanGrid' | 'counter' | 'comparison' | 'timeline' | 'barChart';
  visualizationConfig: Record<string, unknown>;
  filterRecords?: Record<string, unknown>;
  highlightRecordIds?: number[];
  transition?: 'fade' | 'morph' | 'zoom' | 'slide';
  transitionDuration?: number;
  backgroundColor?: string;
  textColor?: string;
}

export interface ScrollytellingConfig {
  scenes: Scene[];
  stickyContent?: 'visualization' | 'narrative';
  transitionDuration?: number;
  showProgress?: boolean;
  progressPosition?: 'left' | 'right';
  theme?: 'light' | 'dark';
  title?: string;
}

interface ScrollytellingEngineProps {
  config: ScrollytellingConfig;
  data: Record<string, unknown>[];
  renderVisualization: (
    scene: Scene,
    data: Record<string, unknown>[],
    progress: number,
    isTransitioning: boolean,
    theme: 'light' | 'dark'
  ) => React.ReactNode;
  className?: string;
}

// ============================================================================
// Smooth Scroll Progress Hook
// ============================================================================

function useSmoothScrollProgress(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const lastProgressRef = useRef(0);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const updateProgress = () => {
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollableHeight = rect.height - windowHeight;
      
      if (scrollableHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      
      // Calculate raw progress
      const scrolled = -rect.top;
      const rawProgress = Math.max(0, Math.min(1, scrolled / scrollableHeight));
      
      // Smooth interpolation
      const smoothingFactor = 0.15;
      const smoothedProgress = lastProgressRef.current + 
        (rawProgress - lastProgressRef.current) * smoothingFactor;
      
      lastProgressRef.current = smoothedProgress;
      setScrollProgress(smoothedProgress);
      
      rafRef.current = requestAnimationFrame(updateProgress);
    };
    
    rafRef.current = requestAnimationFrame(updateProgress);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [containerRef]);
  
  return scrollProgress;
}

// ============================================================================
// Scene Progress Calculator
// ============================================================================

function useSceneProgress(
  globalProgress: number, 
  totalScenes: number
): { activeIndex: number; sceneProgress: number; isTransitioning: boolean } {
  return useMemo(() => {
    if (totalScenes === 0) {
      return { activeIndex: 0, sceneProgress: 0, isTransitioning: false };
    }
    
    // Each scene takes up equal scroll distance
    const sceneLength = 1 / totalScenes;
    const activeIndex = Math.min(
      Math.floor(globalProgress / sceneLength),
      totalScenes - 1
    );
    
    // Progress within the current scene (0 to 1)
    const sceneStart = activeIndex * sceneLength;
    const sceneProgress = Math.min(1, (globalProgress - sceneStart) / sceneLength);
    
    // Detect if we're transitioning between scenes (near boundaries)
    const transitionThreshold = 0.1;
    const isTransitioning = sceneProgress < transitionThreshold || sceneProgress > (1 - transitionThreshold);
    
    return { activeIndex, sceneProgress, isTransitioning };
  }, [globalProgress, totalScenes]);
}

// ============================================================================
// Progress Indicator (Vertical dots on the side)
// ============================================================================

function ProgressIndicator({ 
  scenes, 
  activeIndex, 
  globalProgress,
  position = 'right',
  theme = 'light'
}: { 
  scenes: Scene[]; 
  activeIndex: number; 
  globalProgress: number;
  position?: 'left' | 'right';
  theme?: 'light' | 'dark';
}) {
  const isLight = theme === 'light';
  const positionClasses = position === 'left' ? 'left-6' : 'right-6';
  
  return (
    <div className={`fixed top-1/2 -translate-y-1/2 z-50 ${positionClasses}`}>
      <div className="flex flex-col items-center gap-3">
        {scenes.map((scene, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          
          return (
            <button
              key={scene.id}
              className="group relative flex items-center justify-center"
              onClick={() => {
                // Scroll to scene
                const targetProgress = index / scenes.length;
                // TODO: Implement smooth scroll to scene
              }}
            >
              {/* Outer ring for active */}
              <div 
                className={`
                  w-4 h-4 rounded-full transition-all duration-500 ease-out
                  ${isActive 
                    ? 'scale-125 bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30' 
                    : isPast 
                      ? isLight ? 'bg-gray-400' : 'bg-gray-500'
                      : isLight ? 'bg-gray-200' : 'bg-gray-700'
                  }
                `}
              />
              
              {/* Label on hover */}
              <span 
                className={`
                  absolute whitespace-nowrap text-sm font-medium
                  opacity-0 group-hover:opacity-100 transition-opacity
                  ${position === 'left' ? 'left-7' : 'right-7'}
                  ${isLight ? 'text-gray-700' : 'text-gray-200'}
                  bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded shadow
                `}
              >
                {index + 1}. {scene.narrativeText.slice(0, 30)}...
              </span>
            </button>
          );
        })}
        
        {/* Progress line */}
        <div 
          className={`absolute top-0 w-0.5 h-full -z-10 ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}
        >
          <div 
            className="w-full bg-gradient-to-b from-blue-500 to-purple-600 transition-all duration-300 ease-out"
            style={{ height: `${globalProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Narrative Text Component (with smooth transitions)
// ============================================================================

function NarrativeText({ 
  scene, 
  progress,
  isActive,
  theme = 'light'
}: { 
  scene: Scene; 
  progress: number;
  isActive: boolean;
  theme?: 'light' | 'dark';
}) {
  // Smooth opacity/transform based on progress
  // 0-0.2: fade in, 0.2-0.8: fully visible, 0.8-1: fade out
  const getOpacity = () => {
    if (!isActive) return 0;
    if (progress < 0.15) return progress / 0.15;
    if (progress > 0.85) return 1 - (progress - 0.85) / 0.15;
    return 1;
  };
  
  const getTransform = () => {
    if (!isActive) return 'translateY(30px)';
    if (progress < 0.15) return `translateY(${30 * (1 - progress / 0.15)}px)`;
    if (progress > 0.85) return `translateY(${-30 * ((progress - 0.85) / 0.15)}px)`;
    return 'translateY(0)';
  };
  
  const textColor = scene.textColor || (theme === 'dark' ? '#ffffff' : '#111827');
  const subtextColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  
  return (
    <div 
      className="transition-opacity duration-100"
      style={{ 
        opacity: getOpacity(),
        transform: getTransform()
      }}
    >
      <h2 
        className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
        style={{ color: textColor }}
      >
        {scene.narrativeText}
      </h2>
      {scene.narrativeSubtext && (
        <p 
          className="text-xl md:text-2xl leading-relaxed"
          style={{ color: subtextColor }}
        >
          {scene.narrativeSubtext}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Sticky Visualization Container
// ============================================================================

function StickyVisualization({ 
  children,
  theme = 'light',
  progress,
  isTransitioning
}: { 
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  progress: number;
  isTransitioning: boolean;
}) {
  const bgColor = theme === 'dark' ? 'bg-gray-950' : 'bg-white';
  
  return (
    <div 
      className={`sticky top-0 h-screen w-full flex items-center justify-center ${bgColor}`}
      style={{
        // Subtle scale effect during transitions
        transform: isTransitioning ? `scale(${0.98 + (progress * 0.02)})` : 'scale(1)',
        transition: 'transform 0.3s ease-out'
      }}
    >
      <div className="w-full h-full flex items-center justify-center p-8 md:p-12 lg:p-16">
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Main Scrollytelling Engine V2
// ============================================================================

export function ScrollytellingEngineV2({
  config,
  data,
  renderVisualization,
  className = ''
}: ScrollytellingEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globalProgress = useSmoothScrollProgress(containerRef);
  const { activeIndex, sceneProgress, isTransitioning } = useSceneProgress(
    globalProgress, 
    config.scenes.length
  );
  
  // Filter data based on active scene
  const filteredData = useMemo(() => {
    const activeScene = config.scenes[activeIndex];
    if (!activeScene?.filterRecords) return data;
    
    return data.filter(record => {
      return Object.entries(activeScene.filterRecords!).every(([key, value]) => {
        if (Array.isArray(value)) return value.includes(record[key]);
        return record[key] === value;
      });
    });
  }, [data, config.scenes, activeIndex]);
  
  const activeScene = config.scenes[activeIndex];
  const theme = config.theme || 'light';
  const bgClass = theme === 'dark' ? 'bg-gray-950' : 'bg-white';
  
  // Calculate scroll height (each scene = 100vh of scroll)
  const totalScrollHeight = config.scenes.length * 100;
  
  return (
    <div 
      ref={containerRef} 
      className={`relative ${bgClass} ${className}`}
      style={{ minHeight: `${totalScrollHeight}vh` }}
    >
      {/* Progress indicator */}
      {config.showProgress !== false && config.scenes.length > 1 && (
        <ProgressIndicator
          scenes={config.scenes}
          activeIndex={activeIndex}
          globalProgress={globalProgress}
          position={config.progressPosition || 'right'}
          theme={theme}
        />
      )}
      
      {/* Two-column layout: Visualization (60%) | Narrative (40%) */}
      <div className="flex min-h-screen">
        {/* Visualization - Sticky and takes most of the screen */}
        <div className="w-full md:w-[65%] lg:w-[70%]">
          <StickyVisualization 
            theme={theme}
            progress={sceneProgress}
            isTransitioning={isTransitioning}
          >
            {activeScene && renderVisualization(
              {
                ...activeScene,
                visualizationConfig: {
                  ...activeScene.visualizationConfig,
                  transitionProgress: sceneProgress,
                  highlightedIds: activeScene.highlightRecordIds
                }
              },
              filteredData,
              sceneProgress,
              isTransitioning,
              theme
            )}
          </StickyVisualization>
        </div>
        
        {/* Narrative - Scrolling text */}
        <div className="hidden md:block w-[35%] lg:w-[30%]">
          {config.scenes.map((scene, index) => (
            <div 
              key={scene.id}
              className="min-h-screen flex items-center px-8 lg:px-12"
              style={{ backgroundColor: scene.backgroundColor || 'transparent' }}
            >
              <NarrativeText
                scene={scene}
                progress={index === activeIndex ? sceneProgress : 0}
                isActive={index === activeIndex}
                theme={theme}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile: Full-width narrative overlay at bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div 
          className={`p-6 ${theme === 'dark' ? 'bg-gray-950/95' : 'bg-white/95'} backdrop-blur-sm`}
        >
          {activeScene && (
            <NarrativeText
              scene={activeScene}
              progress={sceneProgress}
              isActive={true}
              theme={theme}
            />
          )}
          
          {/* Scene counter for mobile */}
          <div className={`mt-4 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {activeIndex + 1} / {config.scenes.length}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Full-Width Immersive Variant
// (Visualization takes full screen, narrative overlays)
// ============================================================================

export function ScrollytellingImmersive({
  config,
  data,
  renderVisualization,
  className = ''
}: ScrollytellingEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globalProgress = useSmoothScrollProgress(containerRef);
  const { activeIndex, sceneProgress, isTransitioning } = useSceneProgress(
    globalProgress, 
    config.scenes.length
  );
  
  const filteredData = useMemo(() => {
    const activeScene = config.scenes[activeIndex];
    if (!activeScene?.filterRecords) return data;
    
    return data.filter(record => {
      return Object.entries(activeScene.filterRecords!).every(([key, value]) => {
        if (Array.isArray(value)) return value.includes(record[key]);
        return record[key] === value;
      });
    });
  }, [data, config.scenes, activeIndex]);
  
  const activeScene = config.scenes[activeIndex];
  const theme = config.theme || 'light';
  const totalScrollHeight = config.scenes.length * 100;
  
  return (
    <div 
      ref={containerRef} 
      className={`relative ${className}`}
      style={{ minHeight: `${totalScrollHeight}vh` }}
    >
      {/* Full-screen visualization (sticky) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Background effect based on scene */}
        <div 
          className="absolute inset-0 transition-colors duration-700"
          style={{ 
            backgroundColor: activeScene?.backgroundColor || (theme === 'dark' ? '#030712' : '#ffffff')
          }}
        />
        
        {/* Visualization */}
        <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8 lg:p-16">
          {activeScene && renderVisualization(
            {
              ...activeScene,
              visualizationConfig: {
                ...activeScene.visualizationConfig,
                transitionProgress: sceneProgress,
                highlightedIds: activeScene.highlightRecordIds
              }
            },
            filteredData,
            sceneProgress,
            isTransitioning,
            theme
          )}
        </div>
        
        {/* Gradient overlay for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        
        {/* Narrative text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 lg:p-16 text-white">
          <div className="max-w-3xl">
            <NarrativeText
              scene={activeScene || config.scenes[0]}
              progress={sceneProgress}
              isActive={true}
              theme="dark"
            />
          </div>
          
          {/* Progress bar at bottom */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/80 transition-all duration-300 ease-out"
                style={{ width: `${globalProgress * 100}%` }}
              />
            </div>
            <span className="text-sm text-white/60">
              {activeIndex + 1}/{config.scenes.length}
            </span>
          </div>
        </div>
      </div>
      
      {/* Scroll spacers for each scene */}
      <div className="relative pointer-events-none">
        {config.scenes.map((scene) => (
          <div key={scene.id} className="h-screen" />
        ))}
      </div>
      
      {/* Progress dots */}
      {config.showProgress !== false && (
        <ProgressIndicator
          scenes={config.scenes}
          activeIndex={activeIndex}
          globalProgress={globalProgress}
          position={config.progressPosition || 'right'}
          theme="dark"
        />
      )}
    </div>
  );
}

// ============================================================================
// Export default and types
// ============================================================================

export type { Scene as SceneV2, ScrollytellingConfig as ScrollytellingConfigV2 };
export default ScrollytellingEngineV2;
