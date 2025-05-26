import { useEffect, useRef, useState } from "react";
import { io as socketIO, Socket } from "socket.io-client";

import { getPlatformSpecificURL, PlatformOS } from "./platformUtils";
import { log } from "./utils/logger";

interface Props {
  deviceName: string; // Unique name to identify the device
  socketURL: string; // Base URL of the socket server (may be modified based on platform)
  persistentDeviceId: string | null; // Persistent device ID
  extraDeviceInfo?: Record<string, string>; // Additional device information as key-value pairs
  envVariables?: Record<string, string>; // Environment variables from the mobile app
  platform: PlatformOS; // Platform identifier
  /**
   * Enable/disable logging for debugging purposes
   * @default false
   */
  enableLogs?: boolean;
}

/**
 * Create a singleton socket instance that persists across component renders
 * This way multiple components can share the same socket connection
 */
let globalSocketInstance: Socket | null = null;
let currentSocketURL = "";

/**
 * Hook that handles socket connection for device-dashboard communication
 *
 * Features:
 * - Singleton pattern for socket connection
 * - Platform-specific URL handling for iOS/Android/Web
 * - Device name identification
 * - Connection state tracking
 * - User list management
 */
export function useMySocket({
  deviceName,
  socketURL,
  persistentDeviceId,
  extraDeviceInfo,
  envVariables,
  platform,
  enableLogs = false,
}: Props) {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const initialized = useRef(false);

  // For logging clarity
  const logPrefix = `[${deviceName}]`;

  // Define event handlers at function root level to satisfy linter
  const onConnect = () => {
    log(`${logPrefix} Socket connected successfully`, enableLogs);
    setIsConnected(true);
  };

  const onDisconnect = (reason: string) => {
    log(`${logPrefix} Socket disconnected. Reason: ${reason}`, enableLogs);
    setIsConnected(false);
  };

  const onConnectError = (error: Error) => {
    log(
      `${logPrefix} Socket connection error: ${error.message}`,
      enableLogs,
      "error"
    );
  };

  const onConnectTimeout = () => {
    log(`${logPrefix} Socket connection timeout`, enableLogs, "error");
  };

  // Main socket initialization - runs only once
  useEffect(() => {
    // Wait until we have a persistent device ID
    if (!persistentDeviceId) {
      return;
    }

    // Only initialize socket once to prevent multiple connections
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    // Get the platform-specific URL
    const platformUrl = getPlatformSpecificURL(socketURL, platform);
    currentSocketURL = platformUrl;

    log(
      `${logPrefix} Platform: ${platform}, using URL: ${platformUrl}`,
      enableLogs
    );

    try {
      // Use existing global socket or create a new one
      if (!globalSocketInstance) {
        log(
          `${logPrefix} Creating new socket instance to ${platformUrl}`,
          enableLogs
        );
        globalSocketInstance = socketIO(platformUrl, {
          autoConnect: true,
          query: {
            deviceName,
            deviceId: persistentDeviceId,
            platform,
            extraDeviceInfo: JSON.stringify(extraDeviceInfo),
            envVariables: JSON.stringify(envVariables),
          },
          reconnection: false,
          transports: ["websocket"], // Prefer websocket transport for React Native
        });
      } else {
        log(
          `${logPrefix} Reusing existing socket instance to ${platformUrl}`,
          enableLogs
        );
      }

      socketRef.current = globalSocketInstance;
      setSocket(socketRef.current);

      // Setup error event listener
      socketRef.current.on("connect_error", onConnectError);
      socketRef.current.on("connect_timeout", onConnectTimeout);

      // Check initial connection state
      if (socketRef.current.connected) {
        setIsConnected(true);
        log(`${logPrefix} Socket already connected on init`, enableLogs);
      }

      // Set up event handlers
      socketRef.current.on("connect", onConnect);
      socketRef.current.on("disconnect", onDisconnect);

      // Clean up event listeners on unmount but don't disconnect
      return () => {
        if (socketRef.current) {
          log(`${logPrefix} Cleaning up socket event listeners`, enableLogs);
          socketRef.current.off("connect", onConnect);
          socketRef.current.off("disconnect", onDisconnect);
          socketRef.current.off("connect_error", onConnectError);
          socketRef.current.off("connect_timeout", onConnectTimeout);
          // Don't disconnect socket on component unmount
          // We want it to remain connected for the app's lifetime
        }
      };
    } catch (error) {
      log(
        `${logPrefix} Failed to initialize socket: ${error}`,
        enableLogs,
        "error"
      );
    }
  }, [persistentDeviceId]);

  // Update the socket query parameters when deviceName changes
  useEffect(() => {
    if (
      socketRef.current &&
      socketRef.current.io.opts.query &&
      persistentDeviceId
    ) {
      log(`${logPrefix} Updating device name in socket connection`, enableLogs);
      socketRef.current.io.opts.query = {
        ...socketRef.current.io.opts.query,
        deviceName,
        deviceId: persistentDeviceId,
        platform,
      };
    }
  }, [deviceName, logPrefix, persistentDeviceId, platform, enableLogs]);

  // Update the socket URL when socketURL changes
  useEffect(() => {
    // Get platform-specific URL for the new socketURL
    const platformUrl = getPlatformSpecificURL(socketURL, platform);

    // Compare with last known URL to avoid direct property access
    if (
      socketRef.current &&
      currentSocketURL !== platformUrl &&
      persistentDeviceId
    ) {
      log(
        `${logPrefix} Socket URL changed from ${currentSocketURL} to ${platformUrl}`,
        enableLogs
      );

      try {
        // Only recreate socket if URL actually changed
        socketRef.current.disconnect();
        currentSocketURL = platformUrl;

        log(
          `${logPrefix} Creating new socket connection to ${platformUrl}`,
          enableLogs
        );
        globalSocketInstance = socketIO(platformUrl, {
          autoConnect: true,
          query: {
            deviceName,
            deviceId: persistentDeviceId,
            platform,
            extraDeviceInfo: JSON.stringify(extraDeviceInfo),
            envVariables: JSON.stringify(envVariables),
          },
          reconnection: false,
          transports: ["websocket"], // Prefer websocket transport for React Native
        });

        socketRef.current = globalSocketInstance;
        setSocket(socketRef.current);
      } catch (error) {
        log(
          `${logPrefix} Failed to update socket connection: ${error}`,
          enableLogs,
          "error"
        );
      }
    }
  }, [
    socketURL,
    deviceName,
    logPrefix,
    persistentDeviceId,
    platform,
    enableLogs,
  ]);

  /**
   * Manually connect to the socket server
   */
  function connect() {
    if (socketRef.current && !socketRef.current.connected) {
      log(`${logPrefix} Manually connecting to socket server`, enableLogs);
      socketRef.current.connect();
    }
  }

  /**
   * Manually disconnect from the socket server
   */
  function disconnect() {
    if (socketRef.current && socketRef.current.connected) {
      log(`${logPrefix} Manually disconnecting from socket server`, enableLogs);
      socketRef.current.disconnect();
    }
  }

  return {
    socket,
    connect,
    disconnect,
    isConnected,
  };
}
