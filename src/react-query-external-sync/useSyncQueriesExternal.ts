import { useEffect, useMemo, useRef } from 'react';
import type { QueryKey } from '@tanstack/query-core';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import superjson from 'superjson';

import { type AsyncStorageStatic, useDynamicAsyncStorageQueries } from './hooks/useDynamicAsyncStorageQueries';
import { useDynamicEnv } from './hooks/useDynamicEnvQueries';
import { MmkvStorage, useDynamicMmkvQueries } from './hooks/useDynamicMmkvQueries';
import { useDynamicSecureStorageQueries } from './hooks/useDynamicSecureStorageQueries';
import { log, syncLogger } from './utils/logger';
import { handleStorageRemoval, handleStorageUpdate, type StorageInterface } from './utils/storageHandlers';
import { Dehydrate } from './hydration';
import { PlatformOS } from './platformUtils';
import { SuperJSONResult, SyncMessage } from './types';
import { useMySocket } from './useMySocket';

/**
 * Query actions that can be performed on a query.
 * These actions are used to synchronize query state between devices and the dashboard.
 */
type QueryActions =
  // Regular query actions
  | 'ACTION-REFETCH' // Refetch a query without invalidating it
  | 'ACTION-INVALIDATE' // Invalidate a query and trigger a refetch
  | 'ACTION-RESET' // Reset a query to its initial state
  | 'ACTION-REMOVE' // Remove a query from the cache
  | 'ACTION-DATA-UPDATE' // Update a query's data manually
  // Error handling actions
  | 'ACTION-TRIGGER-ERROR' // Manually trigger an error state
  | 'ACTION-RESTORE-ERROR' // Restore from an error state
  // Loading state actions
  | 'ACTION-TRIGGER-LOADING' // Manually trigger a loading state
  | 'ACTION-RESTORE-LOADING' // Restore from a loading state
  // Online status actions
  | 'ACTION-ONLINE-MANAGER-ONLINE' // Set online manager to online
  | 'ACTION-ONLINE-MANAGER-OFFLINE' // Set online manager to offline
  // Internal action
  | 'success' // Internal success action
  | 'ACTION-CLEAR-MUTATION-CACHE' // Clear the mutation cache
  | 'ACTION-CLEAR-QUERY-CACHE'; // Clear the query cache

/**
 * Message structure for query actions between dashboard and devices
 */
interface QueryActionMessage {
  queryHash: string; // Unique hash of the query
  queryKey: QueryKey; // Key array used to identify the query
  data: unknown; // Data payload (if applicable)
  action: QueryActions; // Action to perform
  deviceId: string; // Device to target
}

/**
 * Message structure for online manager actions from dashboard to devices
 */
interface OnlineManagerMessage {
  action: 'ACTION-ONLINE-MANAGER-ONLINE' | 'ACTION-ONLINE-MANAGER-OFFLINE';
  targetDeviceId: string; // Device ID to target ('All' || device)
}

/**
 * Determines if a message should be processed by the current device
 */
interface ShouldProcessMessageProps {
  targetDeviceId: string;
  currentDeviceId: string;
}
function shouldProcessMessage({ targetDeviceId, currentDeviceId }: ShouldProcessMessageProps): boolean {
  return targetDeviceId === currentDeviceId || targetDeviceId === 'All';
}

/**
 * Verifies if the React Query version is compatible with dev tools
 */
function checkVersion(queryClient: QueryClient) {
  // Basic version check
  const version = (
    queryClient as unknown as {
      getDefaultOptions?: () => { queries?: { version?: unknown } };
    }
  ).getDefaultOptions?.()?.queries?.version;
  if (version && !version.toString().startsWith('4') && !version.toString().startsWith('5')) {
    log(
      'This version of React Query has not been tested with the dev tools plugin. Some features might not work as expected.',
      true,
      'warn',
    );
  }
}

/**
 * SecureStore static interface (from expo-secure-store)
 */
interface SecureStoreStatic {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync?: (key: string, value: string) => Promise<void>;
  deleteItemAsync?: (key: string) => Promise<void>;
}

/**
 * Extended MMKV interface that includes set/delete methods
 */
interface MmkvWithSetDelete {
  set?: (key: string, value: string | number | boolean) => void;
  setString?: (key: string, value: string) => void;
  delete?: (key: string) => void;
}

