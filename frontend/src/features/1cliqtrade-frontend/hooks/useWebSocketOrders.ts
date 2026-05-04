/**
 * Hook for WebSocket Order Updates
 * Listens for order status changes and notifies when orders are updated
 */

import { useEffect, useState, useCallback } from 'react';
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
 * Triggers a callback when orders are updated
 */
export function useWebSocketOrderUpdates(
    onUpdate?: (update: OrderUpdateMessage) => void
) {
    const [lastUpdate, setLastUpdate] = useState<OrderUpdateMessage | null>(null);
    const [updateCount, setUpdateCount] = useState(0);
    const { addMessageListener, isConnected } = useWebSocketManager();

    /**
     * Handle order update message
     */
    const handleOrderUpdate = useCallback(
        (data: any) => {
            const update: OrderUpdateMessage = {
                orderid: data.orderid || data.order_id || '',
                symbol: data.symbol || '',
                status: data.status || 'unknown',
                quantity: data.quantity || 0,
                filled_quantity: data.filled_quantity || 0,
                average_price: data.average_price || 0,
                price: data.price || 0,
                timestamp: data.timestamp || Date.now(),
            };

            setLastUpdate(update);
            setUpdateCount((prev) => prev + 1);

            // Call user callback if provided
            if (onUpdate) {
                try {
                    onUpdate(update);
                } catch (error) {
                    console.error('Error in order update callback:', error);
                }
            }
        },
        [onUpdate]
    );

    /**
     * Subscribe to order updates
     */
    useEffect(() => {
        if (!isConnected) {
            return;
        }

        try {
            const unsubscribeListener = addMessageListener('order_update', handleOrderUpdate);

            return () => {
                unsubscribeListener();
            };
        } catch (error) {
            console.error('Error subscribing to order updates:', error);
        }
    }, [isConnected, addMessageListener, handleOrderUpdate]);

    return {
        lastUpdate,
        updateCount,
    };
}
