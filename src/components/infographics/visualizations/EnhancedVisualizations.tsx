'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ColorLegendItem {
  label: string;
  color: string;
  count?: number;
  description?: string;
}

export interface DotGridConfig {
  dotsPerRow?: number;
  dotSize?: number;
  dotGap?: number;
  groupBy?: string;
  colorBy?: string;
  colorMap?: Record<string, string>;
  colorLegend?: ColorLegendItem[];  // New: explicit legend items from AI
  defaultColor?: string;
  highlightColor?: string;
  dimmedOpacity?: number;
  animationDuration?: number;
  animationStagger?: number;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right' | 'overlay-bottom' | 'overlay-top' | 'top-right' | 'top-left';
  highlightedIds?: number[];
  transitionProgress?: number;
  interactive?: boolean;
  theme?: 'light' | 'dark';
  onDotClick?: (record: Record<string, unknown>, index: number) => void;
  onDotHover?: (record: Record<string, unknown> | null, index: number) => void;
}

interface DotGridProps {
  data: Record<string, unknown>[];
  config: DotGridConfig;
  className?: string;
}

// ============================================================================
// Individual Dot Component
// ============================================================================

function Dot({
  record,
  index,
  x,
  y,
  size,
  color,
  isHighlighted,
  isDimmed,
  dimmedOpacity,
  delay,
  duration,
  interactive,
  onClick,
  onHover
}: {
  record: Record<string, unknown>;
  index: number;
  x: number;
  y: number;
  size: number;
  color: string;
  isHighlighted: boolean;
  isDimmed: boolean;
  dimmedOpacity: number;
  delay: number;
  duration: number;
  interactive: boolean;
  onClick?: (record: Record<string, unknown>, index: number) => void;
  onHover?: (record: Record<string, unknown> | null, index: number) => void;
}) {
  const [isAnimated, setIsAnimated] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  const scale = isAnimated ? 1 : 0;
  const opacity = isDimmed ? dimmedOpacity : 1;
  const finalSize = isHighlighted ? size * 1.3 : size;
  const glowSize = isHighlighted ? size * 0.5 : 0;
  
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    onHover?.(record, index);
  }, [record, index, onHover]);
  
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    onHover?.(null, index);
  }, [index, onHover]);
  
  const handleClick = useCallback(() => {
    onClick?.(record, index);
  }, [record, index, onClick]);
  
  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
      onMouseEnter={interactive ? handleMouseEnter : undefined}
      onMouseLeave={interactive ? handleMouseLeave : undefined}
      onClick={interactive ? handleClick : undefined}
    >
      {/* Glow effect for highlighted dots */}
      {isHighlighted && (
        <circle
          r={finalSize / 2 + glowSize}
          fill={color}
          opacity={0.3}
          style={{
            transition: `all ${duration}ms ease-out`,
            filter: 'blur(4px)'
          }}
        />
      )}
      
      {/* Main dot */}
      <circle
        r={finalSize / 2}
        fill={color}
        opacity={opacity}
        style={{
          transform: `scale(${scale})`,
          transition: `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1), 
                       opacity ${duration}ms ease-out,
                       r ${duration}ms ease-out`,
          transformOrigin: 'center'
        }}
      />
      
      {/* Hover ring */}
      {isHovered && (
        <circle
          r={finalSize / 2 + 3}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.8}
        />
      )}
    </g>
  );
}

// ============================================================================
// Enhanced Legend Component (Prominent, Always Visible)
// ============================================================================

export interface ColorLegendItem {
  label: string;
  color: string;
  count?: number;
  description?: string;
}

interface EnhancedLegendProps {
  items: ColorLegendItem[];
  theme?: 'light' | 'dark';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'overlay-bottom' | 'overlay-top' | 'top-right' | 'top-left';
  title?: string;
  dotSize?: number;
  totalRecords?: number; // Explicit total for accurate percentages
  onCategoryClick?: (label: string, records?: Record<string, unknown>[]) => void;
}

