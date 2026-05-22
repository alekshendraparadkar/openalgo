/**
 * useOrderNotification - Hook for managing order notifications
 * Handles notification state, auto-dismiss, and notification queuing
 */

import { useState, useCallback } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('useOrderNotification');

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number; // ms, 0 = no auto-dismiss
}

export function useOrderNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add notification
  const addNotification = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
      duration: number = 4000,
      title?: string
    ) => {
      const id = `notif-${Date.now()}-${Math.random()}`;
      const notification: Notification = {
        id,
        type,
        message,
        title,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);
      logger.info(`📢 Notification added: ${type.toUpperCase()}`, {
        id,
        message,
        duration,
      });

      // Auto-dismiss if duration > 0
      if (duration > 0) {
        const timer = setTimeout(() => {
          removeNotification(id);
        }, duration);

        return () => clearTimeout(timer);
      }

      return undefined;
    },
    []
  );

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    logger.debug('🗑️ Notification removed', { id });
  }, []);

  // Remove all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    logger.info('🧹 All notifications cleared');
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, title?: string, duration?: number) =>
      addNotification(message, 'success', duration, title),
    [addNotification]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) =>
      addNotification(message, 'error', duration, title),
    [addNotification]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) =>
      addNotification(message, 'warning', duration, title),
    [addNotification]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) =>
      addNotification(message, 'info', duration, title),
    [addNotification]
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
  };
}
