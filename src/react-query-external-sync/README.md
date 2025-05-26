# React Query External Sync

A powerful debugging tool for React Query state in any React-based application. Whether you're building for mobile, web, desktop, TV, or VR - this package has you covered. It works seamlessly across all platforms where React runs, with zero configuration to disable in production.

Pairs perfectly with [React Native DevTools](https://github.com/LovesWorking/rn-better-dev-tools) for a complete development experience.

![React Query External Sync Demo](https://github.com/user-attachments/assets/39e5c417-be4d-46af-8138-3589d73fce9f)

## ✨ Features

- 🔄 Real-time React Query state synchronization
- 📱 Works with any React-based framework (React, React Native, Expo, Next.js, etc.)
- 🖥️ Platform-agnostic: Web, iOS, Android, macOS, Windows, Linux, tvOS, VR - you name it!
- 🔌 Socket.IO integration for reliable communication
- 📊 Query status, data, and error monitoring
- ⚡️ Simple integration with minimal setup
- 🧩 Perfect companion to React Native DevTools
- 🛑 Zero-config production safety - automatically disabled in production builds

## 📦 Installation

```bash
# Using npm
npm install --save-dev react-query-external-sync socket.io-client

# Using yarn
yarn add -D react-query-external-sync socket.io-client

# Using pnpm
pnpm add -D react-query-external-sync socket.io-client
```

## 🚀 Quick Start

Add the hook to your application where you set up your React Query context:

```jsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncQueriesExternal } from "react-query-external-sync";
// Import Platform for React Native or use other platform detection for web/desktop
import { Platform } from "react-native";

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
    envVariables: {
      // Optional environment variables from your app
      NODE_ENV: process.env.NODE_ENV,
      API_URL: process.env.API_URL,
      // Add any relevant environment variables
    },
    enableLogs: false,
  });

  // Your app content
  return <YourApp />;
}
```

## 🔒 Production Safety

This package is automatically disabled in production builds.

```jsx
// The package handles this internally:
if (process.env.NODE_ENV !== "production") {
  useSyncQueries = require("./new-sync/useSyncQueries").useSyncQueries;
} else {
  // In production, this becomes a no-op function
  useSyncQueries = () => ({
    isConnected: false,
    connect: () => {},
    disconnect: () => {},
    socket: null,
    users: [],
  });
}
```

## 💡 Usage with DevTools

For the best experience, use this package with the [React Native DevTools](https://github.com/LovesWorking/rn-better-dev-tools) application:

1. Download and launch the DevTools application
2. Integrate this package in your React application
3. Start your application
4. DevTools will automatically detect and connect to your running application

> **Note**: For optimal connection, launch DevTools before starting your application.

## ⚙️ Configuration Options

The `useSyncQueriesExternal` hook accepts the following options:

| Option            | Type        | Required | Description                                                             |
| ----------------- | ----------- | -------- | ----------------------------------------------------------------------- |
| `queryClient`     | QueryClient | Yes      | Your React Query client instance                                        |
| `socketURL`       | string      | Yes      | URL of the socket server (e.g., 'http://localhost:42831')               |
| `deviceName`      | string      | Yes      | Human-readable name for your device                                     |
| `platform`        | string      | Yes      | Platform identifier ('ios', 'android', 'web', 'macos', 'windows', etc.) |
| `deviceId`        | string      | Yes      | Unique identifier for your device                                       |
| `extraDeviceInfo` | object      | No       | Additional device metadata to display in DevTools                       |
| `envVariables`    | object      | No       | Environment variables from your app to display in DevTools              |
| `enableLogs`      | boolean     | No       | Enable console logging for debugging (default: false)                   |

## 🐛 Troubleshooting

### Quick Checklist

1. **DevTools Connection**

   - Look for "Connected" status in the top-left corner of the DevTools app
   - If it shows "Disconnected", restart the DevTools app

2. **No Devices Appearing**

   - Verify the Socket.IO client is installed (`npm list socket.io-client`)
   - Ensure the hook is properly set up in your app
   - Check that `socketURL` matches the DevTools port (default: 42831)
   - Restart both your app and the DevTools

3. **Data Not Syncing**
   - Confirm you're passing the correct `queryClient` instance
   - Set `enableLogs: true` to see connection information

That's it! If you're still having issues, visit the [GitHub repository](https://github.com/LovesWorking/react-query-external-sync/issues) for support.

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

## 📄 License

MIT

---

Made with ❤️ by [LovesWorking](https://github.com/LovesWorking)