interface useSyncQueriesExternalProps {
  queryClient: QueryClient;
  deviceName: string;
  /**
   * A unique identifier for this device that persists across app restarts.
   * This is crucial for proper device tracking, especially if you have multiple devices of the same type.
   * If you only have one iOS and one Android device, you can use 'ios' and 'android'.
   * For multiple devices of the same type, ensure this ID is unique and persistent.
   */
  deviceId: string;
  extraDeviceInfo?: Record<string, string>; // Additional device information as key-value pairs
  /**
   * Additional environment variables to include beyond the automatically collected EXPO_PUBLIC_ variables.
   * The hook automatically collects all EXPO_PUBLIC_ prefixed environment variables.
   * Use this parameter to add any additional env vars you want to send to the dashboard.
   */
  envVariables?: Record<string, string>;
  socketURL: string;
  platform: PlatformOS; // Required platform
  /**
   * Enable/disable logging for debugging purposes
   * @default false
   */
  enableLogs?: boolean;

  /**
   * Storage instances for different storage types
   * When provided, these will automatically enable both external sync AND storage monitoring
   *
   * - mmkvStorage: MMKV storage instance (enables ['#storage', 'mmkv', 'key'] queries + monitoring)
   * - asyncStorage: AsyncStorage instance (enables ['#storage', 'async', 'key'] queries + monitoring)
   * - secureStorage: SecureStore instance (enables ['#storage', 'secure', 'key'] queries + monitoring)
   * - secureStorageKeys: Array of SecureStore keys to monitor (required when using secureStorage)
   * - secureStoragePollInterval: Polling interval for SecureStore monitoring (default: 1000ms)
   */
  storage?: StorageInterface; // Legacy prop for backward compatibility
  mmkvStorage?: StorageInterface | MmkvStorage; // MMKV storage instance (will be auto-adapted)
  asyncStorage?: StorageInterface | AsyncStorageStatic; // AsyncStorage instance (will be auto-adapted)
  secureStorage?: StorageInterface | SecureStoreStatic; // SecureStore instance (will be auto-adapted)
  secureStorageKeys?: string[]; // Required when using secureStorage - keys to monitor
  secureStoragePollInterval?: number; // Optional polling interval for SecureStore (default: 1000ms)
}

/**
 * Helper function to detect storage type and create an adapter if needed
 */
function createStorageAdapter(
  storage: StorageInterface | AsyncStorageStatic | SecureStoreStatic | MmkvStorage,
): StorageInterface {
  // Note: These debug logs are intentionally minimal to reduce noise
  // They can be enabled for deep debugging if needed

  // Check if it's already a StorageInterface-compatible storage
  if ('set' in storage && 'delete' in storage) {
    return storage as StorageInterface;
  }

  // Check if it's MMKV by looking for MMKV-specific methods
  if ('getString' in storage && 'getAllKeys' in storage && 'addOnValueChangedListener' in storage) {
    // MMKV has different method names, create an adapter
    const mmkvStorage = storage as MmkvStorage;
    return {
      set: (key: string, value: string | number | boolean) => {
        // MMKV doesn't have a generic set method, we need to use the specific type methods
        // For now, we'll convert everything to string and use setString
        // Note: This assumes the MMKV instance has setString method
        const mmkvWithSet = mmkvStorage as MmkvStorage & MmkvWithSetDelete;
        if (mmkvWithSet.set) {
          mmkvWithSet.set(key, value);
        } else if (mmkvWithSet.setString) {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          mmkvWithSet.setString(key, stringValue);
        } else {
          console.warn('⚠️ MMKV storage does not have set or setString method');
        }
      },
      delete: (key: string) => {
        const mmkvWithDelete = mmkvStorage as MmkvStorage & MmkvWithSetDelete;
        if (mmkvWithDelete.delete) {
          mmkvWithDelete.delete(key);
        } else {
          console.warn('⚠️ MMKV storage does not have delete method');
        }
      },
    };
  }

  // Check if it's AsyncStorage by looking for setItem/removeItem methods
  if ('setItem' in storage && 'removeItem' in storage) {
    // This is AsyncStorage, create an adapter
    return {
      set: (key: string, value: string | number | boolean) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        return storage.setItem(key, stringValue);
      },
      delete: (key: string) => {
        return storage.removeItem(key);
      },
    };
  }

  // Check if it's SecureStore by looking for setItemAsync/deleteItemAsync methods
  if ('setItemAsync' in storage && 'deleteItemAsync' in storage) {
    // This is SecureStore, create an adapter
    const secureStore = storage as SecureStoreStatic;
    return {
      set: (key: string, value: string | number | boolean) => {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        if (secureStore.setItemAsync) {
          return secureStore.setItemAsync(key, stringValue);
        }
        throw new Error('SecureStore setItemAsync method not available');
      },
      delete: (key: string) => {
        if (secureStore.deleteItemAsync) {
          return secureStore.deleteItemAsync(key);
        }
        throw new Error('SecureStore deleteItemAsync method not available');
      },
    };
  }

  // Fallback - assume it's already compatible
  return storage as unknown as StorageInterface;
}

