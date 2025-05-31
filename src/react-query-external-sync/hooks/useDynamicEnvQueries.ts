import { useMemo } from 'react';

export interface UseDynamicEnvOptions {
  /**
   * Optional filter function to determine which env vars to include
   * Note: Only EXPO_PUBLIC_ prefixed variables are available in process.env
   */
  envFilter?: (key: string, value: string | undefined) => boolean;
}

export interface EnvResult {
  key: string;
  data: unknown;
}

/**
 * Hook that returns all available environment variables with parsed values
 * Includes all available environment variables by default (only EXPO_PUBLIC_ prefixed vars are loaded by Expo)
 *
 * @example
 * // Get all available environment variables (only EXPO_PUBLIC_ prefixed)
 * const envVars = useDynamicEnv();
 * // Returns: [
 * //   { key: 'EXPO_PUBLIC_API_URL', data: 'https://api.example.com' },
 * //   { key: 'EXPO_PUBLIC_APP_NAME', data: 'MyApp' },
 * //   ...
 * // ]
 *
 * @example
 * // Filter to specific variables
 * const envVars = useDynamicEnv({
 *   envFilter: (key) => key.includes('API') || key.includes('URL')
 * });
 *
 * @example
 * // Filter by value content
 * const envVars = useDynamicEnv({
 *   envFilter: (key, value) => value !== undefined && value.length > 0
 * });
 */
export function useDynamicEnv({
  envFilter = () => true, // Default: include all available environment variables (EXPO_PUBLIC_ only)
}: UseDynamicEnvOptions = {}): EnvResult[] {
  // Helper function to get a single environment variable value
  const getEnvValue = useMemo(() => {
    return (key: string): unknown => {
      const value = process.env[key];

      if (value === undefined) {
        return null;
      }

      // Try to parse as JSON for complex values, fall back to string
      try {
        // Only attempt JSON parsing if it looks like JSON (starts with { or [)
        if (value.startsWith('{') || value.startsWith('[')) {
          return JSON.parse(value);
        }

        // Parse boolean-like strings
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Parse number-like strings
        if (/^\d+$/.test(value)) {
          const num = parseInt(value, 10);
          return !isNaN(num) ? num : value;
        }

        if (/^\d*\.\d+$/.test(value)) {
          const num = parseFloat(value);
          return !isNaN(num) ? num : value;
        }

        return value;
      } catch {
        return value;
      }
    };
  }, []);

  // Get all environment variables and process them
  const envResults = useMemo(() => {
    const allEnvKeys = Object.keys(process.env);
    const filteredKeys = allEnvKeys.filter((key) => {
      const value = process.env[key];
      return envFilter(key, value);
    });

    return filteredKeys.map((key) => ({
      key,
      data: getEnvValue(key),
    }));
  }, [envFilter, getEnvValue]);

  return envResults;
}
