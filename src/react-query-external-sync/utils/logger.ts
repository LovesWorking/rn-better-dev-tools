/**
 * Log types supported by the logger
 */
export type LogType = 'log' | 'warn' | 'error';

/**
 * Helper function for controlled logging
 * Only shows logs when enableLogs is true
 * Always shows warnings and errors regardless of enableLogs setting
 */
export function log(message: string, enableLogs: boolean, type: LogType = 'log'): void {
  if (!enableLogs && type === 'log') return;
  switch (type) {
    case 'warn':
      console.warn(message);
      break;
    case 'error':
      console.error(message);
      break;
    default:
      console.log(message);
  }
}

/**
 * Context for sync operations
 */
interface SyncContext {
  deviceName: string;
  deviceId: string;
  platform: string;
  requestId: string;
  timestamp: number;
}

/**
 * Stats for tracking sync operations
 */
interface SyncOperationStats {
  storageUpdates: {
    mmkv: number;
    asyncStorage: number;
    secureStore: number;
  };
  queryActions: {
    dataUpdates: number;
    refetches: number;
    invalidations: number;
    resets: number;
    removes: number;
    errors: number;
  };
  connectionEvents: {
    connects: number;
    disconnects: number;
    reconnects: number;
  };
  errors: Array<{
    type: string;
    message: string;
    timestamp: number;
  }>;
}

/**
 * Sync logger for external sync operations
 * Provides clean, grouped logging similar to API route logging
 */
class ExternalSyncLogger {
  private operations = new Map<
    string,
    {
      context: SyncContext;
      startTime: number;
      stats: SyncOperationStats;
      enableLogs: boolean;
    }
  >();

