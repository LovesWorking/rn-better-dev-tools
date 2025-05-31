import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { log } from './logger';

/**
 * Storage interface that storage implementations should follow
 * Supports both MMKV-style (primitives + strings) and AsyncStorage-style (strings only)
 */
export interface StorageInterface {
  set: (key: string, value: string | number | boolean) => void | Promise<void>;
  delete: (key: string) => void | Promise<void>;
}

/**
 * Unified storage handler that works with both MMKV and AsyncStorage
 * This function updates the actual storage and then invalidates the React Query
 */
async function handleStorageOperation(
  queryKey: QueryKey,
  data: unknown,
  queryClient: QueryClient,
  storageKey: string,
  storage: StorageInterface,
  storageType: string,
  enableLogs?: boolean,
  deviceName?: string,
): Promise<void> {
  try {
    // Update the actual storage with the new data
    if (data === null || data === undefined) {
      // Delete the key if data is null/undefined
      await storage.delete(storageKey);
    } else if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      // Handle primitives - both MMKV and AsyncStorage can handle these
      // (AsyncStorage will convert numbers/booleans to strings automatically)
      await storage.set(storageKey, data);
    } else {
      // For objects/arrays, JSON stringify for both storage types
      const jsonString = JSON.stringify(data);
      await storage.set(storageKey, jsonString);
    }

    // Manually invalidate the React Query since programmatic storage updates
    // don't trigger the change listener automatically
    queryClient.invalidateQueries({ queryKey });
  } catch (error) {
    log(`❌ Failed to update ${storageType} storage: ${error}`, enableLogs || false, 'error');
    // Fall back to just updating the query data if storage fails
    queryClient.setQueryData(queryKey, data, {
      updatedAt: Date.now(),
    });
  }
}

/**
 * Unified storage removal handler that works with both MMKV and AsyncStorage
 * This function removes the key from actual storage and removes the query from React Query cache
 */
async function handleStorageRemovalOperation(
  queryKey: QueryKey,
  queryClient: QueryClient,
  storageKey: string,
  storage: StorageInterface,
  storageType: string,
  enableLogs?: boolean,
  deviceName?: string,
): Promise<void> {
  try {
    // Remove the key from actual storage
    await storage.delete(storageKey);

    // Remove the query from React Query cache
    queryClient.removeQueries({ queryKey, exact: true });
  } catch (error) {
    log(`❌ Failed to remove ${storageType} storage key: ${error}`, enableLogs || false, 'error');
    // Fall back to just removing the query from cache if storage fails
    queryClient.removeQueries({ queryKey, exact: true });
  }
}

/**
 * Handles storage queries by detecting the storage type and delegating to the unified handler
 * This function assumes the queryKey is already confirmed to be a storage query
 * Expected format: ['#storage', 'storageType', 'key']
 * Supported storage types: 'mmkv', 'asyncstorage', 'async-storage', 'async', 'securestorage', 'secure-storage', 'secure'
 * Returns true if it was handled, false if it should fall back to regular query update
 */
