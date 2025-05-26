# React Native DevTools

Enhanced developer tools for React Native applications, supporting React Query DevTools and device storage monitoring with a beautiful native interface.

![ios pokemon](https://github.com/user-attachments/assets/25ffb38c-2e41-4aa9-a3c7-6f74383a75fc)

https://github.com/user-attachments/assets/fce3cba3-b30a-409a-8f8f-db2bd28579be

## Example app

https://github.com/LovesWorking/RN-Dev-Tools-Example

## ✨ Features

- 🔄 Real-time React Query state monitoring
- 💾 **Device storage monitoring with CRUD operations** - MMKV, AsyncStorage, and SecureStorage
- 🌐 **Environment variables monitoring** - View and track public environment variables
- 🎨 Beautiful native macOS interface
- 🚀 Automatic connection to React apps
- 📊 Query status visualization
- 🔌 Socket.IO integration for reliable communication
- ⚡️ Simple setup with NPM package
- 📱 Works with **any React-based platform**: React Native, React Web, Next.js, Expo, tvOS, VR, etc.
- 🛑 Zero-config production safety - automatically disabled in production builds

## 📦 Installation

### DevTools Desktop Application (macOS)

> **⚠️ Important**: The desktop app has currently only been tested on Apple Silicon Macs (M1/M2/M3).
> If you encounter issues on Intel-based Macs, please [open an issue](https://github.com/LovesWorking/rn-better-dev-tools/issues)
> and we'll work together to fix it.

1. Download the latest release from the [Releases page](https://github.com/LovesWorking/rn-better-dev-tools/releases)
2. Extract the ZIP file
3. Move the app to your Applications folder
4. Launch the app

### React Application Integration

The easiest way to connect your React application to the DevTools is by installing the npm package:

```bash
# Using npm
npm install --save-dev react-query-external-sync socket.io-client

# Using yarn
yarn add -D react-query-external-sync socket.io-client

# Using pnpm (recommended)
pnpm add -D react-query-external-sync socket.io-client
```

## 🚀 Quick Start

1. Launch React Native DevTools application
2. Add the hook to your application where you set up your React Query context:

```jsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncQueriesExternal } from "react-query-external-sync";
// Import Platform for React Native or use other platform detection for web/desktop
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { storage } from "./mmkv"; // Your MMKV instance

// Create your query client
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

function AppContent() {
  // Set up the sync hook - automatically disabled in production!
  useSyncQueriesExternal({
    queryClient,
    socketURL: "http://localhost:42831", // Default port for React Native DevTools
    deviceName: Platform?.OS || "web", // Platform detection
    platform: Platform?.OS || "web", // Use appropriate platform identifier
    deviceId: Platform?.OS || "web", // Use a PERSISTENT identifier (see note below)
    extraDeviceInfo: {
      // Optional additional info about your device
      appVersion: "1.0.0",
      // Add any relevant platform info
    },
    enableLogs: false,
    envVariables: {
      NODE_ENV: process.env.NODE_ENV,
      // Add any private environment variables you want to monitor
      // Public environment variables are automatically loaded
    },
    // Storage monitoring with CRUD operations
    mmkvStorage: storage, // MMKV storage for ['#storage', 'mmkv', 'key'] queries + monitoring
    asyncStorage: AsyncStorage, // AsyncStorage for ['#storage', 'async', 'key'] queries + monitoring
    secureStorage: SecureStore, // SecureStore for ['#storage', 'secure', 'key'] queries + monitoring
    secureStorageKeys: [
      "userToken",
      "refreshToken",
      "biometricKey",
      "deviceId",
    ], // SecureStore keys to monitor
  });

  // Your app content
  return <YourApp />;
}
```

3. Start your React application
4. DevTools will automatically detect and connect to your running application

### 📱 Using with Real Devices (Local Network)

When testing on real devices connected to your local network, you'll need to use your host machine's IP address instead of `localhost`. Here's a helpful setup for Expo apps (contributed by [ShoeBoom](https://github.com/ShoeBoom)):

```jsx
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { storage } from "./mmkv"; // Your MMKV instance

// Get the host IP address dynamically
const hostIP =
  Constants.expoGoConfig?.debuggerHost?.split(`:`)[0] ||
  Constants.expoConfig?.hostUri?.split(`:`)[0];

function AppContent() {
  useSyncQueriesExternal({
    queryClient,
    socketURL: `http://${hostIP}:42831`, // Use local network IP
    deviceName: Platform?.OS || "web",
    platform: Platform?.OS || "web",
    deviceId: Platform?.OS || "web",
    extraDeviceInfo: {
      appVersion: "1.0.0",
    },
    enableLogs: false,
    envVariables: {
      NODE_ENV: process.env.NODE_ENV,
    },
    // Storage monitoring
    mmkvStorage: storage,
    asyncStorage: AsyncStorage,
    secureStorage: SecureStore,
    secureStorageKeys: ["userToken", "refreshToken"],
  });

  return <YourApp />;
}
```

> **Note**: For optimal connection, launch DevTools before starting your application.

## 💡 Usage Tips

- Keep DevTools running while developing
- Monitor query states in real-time
- View detailed query information
- Track cache updates and invalidations
- **Monitor device storage**: View and modify MMKV, AsyncStorage, and SecureStorage data in real-time
- **Track environment variables**: Monitor public environment variables across your application
- **Use storage queries**: Access storage data via React Query with keys like `['#storage', 'mmkv', 'key']`
- The hook is automatically disabled in production builds, no configuration needed

## 📱 Platform Support

React Native DevTools works with **any React-based application**, regardless of platform:

- 📱 Mobile: iOS, Android
- 🖥️ Web: React, Next.js, Remix, etc.
- 🖥️ Desktop: Electron, Tauri
- 📺 TV: tvOS, Android TV
- 🥽 VR/AR: Meta Quest, etc.
- 💻 Cross-platform: Expo, React Native Web

If your platform can run React and connect to a socket server, it will work with these DevTools!

## 💾 Storage Monitoring

React Native DevTools now includes powerful storage monitoring capabilities with full CRUD operations:

### Supported Storage Types

- **MMKV**: High-performance key-value storage
- **AsyncStorage**: React Native's standard async storage
- **SecureStorage**: Secure storage for sensitive data (Expo SecureStore)

### Features

- **Real-time monitoring**: See storage changes as they happen
- **CRUD operations**: Create, read, update, and delete storage entries directly from DevTools
- **React Query integration**: Access storage data via queries like `['#storage', 'mmkv', 'keyName']`
- **Type-safe operations**: Automatic serialization/deserialization of complex data types
- **Secure data handling**: SecureStorage keys are monitored securely

### Usage Example

```jsx
// In your app, use React Query to interact with storage
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Read from MMKV storage
const { data: userData } = useQuery({
  queryKey: ["#storage", "mmkv", "user"],
  // Data will be automatically synced with DevTools
});

