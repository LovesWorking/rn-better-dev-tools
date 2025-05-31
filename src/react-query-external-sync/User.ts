export interface User {
  id: string;
  deviceName: string;
  deviceId?: string; // Optional for backward compatibility
  platform?: string; // Device platform (iOS, Android, Web)
  extraDeviceInfo?: string; // json string of additional device information as key-value pairs
  envVariables?: Record<string, string>; // Environment variables from the mobile app
}
