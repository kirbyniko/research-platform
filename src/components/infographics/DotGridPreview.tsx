'use client';

import { useEffect, useState, useRef } from 'react';
import { DotGridConfig, NarrativeBlock } from '@/types/platform';

interface DotGridPreviewProps {
  config: DotGridConfig;
  data: {
    records?: Array<Record<string, unknown>>;
    count: number;
    groupedData?: Record<string, { count: number }>;
    colorGroups?: Record<string, { count: number; color?: string }>;
  };
  narrative?: NarrativeBlock[];
  animated?: boolean;
}

export function DotGridPreview({ 
  config, 
  data, 
  narrative = [],
  animated = true 
}: DotGridPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!animated);
  const [animatedCount, setAnimatedCount] = useState(0);

  const {
    dotSize = 8,
    dotSpacing = 4,
    dotColor = '#dc2626',
    dotShape = 'circle',
    groupBy,
    colorBy,
    colorScale = {},
    showLegend = true,
    legendPosition = 'bottom',
    showCount = true,
    animation = { enabled: true, type: 'scatter', duration: 1500, staggerDelay: 10 }
  } = config;

  const totalDots = data.count;
  
  // Calculate grid dimensions
  const gridSize = Math.ceil(Math.sqrt(totalDots));
  const dotTotalSize = dotSize + dotSpacing;
  const gridWidth = gridSize * dotTotalSize;
  
  // Set up intersection observer for scroll-triggered animation
  useEffect(() => {
    if (!animated || !animation.enabled) {
      setIsVisible(true);
      setAnimatedCount(totalDots);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animated, animation.enabled, isVisible, totalDots]);

  // Animate dot count
  useEffect(() => {
    if (!isVisible) return;
    
    if (!animation.enabled) {
      setAnimatedCount(totalDots);
      return;
    }

    const duration = animation.duration || 1500;
    const stagger = animation.staggerDelay || 10;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const count = Math.floor(eased * totalDots);
      
      setAnimatedCount(count);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isVisible, totalDots, animation]);

  // Generate dots with colors based on data
  const getDotColor = (index: number): string => {
    if (colorBy && data.records && data.records[index]) {
      const value = String(data.records[index][colorBy] || 'Unknown');
      return colorScale[value] || data.colorGroups?.[value]?.color || dotColor;
    }
    return dotColor;
  };

  // Build legend items
  const legendItems = colorBy && data.colorGroups 
    ? Object.entries(data.colorGroups).map(([label, { count, color }]) => ({
        label,
        count,
        color: colorScale[label] || color || dotColor
      }))
    : groupBy && data.groupedData
    ? Object.entries(data.groupedData).map(([label, { count }]) => ({
        label,
        count,
        color: colorScale[label] || dotColor
      }))
    : [];

  // Find top narrative block
  const topNarrative = narrative.find(n => n.position === 'top');
  const bottomNarrative = narrative.find(n => n.position === 'bottom');

  return (
    <div ref={containerRef} className="w-full">
      {/* Top narrative */}
      {topNarrative && (
        <div 
          className="mb-6 text-gray-700"
          style={topNarrative.style as React.CSSProperties}
        >
          {topNarrative.text}
        </div>
      )}

      {/* Count display */}
      {showCount && (
        <div className="text-center mb-6">
          <span 
            className="font-bold text-5xl tabular-nums"
            style={{ color: dotColor }}
          >
            {animatedCount.toLocaleString()}
          </span>
          {totalDots !== animatedCount && (
            <span className="text-gray-400 ml-2">/ {totalDots.toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Dot grid */}
      <div 
        className="flex flex-wrap justify-center mx-auto"
        style={{ 
          maxWidth: `${gridWidth}px`,
          gap: `${dotSpacing}px`
        }}
      >
        {Array.from({ length: totalDots }).map((_, index) => {
          const isAnimated = index < animatedCount;
          const color = getDotColor(index);
          
          return (
            <div
              key={index}
              className="transition-all duration-200"
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                backgroundColor: color,
                borderRadius: dotShape === 'circle' ? '50%' : dotShape === 'square' ? '0' : '2px',
                opacity: isAnimated ? 1 : 0,
                transform: isAnimated ? 'scale(1)' : 'scale(0)',
                transitionDelay: animation.enabled ? `${(index % 100) * (animation.staggerDelay || 2)}ms` : '0ms'
              }}
              title={data.records?.[index] ? JSON.stringify(data.records[index]).slice(0, 100) : `Item ${index + 1}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && legendItems.length > 0 && (
        <div 
          className={`mt-6 flex flex-wrap gap-4 ${
            legendPosition === 'bottom' ? 'justify-center' : ''
          }`}
        >
          {legendItems.map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-700">{label}</span>
              <span className="text-gray-400">({count})</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom narrative */}
      {bottomNarrative && (
        <div 
          className="mt-6 text-gray-700"
          style={bottomNarrative.style as React.CSSProperties}
        >
          {bottomNarrative.text}
        </div>
      )}
    </div>
  );
}
