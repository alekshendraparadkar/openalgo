/**
 * Cleanup utilities for 1CliqTrade modal
 * Handles resource cleanup when modal is closed
 */

import { createLogger } from './logger';

const logger = createLogger('CliqTradeCleanup');

/**
 * Cleanup context for managing lifecycle resources
 */
export class CliqTradeCleanupManager {
    private timers: Set<ReturnType<typeof setTimeout>> = new Set();
    private abortControllers: Set<AbortController> = new Set();
    private listeners: Array<{ element: any; event: string; handler: any }> = [];
    private querySubscriptions: Set<() => void> = new Set();

    /**
     * Register a timer for cleanup
     */
    registerTimer(timer: ReturnType<typeof setTimeout>): void {
        this.timers.add(timer);
    }

    /**
     * Register an AbortController for cancelling fetch requests
     */
    registerAbortController(controller: AbortController): void {
        this.abortControllers.add(controller);
    }

    /**
     * Register an event listener for cleanup
     */
    registerListener(
        element: any,
        event: string,
        handler: any
    ): void {
        this.listeners.push({ element, event, handler });
    }

    /**
     * Register a query subscription cleanup function
     */
    registerQuerySubscription(cleanup: () => void): void {
        this.querySubscriptions.add(cleanup);
    }

    /**
     * Perform full cleanup
     */
    cleanup(): void {
        logger.debug('🧹 Starting cleanup...');

        // Clear all timers
        this.timers.forEach((timer) => {
            try {
                clearTimeout(timer);
            } catch (error) {
                logger.error('Failed to clear timer', { error: String(error) });
            }
        });
        this.timers.clear();
        logger.debug(`✅ Cleared ${this.timers.size} timers`);

        // Abort all fetch requests
        this.abortControllers.forEach((controller) => {
            try {
                controller.abort();
            } catch (error) {
                logger.error('Failed to abort request', { error: String(error) });
            }
        });
        this.abortControllers.clear();
        logger.debug(`✅ Aborted fetch requests`);

        // Remove all event listeners
        this.listeners.forEach(({ element, event, handler }) => {
            try {
                element?.removeEventListener(event, handler);
            } catch (error) {
                logger.error('Failed to remove event listener', { error: String(error) });
            }
        });
        this.listeners = [];
        logger.debug(`✅ Removed event listeners`);

        // Cleanup query subscriptions
        this.querySubscriptions.forEach((cleanup) => {
            try {
                cleanup();
            } catch (error) {
                logger.error('Failed to cleanup query subscription', { error: String(error) });
            }
        });
        this.querySubscriptions.clear();
        logger.debug(`✅ Cleaned up query subscriptions`);

        logger.info('✅ Cleanup complete');
    }

    /**
     * Get cleanup status
     */
    getStatus(): Record<string, number> {
        return {
            timers: this.timers.size,
            abortControllers: this.abortControllers.size,
            listeners: this.listeners.length,
            querySubscriptions: this.querySubscriptions.size,
        };
    }
}

/**
 * Create abort controller for API requests with timeout
 */
export function createAbortControllerWithTimeout(
    timeoutMs: number = 30000
): AbortController {
    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
        logger.warn('Request aborted due to timeout', { timeoutMs });
    }, timeoutMs);

    // Cleanup timer if request completes before timeout
    controller.signal.addEventListener('abort', () => {
        clearTimeout(timer);
    });

    return controller;
}

/**
 * Safe query cleanup function
 */
export function createQueryCleanup(
    queryKey: any[],
    callback: () => void
): () => void {
    return () => {
        try {
            callback();
            logger.debug('Query cleanup executed', { queryKey });
        } catch (error) {
            logger.error('Query cleanup failed', { queryKey, error: String(error) });
        }
    };
}
