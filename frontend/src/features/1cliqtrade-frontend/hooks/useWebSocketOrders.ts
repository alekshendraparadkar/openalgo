/**
 * Hook for WebSocket Order Updates
 * Listens for order status changes and notifies when orders are updated
 */

import { useCallback } from 'react';
import { useWebSocketManager } from '../contexts/WebSocketManagerContext';

export interface OrderUpdateMessage {
    orderid: string;
    symbol: string;
    status: string;
    quantity: number;
    filled_quantity: number;
    average_price: number;
    price: number;
    timestamp: number;
}

/**
 * Hook to listen for order updates via WebSocket
 * Returns a function to register an update handler
 */
export function useWebSocketOrderUpdates() {
    const { addMessageListener } = useWebSocketManager();

    /**
     * Register an order update handler
     * Returns an unsubscribe function
     */
    const handleOrderUpdate = useCallback(
        (callback: (update: OrderUpdateMessage) => void): (() => void) => {
            return addMessageListener('order_update', callback);
        },
        [addMessageListener]
    );

    return {
        handleOrderUpdate,
    };
}
