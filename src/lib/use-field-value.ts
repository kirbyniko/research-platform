/**
 * useFieldValue Hook
 * 
 * React hook for accessing field values with automatic alias resolution.
 * Uses the field registry to handle field name inconsistencies.
 */

import { useCallback } from 'react';
import { getFieldValue as registryGetFieldValue, getCanonicalName } from './field-registry';

/**
 * Hook to get a field value from an object with alias resolution
 */
export function useFieldValue<T = unknown>(
  data: Record<string, unknown> | null | undefined,
  fieldName: string,
  defaultValue?: T
): T {
  if (!data) return defaultValue as T;
  return registryGetFieldValue(data, fieldName, defaultValue) as T;
}

/**
 * Hook that returns a getter function for field values
 * Useful when you need to get multiple fields from the same object
 */
export function useFieldGetter(data: Record<string, unknown> | null | undefined) {
  const getValue = useCallback(<T = unknown>(fieldName: string, defaultValue?: T): T => {
    if (!data) return defaultValue as T;
    return registryGetFieldValue(data, fieldName, defaultValue) as T;
  }, [data]);
  
  const getBoolean = useCallback((fieldName: string, defaultValue = false): boolean => {
    if (!data) return defaultValue;
    const val = registryGetFieldValue<unknown>(data, fieldName);
    if (val === undefined || val === null) return defaultValue;
    return val === true || val === 'true' || val === 1;
  }, [data]);
  
  const getString = useCallback((fieldName: string, defaultValue = ''): string => {
    if (!data) return defaultValue;
    const val = registryGetFieldValue<unknown>(data, fieldName);
    if (val === undefined || val === null) return defaultValue;
    return String(val);
  }, [data]);
  
  const getNumber = useCallback((fieldName: string, defaultValue?: number): number | undefined => {
    if (!data) return defaultValue;
    const val = registryGetFieldValue(data, fieldName);
    if (val === null || val === undefined || val === '') return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }, [data]);
  
  const getArray = useCallback(<T = unknown>(fieldName: string, defaultValue: T[] = []): T[] => {
    if (!data) return defaultValue;
    const val = registryGetFieldValue<unknown>(data, fieldName);
    return Array.isArray(val) ? val as T[] : defaultValue;
  }, [data]);
  
  return { getValue, getBoolean, getString, getNumber, getArray };
}

/**
 * Create a setter function that updates with canonical field name
 */
export function createFieldSetter<T extends Record<string, unknown>>(
  setState: React.Dispatch<React.SetStateAction<T>>
) {
  return (fieldName: string, value: unknown) => {
    const canonicalName = getCanonicalName(fieldName);
    setState(prev => ({ ...prev, [canonicalName]: value }));
  };
}

// Re-export registry functions for convenience
export { getFieldValue, normalizeFieldNames, getCanonicalName } from './field-registry';
