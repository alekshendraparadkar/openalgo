/**
 * Logging utility for 1CliqTrade debugging
 * Provides structured logging with timestamps and levels
 */

export const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
} as const;

export type LogLevelValue = typeof LogLevel[keyof typeof LogLevel];

interface LogEntry {
    timestamp: string;
    level: LogLevelValue;
    module: string;
    message: string;
    data?: any;
}

// Store logs in memory for debugging (max 500 entries)
const logStore: LogEntry[] = [];
const MAX_LOGS = 500;

/**
 * Add log entry
 */
function addLog(level: LogLevelValue, module: string, message: string, data?: any) {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        module,
        message,
        data,
    };

    logStore.push(entry);
    if (logStore.length > MAX_LOGS) {
        logStore.shift();
    }

    // Also log to console
    const style = getConsoleStyle(level);
    const dataStr = data ? ` | ${JSON.stringify(data, null, 2)}` : '';
    console.log(`%c[${entry.timestamp}] ${level} | ${module} | ${message}${dataStr}`, style);
}

/**
 * Get console style for log level
 */
function getConsoleStyle(level: LogLevelValue): string {
    switch (level) {
        case LogLevel.DEBUG:
            return 'color: #666; font-weight: normal;';
        case LogLevel.INFO:
            return 'color: #0066cc; font-weight: bold;';
        case LogLevel.WARN:
            return 'color: #ff9900; font-weight: bold;';
        case LogLevel.ERROR:
            return 'color: #cc0000; font-weight: bold;';
        default:
            return 'color: #000;';
    }
}

/**
 * 1CliqTrade Logger class
 */
export class CliqTradeLogger {
    public readonly module: string;

    constructor(module: string) {
        this.module = module;
    }

    debug(message: string, data?: any) {
        addLog(LogLevel.DEBUG, this.module, message, data);
    }

    info(message: string, data?: any) {
        addLog(LogLevel.INFO, this.module, message, data);
    }

    warn(message: string, data?: any) {
        addLog(LogLevel.WARN, this.module, message, data);
    }

    error(message: string, data?: any) {
        addLog(LogLevel.ERROR, this.module, message, data);
    }
}

/**
 * Get all stored logs
 */
export function getAllLogs(): LogEntry[] {
    return [...logStore];
}

/**
 * Get logs filtered by level
 */
export function getLogsByLevel(level: LogLevelValue): LogEntry[] {
    return logStore.filter((log) => log.level === level);
}

/**
 * Get logs filtered by module
 */
export function getLogsByModule(module: string): LogEntry[] {
    return logStore.filter((log) => log.module === module);
}

/**
 * Clear all logs
 */
export function clearLogs() {
    logStore.length = 0;
}

/**
 * Export logs as JSON
 */
export function exportLogsAsJSON(): string {
    return JSON.stringify(logStore, null, 2);
}

/**
 * Export logs as CSV
 */
export function exportLogsAsCSV(): string {
    const headers = ['Timestamp', 'Level', 'Module', 'Message', 'Data'];
    const rows = logStore.map((log) => [
        log.timestamp,
        log.level,
        log.module,
        log.message,
        log.data ? JSON.stringify(log.data) : '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    return csvContent;
}

/**
 * Helper to create logger instances
 */
export function createLogger(module: string): CliqTradeLogger {
    return new CliqTradeLogger(module);
}
