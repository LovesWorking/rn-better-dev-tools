export interface User {
  id: string;
  deviceName: string;
  deviceId: string; // Persisted device ID
  platform?: string; // Device platform (iOS, Android, Web)
  isConnected?: boolean; // Whether the device is currently connected
  extraDeviceInfo?: string; // json string of additional device information as key-value pairs
  envVariables?: string; // json string of environment variables from the mobile app
}
