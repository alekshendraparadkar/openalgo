/**
 * Error handling utilities for 1CliqTrade
 * Provides consistent error handling, retry logic, and user feedback
 */

import { createLogger } from './logger';

const logger = createLogger('CliqTradeErrorHandler');

/**
 * Error types
 */
export const ErrorType = {
    NETWORK: 'network_error',
    SERVER: 'server_error',
    VALIDATION: 'validation_error',
    UNAUTHORIZED: 'unauthorized',
    NOT_FOUND: 'not_found',
    TIMEOUT: 'timeout',
    UNKNOWN: 'unknown_error',
} as const;

export type ErrorTypeValue = typeof ErrorType[keyof typeof ErrorType];

/**
 * Retry configuration
 */
interface RetryConfig {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
    maxDelayMs: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 10000,
};

/**
 * Categorize errors based on their characteristics
 */
export function categorizeError(error: any): ErrorTypeValue {
    if (error instanceof TypeError && error.message.includes('fetch')) {
        return ErrorType.NETWORK;
    }

    if (error.status === 401) {
        return ErrorType.UNAUTHORIZED;
    }

    if (error.status === 404) {
        return ErrorType.NOT_FOUND;
    }

    if (error.status >= 500) {
        return ErrorType.SERVER;
    }

    if (error.status >= 400 && error.status < 500) {
        return ErrorType.VALIDATION;
    }

    if (error.name === 'AbortError') {
        return ErrorType.TIMEOUT;
    }

    return ErrorType.UNKNOWN;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(errorType: ErrorTypeValue): boolean {
    const retryableErrors: readonly ErrorTypeValue[] = [
        ErrorType.NETWORK,
        ErrorType.SERVER,
        ErrorType.TIMEOUT,
    ];
    return retryableErrors.includes(errorType);
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(errorType: ErrorTypeValue): string {
    const messages: Record<ErrorTypeValue, string> = {
        [ErrorType.NETWORK]: 'Network connection error. Please check your internet connection.',
        [ErrorType.SERVER]: 'Server error. Please try again later.',
        [ErrorType.VALIDATION]: 'Invalid request. Please check your input.',
        [ErrorType.UNAUTHORIZED]: 'Your session has expired. Please login again.',
        [ErrorType.NOT_FOUND]: 'Resource not found.',
        [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
        [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    };

    return messages[errorType] || messages[ErrorType.UNKNOWN];
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

    let lastError: any;
    let delay = finalConfig.delayMs;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
        try {
            logger.debug(`Executing "${operationName}" (attempt ${attempt}/${finalConfig.maxAttempts})`);
            return await operation();
        } catch (error) {
            lastError = error;
            const errorType = categorizeError(error);

            if (!isRetryable(errorType)) {
                logger.error(`Operation "${operationName}" failed with non-retryable error`, {
                    errorType,
                    error: String(error),
                });
                throw error;
            }

            if (attempt === finalConfig.maxAttempts) {
                logger.error(`Operation "${operationName}" failed after ${attempt} attempts`, {
                    error: String(error),
                });
                throw error;
            }

            logger.warn(`Operation "${operationName}" failed, retrying in ${delay}ms`, {
                attempt,
                error: String(error),
                delay,
            });

            await new Promise((resolve) => setTimeout(resolve, delay));

            delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
        }
    }

    throw lastError;
}

/**
 * Handle API errors with logging
 */
export function handleApiError(
    error: any,
    context: {
        endpoint: string;
        method: string;
        userId?: string;
    }
): { userMessage: string; logLevel: 'warn' | 'error' } {
    const errorType = categorizeError(error);
    const userMessage = getErrorMessage(errorType);

    const logContext = {
        endpoint: context.endpoint,
        method: context.method,
        userId: context.userId,
        errorType,
        error: String(error),
    };

    if (isRetryable(errorType)) {
        logger.warn(`Retryable API error: ${context.method} ${context.endpoint}`, logContext);
        return { userMessage, logLevel: 'warn' };
    }

    logger.error(`Non-retryable API error: ${context.method} ${context.endpoint}`, logContext);
    return { userMessage, logLevel: 'error' };
}

/**
 * Handle WebSocket errors with logging
 */
export function handleWebSocketError(
    error: any,
    context: {
        operation: string;
        wsUrl: string;
    }
): { userMessage: string; shouldReconnect: boolean } {
    const errorType = categorizeError(error);
    const userMessage = getErrorMessage(errorType);
    const shouldReconnect = isRetryable(errorType);

    logger.error(`WebSocket error during ${context.operation}`, {
        wsUrl: context.wsUrl,
        errorType,
        error: String(error),
        shouldReconnect,
    });

    return { userMessage, shouldReconnect };
}

/**
 * Error recovery suggestions based on error type
 */
export function getRecoverySuggestions(errorType: ErrorTypeValue): string[] {
    const suggestions: Record<ErrorTypeValue, string[]> = {
        [ErrorType.NETWORK]: [
            'Check your internet connection',
            'Try reloading the page',
            'Check if the server is reachable',
        ],
        [ErrorType.SERVER]: [
            'The server might be experiencing issues',
            'Try again after a few minutes',
            'Contact support if the issue persists',
        ],
        [ErrorType.VALIDATION]: [
            'Check your input values',
            'Ensure all required fields are filled',
            'Verify the format of your data',
        ],
        [ErrorType.UNAUTHORIZED]: [
            'Your session has expired',
            'Please login again',
            'If the issue persists, clear your browser cache',
        ],
        [ErrorType.NOT_FOUND]: [
            'The requested resource no longer exists',
            'Try refreshing the page',
            'Go back to the previous page',
        ],
        [ErrorType.TIMEOUT]: [
            'The request took too long',
            'Try again with a slower connection',
            'Check the server status',
        ],
        [ErrorType.UNKNOWN]: [
            'Try refreshing the page',
            'Check the browser console for details',
            'Contact support if the issue persists',
        ],
    };

    return suggestions[errorType] || suggestions[ErrorType.UNKNOWN];
}
