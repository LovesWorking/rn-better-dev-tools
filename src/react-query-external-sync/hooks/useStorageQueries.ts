import { QueryClient } from '@tanstack/react-query';

import { useDynamicAsyncStorageQueries } from './useDynamicAsyncStorageQueries';
import { MmkvStorage, useDynamicMmkvQueries } from './useDynamicMmkvQueries';
import { type SecureStoreStatic, useDynamicSecureStorageQueries } from './useDynamicSecureStorageQueries';

export interface UseStorageQueriesOptions {
  /**
   * The React Query client instance
   */
  queryClient: QueryClient;

  /**
   * MMKV storage instance to monitor all MMKV keys
   * Pass your MMKV storage instance or undefined to disable
   */
  mmkv?: MmkvStorage;

  /**
   * Enable AsyncStorage monitoring
   * Set to true to monitor all AsyncStorage keys
   */
  asyncStorage?: boolean;

  /**
   * SecureStorage configuration
   * Pass an array of known keys (SecureStore doesn't expose getAllKeys for security)
   * OR pass an object with storage instance and keys
   */
  secureStorage?:
    | string[]
    | {
        storage: SecureStoreStatic;
        keys: string[];
      };

  /**
   * Optional polling interval for SecureStorage in milliseconds
   * Defaults to 1000ms (1 second)
   */
  secureStoragePollInterval?: number;
}

export interface StorageQueryResults {
  mmkv: ReturnType<typeof useDynamicMmkvQueries>;
  asyncStorage: ReturnType<typeof useDynamicAsyncStorageQueries>;
  secureStorage: ReturnType<typeof useDynamicSecureStorageQueries>;
}

/**
 * Unified hook for monitoring all device storage types with React Query
 *
 * This hook consolidates MMKV, AsyncStorage, and SecureStorage monitoring into one simple interface.
 * Each storage type can be enabled/disabled independently based on your needs.
 *
 * @example
 * // Monitor all storage types (legacy string array format)
 * const storageQueries = useStorageQueries({
 *   queryClient,
 *   mmkv: storage,
 *   asyncStorage: true,
 *   secureStorage: ['sessionToken', 'auth.session', 'auth.email']
 * });
 *
 * @example
 * // Monitor with custom SecureStore instance
 * import * as SecureStore from 'expo-secure-store';
 *
 * const storageQueries = useStorageQueries({
 *   queryClient,
 *   mmkv: storage,
 *   asyncStorage: true,
 *   secureStorage: {
 *     storage: SecureStore,
 *     keys: ['sessionToken', 'auth.session', 'auth.email']
 *   }
 * });
 *
 * @example
 * // Monitor only MMKV storage
 * const storageQueries = useStorageQueries({
 *   queryClient,
 *   mmkv: storage
 * });
 *
 * @example
 * // Monitor only specific secure storage keys
 * const storageQueries = useStorageQueries({
 *   queryClient,
 *   secureStorage: ['sessionToken', 'refreshToken'],
 *   secureStoragePollInterval: 2000 // Check every 2 seconds
 * });
 */
export function useStorageQueries({
  queryClient,
  mmkv,
  asyncStorage,
  secureStorage,
  secureStoragePollInterval,
}: UseStorageQueriesOptions): StorageQueryResults {
  // Always call hooks but with conditional parameters
  // MMKV queries - pass a dummy storage if not enabled
  const mmkvQueries = useDynamicMmkvQueries({
    queryClient,
    storage: mmkv || {
      getAllKeys: () => [],
      getString: () => undefined,
      getNumber: () => undefined,
      getBoolean: () => undefined,
      addOnValueChangedListener: () => ({ remove: () => {} }),
    },
  });

  // AsyncStorage queries - always call but filter results
  const asyncStorageQueries = useDynamicAsyncStorageQueries({
    queryClient,
  });

  // SecureStorage queries - handle both legacy array format and new object format
  const secureStorageConfig = Array.isArray(secureStorage)
    ? { storage: undefined, keys: secureStorage }
    : secureStorage || { storage: undefined, keys: [] };

  const secureStorageQueries = useDynamicSecureStorageQueries({
    queryClient,
    secureStorage: secureStorageConfig.storage,
    knownKeys: secureStorageConfig.keys,
    pollInterval: secureStoragePollInterval,
  });

  return {
    mmkv: mmkv ? mmkvQueries : [],
    asyncStorage: asyncStorage ? asyncStorageQueries : [],
    secureStorage: secureStorageConfig.keys.length ? secureStorageQueries : [],
  };
}