/**
 * Hook used by mobile devices to sync query state with the external dashboard
 *
 * Handles:
 * - Connection to the socket server
 * - Responding to dashboard requests
 * - Processing query actions from the dashboard
 * - Sending query state updates to the dashboard
 * - Automatically collecting all EXPO_PUBLIC_ environment variables
 * - Merging additional user-provided environment variables
 * - Supporting multiple storage types (MMKV, AsyncStorage, SecureStore)
 * - Integrated storage monitoring (automatically monitors storage when instances are provided)
 *
 * @example
 * // Basic usage with MMKV only (legacy)
 * useSyncQueriesExternal({
 *   queryClient,
 *   socketURL: 'http://localhost:42831',
 *   deviceName: 'iOS Simulator',
 *   platform: 'ios',
 *   deviceId: 'ios-sim-1',
 *   storage: mmkvStorage, // Your MMKV instance
 * });
 *
 * @example
 * // Advanced usage with MMKV, AsyncStorage, and SecureStore
 * // This automatically enables both external sync AND storage monitoring
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * import * as SecureStore from 'expo-secure-store';
 * import { storage as mmkvStorage } from '~/lib/storage/mmkv';
 *
 * useSyncQueriesExternal({
 *   queryClient,
 *   socketURL: 'http://localhost:42831',
 *   deviceName: 'iOS Simulator',
 *   platform: 'ios',
 *   deviceId: 'ios-sim-1',
 *   mmkvStorage: mmkvStorage,        // Enables ['#storage', 'mmkv', 'key'] queries + MMKV monitoring
 *   asyncStorage: AsyncStorage,      // Enables ['#storage', 'async', 'key'] queries + AsyncStorage monitoring
 *   secureStorage: SecureStore,      // Enables ['#storage', 'secure', 'key'] queries + SecureStore monitoring
 *   secureStorageKeys: ['sessionToken', 'auth.session', 'auth.email'], // Required for SecureStore monitoring
 *   enableLogs: true,
 * });
 */
