import { Socket, Server as SocketIOServer } from "socket.io";
// Replace the problematic import with a direct type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DefaultEventsMap = Record<string, (...args: any[]) => void>;
import { User } from "../components/external-dash/types/User";
import { SyncMessage } from "../components/external-dash/shared/types";
import {
  OnlineManagerMessage,
  QueryActionMessage,
  QueryRequestInitialStateMessage,
} from "../components/external-dash/useSyncQueriesWeb";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  io: SocketIOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
}

/**
 * Global state for connected users and dashboard clients
 */
let users = [] as User[]; // Connected users
const allDevices = [] as User[]; // All devices that have ever connected (history)
let dashboardClients = [] as string[]; // Dashboard client IDs
// Map to track socketId to deviceId for reconnection handling
const deviceIdMap = new Map<string, string>();
// Map to track active socket connections by deviceId
const activeConnectionsMap = new Map<string, string>();

/**
 * Server-side socket handler that manages:
 * - Communication between devices and dashboard
 * - User connection tracking
 * - Query state synchronization
 * - Action forwarding
 */
export default function socketHandle({ io }: Props) {
  const LOG_PREFIX = "[SERVER]";

  /**
   * Handle client disconnection
   */
  function handleClose(id: string) {
    // Find user before removing for logging
    const user = users.find((user) => user.id === id);

    // Get the device ID from our map if it exists
    const deviceId = deviceIdMap.get(id);

    // Only remove from users array if there's no persistent device ID
    // or if there are no other connections with the same device ID
    if (
      !deviceId ||
      !users.some((u) => u.id !== id && u.deviceId === deviceId)
    ) {
      users = users.filter((user: User) => user.id !== id);

      console.log(
        `${LOG_PREFIX} Client disconnected - ID: ${id}, Name: ${
          user?.deviceName || "Unknown"
        } - Removing user record`
      );

      // Update the connection status in allDevices array
      if (deviceId) {
        const deviceIndex = allDevices.findIndex(
          (u) => u.deviceId === deviceId
        );
        if (deviceIndex !== -1) {
          allDevices[deviceIndex].isConnected = false;
          // Remove the active connection mapping
          activeConnectionsMap.delete(deviceId);
        }
      }
    } else {
      console.log(
        `${LOG_PREFIX} Client disconnected - ID: ${id}, Name: ${
          user?.deviceName || "Unknown"
        } - Keeping user record for same device with ID: ${deviceId}`
      );
    }

    // Remove from deviceIdMap
    deviceIdMap.delete(id);

    // Remove from dashboard clients if it exists
    const wasDashboard = dashboardClients.includes(id);
    dashboardClients = dashboardClients.filter((clientId) => clientId !== id);

    console.log(
      `${LOG_PREFIX} Client disconnected - ID: ${id}, Name: ${
        user?.deviceName || "Unknown"
      }, Was Dashboard: ${wasDashboard}`
    );

    // Also send the complete device history list (excluding dashboard)
    io.emit(
      "all-devices-update",
      allDevices.filter((device) => device.deviceName !== "Dashboard")
    );
    console.log(
      `${LOG_PREFIX} Updated users list: ${users
        .map((u) => u.deviceName)
        .join(", ")}`
    );
  }

  // ==========================================================
  // Add a new user to the connected users list with unique naming
  // ==========================================================
  function addNewUser({
    id,
    deviceName,
    deviceId,
    platform,
    extraDeviceInfo,
    envVariables,
  }: User) {
    // Check if we're reconnecting an existing device by deviceId
    if (deviceId) {
      // Store the mapping for future reference
      deviceIdMap.set(id, deviceId);
      // Track active connection
      activeConnectionsMap.set(deviceId, id);

      // Check if we already have a user with this deviceId
      const existingUserIndex = users.findIndex(
        (user) => user.deviceId === deviceId
      );

      // Check if this device is in our history
      const existingDeviceIndex = allDevices.findIndex(
        (device) => device.deviceId === deviceId
      );
      // If the user exists, update the user with the new socket id and potentially new info
      if (existingUserIndex !== -1) {
        console.log(
          `${LOG_PREFIX} Reconnecting existing device - ID: ${id}, Name: ${deviceName}, DeviceId: ${deviceId}, Platform: ${
            platform || "Unknown"
          }, ExtraDeviceInfo: ${extraDeviceInfo}`
        );

        // Update the existing user with the new socket id and potentially new info
        users[existingUserIndex].id = id;
        if (platform) {
          users[existingUserIndex].platform = platform;
        }
        if (extraDeviceInfo) {
          users[existingUserIndex].extraDeviceInfo = extraDeviceInfo;
        }
        if (envVariables) {
          users[existingUserIndex].envVariables = envVariables;
        }

        // Add isConnected status
        users[existingUserIndex].isConnected = true;

        // Update in history list too if it exists
        if (existingDeviceIndex !== -1) {
          allDevices[existingDeviceIndex].id = id;
          allDevices[existingDeviceIndex].isConnected = true;
          if (platform) {
            allDevices[existingDeviceIndex].platform = platform;
          }
          if (extraDeviceInfo) {
            allDevices[existingDeviceIndex].extraDeviceInfo = extraDeviceInfo;
          }
          if (envVariables) {
            allDevices[existingDeviceIndex].envVariables = envVariables;
          }
        } else if (deviceName !== "Dashboard") {
          // Add to history if not yet present and not a dashboard
          allDevices.push({
            id,
            deviceName,
            deviceId,
            platform,
            isConnected: true,
            extraDeviceInfo,
            envVariables,
          });
        }

        // Notify all clients of updated device list
        io.emit(
          "all-devices-update",
          allDevices.filter((device) => device.deviceName !== "Dashboard")
        );
        console.log(
          `${LOG_PREFIX} Updated users list: ${users
            .map((u) => u.deviceName)
            .join(", ")}`
        );

        return;
      }
    }

    // Handle duplicate device names by adding incrementing numbers
    const extractNumber = (name: string) => {
      const match = name.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 1;
    };

    let highestNumber = 0;
    users.forEach((user) => {
      if (user.deviceName.startsWith(deviceName)) {
        const number = extractNumber(user.deviceName);
        if (number >= highestNumber) {
          highestNumber = number;
        }
      }
    });

    // Add a number suffix if this is a duplicate name
    if (highestNumber > 0) {
      deviceName = `${deviceName} #${highestNumber + 1}`;
    }

    // Add user to the list if ID is valid
    if (id) {
      // Create user object with connection status
      const newUser = {
        id: id,
        deviceName: deviceName,
        deviceId: deviceId,
        platform: platform,
        isConnected: true,
        extraDeviceInfo: extraDeviceInfo,
        envVariables: envVariables,
      };

      users.push(newUser);

      // Add to history if it's not a dashboard
      if (deviceName !== "Dashboard" && deviceId) {
        // Check if already in history
        const existingDeviceIndex = allDevices.findIndex(
          (device) => device.deviceId === deviceId
        );

        if (existingDeviceIndex !== -1) {
          // Update existing record with all fields including extraDeviceInfo
          allDevices[existingDeviceIndex] = { ...newUser };
        } else {
          // Add new device to history with all fields
          allDevices.push({ ...newUser });
        }
      }

      console.log(
        `${LOG_PREFIX} New user connected - ID: ${id}, Name: ${deviceName}${
          deviceId ? `, DeviceId: ${deviceId}` : ""
        }${platform ? `, Platform: ${platform}` : ""}`
      );

      // Check if this is a dashboard client
      if (deviceName === "Dashboard" && id) {
        dashboardClients.push(id);
        console.log(`${LOG_PREFIX} Registered dashboard client with ID: ${id}`);
      }

      // Notify all clients of updated device list
      io.emit(
        "all-devices-update",
        allDevices.filter((device) => device.deviceName !== "Dashboard")
      );
      console.log(
        `${LOG_PREFIX} Updated device list: ${users
          .map((u) => u.deviceName)
          .join(", ")}`
      );
    }
  }
  // Function that returns device from all devies based off deviceId
  function getDeviceFromDeviceId(deviceId: string) {
    return allDevices.find((device) => device.deviceId === deviceId);
  }
  // ==========================================================
  // Handle generic user messages (for debugging purposes)
  // ==========================================================
  function handleUserMessage(message: string, deviceName: string) {
    console.log(`${LOG_PREFIX} Message from ${deviceName}: ${message}`);
    io.emit("message", `Device ${deviceName} sent message: ${message}`);
  }

  // ==========================================================
  // Forward query sync messages only to dashboard clients
  // ==========================================================
  function forwardQuerySyncToDashboards(message: SyncMessage) {
    const device = getDeviceFromDeviceId(message.persistentDeviceId);
    if (dashboardClients.length === 0) {
      console.log(
        `${LOG_PREFIX} No dashboard clients connected to forward query sync to`
      );
      return;
    }

    console.log(
      `${LOG_PREFIX} Forwarding query sync from ${device?.deviceName} to ${dashboardClients.length} dashboard(s)`
    );

    // First try to send directly to each dashboard client (more reliable)
    let sentSuccessfully = false;

    // Log the current socket connections for debugging
    const socketIds = Array.from(io.sockets.sockets.keys());
    console.log(
      `${LOG_PREFIX} Current socket connections: ${socketIds.join(", ")}`
    );

    // Check if dashboard clients are still valid
    dashboardClients = dashboardClients.filter((id) =>
      io.sockets.sockets.has(id)
    );

    // First attempt: try to directly send to each dashboard client
    for (const dashboardId of dashboardClients) {
      try {
        const socket = io.sockets.sockets.get(dashboardId);
        if (socket) {
          console.log(
            `${LOG_PREFIX} Sending directly to dashboard ${dashboardId}`
          );
          socket.emit("query-sync", message);
          sentSuccessfully = true;
          console.log(
            `${LOG_PREFIX} Successfully sent to dashboard ${dashboardId}`
          );
        } else {
          console.log(
            `${LOG_PREFIX} Dashboard socket ${dashboardId} not found`
          );
        }
      } catch (error) {
        console.error(
          `${LOG_PREFIX} Error sending to dashboard ${dashboardId}:`,
          error
        );
      }
    }

    // Fallback: If direct sending failed, try broadcasting to all clients
    // The dashboard clients will filter based on their selected device
    if (!sentSuccessfully) {
      console.log(
        `${LOG_PREFIX} Fallback: Broadcasting query sync to all clients`
      );
      io.emit("query-sync", message);
    }

    // Also log detailed message information for debugging
    console.log(`${LOG_PREFIX} Message details:`, {
      deviceName: device?.deviceName,
      type: message.type,
      persistentDeviceId: message.persistentDeviceId,
      queriesCount: message.state.queries.length,
      mutationsCount: message.state.mutations.length,
    });
  }

  /**
   * Helper function to find target user(s) and execute an action on them
   * @param targetDevice The target device name or "All"
   * @param action Function to execute on each target user
   * @param actionName Description of the action for logging
   */
  function withTargetUsers(
    targetDeviceId: string,
    action: (user: User) => void,
    actionName: string
  ) {
    const deviceName = getDeviceFromDeviceId(targetDeviceId)?.deviceName;
    // Skip if the targetDevice indicates there are no devices available
    if (targetDeviceId === "No devices available") {
      console.log(
        `${LOG_PREFIX} Skipping ${actionName} - No devices available`
      );
      return;
    }

    if (targetDeviceId === "All") {
      console.log(`${LOG_PREFIX} Broadcasting ${actionName} to all devices`);
      // Broadcast to all non-dashboard clients
      const deviceUsers = users.filter(
        (user) => user.deviceName !== "Dashboard"
      );
      console.log(
        `${LOG_PREFIX} Sending to ${deviceUsers.length} devices: ${deviceUsers
          .map((u) => u.deviceName)
          .join(", ")}`
      );

      deviceUsers.forEach(action);
    } else {
      // Find the target device and send only to that device
      const targetUser = users.find((user) => user.deviceId === targetDeviceId);

      if (targetUser) {
        console.log(
          `${LOG_PREFIX} Sending to target device ${targetUser.deviceName} (${targetUser.deviceId}) targetDeviceId: ${targetDeviceId}`
        );
        action(targetUser);
      } else {
        console.log(
          `${LOG_PREFIX} Target device not found - DeviceId: ${targetDeviceId}, DeviceName: ${deviceName}`
        );
      }
    }
  }

  // ==========================================================
  // Main socket connection handler
  // ==========================================================
  io.on("connection", (socket: Socket) => {
    // Get the query parameters from the handshake
    const { deviceName, deviceId, platform, extraDeviceInfo, envVariables } =
      socket.handshake.query as {
        deviceName: string | undefined;
        deviceId: string | undefined;
        platform: string | undefined;
        extraDeviceInfo: string | undefined;
        envVariables: string | undefined;
      };
    console.log(
      `${LOG_PREFIX} New connection - ID: ${socket.id}, Name: ${
        deviceName || "Unknown Device"
      }${deviceId ? `, DeviceId: ${deviceId}` : ""}${
        platform ? `, Platform: ${platform}` : ""
      }${extraDeviceInfo ? `, ExtraDeviceInfo: ${extraDeviceInfo}` : ""}${
        envVariables ? `, EnvVariables: ${envVariables}` : ""
      }`
    );

    // ==========================================================
    // Add new user
    // ==========================================================
    addNewUser({
      id: socket.id,
      deviceName: deviceName || "Unknown Device Name",
      deviceId: deviceId,
      platform: platform,
      extraDeviceInfo: extraDeviceInfo,
      envVariables: envVariables,
    });

    // ==========================================================
    // Event Handlers
    // ==========================================================

    // ==========================================================
    // Handle the disconnect event
    // ==========================================================
    socket.on("disconnect", () => handleClose(socket.id));

    // ==========================================================
    // Handle debug messages
    // ==========================================================
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on("message", (msg: any) => {
      handleUserMessage(msg, deviceName || "Unknown");
    });

    // ==========================================================
    // Listen for query-sync messages from devices and forward only to dashboard clients
    // ==========================================================
    socket.on("query-sync", (message: SyncMessage) => {
      const device = getDeviceFromDeviceId(message.persistentDeviceId);
      console.log(
        `${LOG_PREFIX} Query sync received from: ${device?.deviceName}, Queries: ${message.state.queries.length}, Mutations: ${message.state.mutations.length}`
      );
      // Only forward to dashboard clients, not back to devices
      forwardQuerySyncToDashboards(message);
    });

    // ==========================================================
    // Handle query action messages from the dashboard to the devices
    // ==========================================================
    socket.on("query-action", (message: QueryActionMessage) => {
      const deviceName = getDeviceFromDeviceId(message.deviceId)?.deviceName;
      // Check if message exists before accessing properties
      if (!message) {
        console.error(`${LOG_PREFIX} Error: query-action message is undefined`);
        return;
      }

      console.log(
        `${LOG_PREFIX} Query action from dashboard - Action: ${message.action}, Target: ${deviceName}`
      );

      withTargetUsers(
        message.deviceId,
        (user) => io.to(user.id).emit("query-action", message),
        "query action"
      );
    });

    // ==========================================================
    // Handle dashboard requesting initial state from devices
    // ==========================================================
    socket.on(
      "request-initial-state",
      (message: QueryRequestInitialStateMessage) => {
        const deviceName = getDeviceFromDeviceId(
          message.targetDeviceId
        )?.deviceName;
        // Check if message exists before accessing properties
        if (!message) {
          console.error(
            `${LOG_PREFIX} Error: request-initial-state message is undefined`
          );
          return;
        }

        console.log(
          `${LOG_PREFIX} Request initial state - Target: ${deviceName} (${message.targetDeviceId})`
        );

        withTargetUsers(
          message.targetDeviceId,
          (user) =>
            io
              .to(user.id)
              .emit("request-initial-state", { type: "request-initial-state" }),
          "initial state request"
        );
      }
    );

    // ==========================================================
    // Handle online manager messages from the dashboard to the devices
    // ==========================================================
    socket.on("online-manager", (message: OnlineManagerMessage) => {
      const deviceName = getDeviceFromDeviceId(
        message.targetDeviceId
      )?.deviceName;
      console.log(
        `${LOG_PREFIX} Online manager message from dashboard - Action: ${message.action}, Target: ${deviceName} (${message.targetDeviceId})`
      );

      withTargetUsers(
        message.targetDeviceId,
        (user) => io.to(user.id).emit("online-manager", message),
        "online manager message"
      );
    });
  });
}
