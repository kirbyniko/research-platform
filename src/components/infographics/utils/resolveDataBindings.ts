/**
 * Data Binding Resolution Utilities
 * 
 * These utilities resolve data bindings in infographic scenes to actual values
 * computed from the real record data. This ensures:
 * 1. Visualizations always reflect current data
 * 2. Data is clickable/traceable to sources
 * 3. Numbers update automatically when records change
 */

import { Scene, DataBinding } from '../engine/ScrollytellingEngine';

export interface ResolvedData {
  /** The computed value (for counter, humanScale) */
  value?: number;
  /** Grouped data (for charts, grids with colorBy) */
  groups?: Array<{ key: string; value: number; records: Record<string, unknown>[] }>;
  /** The records that contributed to this value */
  sourceRecords: Record<string, unknown>[];
  /** Total count of records involved */
  totalCount: number;
}

/**
 * Apply a filter to records
 */
function applyFilter(
  records: Record<string, unknown>[],
  filter: Record<string, unknown>
): Record<string, unknown>[] {
  return records.filter(record => {
    for (const [key, value] of Object.entries(filter)) {
      const recordValue = record[key];
      
      // Handle array filter (value in list)
      if (Array.isArray(value)) {
        if (!value.includes(recordValue)) return false;
      }
      // Handle range filter { min, max }
      else if (typeof value === 'object' && value !== null) {
        const rangeFilter = value as { min?: number; max?: number };
        const numValue = Number(recordValue);
        if (rangeFilter.min !== undefined && numValue < rangeFilter.min) return false;
        if (rangeFilter.max !== undefined && numValue > rangeFilter.max) return false;
      }
      // Handle exact match
      else if (recordValue !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Resolve a data binding to actual values from records
 */
export function resolveDataBinding(
  binding: DataBinding,
  data: Record<string, unknown>[]
): ResolvedData {
  // Apply filter if specified
  let filteredData = binding.filter 
    ? applyFilter(data, binding.filter)
    : data;

  switch (binding.type) {
    case 'count':
      return {
        value: filteredData.length,
        sourceRecords: filteredData,
        totalCount: filteredData.length
      };

    case 'sum':
      if (!binding.field) {
        return { value: 0, sourceRecords: [], totalCount: 0 };
      }
      const sum = filteredData.reduce((acc, record) => {
        const val = Number(record[binding.field!]) || 0;
        return acc + val;
      }, 0);
      return {
        value: sum,
        sourceRecords: filteredData,
        totalCount: filteredData.length
      };

    case 'average':
      if (!binding.field || filteredData.length === 0) {
        return { value: 0, sourceRecords: [], totalCount: 0 };
      }
      const total = filteredData.reduce((acc, record) => {
        const val = Number(record[binding.field!]) || 0;
        return acc + val;
      }, 0);
      return {
        value: total / filteredData.length,
        sourceRecords: filteredData,
        totalCount: filteredData.length
      };

    case 'groupBy':
      if (!binding.field) {
        return { groups: [], sourceRecords: [], totalCount: 0 };
      }
      const groups: Map<string, { count: number; records: Record<string, unknown>[] }> = new Map();
      
      for (const record of filteredData) {
        const key = String(record[binding.field] ?? 'Unknown');
        if (!groups.has(key)) {
          groups.set(key, { count: 0, records: [] });
        }
        const group = groups.get(key)!;
        group.count++;
        group.records.push(record);
      }
      
      return {
        groups: Array.from(groups.entries()).map(([key, { count, records }]) => ({
          key,
          value: count,
          records
        })).sort((a, b) => b.value - a.value), // Sort by count descending
        sourceRecords: filteredData,
        totalCount: filteredData.length
      };

    case 'records':
      const limitedData = binding.limit 
        ? filteredData.slice(0, binding.limit)
        : filteredData;
      return {
        sourceRecords: limitedData,
        totalCount: filteredData.length
      };

    case 'field':
      // Return unique values of a field
      if (!binding.field) {
        return { sourceRecords: [], totalCount: 0 };
      }
      const uniqueValues = new Set(filteredData.map(r => r[binding.field!]));
      return {
        value: uniqueValues.size,
        sourceRecords: filteredData,
        totalCount: filteredData.length
      };

    default:
      return { sourceRecords: filteredData, totalCount: filteredData.length };
  }
}

/**
 * Resolve a scene's visualization config, replacing data bindings with real values
 * Returns both the resolved config and the source records for clickability
 */
export function resolveSceneData(
  scene: Scene,
  data: Record<string, unknown>[]
): {
  resolvedConfig: Record<string, unknown>;
  sourceRecords: Record<string, unknown>[];
  totalCount: number;
  groupedRecords?: Map<string, Record<string, unknown>[]>;
} {
  const config = { ...scene.visualizationConfig };
  let sourceRecords = data;
  let totalCount = data.length;
  let groupedRecords: Map<string, Record<string, unknown>[]> | undefined;

  // Apply scene-level filter first
  if (scene.filterRecords) {
    sourceRecords = applyFilter(data, scene.filterRecords);
    totalCount = sourceRecords.length;
  }

  // If there's a data binding, resolve it
  if (scene.dataBinding) {
    const resolved = resolveDataBinding(scene.dataBinding, sourceRecords);
    sourceRecords = resolved.sourceRecords;
    totalCount = resolved.totalCount;

    // Apply resolved values to config based on visualization type
    switch (scene.visualizationType) {
      case 'counter':
      case 'humanScale':
        if (resolved.value !== undefined) {
          config.value = resolved.value;
        }
        break;

      case 'dotGrid':
      case 'humanGrid':
        // For grids, the data itself is the source records
        // colorBy grouping will be computed from sourceRecords
        break;

      case 'barChart':
      case 'pieChart':
      case 'comparison':
        // Use grouped data if available
        if (resolved.groups) {
          config.data = resolved.groups.map(g => ({
            label: g.key,
            value: g.value
          }));
          // Build grouped records map for clickability
          groupedRecords = new Map();
          for (const group of resolved.groups) {
            groupedRecords.set(group.key, group.records);
          }
        }
        break;
    }
  } else {
    // Legacy: No data binding, use static config values
    // But still set sourceRecords for clickability
  }

  return {
    resolvedConfig: config,
    sourceRecords,
    totalCount,
    groupedRecords
  };
}

/**
 * Generate a data binding from a visualization config (for migration)
 */
export function inferDataBinding(
  visualizationType: string,
  config: Record<string, unknown>
): DataBinding | undefined {
  switch (visualizationType) {
    case 'counter':
    case 'humanScale':
      // Counter should count records
      return { type: 'count' };

    case 'dotGrid':
    case 'humanGrid':
      // Grids use all records, optionally colored by a field
      return { type: 'records' };

    case 'barChart':
    case 'pieChart':
    case 'comparison':
      // Charts group by a field
      if (config.groupBy) {
        return { type: 'groupBy', field: config.groupBy as string };
      }
      return { type: 'count' };

    case 'timeline':
      if (config.dateField) {
        return { 
          type: 'groupBy', 
          field: config.dateField as string 
        };
      }
      return undefined;

    default:
      return undefined;
  }
}
