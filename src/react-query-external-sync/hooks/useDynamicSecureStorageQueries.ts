import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, useQueries } from '@tanstack/react-query';

import { storageQueryKeys } from './storageQueryKeys';

/**
 * SecureStore interface that matches expo-secure-store API
 * Users can pass any implementation that follows this interface
 */
export interface SecureStoreStatic {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync?: (key: string, value: string) => Promise<void>;
  deleteItemAsync?: (key: string) => Promise<void>;
}

export interface UseDynamicSecureStorageQueriesOptions {
  /**
   * The React Query client instance
   */
  queryClient: QueryClient;
  /**
   * SecureStore instance that implements the SecureStore interface
   * This allows users to provide their own SecureStore implementation
   * (e.g., expo-secure-store, react-native-keychain, or custom implementation)
   */
  secureStorage?: SecureStoreStatic;
  /**
   * Optional interval in milliseconds to poll for value changes
   * Defaults to 1000ms (1 second). Set to 0 to disable polling.
   * Note: SecureStore doesn't provide getAllKeys() for security reasons,
   * so we only poll known keys for value changes.
   */
  pollInterval?: number;
  /**
   * Array of known SecureStore keys to monitor
   * Since SecureStore doesn't expose getAllKeys() for security reasons,
   * you must provide the keys you want to monitor
   */
  knownKeys: string[];
}

