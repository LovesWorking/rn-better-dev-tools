/**
 * Centralized storage query keys for all storage hooks
 * This ensures consistency across MMKV, AsyncStorage, and SecureStorage hooks
 * and allows easy modification of the base storage key in one place
 */
export const storageQueryKeys = {
  /**
   * Base storage key - change this to update all storage-related queries
   */
  base: () => ["#storage"] as const,

  /**
   * MMKV storage query keys
   */
  mmkv: {
    root: () => [...storageQueryKeys.base(), "mmkv"] as const,
    key: (key: string) => [...storageQueryKeys.mmkv.root(), key] as const,
    all: () => [...storageQueryKeys.mmkv.root(), "all"] as const,
  },

  /**
   * AsyncStorage query keys
   */
  async: {
    root: () => [...storageQueryKeys.base(), "async"] as const,
    key: (key: string) => [...storageQueryKeys.async.root(), key] as const,
    all: () => [...storageQueryKeys.async.root(), "all"] as const,
  },

  /**
   * SecureStorage query keys
   */
  secure: {
    root: () => [...storageQueryKeys.base(), "secure"] as const,
    key: (key: string) => [...storageQueryKeys.secure.root(), key] as const,
    all: () => [...storageQueryKeys.secure.root(), "all"] as const,
  },
} as const;

/**
 * Storage types that can be enabled/disabled
 */
export type StorageType = "mmkv" | "async" | "secure";

/**
 * Check if a query key matches any of the storage patterns
 */
export function isStorageQuery(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }

  return queryKey[0] === "#storage";
}

/**
 * Get the storage type from a query key
 */
export function getStorageType(
  queryKey: readonly unknown[]
): StorageType | null {
  if (!isStorageQuery(queryKey) || queryKey.length < 2) {
    return null;
  }

  const storageType = queryKey[1];
  if (
    storageType === "mmkv" ||
    storageType === "async" ||
    storageType === "secure"
  ) {
    return storageType;
  }

  return null;
}

/**
 * Check if a storage type should be filtered out based on enabled storage types
 */
export function shouldFilterStorageQuery(
  queryKey: readonly unknown[],
  enabledStorageTypes: Set<StorageType>
): boolean {
  const storageType = getStorageType(queryKey);
  if (storageType === null) {
    return false; // Not a storage query, don't filter
  }

  return !enabledStorageTypes.has(storageType);
}