export function EnhancedLegend({
  items,
  theme = 'dark',
  position = 'top-right',
  title = 'Legend',
  dotSize = 14,
  totalRecords,
  onCategoryClick
}: EnhancedLegendProps) {
  if (!items || items.length === 0) return null;
  
  const bgClass = theme === 'dark' 
    ? 'bg-gray-900/95 border border-white/10' 
    : 'bg-white/95 border border-gray-200';
  
  const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const subtextClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const headerClass = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
  
  // Position classes for different placements
  const positionClasses: Record<string, string> = {
    'overlay-bottom': 'absolute bottom-4 left-1/2 -translate-x-1/2',
    'overlay-top': 'absolute top-4 left-1/2 -translate-x-1/2',
    'top-right': 'absolute top-4 right-4',
    'top-left': 'absolute top-4 left-4',
    'bottom': 'mt-4',
    'top': 'mb-4',
    'left': 'mr-4',
    'right': 'ml-4',
  };
  
  const positionClass = positionClasses[position] || positionClasses['top-right'];
  
  // Calculate total for percentages - use explicit totalRecords if provided
  const summedTotal = items.reduce((sum, item) => sum + (item.count || 0), 0);
  const total = totalRecords ?? summedTotal;
  
  return (
    <div 
      className={`
        ${bgClass} ${positionClass} rounded-xl p-4 z-20
        shadow-2xl min-w-[200px] max-w-[320px]
      `}
    >
      {/* Header */}
      <div className={`text-xs font-semibold uppercase tracking-wider ${headerClass} mb-3 pb-2 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
        {title}
      </div>
      
      {/* Legend items */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const percentage = total > 0 && item.count ? ((item.count / total) * 100).toFixed(1) : null;
          const isClickable = !!onCategoryClick;
          
          return (
            <div 
              key={index} 
              className={`flex items-start gap-3 ${isClickable ? 'cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors' : ''}`}
              onClick={isClickable ? () => onCategoryClick(item.label) : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              {/* Color indicator with glow */}
              <div 
                className="rounded-full flex-shrink-0 mt-0.5"
                style={{ 
                  width: dotSize, 
                  height: dotSize, 
                  backgroundColor: item.color,
                  boxShadow: theme === 'dark' 
                    ? `0 0 12px ${item.color}60, 0 0 4px ${item.color}` 
                    : `0 2px 4px ${item.color}40`
                }}
              />
              
              {/* Label, count, and description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm font-medium ${textClass} leading-tight ${isClickable ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                    {item.label}
                  </span>
                  {item.count !== undefined && (
                    <span className={`text-sm font-bold ${textClass} tabular-nums`}>
                      {item.count.toLocaleString()}
                    </span>
                  )}
                </div>
                
                {/* Percentage bar */}
                {percentage && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className={`flex-1 h-1.5 rounded-full ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}>
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                    <span className={`text-xs ${subtextClass} tabular-nums w-12 text-right`}>
                      {percentage}%
                    </span>
                  </div>
                )}
                
                {/* Description */}
                {item.description && (
                  <p className={`text-xs ${subtextClass} mt-1 leading-snug`}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Total */}
      {total > 0 && (
        <div className={`mt-3 pt-2 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} flex justify-between`}>
          <span className={`text-xs ${subtextClass}`}>Total</span>
          <span className={`text-sm font-bold ${textClass}`}>{total.toLocaleString()}</span>
        </div>
      )}
      
      {/* Show if partial data in legend */}
      {summedTotal < total && summedTotal > 0 && (
        <div className={`mt-1 text-xs ${subtextClass} italic`}>
          {summedTotal.toLocaleString()} of {total.toLocaleString()} categorized
        </div>
      )}
    </div>
  );
}

// Legacy legend (for backwards compat)
function DotGridLegend({
  colorMap,
  counts,
  dotSize,
  position
}: {
  colorMap: Record<string, string>;
  counts: Record<string, number>;
  dotSize: number;
  position: 'top' | 'bottom' | 'left' | 'right';
}) {
  const items: ColorLegendItem[] = Object.entries(colorMap).map(([label, color]) => ({
    label,
    color,
    count: counts[label] || 0
  }));
  
  return <EnhancedLegend items={items} position={position} dotSize={dotSize} />;
}

// ============================================================================
// Tooltip Component
// ============================================================================

