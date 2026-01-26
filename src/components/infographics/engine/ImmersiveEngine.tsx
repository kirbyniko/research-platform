'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface Scene {
  id: string;
  narrativeText: string;
  narrativeSubtext?: string;
  visualizationType: 'dotGrid' | 'humanGrid' | 'counter' | 'comparison' | 'timeline' | 'barChart' | 'pieChart' | 'humanScale';
  visualizationConfig: Record<string, unknown>;
  filterRecords?: Record<string, unknown>;
  highlightRecordIds?: number[];
  transition?: 'fade' | 'morph' | 'zoom' | 'slide';
  transitionDuration?: number;
  backgroundColor?: string;
  textColor?: string;
  annotation?: {
    text: string;
    position?: string;
  };
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

interface ImmersiveEngineProps {
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
  onSceneFeedback?: (sceneId: string, feedback: 'good' | 'bad' | 'regenerate') => void;
  showFeedback?: boolean;
}

// ============================================================================
// Smooth Scroll Progress Hook (optimized)
// ============================================================================

function useSmoothScrollProgress(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const lastProgressRef = useRef(0);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let isRunning = true;
    
    const updateProgress = () => {
      if (!isRunning) return;
      
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollableHeight = rect.height - windowHeight;
      
      if (scrollableHeight <= 0) {
        setScrollProgress(0);
        rafRef.current = requestAnimationFrame(updateProgress);
        return;
      }
      
      const scrolled = -rect.top;
      const rawProgress = Math.max(0, Math.min(1, scrolled / scrollableHeight));
      
      // Smooth interpolation for buttery animations
      const smoothingFactor = 0.12;
      const smoothedProgress = lastProgressRef.current + 
        (rawProgress - lastProgressRef.current) * smoothingFactor;
      
      // Only update if meaningful change
      if (Math.abs(smoothedProgress - lastProgressRef.current) > 0.0001) {
        lastProgressRef.current = smoothedProgress;
        setScrollProgress(smoothedProgress);
      }
      
      rafRef.current = requestAnimationFrame(updateProgress);
    };
    
    rafRef.current = requestAnimationFrame(updateProgress);
    
    return () => {
      isRunning = false;
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

function useSceneProgress(globalProgress: number, sceneCount: number) {
  return useMemo(() => {
    if (sceneCount === 0) return { activeIndex: 0, sceneProgress: 0, isTransitioning: false };
    
    const sceneSize = 1 / sceneCount;
    const activeIndex = Math.min(Math.floor(globalProgress / sceneSize), sceneCount - 1);
    const sceneStart = activeIndex * sceneSize;
    const sceneProgress = (globalProgress - sceneStart) / sceneSize;
    
    // Transition zone is 15% at scene boundaries
    // BUT: First scene at start (progress near 0) should NOT be in transition
    const transitionZone = 0.15;
    const isAtVeryStart = activeIndex === 0 && globalProgress < 0.02;
    const isTransitioning = isAtVeryStart 
      ? false  // Never show first scene as transitioning when at top
      : (sceneProgress < transitionZone || sceneProgress > (1 - transitionZone));
    
    return { activeIndex, sceneProgress: Math.min(Math.max(sceneProgress, 0), 1), isTransitioning };
  }, [globalProgress, sceneCount]);
}

// ============================================================================
// Progress Indicator (vertical dots)
// ============================================================================

function ProgressIndicator({ 
  scenes, 
  activeIndex, 
  globalProgress,
  position = 'right',
  theme = 'dark'
}: { 
  scenes: Scene[]; 
  activeIndex: number;
  globalProgress: number;
  position?: 'left' | 'right';
  theme?: 'light' | 'dark';
}) {
  const positionClass = position === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6';
  const dotInactive = theme === 'dark' ? 'bg-white/20' : 'bg-black/20';
  const dotActive = theme === 'dark' ? 'bg-white' : 'bg-gray-900';
  const textColor = theme === 'dark' ? 'text-white/70' : 'text-gray-600';
  
  return (
    <div className={`fixed top-1/2 -translate-y-1/2 z-50 ${positionClass}`}>
      <div className="flex flex-col items-center gap-3">
        {scenes.map((scene, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          
          return (
            <button
              key={scene.id}
              className="group relative flex items-center justify-center"
              onClick={() => {
                const targetProgress = index / scenes.length;
                const container = document.querySelector('[data-scrolly-container]');
                if (container) {
                  const rect = container.getBoundingClientRect();
                  const scrollableHeight = rect.height - window.innerHeight;
                  const targetScroll = targetProgress * scrollableHeight + window.scrollY + rect.top;
                  window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }
              }}
            >
              {/* Dot */}
              <div className={`
                w-3 h-3 rounded-full transition-all duration-500 ease-out
                ${isActive ? `${dotActive} scale-125 shadow-lg` : isPast ? dotActive : dotInactive}
              `}>
                {isActive && (
                  <div className={`absolute inset-0 rounded-full ${dotActive} animate-ping opacity-30`} />
                )}
              </div>
              
              {/* Hover label */}
              <div className={`
                absolute ${position === 'left' ? 'left-full ml-3' : 'right-full mr-3'} 
                whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                ${textColor} text-sm font-medium
                bg-black/50 backdrop-blur-sm px-2 py-1 rounded
              `}>
                {index + 1}. {scene.narrativeText.substring(0, 30)}...
              </div>
            </button>
          );
        })}
        
        {/* Progress line */}
        <div className={`absolute left-1/2 -translate-x-1/2 w-0.5 h-full ${dotInactive} -z-10`}>
          <div 
            className={`w-full ${dotActive} transition-all duration-300`}
            style={{ height: `${globalProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Narrative Text Component (full-screen overlay style)
// ============================================================================

function NarrativeOverlay({
  scene,
  progress,
  isActive,
  theme,
  sceneIndex,
  totalScenes,
  onFeedback
}: {
  scene: Scene;
  progress: number;
  isActive: boolean;
  theme: 'light' | 'dark';
  sceneIndex: number;
  totalScenes: number;
  onFeedback?: (feedback: 'good' | 'bad' | 'regenerate') => void;
}) {
  // First scene should always be visible at start
  const isFirstScene = sceneIndex === 0;
  
  // Fade in/out based on progress - first scene starts fully visible
  const fadeIn = isFirstScene 
    ? (progress < 0.1 ? 1 : Math.min(progress * 4, 1))  // First scene: always visible at start
    : Math.min(progress * 4, 1);  // Other scenes: fade in as you scroll into them
  const fadeOut = progress > 0.85 ? 1 - ((progress - 0.85) / 0.15) : 1;
  const opacity = isActive ? fadeIn * fadeOut : 0;
  
  const bgColor = theme === 'dark' 
    ? 'bg-gray-950' 
    : 'bg-white';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
  const textMuted = theme === 'dark' ? 'text-gray-500' : 'text-gray-400';
  
  return (
    <div 
      className={`
        h-full w-full ${bgColor}
        transition-opacity duration-500
      `}
      style={{ opacity }}
    >
      {/* Content */}
      <div className="h-full px-6 md:px-12 lg:px-20 py-4 md:py-6 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto w-full">
          {/* Main narrative */}
          <h2 
            className={`
              text-2xl md:text-3xl lg:text-4xl font-bold leading-tight mb-2 md:mb-3
              ${textPrimary}
            `}
            style={{ 
              transform: `translateY(${(1 - fadeIn) * 10}px)`,
              transition: 'transform 300ms ease-out'
            }}
          >
            {scene.narrativeText}
          </h2>
          
          {/* Subtext */}
          {scene.narrativeSubtext && (
            <p 
              className={`text-base md:text-lg ${textSecondary} max-w-2xl`}
              style={{ 
                transform: `translateY(${(1 - fadeIn) * 15}px)`,
                opacity: fadeIn * 0.9,
                transition: 'transform 300ms ease-out, opacity 300ms ease-out'
              }}
            >
              {scene.narrativeSubtext}
            </p>
          )}
          
          {/* Scene counter */}
          <div className={`mt-3 text-sm font-medium ${textMuted}`}>
            <span className={textPrimary}>{sceneIndex + 1}</span>
            <span> / {totalScenes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Immersive Engine
// ============================================================================

export function ImmersiveEngine({
  config,
  data,
  renderVisualization,
  className = '',
  onSceneFeedback,
  showFeedback = false
}: ImmersiveEngineProps) {
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
  const theme = config.theme || 'dark';
  
  // Calculate scroll height (each scene = 100vh of scroll)
  const totalScrollHeight = config.scenes.length * 100;
  
  // Background color with scene-specific override
  const bgColor = activeScene?.backgroundColor || (theme === 'dark' ? '#030712' : '#ffffff');
  
  const handleFeedback = useCallback((feedback: 'good' | 'bad' | 'regenerate') => {
    if (onSceneFeedback && activeScene) {
      onSceneFeedback(activeScene.id, feedback);
    }
  }, [onSceneFeedback, activeScene]);
  
  return (
    <div 
      ref={containerRef}
      data-scrolly-container
      className={`relative w-full ${className}`}
      style={{ 
        minHeight: `${totalScrollHeight}vh`,
        backgroundColor: bgColor
      }}
    >
      {/* Full-screen sticky visualization */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col">
        {/* Dynamic background with smooth transition */}
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-out -z-10"
          style={{ backgroundColor: bgColor }}
        />
        
        {/* Visualization area - takes top portion, leaves room for narrative */}
        <div 
          className="flex-1 flex items-center justify-center min-h-0 pt-4 pb-0"
          style={{ 
            maxHeight: 'calc(100vh - 200px)', // Leave space for narrative
            opacity: isTransitioning ? 0 : 1,
            transform: `scale(${isTransitioning ? 0.95 : 1})`,
            transition: 'opacity 500ms ease-out, transform 500ms ease-out'
          }}
        >
          <div className="w-full h-full p-4 md:p-6 lg:p-8 flex items-center justify-center">
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
        </div>
        
        {/* Narrative area - fixed at bottom, never overlaps */}
        <div className="flex-shrink-0 h-[200px] relative z-20">
          {activeScene && (
            <NarrativeOverlay
              scene={activeScene}
              progress={sceneProgress}
              isActive={true}
              theme={theme}
            sceneIndex={activeIndex}
            totalScenes={config.scenes.length}
            onFeedback={showFeedback ? handleFeedback : undefined}
          />
        )}
        </div>
      </div>
      
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
      
      {/* Scroll hint on first scene */}
      {activeIndex === 0 && sceneProgress < 0.3 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <div className={`
            flex flex-col items-center gap-2
            ${theme === 'dark' ? 'text-white/60' : 'text-gray-400'}
          `}>
            <span className="text-sm">Scroll to explore</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImmersiveEngine;