export function handleStorageUpdate(
  queryKey: QueryKey,
  data: unknown,
  queryClient: QueryClient,
  storage?: StorageInterface,
  enableLogs?: boolean,
  deviceName?: string,
): boolean {
  const storageType = queryKey[1] as string;
  const storageKey = queryKey[2] as string;

  // Handle different storage types
  switch (storageType.toLowerCase()) {
    case 'mmkv':
      if (!storage) {
        log(`⚠️ MMKV storage not configured for key: ${storageKey}`, enableLogs || false, 'warn');
        return false;
      }
      // Use unified handler for MMKV
      handleStorageOperation(queryKey, data, queryClient, storageKey, storage, 'MMKV', enableLogs, deviceName).catch(
        (error) => {
          log(`❌ MMKV storage update failed: ${error}`, enableLogs || false, 'error');
          // Fall back to regular query update if storage fails
          queryClient.setQueryData(queryKey, data, {
            updatedAt: Date.now(),
          });
        },
      );
      return true;
    case 'asyncstorage':
    case 'async-storage':
    case 'async':
      if (!storage) {
        log(`⚠️ AsyncStorage not configured for key: ${storageKey}`, enableLogs || false, 'warn');
        return false;
      }
      // Use unified handler for AsyncStorage
      handleStorageOperation(
        queryKey,
        data,
        queryClient,
        storageKey,
        storage,
        'AsyncStorage',
        enableLogs,
        deviceName,
      ).catch((error) => {
        log(`❌ AsyncStorage update failed: ${error}`, enableLogs || false, 'error');
        // Fall back to regular query update if storage fails
        queryClient.setQueryData(queryKey, data, {
          updatedAt: Date.now(),
        });
      });
      return true;
    case 'securestorage':
    case 'secure-storage':
    case 'secure':
      if (!storage) {
        log(`⚠️ SecureStore not configured for key: ${storageKey}`, enableLogs || false, 'warn');
        return false;
      }
      // Use unified handler for SecureStore
      handleStorageOperation(
        queryKey,
        data,
        queryClient,
        storageKey,
        storage,
        'SecureStore',
        enableLogs,
        deviceName,
      ).catch((error) => {
        log(`❌ SecureStore update failed: ${error}`, enableLogs || false, 'error');
        // Fall back to regular query update if storage fails
        queryClient.setQueryData(queryKey, data, {
          updatedAt: Date.now(),
        });
      });
      return true;
    default:
      // Unknown storage type, let the main function handle it as regular query
      return false;
  }
}

/**
 * Handles storage query removal by detecting the storage type and delegating to the unified removal handler
 * This function assumes the queryKey is already confirmed to be a storage query
 * Expected format: ['#storage', 'storageType', 'key']
 * Supported storage types: 'mmkv', 'asyncstorage', 'async-storage', 'async', 'securestorage', 'secure-storage', 'secure'
 * Returns true if it was handled, false if it should fall back to regular query removal
 */
export function handleStorageRemoval(
  queryKey: QueryKey,
  queryClient: QueryClient,
  storage?: StorageInterface,
  enableLogs?: boolean,
  deviceName?: string,
): boolean {
  const storageType = queryKey[1] as string;
  const storageKey = queryKey[2] as string;

  // Handle different storage types
  switch (storageType.toLowerCase()) {
    case 'mmkv':
      if (!storage) {
        log(`⚠️ MMKV storage not configured for key: ${storageKey}`, enableLogs || false, 'warn');
        return false;
      }
      // Use unified removal handler for MMKV
      handleStorageRemovalOperation(queryKey, queryClient, storageKey, storage, 'MMKV', enableLogs, deviceName).catch(
        (error) => {
          log(`❌ MMKV storage removal failed: ${error}`, enableLogs || false, 'error');
          // Fall back to regular query removal if storage fails
          queryClient.removeQueries({ queryKey, exact: true });
        },
      );
      return true;
    case 'asyncstorage':
    case 'async-storage':
    case 'async':
      if (!storage) {
        log(`⚠️ AsyncStorage not configured for key: ${storageKey}`, enableLogs || false, 'warn');
        return false;
      }
      // Use unified removal handler for AsyncStorage
      handleStorageRemovalOperation(
        queryKey,
        queryClient,
        storageKey,
        storage,
        'AsyncStorage',
        enableLogs,
        deviceName,
      ).catch((error) => {
        log(`❌ AsyncStorage removal failed: ${error}`, enableLogs || false, 'error');
        // Fall back to regular query removal if storage fails
        queryClient.removeQueries({ queryKey, exact: true });
      });
      return true;
    case 'securestorage':
    case 'secure-storage':
    case 'secure':
      if (!storage) {
        log(`⚠️ SecureStore not configured for key: ${storageKey}`, enableLogs || false, 'warn');
        return false;
      }
      // Use unified removal handler for SecureStore
      handleStorageRemovalOperation(
        queryKey,
        queryClient,
        storageKey,
        storage,
        'SecureStore',
        enableLogs,
        deviceName,
      ).catch((error) => {
        log(`❌ SecureStore removal failed: ${error}`, enableLogs || false, 'error');
        // Fall back to regular query removal if storage fails
        queryClient.removeQueries({ queryKey, exact: true });
      });
      return true;
    default:
      // Unknown storage type, let the main function handle it as regular query
      return false;
  }
}
