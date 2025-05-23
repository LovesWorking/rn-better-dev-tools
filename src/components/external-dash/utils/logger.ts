import { logInfo, logError, logWarn, logDebug } from "./logStore";
import { User } from "../types/User";

/**
 * A logger utility that both logs to the console and to our LogStore for display in the UI
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (message: string, deviceInfo?: Partial<User>) => {
    console.info(message);
    logInfo(message, deviceInfo);
  },

  /**
   * Log warning message
   */
  warn: (message: string, deviceInfo?: Partial<User>) => {
    console.warn(message);
    logWarn(message, deviceInfo);
  },

  /**
   * Log error message
   */
  error: (message: string, deviceInfo?: Partial<User>) => {
    console.error(message);
    logError(message, deviceInfo);
  },

  /**
   * Log debug message
   */
  debug: (message: string, deviceInfo?: Partial<User>) => {
    console.debug(message);
    logDebug(message, deviceInfo);
  },

  /**
   * Regular log - maps to info level
   */
  log: (message: string, deviceInfo?: Partial<User>) => {
    console.log(message);
    logInfo(message, deviceInfo);
  },
};

/**
 * Create a logger instance pre-configured with a specific device
 */
export const createDeviceLogger = (device: User) => {
  const deviceInfo = {
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    platform: device.platform,
  };

  return {
    info: (message: string) => logger.info(message, deviceInfo),
    warn: (message: string) => logger.warn(message, deviceInfo),
    error: (message: string) => logger.error(message, deviceInfo),
    debug: (message: string) => logger.debug(message, deviceInfo),
    log: (message: string) => logger.log(message, deviceInfo),
  };
};
