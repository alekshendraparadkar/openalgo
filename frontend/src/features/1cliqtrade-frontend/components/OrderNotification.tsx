/**
 * OrderNotification - Phase 5 Component
 * Toast/snackbar notification display system for order events
 */

import type { Notification } from '../hooks/useOrderNotification';

interface OrderNotificationProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function OrderNotification({ notifications, onDismiss }: OrderNotificationProps) {
  const getStyles = (type: Notification['type']) => {
    const baseClass = 'rounded-lg shadow-lg p-4 mb-3 flex items-start gap-3 animate-slide-in';
    switch (type) {
      case 'success':
        return `${baseClass} bg-green-50 border border-green-200`;
      case 'error':
        return `${baseClass} bg-red-50 border border-red-200`;
      case 'warning':
        return `${baseClass} bg-yellow-50 border border-yellow-200`;
      case 'info':
        return `${baseClass} bg-blue-50 border border-blue-200`;
      default:
        return baseClass;
    }
  };

  const getIconAndColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return { icon: '✅', textClass: 'text-green-700', titleClass: 'text-green-900' };
      case 'error':
        return { icon: '❌', textClass: 'text-red-700', titleClass: 'text-red-900' };
      case 'warning':
        return { icon: '⚠️', textClass: 'text-yellow-700', titleClass: 'text-yellow-900' };
      case 'info':
        return { icon: 'ℹ️', textClass: 'text-blue-700', titleClass: 'text-blue-900' };
      default:
        return { icon: '📢', textClass: 'text-slate-700', titleClass: 'text-slate-900' };
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm pointer-events-auto">
      {notifications.map((notification) => {
        const { icon, textClass, titleClass } = getIconAndColor(notification.type);
        return (
          <div key={notification.id} className={getStyles(notification.type)}>
            {/* Icon */}
            <div className="flex-shrink-0 text-xl mt-1">{icon}</div>

            {/* Content */}
            <div className="flex-1">
              {notification.title && (
                <p className={`font-semibold text-sm ${titleClass}`}>{notification.title}</p>
              )}
              <p className={`text-sm ${textClass}`}>{notification.message}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => onDismiss(notification.id)}
              className={`flex-shrink-0 text-lg font-bold ${textClass} hover:opacity-70 transition-opacity`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default OrderNotification;
