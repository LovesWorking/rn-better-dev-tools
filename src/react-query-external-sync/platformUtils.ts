/**
 * Platform and storage utilities that work across different environments (React Native, web, etc.)
 */

// Types
/**
 * Valid platform operating systems that can be used with React Native
 * @see https://reactnative.dev/docs/platform
 */
export type PlatformOS =
  | 'ios' // iOS devices (iPhone, iPad, iPod)
  | 'android' // Android devices
  | 'web' // Web browsers
  | 'windows' // Windows desktop/UWP
  | 'macos' // macOS desktop
  | 'native' // Generic native platform
  | 'tv' // Generic TV platform (Android TV, etc)
  | 'tvos' // Apple TV
  | 'visionos' // Apple Vision Pro / visionOS
  | 'maccatalyst'; // iOS apps running on macOS via Mac Catalyst

// Storage interface similar to AsyncStorage
export interface StorageInterface {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

let customStorageImplementation: StorageInterface | null = null;

// Try to detect if we're in a React Native environment
export const isReactNative = (): boolean => {
  try {
    return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  } catch (e) {
    return false;
  }
};

/**
 * Get platform-specific URL for socket connection
 * On Android emulator, we need to replace localhost with 10.0.2.2
 */
export const getPlatformSpecificURL = (baseUrl: string, platform: PlatformOS): string => {
  try {
    const url = new URL(baseUrl);

    // For Android emulator, replace hostname with 10.0.2.2
    if (platform === 'android' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      url.hostname = '10.0.2.2';
      return url.toString();
    }

    // For other platforms, use as provided
    return baseUrl;
  } catch (e) {
    console.warn('Error getting platform-specific URL:', e);
    return baseUrl;
  }
};

// Storage implementation
export const getStorage = (): StorageInterface => {
  // Return user-defined storage if available
  if (customStorageImplementation) {
    return customStorageImplementation;
  }

  // Try to use React Native AsyncStorage if available
  if (isReactNative()) {
    try {
      // Dynamic import to avoid bundling issues
      const AsyncStorage =
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@react-native-async-storage/async-storage').default;
      return AsyncStorage;
    } catch (e) {
      console.warn('Failed to import AsyncStorage from react-native:', e);
    }
  }

  // Fallback to browser localStorage with an async wrapper
  if (typeof localStorage !== 'undefined') {
    return {
      getItem: async (key: string): Promise<string | null> => {
        return localStorage.getItem(key);
      },
      setItem: async (key: string, value: string): Promise<void> => {
        localStorage.setItem(key, value);
      },
      removeItem: async (key: string): Promise<void> => {
        localStorage.removeItem(key);
      },
    };
  }

  // Memory fallback if nothing else is available
  console.warn('No persistent storage available, using in-memory storage');
  const memoryStorage: Record<string, string> = {};
  return {
    getItem: async (key: string): Promise<string | null> => {
      return memoryStorage[key] || null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      memoryStorage[key] = value;
    },
    removeItem: async (key: string): Promise<void> => {
      delete memoryStorage[key];
    },
  };
};

/**
 * Set a custom storage implementation
 * Use this if you need to provide your own storage solution
 */
export const setCustomStorage = (storage: StorageInterface | null): void => {
  customStorageImplementation = storage;
};