function DotTooltip({
  record,
  position
}: {
  record: Record<string, unknown> | null;
  position: { x: number; y: number };
}) {
  if (!record) return null;
  
  // Get a display name or identifier from the record
  const name = record.name || record.title || record.id || 'Record';
  const details = Object.entries(record)
    .filter(([key]) => !['id', 'name', 'title'].includes(key))
    .slice(0, 4); // Show max 4 additional fields
  
  return (
    <div
      className="absolute z-50 bg-gray-900 text-white text-sm rounded-lg shadow-xl p-3 
                 pointer-events-none transform -translate-x-1/2 -translate-y-full"
      style={{ left: position.x, top: position.y - 10 }}
    >
      <div className="font-semibold mb-1">{String(name)}</div>
      {details.map(([key, value]) => (
        <div key={key} className="text-gray-300 text-xs">
          <span className="text-gray-500">{key}:</span> {String(value)}
        </div>
      ))}
      {/* Arrow */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 
                   border-l-8 border-r-8 border-t-8 
                   border-l-transparent border-r-transparent border-t-gray-900"
      />
    </div>
  );
}

// ============================================================================
// Main DotGrid Component
// ============================================================================

export function EnhancedDotGrid({ data, config, className = '' }: DotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredRecord, setHoveredRecord] = useState<Record<string, unknown> | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const {
    dotsPerRow = 20,
    dotSize = 12,
    dotGap = 4,
    groupBy,
    colorBy,
    colorMap = {},
    defaultColor = '#3B82F6',
    highlightColor = '#EF4444',
    dimmedOpacity = 0.2,
    animationDuration = 400,
    animationStagger = 5,
    showLegend = true,
    legendPosition = 'top-right',
    highlightedIds = [],
    transitionProgress = 1,
    interactive = true,
    onDotClick,
    onDotHover
  } = config;
  
  // Determine if we need scrolling
  const needsScroll = data.length > 400;
  
  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  // Calculate dot positions and colors
  const dotsData = useMemo(() => {
    const cellSize = dotSize + dotGap;
    const rows = Math.ceil(data.length / dotsPerRow);
    
    // Calculate grid dimensions
    const gridWidth = dotsPerRow * cellSize;
    const gridHeight = rows * cellSize;
    
    // For scrollable, left-align with padding. Otherwise center.
    const offsetX = needsScroll 
      ? cellSize / 2 + 16
      : (dimensions.width - gridWidth) / 2 + cellSize / 2;
    const offsetY = cellSize / 2 + 16; // Start from top with padding
    
    return data.map((record, index) => {
      const row = Math.floor(index / dotsPerRow);
      const col = index % dotsPerRow;
      
      // Get color
      let color = defaultColor;
      if (colorBy && colorMap) {
        const colorValue = String(record[colorBy] || '');
        color = colorMap[colorValue] || defaultColor;
      }
      
      // Check if highlighted
      const recordId = record.id as number;
      const isHighlighted = highlightedIds.length > 0 && highlightedIds.includes(recordId);
      const isDimmed = highlightedIds.length > 0 && !isHighlighted;
      
      // Calculate animation delay
      const delay = index * animationStagger;
      
      return {
        record,
        index,
        x: offsetX + col * cellSize,
        y: offsetY + row * cellSize,
        color: isHighlighted ? highlightColor : color,
        isHighlighted,
        isDimmed,
        delay
      };
    });
  }, [data, dimensions, dotsPerRow, dotSize, dotGap, colorBy, colorMap, 
      defaultColor, highlightColor, highlightedIds, animationStagger]);
  
  // Count by color category for legend
  const colorCounts = useMemo((): Record<string, number> => {
    if (!colorBy) return {};
    
    const counts: Record<string, number> = {};
    data.forEach(record => {
      const value = String(record[colorBy] || 'Unknown');
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }, [data, colorBy]);
  
  // Handle hover
  const handleDotHover = useCallback((record: Record<string, unknown> | null, index: number) => {
    setHoveredRecord(record);
    if (record && containerRef.current) {
      const dot = dotsData[index];
      if (dot) {
        setTooltipPosition({ x: dot.x, y: dot.y });
      }
    }
    onDotHover?.(record, index);
  }, [dotsData, onDotHover]);
  
  // Build legend items - prefer explicit colorLegend, fall back to colorMap
  const legendItems: ColorLegendItem[] = useMemo(() => {
    if (config.colorLegend && config.colorLegend.length > 0) {
      // Use explicit legend from AI (with counts from our data if not provided)
      return config.colorLegend.map(item => ({
        ...item,
        count: item.count ?? colorCounts[item.label] ?? 0
      }));
    }
    
    // Fall back to building from colorMap
    if (colorBy && Object.keys(colorMap).length > 0) {
      return Object.entries(colorMap).map(([label, color]) => ({
        label,
        color,
        count: colorCounts[label] || 0
      }));
    }
    
    return [];
  }, [config.colorLegend, colorMap, colorBy, colorCounts]);
  
  const theme = config.theme || 'dark';
  
  // Calculate SVG height - expand for scroll if needed
  const cellSize = dotSize + dotGap;
  const rows = Math.ceil(data.length / dotsPerRow);
  const gridHeight = rows * cellSize + 40;
  const svgHeight = needsScroll ? gridHeight : dimensions.height;
  
  const scrollClass = needsScroll 
    ? 'overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent' 
    : '';
  
  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full ${className}`}
    >
      {/* Always-visible legend in top-right, outside scroll area */}
      {showLegend && legendItems.length > 0 && (
        <EnhancedLegend
          items={legendItems}
          theme={theme}
          position={legendPosition || 'top-right'}
          dotSize={Math.max(dotSize, 12)}
          title={`${data.length.toLocaleString()} records`}
          totalRecords={data.length}
        />
      )}
      
      {/* Scrollable container for the grid */}
      <div className={`w-full h-full ${scrollClass}`}>
        {/* SVG Grid */}
        <svg 
          width={dimensions.width} 
          height={svgHeight}
          className="block"
        >
          {dotsData.map(dot => (
            <Dot
              key={dot.index}
              record={dot.record}
              index={dot.index}
              x={dot.x}
              y={dot.y}
              size={dotSize}
              color={dot.color}
              isHighlighted={dot.isHighlighted}
              isDimmed={dot.isDimmed}
              dimmedOpacity={dimmedOpacity}
              delay={dot.delay}
              duration={animationDuration}
              interactive={interactive}
              onClick={onDotClick}
              onHover={handleDotHover}
            />
          ))}
        </svg>
      </div>
      
      {/* Tooltip */}
      {interactive && hoveredRecord && (
        <DotTooltip record={hoveredRecord} position={tooltipPosition} />
      )}
      
      {/* Scroll indicator for large datasets */}
      {needsScroll && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-400 animate-bounce">
          <span className="text-xs">Scroll to see all {data.length.toLocaleString()}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Animated Counter (enhanced)
// ============================================================================

interface CounterConfig {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  highlightColor?: string;
  animateOnScroll?: boolean;
  format?: 'number' | 'currency' | 'percent';
  locale?: string;
}

export function EnhancedCounter({
  config,
  className = ''
}: {
  config: CounterConfig;
  className?: string;
}) {
  const {
    value,
    prefix = '',
    suffix = '',
    duration = 2000,
    decimals = 0,
    fontSize = '6rem',
    fontWeight = 'bold',
    color = '#111827',
    format = 'number',
    locale = 'en-US'
  } = config;
  
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  // Start animation when visible
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasStarted]);
  
  // Animate the number
  useEffect(() => {
    if (!hasStarted) return;
    
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (value - startValue) * easeProgress;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [hasStarted, value, duration]);
  
  // Format the number
  const formattedValue = useMemo(() => {
    const roundedValue = Number(displayValue.toFixed(decimals));
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(roundedValue);
      case 'percent':
        return new Intl.NumberFormat(locale, {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(roundedValue / 100);
      default:
        return new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(roundedValue);
    }
  }, [displayValue, decimals, format, locale]);
  
  return (
    <div ref={ref} className={`text-center ${className}`}>
      <span
        style={{
          fontSize,
          fontWeight,
          color,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {prefix}{formattedValue}{suffix}
      </span>
    </div>
  );
}

// ============================================================================
// Human Grid (person icons instead of dots)
// ============================================================================

function PersonIcon({ 
  x, 
  y, 
  size, 
  color, 
  opacity,
  isHighlighted 
}: { 
  x: number; 
  y: number; 
  size: number; 
  color: string; 
  opacity: number;
  isHighlighted: boolean;
}) {
  const scale = size / 24; // Base icon is 24x24
  
  return (
    <g 
      transform={`translate(${x - size/2}, ${y - size/2}) scale(${scale})`}
      opacity={opacity}
    >
      {/* Person silhouette */}
      <circle cx="12" cy="7" r="4" fill={color} />
      <path 
        d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z" 
        fill={color}
      />
      {/* Highlight glow */}
      {isHighlighted && (
        <circle 
          cx="12" 
          cy="12" 
          r="14" 
          fill={color} 
          opacity={0.2}
          style={{ filter: 'blur(4px)' }}
        />
      )}
    </g>
  );
}

export function HumanGrid({ 
  data, 
  config, 
  className = '' 
}: DotGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const {
    colorBy,
    colorMap = {},
    defaultColor = '#6B7280',
    highlightColor = '#EF4444',
    dimmedOpacity = 0.15,
    highlightedIds = [],
    showLegend = true,
    legendPosition = 'top-right',
    dotsPerRow
  } = config;
  
  // Compute color counts for legend
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (colorBy) {
      data.forEach(record => {
        const colorValue = String(record[colorBy] || 'Unknown');
        counts[colorValue] = (counts[colorValue] || 0) + 1;
      });
    }
    return counts;
  }, [data, colorBy]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  // Determine if we need scrolling (too many items to fit comfortably)
  const needsScroll = data.length > 200;
  
  // DYNAMIC SIZING: Calculate optimal icon size and grid to fill the space
  const gridConfig = useMemo(() => {
    const count = data.length;
    const availableWidth = dimensions.width * 0.85; // Leave room for legend
    const availableHeight = needsScroll 
      ? dimensions.height * 5 // Allow tall scrollable area
      : dimensions.height * 0.85; // Fixed height when few items
    
    // If dotsPerRow is specified, use it
    let cols = dotsPerRow || Math.ceil(Math.sqrt(count * (availableWidth / availableHeight)));
    // Ensure at least 10 columns for visibility
    cols = Math.max(cols, 10);
    let rows = Math.ceil(count / cols);
    
    // Ensure we don't have too many empty spots
    while (cols * (rows - 1) >= count && rows > 1) {
      rows--;
    }
    
    // Calculate cell size - for scrollable, use fixed comfortable size
    let cellSize: number;
    if (needsScroll) {
      cellSize = 32; // Fixed comfortable size for scrollable grids
    } else {
      const maxCellWidth = availableWidth / cols;
      const maxCellHeight = availableHeight / rows;
      cellSize = Math.min(maxCellWidth, maxCellHeight, 50);
    }
    
    const iconSize = cellSize * 0.75; // Icon is 75% of cell
    
    // Calculate actual grid dimensions
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;
    
    // For scrollable, left-align. Otherwise center
    const offsetX = needsScroll 
      ? cellSize / 2 + 16 
      : (dimensions.width - gridWidth) / 2 + cellSize / 2;
    const offsetY = cellSize / 2 + 16; // Always start from top with padding
    
    return { cols, rows, cellSize, iconSize, offsetX, offsetY, gridHeight };
  }, [data.length, dimensions, needsScroll, dotsPerRow]);
  
  const peopleData = useMemo(() => {
    const { cols, cellSize, iconSize, offsetX, offsetY } = gridConfig;
    
    return data.map((record, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      let color = defaultColor;
      if (colorBy && colorMap) {
        const colorValue = String(record[colorBy] || '');
        color = colorMap[colorValue] || defaultColor;
      }
      
      const recordId = record.id as number;
      const isHighlighted = highlightedIds.length > 0 && highlightedIds.includes(recordId);
      const isDimmed = highlightedIds.length > 0 && !isHighlighted;
      
      return {
        index,
        x: offsetX + col * cellSize,
        y: offsetY + row * cellSize,
        size: iconSize,
        color: isHighlighted ? highlightColor : color,
        opacity: isDimmed ? dimmedOpacity : 1,
        isHighlighted
      };
    });
  }, [data, gridConfig, colorBy, colorMap, defaultColor, highlightColor, highlightedIds, dimmedOpacity]);
  
  // Build legend items
  const legendItems: ColorLegendItem[] = useMemo(() => {
    if (config.colorLegend && config.colorLegend.length > 0) {
      return config.colorLegend.map(item => ({
        ...item,
        count: item.count ?? colorCounts[item.label] ?? 0
      }));
    }
    
    if (colorBy && Object.keys(colorMap).length > 0) {
      return Object.entries(colorMap).map(([label, color]) => ({
        label,
        color,
        count: colorCounts[label] || 0
      }));
    }
    
    return [];
  }, [config.colorLegend, colorMap, colorBy, colorCounts]);
  
  const theme = config.theme || 'dark';
  
  // Calculate SVG height - either fit to container or expand for scroll
  const svgHeight = needsScroll 
    ? gridConfig.gridHeight + 40 
    : dimensions.height;
  
  const scrollClass = needsScroll 
    ? 'overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent' 
    : '';
  
  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {/* Legend positioned at top-right, outside scroll area */}
      {showLegend && legendItems.length > 0 && (
        <EnhancedLegend
          items={legendItems}
          theme={theme}
          position={legendPosition || 'top-right'}
          dotSize={Math.max(14, gridConfig.iconSize * 0.5)}
          title={`${data.length.toLocaleString()} people`}
        />
      )}
      
      {/* Scrollable container for the grid */}
      <div className={`w-full h-full ${scrollClass}`}>
        <svg 
          width={dimensions.width} 
          height={svgHeight}
          className="block"
        >
          {peopleData.map(person => (
            <PersonIcon
              key={person.index}
              x={person.x}
              y={person.y}
              size={person.size}
              color={person.color}
              opacity={person.opacity}
              isHighlighted={person.isHighlighted}
            />
          ))}
        </svg>
      </div>
      
      {/* Scroll indicator for large datasets */}
      {needsScroll && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-400 animate-bounce">
          <span className="text-xs">Scroll to see all {data.length.toLocaleString()}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default EnhancedDotGrid;
