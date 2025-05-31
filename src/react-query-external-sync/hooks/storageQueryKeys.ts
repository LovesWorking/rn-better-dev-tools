/**
 * Centralized storage query keys for all storage hooks
 * This ensures consistency across MMKV, AsyncStorage, and SecureStorage hooks
 * and allows easy modification of the base storage key in one place
 */
export const storageQueryKeys = {
  /**
   * Base storage key - change this to update all storage-related queries
   */
  base: () => ['#storage'] as const,

  /**
   * MMKV storage query keys
   */
  mmkv: {
    root: () => [...storageQueryKeys.base(), 'mmkv'] as const,
    key: (key: string) => [...storageQueryKeys.mmkv.root(), key] as const,
    all: () => [...storageQueryKeys.mmkv.root(), 'all'] as const,
  },

  /**
   * AsyncStorage query keys
   */
  async: {
    root: () => [...storageQueryKeys.base(), 'async'] as const,
    key: (key: string) => [...storageQueryKeys.async.root(), key] as const,
    all: () => [...storageQueryKeys.async.root(), 'all'] as const,
  },

  /**
   * SecureStorage query keys
   */
  secure: {
    root: () => [...storageQueryKeys.base(), 'secure'] as const,
    key: (key: string) => [...storageQueryKeys.secure.root(), key] as const,
    all: () => [...storageQueryKeys.secure.root(), 'all'] as const,
  },
} as const;