// Write to AsyncStorage
const queryClient = useQueryClient();
const updateAsyncStorage = useMutation({
  mutationFn: async ({ key, value }) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    // Invalidate to trigger sync
    queryClient.invalidateQueries(["#storage", "async", key]);
  },
});
```

## ⚙️ Configuration Options

The `useSyncQueriesExternal` hook accepts the following options:

| Option              | Type         | Required | Description                                                                       |
| ------------------- | ------------ | -------- | --------------------------------------------------------------------------------- |
| `queryClient`       | QueryClient  | Yes      | Your React Query client instance                                                  |
| `socketURL`         | string       | Yes      | URL of the socket server (e.g., 'http://localhost:42831')                         |
| `deviceName`        | string       | Yes      | Human-readable name for your device                                               |
| `platform`          | string       | Yes      | Platform identifier ('ios', 'android', 'web', 'macos', 'windows', etc.)           |
| `deviceId`          | string       | Yes      | Unique identifier for your device                                                 |
| `extraDeviceInfo`   | object       | No       | Additional device metadata to display in DevTools                                 |
| `enableLogs`        | boolean      | No       | Enable console logging for debugging (default: false)                             |
| `envVariables`      | object       | No       | Private environment variables to sync with DevTools (public vars are auto-loaded) |
| `mmkvStorage`       | MmkvStorage  | No       | MMKV storage instance for real-time monitoring                                    |
| `asyncStorage`      | AsyncStorage | No       | AsyncStorage instance for polling-based monitoring                                |
| `secureStorage`     | SecureStore  | No       | SecureStore instance for secure data monitoring                                   |
| `secureStorageKeys` | string[]     | No       | Array of SecureStore keys to monitor (required if using secureStorage)            |

## 🔮 Future Plans

React Native DevTools is actively being developed with exciting features on the roadmap:

- ✅ **Storage Viewers**: Beautiful interfaces for viewing and modifying storage (AsyncStorage, MMKV, SecureStorage) - **Now Available!**
- 🌐 **Network Request Monitoring**: Track API calls, WebSockets, and GraphQL requests
- ❌ **Failed Request Tracking**: Easily identify and debug network failures
- 🔄 **Remote Expo DevTools**: Trigger Expo DevTools commands remotely without using the command line
- 🧩 **Plugin System**: Allow community extensions for specialized debugging tasks
- 🗄️ **Drizzle Studio Plugin**: Integration with Drizzle ORM for database management

Stay tuned for updates!

## 🤝 Contributing

I welcome contributions! See [Development Guide](DEVELOPMENT.md) for details on:

- Setting up the development environment
- Building and testing
- Release process
- Contribution guidelines

## 🐛 Troubleshooting

Having issues? Check these common solutions:

1. **App Not Connecting**

   - Ensure DevTools is launched before your React app
   - Check that your React app is running
   - Verify you're on the same network
   - Make sure the `socketURL` is correctly pointing to localhost:42831
   - Verify the Socket.IO client is properly installed in your app
   - Check that the `useSyncQueriesExternal` hook is properly implemented

2. **App Not Starting**

   - Verify you're using the latest version
   - Check system requirements (macOS with Apple Silicon chip)
   - Try reinstalling the application
   - If using an Intel Mac and encountering issues, please report them

3. **Socket Connection Issues**

   - Make sure no firewall is blocking the connection on port 42831
   - Restart both the DevTools app and your React app
   - Check the console logs with `enableLogs: true` for any error messages
   - If the React Query data is too large the socket connection will crash! If you see the device connect and then disconnect with no logs this is what's happening. You'll need to fix your query cache to not be so large.

4. **Data Not Syncing**

   - Confirm you're passing the correct `queryClient` instance
   - Set `enableLogs: true` to see connection information

5. **Device ID Issues**

   - Make sure your `deviceId` is persistent (see below)

6. **Storage Monitoring Issues**

   - Ensure storage instances are properly passed to the hook
   - For SecureStorage, make sure `secureStorageKeys` array is provided
   - Check that storage permissions are granted on the device
   - Verify storage libraries are properly installed and configured
   - Use `enableLogs: true` to see storage sync information

## ⚠️ Important Note About Device IDs

The `deviceId` parameter must be **persistent** across app restarts and re-renders. Using a value that changes (like `Date.now()`) will cause each render to be treated as a new device.

**Recommended approaches:**

```jsx
// Simple approach for single devices
deviceId: Platform.OS, // Works if you only have one device per platform

// Better approach for multiple simulators/devices of same type
// Using AsyncStorage, MMKV, or another storage solution
const [deviceId, setDeviceId] = useState(Platform.OS);

useEffect(() => {
  const loadOrCreateDeviceId = async () => {
    // Try to load existing ID
    const storedId = await AsyncStorage.getItem('deviceId');

    if (storedId) {
      setDeviceId(storedId);
    } else {
      // First launch - generate and store a persistent ID
      const newId = `${Platform.OS}-${Date.now()}`;
      await AsyncStorage.setItem('deviceId', newId);
      setDeviceId(newId);
    }
  };

  loadOrCreateDeviceId();
}, []);
```

For more detailed troubleshooting, see our [Development Guide](DEVELOPMENT.md).

## 📄 License

MIT

---

Made with ❤️ by [LovesWorking](https://github.com/LovesWorking)
