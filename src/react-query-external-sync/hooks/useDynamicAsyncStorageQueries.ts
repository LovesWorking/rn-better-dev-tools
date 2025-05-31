import { useEffect, useMemo, useState } from 'react';
import { QueryClient, useQueries } from '@tanstack/react-query';

import { storageQueryKeys } from './storageQueryKeys';

/**
 * AsyncStorage static interface (from @react-native-async-storage/async-storage)
 */
export interface AsyncStorageStatic {
  getItem: (key: string) => Promise<string | null>;
  getAllKeys: () => Promise<readonly string[]>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export interface UseDynamicAsyncStorageQueriesOptions {
  /**
   * The React Query client instance
   */
  queryClient: QueryClient;
  /**
   * AsyncStorage instance to use for storage operations
   * Pass your AsyncStorage instance from @react-native-async-storage/async-storage
   * If not provided, the hook will be disabled
   */
  asyncStorage?: AsyncStorageStatic;
  /**
   * Optional interval in milliseconds to poll for key changes
   * Defaults to 5000ms (5 seconds). Set to 0 to disable polling.
   */
  pollInterval?: number;
  /**
   * Whether to enable AsyncStorage monitoring
   * When false, no queries will be created and no polling will occur
   * @default true
   */
  enabled?: boolean;
}

export interface AsyncStorageQueryResult {
  key: string;
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that creates individual React Query queries for each AsyncStorage key
 * This gives you granular control and better performance since each key has its own query
 * Since AsyncStorage doesn't have built-in change listeners, this hook uses polling to detect changes
 *
 * @example
 * // Get individual queries for all AsyncStorage keys
 * const queries = useDynamicAsyncStorageQueries({ queryClient });
 * // Returns: [
 * //   { key: '@notifications:status', data: 'enabled', isLoading: false, error: null },
 * //   { key: '@user:preferences', data: { theme: 'dark' }, isLoading: false, error: null },
 * //   ...
 * // ]
 */
export function useDynamicAsyncStorageQueries({
  queryClient,
  asyncStorage,
  pollInterval = 1000,
  enabled = true,
}: UseDynamicAsyncStorageQueriesOptions): AsyncStorageQueryResult[] {
  // State to track AsyncStorage keys (since getAllKeys is async)
  const [asyncStorageKeys, setAsyncStorageKeys] = useState<string[]>([]);

  // Helper function to get a single AsyncStorage value
  const getAsyncStorageValue = useMemo(() => {
    return async (key: string): Promise<unknown> => {
      if (!asyncStorage) {
        return null;
      }

      try {
        const value = await asyncStorage.getItem(key);
        if (value === null) {
          return null;
        }

        // Try to parse as JSON, fall back to string
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      } catch (error) {
        console.error('Error getting AsyncStorage value for key:', key, error);
        throw error;
      }
    };
  }, [asyncStorage]);

  // Function to refresh the list of AsyncStorage keys
  const refreshKeys = useMemo(() => {
    return async () => {
      if (!enabled || !asyncStorage) {
        setAsyncStorageKeys([]);
        return;
      }

      try {
        const keys = await asyncStorage.getAllKeys();
        // Filter out React Query cache and other noisy keys
        const filteredKeys = keys.filter(
          (key) => !key.includes('REACT_QUERY_OFFLINE_CACHE') && !key.includes('RCTAsyncLocalStorage'),
        );
        setAsyncStorageKeys([...filteredKeys]); // Convert readonly array to mutable array
      } catch (error) {
        console.error('📱 [AsyncStorage Hook] Error getting AsyncStorage keys:', error);
        setAsyncStorageKeys([]);
      }
    };
  }, [enabled, asyncStorage]);

  // Initial load of keys
  useEffect(() => {
    refreshKeys();
  }, [refreshKeys]);

  // Set up polling for key changes (since AsyncStorage doesn't have listeners)
  useEffect(() => {
    if (!enabled || pollInterval <= 0 || !asyncStorage) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const currentKeys = await asyncStorage.getAllKeys();
        // Filter out React Query cache and other noisy keys
        const filteredKeys = currentKeys.filter(
          (key) => !key.includes('REACT_QUERY_OFFLINE_CACHE') && !key.includes('RCTAsyncLocalStorage'),
        );

        // Check if keys have changed (added/removed)
        const keysChanged =
          filteredKeys.length !== asyncStorageKeys.length ||
          !filteredKeys.every((key) => asyncStorageKeys.includes(key));

        if (keysChanged) {
          console.log('🔄 [AsyncStorage Hook] AsyncStorage keys changed!');
          console.log('🔄 [AsyncStorage Hook] Old keys:', asyncStorageKeys.length);
          console.log('🔄 [AsyncStorage Hook] New keys:', filteredKeys.length);
          setAsyncStorageKeys([...filteredKeys]); // Convert readonly array to mutable array

          // Invalidate all AsyncStorage queries to refresh data
          queryClient.invalidateQueries({
            queryKey: storageQueryKeys.async.root(),
          });
        } else {
          // Keys are the same, but check if any values have changed
          for (const key of asyncStorageKeys) {
            try {
              // Check if the query exists in the cache first
              const queryExists = queryClient.getQueryCache().find({ queryKey: storageQueryKeys.async.key(key) });

              // If query doesn't exist (e.g., after cache clear), skip comparison
              // The useQueries hook will recreate the query automatically
              if (!queryExists) {
                continue;
              }

              // Get current value from AsyncStorage
              const currentValue = await getAsyncStorageValue(key);

              // Get cached value from React Query
              const cachedData = queryClient.getQueryData(storageQueryKeys.async.key(key));

              // Only compare if we have cached data (avoid false positives after cache clear)
              if (cachedData !== undefined) {
                // Compare values (deep comparison for objects)
                const valuesAreDifferent = JSON.stringify(currentValue) !== JSON.stringify(cachedData);

                if (valuesAreDifferent) {
                  console.log('🔄 [AsyncStorage Hook] Value changed for key:', key);

                  // Invalidate this specific query
                  queryClient.invalidateQueries({
                    queryKey: storageQueryKeys.async.key(key),
                  });
                }
              }
            } catch (error) {
              console.error('📱 [AsyncStorage Hook] Error checking value for key:', key, error);
            }
          }
        }
      } catch (error) {
        console.error('📱 [AsyncStorage Hook] Error polling AsyncStorage keys:', error);
      }
    }, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [pollInterval, asyncStorageKeys, queryClient, getAsyncStorageValue, enabled, asyncStorage]);

  // Create individual queries for each key
  const queries = useQueries(
    {
      queries:
        enabled && asyncStorage
          ? asyncStorageKeys.map((key) => ({
              queryKey: storageQueryKeys.async.key(key),
              queryFn: async () => {
                const value = await getAsyncStorageValue(key);
                return value;
              },
              staleTime: pollInterval > 0 ? pollInterval / 2 : 0, // Half the poll interval
              gcTime: 5 * 60 * 1000, // 5 minutes
              networkMode: 'always' as const,
              retry: 0, // Retry failed requests
              retryDelay: 100, // 1 second delay between retries
            }))
          : [],
      combine: (results) => {
        if (!enabled || !asyncStorage) {
          return [];
        }

        const combinedResults = results.map((result, index) => ({
          key: asyncStorageKeys[index],
          data: result.data,
          isLoading: result.isLoading,
          error: result.error,
        }));

        return combinedResults;
      },
    },
    queryClient,
  );

  return queries;
}
