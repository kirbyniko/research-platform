'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Scene } from './ScrollytellingEngine';

/**
 * AccumulativeEngine - Inspired by "One Pixel Wealth" and "Incarceration in Real Numbers"
 * 
 * Key principles:
 * 1. Content ACCUMULATES - previous sections stay visible above
 * 2. NO snap scrolling - natural, smooth scroll behavior  
 * 3. Sections fade/slide in from below as you scroll
 * 4. Large visualizations can span full height without being cut off
 * 5. The scroll distance itself conveys magnitude
 */

export interface AccumulativeConfig {
  scenes: Scene[];
  theme?: 'light' | 'dark';
  title?: string;
  showProgress?: boolean;
}

interface AccumulativeEngineProps {
  config: AccumulativeConfig;
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

// Hook to track how far a section is scrolled into view
function useSectionVisibility(ref: React.RefObject<HTMLElement | null>) {
  const [visibility, setVisibility] = useState(0);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // Calculate how much of the element is in view (0-1)
          setVisibility(entry.intersectionRatio);
        });
      },
      {
        threshold: Array.from({ length: 21 }, (_, i) => i / 20), // 0, 0.05, 0.1, ... 1
        rootMargin: '0px'
      }
    );
    
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  
  return visibility;
}

// Individual section that fades in as it scrolls into view
function AccumulativeSection({
  scene,
  sceneIndex,
  totalScenes,
  data,
  renderVisualization,
  theme = 'dark'
}: {
  scene: Scene;
  sceneIndex: number;
  totalScenes: number;
  data: Record<string, unknown>[];
  renderVisualization: AccumulativeEngineProps['renderVisualization'];
  theme: 'light' | 'dark';
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const visibility = useSectionVisibility(sectionRef);
  
  // Animation based on visibility
  const opacity = Math.min(visibility * 2, 1); // Fade in quickly
  const translateY = (1 - Math.min(visibility * 1.5, 1)) * 30; // Slide up from below
  
  const bgColor = theme === 'dark' ? 'bg-gray-950' : 'bg-white';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const borderColor = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';
  
  // Filter data for this scene if needed
  const filteredData = useMemo(() => {
    if (!scene.filterRecords) return data;
    return data.filter(record => {
      return Object.entries(scene.filterRecords!).every(([key, value]) => {
        if (Array.isArray(value)) return value.includes(record[key]);
        return record[key] === value;
      });
    });
  }, [data, scene.filterRecords]);
  
  const isFirstScene = sceneIndex === 0;
  
  return (
    <section
      ref={sectionRef}
      className={`
        ${bgColor} ${borderColor}
        ${!isFirstScene ? 'border-t' : ''}
        transition-opacity duration-500
      `}
      style={{ 
        opacity: isFirstScene ? 1 : opacity,
        transform: isFirstScene ? 'none' : `translateY(${translateY}px)`
      }}
    >
      {/* Section content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        {/* Scene counter badge */}
        <div className={`inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full text-sm font-medium
                        ${theme === 'dark' ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-500'}`}>
          <span>{sceneIndex + 1}</span>
          <span className="opacity-50">/</span>
          <span className="opacity-50">{totalScenes}</span>
        </div>
        
        {/* Narrative text - large and impactful */}
        <h2 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold ${textPrimary} mb-4 leading-tight`}>
          {scene.narrativeText}
        </h2>
        
        {/* Subtext */}
        {scene.narrativeSubtext && (
          <p className={`text-lg md:text-xl ${textSecondary} mb-8 md:mb-12 max-w-3xl`}>
            {scene.narrativeSubtext}
          </p>
        )}
        
        {/* Visualization - takes full width, can grow as needed */}
        <div className="w-full min-h-[300px] md:min-h-[400px]">
          {renderVisualization(
            scene,
            filteredData,
            visibility,
            false,
            theme
          )}
        </div>
        
        {/* Optional annotation - cast to extended type */}
        {(scene as Scene & { annotation?: { text: string } }).annotation && (
          <p className={`mt-6 text-sm ${textSecondary} italic max-w-2xl`}>
            {(scene as Scene & { annotation?: { text: string } }).annotation?.text}
          </p>
        )}
      </div>
    </section>
  );
}

// Progress bar at top of screen
function TopProgressBar({ 
  progress, 
  theme 
}: { 
  progress: number; 
  theme: 'light' | 'dark';
}) {
  const barColor = theme === 'dark' ? 'bg-white' : 'bg-gray-900';
  const trackColor = theme === 'dark' ? 'bg-white/10' : 'bg-gray-200';
  
  return (
    <div className={`fixed top-0 left-0 right-0 h-1 ${trackColor} z-50`}>
      <div 
        className={`h-full ${barColor} transition-all duration-100`}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

// Main component
export function AccumulativeEngine({
  config,
  data,
  renderVisualization,
  className = ''
}: AccumulativeEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const theme = config.theme || 'dark';
  const bgColor = theme === 'dark' ? 'bg-gray-950' : 'bg-white';
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  
  // Track scroll progress for the progress bar
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) {
        setScrollProgress(0);
        return;
      }
      
      const scrolled = -rect.top;
      setScrollProgress(Math.max(0, Math.min(1, scrolled / scrollable)));
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className={`${bgColor} ${className}`}
    >
      {/* Progress bar */}
      {config.showProgress !== false && (
        <TopProgressBar progress={scrollProgress} theme={theme} />
      )}
      
      {/* Title section - always visible at top */}
      {config.title && (
        <header className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-4xl">
            <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black ${textPrimary} mb-6`}>
              {config.title}
            </h1>
            <p className={`text-lg md:text-xl ${textSecondary}`}>
              Scroll to explore
            </p>
            <div className={`mt-8 animate-bounce ${textSecondary}`}>
              <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </header>
      )}
      
      {/* Accumulative sections - each one stacks on top of the previous */}
      {config.scenes.map((scene, index) => (
        <AccumulativeSection
          key={scene.id}
          scene={scene}
          sceneIndex={index}
          totalScenes={config.scenes.length}
          data={data}
          renderVisualization={renderVisualization}
          theme={theme}
        />
      ))}
      
      {/* End section */}
      <footer className={`py-20 text-center ${bgColor}`}>
        <p className={textSecondary}>
          Based on {data.length.toLocaleString()} documented records
        </p>
      </footer>
    </div>
  );
}

export default AccumulativeEngine;
