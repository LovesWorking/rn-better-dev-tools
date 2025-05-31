import { useEffect, useMemo } from 'react';
import { QueryClient, useQueries } from '@tanstack/react-query';

import { storageQueryKeys } from './storageQueryKeys';

// Define the MMKV storage interface for better type safety
export interface MmkvStorage {
  getAllKeys(): string[];
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  addOnValueChangedListener(listener: (key: string) => void): { remove: () => void };
}

export interface UseDynamicMmkvQueriesOptions {
  /**
   * The React Query client instance
   */
  queryClient: QueryClient;
  /**
   * The MMKV storage instance to use
   */
  storage: MmkvStorage;
}

export interface MmkvQueryResult {
  key: string;
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that creates individual React Query queries for each MMKV key
 * This gives you granular control and better performance since each key has its own query
 * Automatically listens for MMKV changes and updates the relevant queries
 *
 * @example
 * // Get individual queries for all MMKV keys
 * const queries = useDynamicMmkvQueries({ queryClient, storage });
 * // Returns: [
 * //   { key: 'sync_download_progress', data: 75, isLoading: false, error: null },
 * //   { key: 'user_preference', data: 'dark', isLoading: false, error: null },
 * //   ...
 * // ]
 */
export function useDynamicMmkvQueries({ queryClient, storage }: UseDynamicMmkvQueriesOptions): MmkvQueryResult[] {
  // Get all MMKV keys
  const mmkvKeys = useMemo(() => {
    return storage.getAllKeys();
  }, [storage]);

  // Helper function to get a single MMKV value
  const getMmkvValue = useMemo(() => {
    return (key: string): unknown => {
      // Try to get the value as different types since MMKV doesn't tell us the type
      const stringValue = storage.getString(key);
      if (stringValue !== undefined) {
        // Try to parse as JSON, fall back to string
        try {
          return JSON.parse(stringValue);
        } catch {
          return stringValue;
        }
      }

      const numberValue = storage.getNumber(key);
      if (numberValue !== undefined) {
        return numberValue;
      }

      const boolValue = storage.getBoolean(key);
      if (boolValue !== undefined) {
        return boolValue;
      }

      return null;
    };
  }, [storage]);

  // Create individual queries for each key
  const queries = useQueries(
    {
      queries: mmkvKeys.map((key) => ({
        queryKey: storageQueryKeys.mmkv.key(key),
        queryFn: () => {
          // Removed repetitive fetch logs for cleaner output
          const value = getMmkvValue(key);
          return value;
        },
        staleTime: 0, // Always fetch fresh data
        gcTime: 5 * 60 * 1000, // 5 minutes
        networkMode: 'always' as const,
      })),
      combine: (results) => {
        return results.map((result, index) => ({
          key: mmkvKeys[index],
          data: result.data,
          isLoading: result.isLoading,
          error: result.error,
        }));
      },
    },
    queryClient,
  );

  // Set up MMKV listener for automatic updates
  useEffect(() => {
    if (mmkvKeys.length === 0) return;

    // Removed repetitive listener setup logs for cleaner output

    const listener = storage.addOnValueChangedListener((changedKey) => {
      // Only invalidate if the changed key is in our list
      if (mmkvKeys.includes(changedKey)) {
        // Removed repetitive value change logs for cleaner output
        queryClient.invalidateQueries({
          queryKey: storageQueryKeys.mmkv.key(changedKey),
        });
      }
    });

    return () => {
      // Removed repetitive listener cleanup logs for cleaner output
      listener.remove();
    };
  }, [mmkvKeys, queryClient, storage]);

  return queries;
}