  /**
   * Start a new sync operation
   */
  startOperation(
    type: 'connection' | 'query-action' | 'storage-update' | 'sync-session',
    context: Partial<SyncContext>,
    enableLogs: boolean = false,
  ): string {
    const requestId = this.generateRequestId();
    const fullContext: SyncContext = {
      deviceName: context.deviceName || 'unknown',
      deviceId: context.deviceId || 'unknown',
      platform: context.platform || 'unknown',
      requestId,
      timestamp: Date.now(),
    };

    this.operations.set(requestId, {
      context: fullContext,
      startTime: Date.now(),
      stats: {
        storageUpdates: { mmkv: 0, asyncStorage: 0, secureStore: 0 },
        queryActions: { dataUpdates: 0, refetches: 0, invalidations: 0, resets: 0, removes: 0, errors: 0 },
        connectionEvents: { connects: 0, disconnects: 0, reconnects: 0 },
        errors: [],
      },
      enableLogs,
    });

    if (enableLogs) {
      const icon = this.getOperationIcon(type);
      const readableTime = new Date(fullContext.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      log(
        `┌─ 🌴 ${this.getOperationTitle(type)} • ${fullContext.deviceName} (${fullContext.platform}) • ${readableTime}`,
        enableLogs,
      );
    }

    return requestId;
  }

  /**
   * Log a storage update
   */
  logStorageUpdate(
    requestId: string,
    storageType: 'mmkv' | 'asyncStorage' | 'secureStore',
    key: string,
    currentValue: unknown,
    newValue: unknown,
  ): void {
    const operation = this.operations.get(requestId);
    if (!operation) return;

    operation.stats.storageUpdates[storageType]++;

    if (operation.enableLogs) {
      const icon = this.getStorageIcon(storageType);
      const typeDisplay =
        storageType === 'asyncStorage' ? 'AsyncStorage' : storageType === 'secureStore' ? 'SecureStore' : 'MMKV';
      log(
        `├─ ${icon} ${typeDisplay}: ${key} | ${JSON.stringify(currentValue)} → ${JSON.stringify(newValue)}`,
        operation.enableLogs,
      );
    }
  }

  /**
   * Log a query action
   */
  logQueryAction(requestId: string, action: string, queryHash: string, success: boolean = true): void {
    const operation = this.operations.get(requestId);
    if (!operation) return;

    // Update stats based on action type
    switch (action) {
      case 'ACTION-DATA-UPDATE':
        operation.stats.queryActions.dataUpdates++;
        break;
      case 'ACTION-REFETCH':
        operation.stats.queryActions.refetches++;
        break;
      case 'ACTION-INVALIDATE':
        operation.stats.queryActions.invalidations++;
        break;
      case 'ACTION-RESET':
        operation.stats.queryActions.resets++;
        break;
      case 'ACTION-REMOVE':
        operation.stats.queryActions.removes++;
        break;
      default:
        if (!success) operation.stats.queryActions.errors++;
        break;
    }

    if (operation.enableLogs) {
      const icon = this.getActionIcon(action, success);
      const actionName = this.getActionDisplayName(action);
      log(`├─ ${icon} ${actionName}: ${queryHash}`, operation.enableLogs);
    }
  }

  /**
   * Log a connection event
   */
  logConnectionEvent(requestId: string, event: 'connect' | 'disconnect' | 'reconnect', details?: string): void {
    const operation = this.operations.get(requestId);
    if (!operation) return;

    operation.stats.connectionEvents[`${event}s` as keyof typeof operation.stats.connectionEvents]++;

    if (operation.enableLogs) {
      const icon = event === 'connect' ? '🔗' : event === 'disconnect' ? '🔌' : '🔄';
      const message = details ? `${event.toUpperCase()}: ${details}` : event.toUpperCase();
      console.log(`├ ${icon} ${message}`);
    }
  }

  /**
   * Log an error
   */
  logError(requestId: string, type: string, message: string, error?: Error): void {
    const operation = this.operations.get(requestId);
    if (!operation) return;

    operation.stats.errors.push({
      type,
      message,
      timestamp: Date.now(),
    });

    if (operation.enableLogs) {
      console.log(`├ ❌ ${type}: ${message}`);
      if (error?.stack) {
        console.log(`├    Stack: ${error.stack.split('\n')[1]?.trim()}`);
      }
    }
  }

  /**
   * Complete and log the operation summary
   */
  completeOperation(requestId: string, success: boolean = true): void {
    const operation = this.operations.get(requestId);
    if (!operation) return;

    // Only show completion log if there was an error
    if (operation.enableLogs && !success) {
      log(`└─ ❌ Error`, operation.enableLogs);
      log('', operation.enableLogs); // Add empty line for spacing
    } else if (operation.enableLogs) {
      // Just add spacing for successful operations without the "Complete" message
      log('', operation.enableLogs);
    }

    // Clean up without logging summary
    this.operations.delete(requestId);
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getOperationIcon(type: string): string {
    switch (type) {
      case 'connection':
        return '🔗';
      case 'query-action':
        return '🔄';
      case 'storage-update':
        return '💾';
      case 'sync-session':
        return '🔄';
      default:
        return '📋';
    }
  }

  private getOperationTitle(type: string): string {
    switch (type) {
      case 'connection':
        return 'Connection';
      case 'query-action':
        return 'Query Action';
      case 'storage-update':
        return 'Storage Update';
      case 'sync-session':
        return 'Sync Session';
      default:
        return 'Operation';
    }
  }

  private getStorageIcon(storageType: string): string {
    switch (storageType) {
      case 'mmkv':
        return '💾';
      case 'asyncStorage':
        return '📱';
      case 'secureStore':
        return '🔐';
      default:
        return '📦';
    }
  }

  private getActionIcon(action: string, success: boolean): string {
    if (!success) return '🔴'; // Red for failures (#EF4444)

    switch (action) {
      case 'ACTION-DATA-UPDATE':
        return '🟢'; // Green for fresh/success (#039855)
      case 'ACTION-REFETCH':
        return '🔵'; // Blue for refetch (#1570EF)
      case 'ACTION-INVALIDATE':
        return '🟠'; // Orange for invalidate (#DC6803)
      case 'ACTION-RESET':
        return '⚫'; // Dark gray for reset (#475467)
      case 'ACTION-REMOVE':
        return '🟣'; // Pink/purple for remove (#DB2777)
      case 'ACTION-TRIGGER-ERROR':
        return '🔴'; // Red for error (#EF4444)
      case 'ACTION-RESTORE-ERROR':
        return '🟢'; // Green for restore (success variant)
      case 'ACTION-TRIGGER-LOADING':
        return '🔷'; // Light blue diamond for loading (#0891B2)
      case 'ACTION-RESTORE-LOADING':
        return '🔶'; // Orange diamond for restore loading (loading variant)
      case 'ACTION-CLEAR-MUTATION-CACHE':
        return '⚪'; // White for clear cache (neutral)
      case 'ACTION-CLEAR-QUERY-CACHE':
        return '⬜'; // White square for clear cache (neutral)
      case 'ACTION-ONLINE-MANAGER-ONLINE':
        return '🟢'; // Green for online (fresh)
      case 'ACTION-ONLINE-MANAGER-OFFLINE':
        return '🔴'; // Red for offline (error)
      default:
        return '⚪'; // White for generic (inactive #667085)
    }
  }

  private getActionDisplayName(action: string): string {
    switch (action) {
      case 'ACTION-DATA-UPDATE':
        return 'Data Update';
      case 'ACTION-REFETCH':
        return 'Refetch';
      case 'ACTION-INVALIDATE':
        return 'Invalidate';
      case 'ACTION-RESET':
        return 'Reset';
      case 'ACTION-REMOVE':
        return 'Remove';
      case 'ACTION-TRIGGER-ERROR':
        return 'Trigger Error';
      case 'ACTION-RESTORE-ERROR':
        return 'Restore Error';
      case 'ACTION-TRIGGER-LOADING':
        return 'Trigger Loading';
      case 'ACTION-RESTORE-LOADING':
        return 'Restore Loading';
      default:
        return action.replace('ACTION-', '').replace(/-/g, ' ');
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  }
}

export const syncLogger = new ExternalSyncLogger();
