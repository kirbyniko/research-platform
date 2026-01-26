'use client';

import { useEffect, useState, useRef } from 'react';
import { CounterConfig, NarrativeBlock } from '@/types/platform';

interface CounterPreviewProps {
  config: CounterConfig;
  count: number;
  narrative?: NarrativeBlock[];
}

export function CounterPreview({ config, count, narrative = [] }: CounterPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animatedValue, setAnimatedValue] = useState(0);

  const {
    fontSize = 72,
    fontWeight = 'bold',
    color = '#dc2626',
    prefix = '',
    suffix = '',
    animateOnScroll = true,
    startValue = 0,
    duration = 2000,
    showComparison = false,
    comparisonValue,
    comparisonLabel,
    animation = { enabled: true, type: 'fade', duration: 500 }
  } = config;

  // Intersection observer for scroll trigger
  useEffect(() => {
    if (!animateOnScroll) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animateOnScroll]);

  // Animate counter
  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const from = startValue;
    const to = count;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out exponential
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(from + (to - from) * eased);
      
      setAnimatedValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isVisible, count, startValue, duration]);

  // Format number with commas
  const formatNumber = (n: number): string => {
    return n.toLocaleString();
  };

  // Calculate comparison
  const comparisonDiff = showComparison && comparisonValue 
    ? count - comparisonValue 
    : null;
  const comparisonPercent = showComparison && comparisonValue && comparisonValue !== 0
    ? ((count - comparisonValue) / comparisonValue * 100).toFixed(1)
    : null;

  // Find narratives
  const topNarrative = narrative.find(n => n.position === 'top');
  const bottomNarrative = narrative.find(n => n.position === 'bottom');

  return (
    <div 
      ref={containerRef}
      className="text-center py-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${animation.duration}ms ease-out`
      }}
    >
      {/* Top narrative */}
      {topNarrative && (
        <div 
          className="mb-6 text-gray-700 max-w-lg mx-auto"
          style={topNarrative.style as React.CSSProperties}
        >
          {topNarrative.text}
        </div>
      )}

      {/* Main counter */}
      <div 
        className="tabular-nums"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight as any,
          color: color,
          lineHeight: 1.2
        }}
      >
        {prefix && <span className="opacity-60">{prefix}</span>}
        <span>{formatNumber(animatedValue)}</span>
        {suffix && <span className="opacity-60">{suffix}</span>}
      </div>

      {/* Comparison */}
      {showComparison && comparisonValue !== undefined && (
        <div className="mt-4 text-gray-500">
          {comparisonLabel && <span className="mr-2">{comparisonLabel}:</span>}
          <span className={`font-medium ${
            comparisonDiff && comparisonDiff > 0 ? 'text-red-600' : 
            comparisonDiff && comparisonDiff < 0 ? 'text-green-600' : ''
          }`}>
            {comparisonDiff && comparisonDiff > 0 ? '+' : ''}
            {comparisonDiff !== null && formatNumber(comparisonDiff)}
            {comparisonPercent && (
              <span className="text-sm ml-1">({comparisonPercent}%)</span>
            )}
          </span>
        </div>
      )}

      {/* Bottom narrative */}
      {bottomNarrative && (
        <div 
          className="mt-6 text-gray-700 max-w-lg mx-auto"
          style={bottomNarrative.style as React.CSSProperties}
        >
          {bottomNarrative.text}
        </div>
      )}
    </div>
  );
}