export function useSyncQueriesExternal({
  queryClient,
  deviceName,
  socketURL,
  extraDeviceInfo,
  envVariables,
  platform,
  deviceId,
  enableLogs = false,
  storage,
  mmkvStorage,
  asyncStorage,
  secureStorage,
  secureStorageKeys,
  secureStoragePollInterval,
}: useSyncQueriesExternalProps) {
  // ==========================================================
  // Validate deviceId
  // ==========================================================
  if (!deviceId?.trim()) {
    throw new Error(
      `[${deviceName}] deviceId is required and must not be empty. This ID must persist across app restarts, especially if you have multiple devices of the same type. If you only have one iOS and one Android device, you can use 'ios' and 'android'.`,
    );
  }

  // ==========================================================
  // Auto-collect environment variables
  // ==========================================================
  const envResults = useDynamicEnv();

  // Convert env results to a simple key-value object
  const autoCollectedEnvVars = useMemo(() => {
    const envVars: Record<string, string> = {};

    envResults.forEach(({ key, data }) => {
      // Include all available env vars
      if (data !== undefined && data !== null) {
        // Convert data to string for transmission
        envVars[key] = typeof data === 'string' ? data : JSON.stringify(data);
      }
    });

    return envVars;
  }, [envResults]);

  // Merge auto-collected env vars with user-provided ones (user-provided take precedence)
  const mergedEnvVariables = useMemo(() => {
    const merged = {
      ...autoCollectedEnvVars,
      ...(envVariables || {}),
    };

    return merged;
  }, [autoCollectedEnvVars, envVariables]);

  // ==========================================================
  // Persistent device ID - used to identify this device
  // across app restarts
  // ==========================================================
  const logPrefix = `[${deviceName}]`;

  // ==========================================================
  // Integrated Storage Monitoring
  // Automatically enable storage monitoring when storage instances are provided
  // ==========================================================

  // MMKV monitoring - only if mmkvStorage is provided and has the required methods
  const mmkvQueries = useDynamicMmkvQueries({
    queryClient,
    storage:
      mmkvStorage && 'getAllKeys' in mmkvStorage
        ? (mmkvStorage as MmkvStorage)
        : {
            getAllKeys: () => [],
            getString: () => undefined,
            getNumber: () => undefined,
            getBoolean: () => undefined,
            addOnValueChangedListener: () => ({ remove: () => {} }),
          },
  });

  // AsyncStorage monitoring - only if asyncStorage is provided
  const asyncStorageQueries = useDynamicAsyncStorageQueries({
    queryClient,
    asyncStorage:
      asyncStorage && 'getItem' in asyncStorage && 'getAllKeys' in asyncStorage
        ? (asyncStorage as AsyncStorageStatic)
        : undefined,
    enabled: !!asyncStorage, // Only enable when asyncStorage is provided
  });

  // SecureStorage monitoring - only if secureStorage and secureStorageKeys are provided
  const secureStorageQueries = useDynamicSecureStorageQueries({
    queryClient,
    secureStorage: secureStorage && 'getItemAsync' in secureStorage ? (secureStorage as SecureStoreStatic) : undefined,
    knownKeys: secureStorageKeys || [],
    pollInterval: secureStoragePollInterval || 1000,
  });

  // Use a ref to track previous connection state to avoid duplicate logs
  const prevConnectedRef = useRef(false);
  const prevEnvVarsRef = useRef<Record<string, string>>({});
  const storageLoggingDoneRef = useRef(false);

  // Log storage monitoring status once
  useEffect(() => {
    if (enableLogs && !storageLoggingDoneRef.current) {
      // Removed redundant storage monitoring status log for cleaner output
      storageLoggingDoneRef.current = true;
    }
  }, [mmkvStorage, asyncStorage, secureStorage, secureStorageKeys, enableLogs, deviceName]);

  // ==========================================================
  // Socket connection - Handles connection to the socket server and
  // event listeners for the socket server
  // Connect immediately since env vars are available synchronously
  // ==========================================================

  const { connect, disconnect, isConnected, socket } = useMySocket({
    deviceName,
    socketURL,
    persistentDeviceId: deviceId,
    extraDeviceInfo,
    envVariables: mergedEnvVariables,
    platform,
    enableLogs,
  });

  useEffect(() => {
    checkVersion(queryClient);

    // Only log connection state changes to reduce noise
    if (prevConnectedRef.current !== isConnected) {
      if (!isConnected) {
        log(`${logPrefix} Not connected to external dashboard`, enableLogs);
      } else {
        log(`${deviceName} Connected to external dashboard`, enableLogs);
      }
      prevConnectedRef.current = isConnected;
    }

    // Send updated env vars if they changed after connection (for failsafe scenarios)
    if (isConnected && socket && mergedEnvVariables) {
      const currentEnvVarsKey = JSON.stringify(mergedEnvVariables);
      const prevEnvVarsKey = JSON.stringify(prevEnvVarsRef.current);

      if (
        currentEnvVarsKey !== prevEnvVarsKey &&
        Object.keys(mergedEnvVariables).length > Object.keys(prevEnvVarsRef.current).length
      ) {
        log(`${deviceName} Sending updated environment variables to dashboard (post-failsafe)`, enableLogs);
        socket.emit('env-vars-update', {
          deviceId,
          envVariables: mergedEnvVariables,
        });
        prevEnvVarsRef.current = { ...mergedEnvVariables };
      }
    }

    // Don't proceed with setting up event handlers if not connected
    if (!isConnected || !socket) {
      return;
    }

    // ==========================================================
    // Event Handlers
    // ==========================================================

    // ==========================================================
    // Handle initial state requests from dashboard
    // ==========================================================
    const initialStateSubscription = socket.on('request-initial-state', () => {
      if (!deviceId) {
        log(`${logPrefix} No persistent device ID found`, enableLogs, 'warn');
        return;
      }
      log(`${logPrefix} Dashboard is requesting initial state`, enableLogs);
      const dehydratedState = Dehydrate(queryClient as unknown as QueryClient);
      const syncMessage: SyncMessage = {
        type: 'dehydrated-state',
        state: dehydratedState as SuperJSONResult,
        isOnlineManagerOnline: onlineManager.isOnline(),
        persistentDeviceId: deviceId,
      };
      socket.emit('query-sync', syncMessage);
      log(`[${deviceName}] Sent initial state to dashboard)`, enableLogs);
    });

    // ==========================================================
    // Online manager handler - Handle device internet connection state changes
    // ==========================================================
    const onlineManagerSubscription = socket.on('online-manager', (message: OnlineManagerMessage) => {
      const { action, targetDeviceId } = message;
      if (!deviceId) {
        log(`${logPrefix} No persistent device ID found`, enableLogs, 'warn');
        return;
      }
      // Only process if this message targets the current device
      if (
        !shouldProcessMessage({
          targetDeviceId: targetDeviceId,
          currentDeviceId: deviceId,
        })
      ) {
        return;
      }

      // Start a sync operation for this online manager action
      const operationId = syncLogger.startOperation(
        'query-action',
        {
          deviceName,
          deviceId,
          platform,
        },
        enableLogs,
      );

      switch (action) {
        case 'ACTION-ONLINE-MANAGER-ONLINE': {
          onlineManager.setOnline(true);
          syncLogger.logQueryAction(operationId, action, 'online-manager');
          break;
        }
        case 'ACTION-ONLINE-MANAGER-OFFLINE': {
          onlineManager.setOnline(false);
          syncLogger.logQueryAction(operationId, action, 'online-manager');
          break;
        }
      }

      // Complete the operation
      syncLogger.completeOperation(operationId);
    });

    // ==========================================================
    // Query Actions handler - Process actions from the dashboard
    // ==========================================================
    const queryActionSubscription = socket.on('query-action', (message: QueryActionMessage) => {
      const { queryHash, queryKey, data, action, deviceId } = message;
      if (!deviceId) {
        log(`[${deviceName}] No persistent device ID found`, enableLogs, 'warn');
        return;
      }
      // Skip if not targeted at this device
      if (
        !shouldProcessMessage({
          targetDeviceId: deviceId,
          currentDeviceId: deviceId,
        })
      ) {
        return;
      }

      // Start a sync operation for this query action
      const operationId = syncLogger.startOperation(
        'query-action',
        {
          deviceName,
          deviceId,
          platform,
        },
        enableLogs,
      );

      // If action is clear cache do the action here before moving on
      if (action === 'ACTION-CLEAR-MUTATION-CACHE') {
        queryClient.getMutationCache().clear();
        syncLogger.logQueryAction(operationId, action, 'mutation-cache');
        syncLogger.completeOperation(operationId);
        return;
      }
      if (action === 'ACTION-CLEAR-QUERY-CACHE') {
        queryClient.getQueryCache().clear();
        syncLogger.logQueryAction(operationId, action, 'query-cache');
        syncLogger.completeOperation(operationId);
        return;
      }

      const activeQuery = queryClient.getQueryCache().get(queryHash);
      if (!activeQuery) {
        syncLogger.logError(operationId, 'Query Not Found', `Query with hash ${queryHash} not found`);
        // Removed redundant log for cleaner output
        syncLogger.completeOperation(operationId, false);
        return;
      }

      try {
        switch (action) {
          case 'ACTION-DATA-UPDATE': {
            // Check if this is a storage query
            if (Array.isArray(queryKey) && queryKey.length === 3 && queryKey[0] === '#storage') {
              const storageType = queryKey[1] as string;
              const storageKey = queryKey[2] as string;

              // Determine which storage instance to use based on storage type
              let storageInstance: StorageInterface | undefined;
              switch (storageType.toLowerCase()) {
                case 'mmkv':
                  const rawMmkvStorage = mmkvStorage || storage;
                  storageInstance = rawMmkvStorage ? createStorageAdapter(rawMmkvStorage) : undefined;
                  break;
                case 'asyncstorage':
                case 'async-storage':
                case 'async':
                  const rawAsyncStorage = asyncStorage || storage;
                  storageInstance = rawAsyncStorage ? createStorageAdapter(rawAsyncStorage) : undefined;
                  break;
                case 'securestorage':
                case 'secure-storage':
                case 'secure':
                  const rawSecureStorage = secureStorage || storage;
                  storageInstance = rawSecureStorage ? createStorageAdapter(rawSecureStorage) : undefined;
                  break;
                default:
                  storageInstance = storage;
                  break;
              }

              // Log the storage update with current and new values
              const currentValue = queryClient.getQueryData(queryKey);
              const storageTypeForLogger =
                storageType.toLowerCase() === 'mmkv'
                  ? 'mmkv'
                  : storageType.toLowerCase().includes('async')
                    ? 'asyncStorage'
                    : 'secureStore';
              syncLogger.logStorageUpdate(operationId, storageTypeForLogger, storageKey, currentValue, data);

              // This is a storage query, handle it with the storage handler
              const wasStorageHandled = handleStorageUpdate(
                queryKey,
                data,
                queryClient,
                storageInstance,
                enableLogs,
                deviceName,
              );

              // If storage handler couldn't handle it, fall back to regular update
              if (!wasStorageHandled) {
                queryClient.setQueryData(queryKey, data, {
                  updatedAt: Date.now(),
                });
              }
            } else {
              // Not a storage query, handle as regular query data update
              queryClient.setQueryData(queryKey, data, {
                updatedAt: Date.now(),
              });
            }

            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }

          case 'ACTION-TRIGGER-ERROR': {
            // Removed redundant log for cleaner output
            const error = new Error('Unknown error from devtools');

            const __previousQueryOptions = activeQuery.options;
            activeQuery.setState({
              status: 'error',
              error,
              fetchMeta: {
                ...activeQuery.state.fetchMeta,
                // @ts-expect-error This does exist
                __previousQueryOptions,
              },
            });
            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-RESTORE-ERROR': {
            // Removed redundant log for cleaner output
            queryClient.resetQueries(activeQuery);
            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-TRIGGER-LOADING': {
            if (!activeQuery) return;
            // Removed redundant log for cleaner output
            const __previousQueryOptions = activeQuery.options;
            // Trigger a fetch in order to trigger suspense as well.
            activeQuery.fetch({
              ...__previousQueryOptions,
              queryFn: () => {
                return new Promise(() => {
                  // Never resolve - simulates perpetual loading
                });
              },
              gcTime: -1,
            });
            activeQuery.setState({
              data: undefined,
              status: 'pending',
              fetchMeta: {
                ...activeQuery.state.fetchMeta,
                // @ts-expect-error This does exist
                __previousQueryOptions,
              },
            });
            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-RESTORE-LOADING': {
            // Removed redundant log for cleaner output
            const previousState = activeQuery.state;
            const previousOptions = activeQuery.state.fetchMeta
              ? (
                  activeQuery.state.fetchMeta as unknown as {
                    __previousQueryOptions: unknown;
                  }
                ).__previousQueryOptions
              : null;

            activeQuery.cancel({ silent: true });
            activeQuery.setState({
              ...previousState,
              fetchStatus: 'idle',
              fetchMeta: null,
            });

            if (previousOptions) {
              activeQuery.fetch(previousOptions);
            }
            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-RESET': {
            // Removed redundant log for cleaner output
            queryClient.resetQueries(activeQuery);
            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-REMOVE': {
            // Check if this is a storage query
            if (Array.isArray(queryKey) && queryKey.length === 3 && queryKey[0] === '#storage') {
              const storageType = queryKey[1] as string;
              const storageKey = queryKey[2] as string;

              // Determine which storage instance to use based on storage type
              let storageInstance: StorageInterface | undefined;
              switch (storageType.toLowerCase()) {
                case 'mmkv':
                  const rawMmkvStorage = mmkvStorage || storage;
                  storageInstance = rawMmkvStorage ? createStorageAdapter(rawMmkvStorage) : undefined;
                  break;
                case 'asyncstorage':
                case 'async-storage':
                case 'async':
                  const rawAsyncStorage = asyncStorage || storage;
                  storageInstance = rawAsyncStorage ? createStorageAdapter(rawAsyncStorage) : undefined;
                  break;
                case 'securestorage':
                case 'secure-storage':
                case 'secure':
                  const rawSecureStorage = secureStorage || storage;
                  storageInstance = rawSecureStorage ? createStorageAdapter(rawSecureStorage) : undefined;
                  break;
                default:
                  storageInstance = storage;
                  break;
              }

              // Log the storage removal
              const currentValue = queryClient.getQueryData(queryKey);
              const storageTypeForLogger =
                storageType.toLowerCase() === 'mmkv'
                  ? 'mmkv'
                  : storageType.toLowerCase().includes('async')
                    ? 'asyncStorage'
                    : 'secureStore';
              syncLogger.logStorageUpdate(operationId, storageTypeForLogger, storageKey, currentValue, null);

              // This is a storage query, handle it with the storage removal handler
              const wasStorageHandled = handleStorageRemoval(
                queryKey,
                queryClient,
                storageInstance,
                enableLogs,
                deviceName,
              );

              // If storage handler couldn't handle it, fall back to regular removal
              if (!wasStorageHandled) {
                queryClient.removeQueries(activeQuery);
              }
            } else {
              // Not a storage query, handle as regular query removal
              queryClient.removeQueries(activeQuery);
            }

            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-REFETCH': {
            // Removed redundant log for cleaner output
            const promise = activeQuery.fetch();
            promise.catch((error) => {
              // Log fetch errors but don't propagate them
              syncLogger.logError(operationId, 'Refetch Error', `Refetch failed for ${queryHash}`, error);
              log(`[${deviceName}] Refetch error for ${queryHash}:`, enableLogs, 'error');
            });
            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-INVALIDATE': {
            // Removed redundant log for cleaner output
            queryClient.invalidateQueries(activeQuery);
            syncLogger.logQueryAction(operationId, action, queryHash);
            break;
          }
          case 'ACTION-ONLINE-MANAGER-ONLINE': {
            // Removed redundant log for cleaner output
            onlineManager.setOnline(true);
            syncLogger.logQueryAction(operationId, action, 'online-manager');
            break;
          }
          case 'ACTION-ONLINE-MANAGER-OFFLINE': {
            // Removed redundant log for cleaner output
            onlineManager.setOnline(false);
            syncLogger.logQueryAction(operationId, action, 'online-manager');
            break;
          }
        }

        // Complete the operation successfully
        syncLogger.completeOperation(operationId);
      } catch (error) {
        // Complete the operation with error
        syncLogger.logError(operationId, 'Action Error', `Failed to execute ${action}`, error as Error);
        syncLogger.completeOperation(operationId, false);
      }
    });

    // ==========================================================
    // Subscribe to query changes and sync to dashboard
    // ==========================================================
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (!deviceId) {
        log(`${logPrefix} No persistent device ID found`, enableLogs, 'warn');
        return;
      }
      // Dehydrate the current state
      const dehydratedState = Dehydrate(queryClient as unknown as QueryClient);

      // Create sync message
      const syncMessage: SyncMessage = {
        type: 'dehydrated-state',
        state: dehydratedState as SuperJSONResult,
        isOnlineManagerOnline: onlineManager.isOnline(),
        persistentDeviceId: deviceId,
      };

      // Send message to dashboard
      socket.emit('query-sync', syncMessage);
    });

    // ==========================================================
    // Cleanup function to unsubscribe from all events
    // ==========================================================
    return () => {
      // Removed repetitive cleanup logging for cleaner output
      queryActionSubscription?.off();
      initialStateSubscription?.off();
      onlineManagerSubscription?.off();
      unsubscribe();
    };
  }, [
    queryClient,
    socket,
    deviceName,
    isConnected,
    deviceId,
    enableLogs,
    logPrefix,
    mergedEnvVariables,
    storage,
    mmkvStorage,
    asyncStorage,
    secureStorage,
    secureStorageKeys,
    secureStoragePollInterval,
    platform,
  ]);

  return { connect, disconnect, isConnected, socket };
}