export interface SecureStorageQueryResult {
  key: string;
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook that creates individual React Query queries for each SecureStore key
 * This gives you granular control and better performance since each key has its own query
 * Since SecureStore doesn't have built-in change listeners and doesn't expose getAllKeys(),
 * this hook uses polling to detect value changes for provided known keys
 *
 * @example
 * // With expo-secure-store
 * import * as SecureStore from 'expo-secure-store';
 *
 * const queries = useDynamicSecureStorageQueries({
 *   queryClient,
 *   secureStorage: SecureStore,
 *   knownKeys: ['auth.session', 'auth.email', 'sessionToken', 'knock_push_token']
 * });
 *
 * @example
 * // With react-native-keychain or custom implementation
 * const customSecureStore = {
 *   getItemAsync: async (key: string) => {
 *     // Your custom implementation
 *     return await Keychain.getInternetCredentials(key);
 *   }
 * };
 *
 * const queries = useDynamicSecureStorageQueries({
 *   queryClient,
 *   secureStorage: customSecureStore,
 *   knownKeys: ['auth.session', 'auth.email']
 * });
 *
 * // Returns: [
 * //   { key: 'auth.session', data: { user: {...} }, isLoading: false, error: null },
 * //   { key: 'auth.email', data: 'user@example.com', isLoading: false, error: null },
 * //   ...
 * // ]
 */
export function useDynamicSecureStorageQueries({
  queryClient,
  secureStorage,
  pollInterval = 1000,
  knownKeys,
}: UseDynamicSecureStorageQueriesOptions): SecureStorageQueryResult[] {
  // State to track which keys actually exist in SecureStore
  const [existingKeys, setExistingKeys] = useState<string[]>([]);

  // Use ref to track the current keys to avoid stale closures in polling
  const existingKeysRef = useRef<string[]>([]);

  // Track if we're currently checking keys to prevent concurrent checks
  const isCheckingKeysRef = useRef(false);

  // Update ref whenever existingKeys changes
  useEffect(() => {
    existingKeysRef.current = existingKeys;
  }, [existingKeys]);

  // Helper function to get a single SecureStore value
  const getSecureStorageValue = useCallback(
    async (key: string): Promise<unknown> => {
      if (!secureStorage) {
        throw new Error('SecureStorage instance not provided');
      }

      try {
        const value = await secureStorage.getItemAsync(key);
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
        console.error('Error getting SecureStore value for key:', key, error);
        throw error;
      }
    },
    [secureStorage],
  );

  // Helper function to compare arrays
  const arraysEqual = useCallback((a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  }, []);

  // Function to check which known keys actually exist in SecureStore
  const refreshExistingKeys = useCallback(async (): Promise<void> => {
    if (!secureStorage || isCheckingKeysRef.current) {
      return;
    }

    isCheckingKeysRef.current = true;

    try {
      const existingKeysList: string[] = [];

      // Check each known key to see if it exists
      await Promise.all(
        knownKeys.map(async (key) => {
          try {
            const value = await secureStorage.getItemAsync(key);
            if (value !== null) {
              existingKeysList.push(key);
            }
          } catch (error) {
            console.error('🔑 [SecureStore Hook] Error checking key:', key, error);
          }
        }),
      );

      // Only update state if the keys have actually changed
      const currentKeys = existingKeysRef.current;
      if (!arraysEqual(existingKeysList, currentKeys)) {
        setExistingKeys([...existingKeysList]);
      }
    } catch (error) {
      console.error('🔑 [SecureStore Hook] Error checking SecureStore keys:', error);
    } finally {
      isCheckingKeysRef.current = false;
    }
  }, [knownKeys, arraysEqual, secureStorage]);

  // Initial load of existing keys
  useEffect(() => {
    if (secureStorage) {
      refreshExistingKeys();
    }
  }, [refreshExistingKeys, secureStorage]);

  // Set up polling for value changes (since SecureStore doesn't have listeners)
  useEffect(() => {
    if (!secureStorage || pollInterval <= 0) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const currentExistingKeys = existingKeysRef.current;

        // Skip if we're already checking keys
        if (isCheckingKeysRef.current) {
          return;
        }

        // Check if any known keys have been added or removed
        const newExistingKeys: string[] = [];
        await Promise.all(
          knownKeys.map(async (key) => {
            try {
              const value = await secureStorage.getItemAsync(key);
              if (value !== null) {
                newExistingKeys.push(key);
              }
            } catch (error) {
              console.error('🔑 [SecureStore Hook] Error checking key during poll:', key, error);
            }
          }),
        );

        // Check if keys have changed (added/removed) using proper comparison
        const keysChanged = !arraysEqual(newExistingKeys, currentExistingKeys);

        if (keysChanged) {
          console.log('🔄 [SecureStore Hook] SecureStore keys changed!');
          console.log('🔄 [SecureStore Hook] Old keys:', currentExistingKeys.length);
          console.log('🔄 [SecureStore Hook] New keys:', newExistingKeys.length);
          setExistingKeys([...newExistingKeys]);

          // Invalidate all SecureStore queries to refresh data
          queryClient.invalidateQueries({
            queryKey: storageQueryKeys.secure.root(),
          });
        } else {
          // Keys are the same, but check if any values have changed
          for (const key of currentExistingKeys) {
            try {
              // Check if the query exists in the cache first
              const queryExists = queryClient.getQueryCache().find({ queryKey: storageQueryKeys.secure.key(key) });

              // If query doesn't exist (e.g., after cache clear), skip comparison
              // The useQueries hook will recreate the query automatically
              if (!queryExists) {
                continue;
              }

              // Get current value from SecureStore
              const currentValue = await getSecureStorageValue(key);

              // Get cached value from React Query
              const cachedData = queryClient.getQueryData(storageQueryKeys.secure.key(key));

              // Only compare if we have cached data (avoid false positives after cache clear)
              if (cachedData !== undefined) {
                // Deep comparison using a more robust method
                const valuesAreDifferent = !deepEqual(currentValue, cachedData);

                if (valuesAreDifferent) {
                  console.log('🔄 [SecureStore Hook] Value changed for key:', key);

                  // Invalidate this specific query
                  queryClient.invalidateQueries({
                    queryKey: storageQueryKeys.secure.key(key),
                  });
                }
              }
            } catch (error) {
              console.error('🔑 [SecureStore Hook] Error checking value for key:', key, error);
            }
          }
        }
      } catch (error) {
        console.error('🔑 [SecureStore Hook] Error polling SecureStore keys:', error);
      }
    }, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [pollInterval, knownKeys, queryClient, getSecureStorageValue, arraysEqual, secureStorage]);

  // Create individual queries for each existing key
  const queries = useQueries(
    {
      queries: existingKeys.map((key) => ({
        queryKey: storageQueryKeys.secure.key(key),
        queryFn: async () => {
          const value = await getSecureStorageValue(key);
          return value;
        },
        staleTime: pollInterval > 0 ? pollInterval / 2 : 0, // Half the poll interval
        gcTime: 10 * 60 * 1000, // 10 minutes (longer than AsyncStorage for security)
        networkMode: 'always' as const,
        retry: 1, // Retry once for secure storage
        retryDelay: 200, // 200ms delay between retries
      })),
      combine: (results) => {
        const combinedResults = results.map((result, index) => ({
          key: existingKeys[index],
          data: result.data,
          isLoading: result.isLoading,
          error: result.error,
        }));

        return combinedResults;
      },
    },
    queryClient,
  );

  // Return empty array if no secureStorage is provided
  if (!secureStorage) {
    return [];
  }

  return queries;
}

// Helper function for deep equality comparison
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return a === b;

  // For objects, use JSON comparison as fallback but handle edge cases
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
