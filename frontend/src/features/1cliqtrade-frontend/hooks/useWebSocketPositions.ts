/**
 * Hook for WebSocket Position Updates
 * Listens for position changes and notifies when positions are updated
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocketManager } from '../contexts/WebSocketManagerContext';

export interface PositionUpdateMessage {
    symbol: string;
    quantity: number;
    average_price: number;
    ltp: number;
    pnl: number;
    pnl_percent: number;
    timestamp: number;
}

/**
 * Hook to listen for position updates via WebSocket
 * Triggers a callback when positions are updated
 */
export function useWebSocketPositionUpdates(
    onUpdate?: (update: PositionUpdateMessage) => void
) {
    const [lastUpdate, setLastUpdate] = useState<PositionUpdateMessage | null>(null);
    const [updateCount, setUpdateCount] = useState(0);
    const { addMessageListener, isConnected } = useWebSocketManager();

    /**
     * Handle position update message
     */
    const handlePositionUpdate = useCallback(
        (data: any) => {
            const update: PositionUpdateMessage = {
                symbol: data.symbol,
                quantity: data.quantity || 0,
                average_price: data.average_price || 0,
                ltp: data.ltp || 0,
                pnl: data.pnl || 0,
                pnl_percent: data.pnl_percent || 0,
                timestamp: data.timestamp || Date.now(),
            };

            setLastUpdate(update);
            setUpdateCount((prev) => prev + 1);

            // Call user callback if provided
            if (onUpdate) {
                try {
                    onUpdate(update);
                } catch (error) {
                    console.error('Error in position update callback:', error);
                }
            }
        },
        [onUpdate]
    );

    /**
     * Subscribe to position updates
     */
    useEffect(() => {
        if (!isConnected) {
            return;
        }

        try {
            const unsubscribeListener = addMessageListener('position_update', handlePositionUpdate);

            return () => {
                unsubscribeListener();
            };
        } catch (error) {
            console.error('Error subscribing to position updates:', error);
        }
    }, [isConnected, addMessageListener, handlePositionUpdate]);

    return {
        lastUpdate,
        updateCount,
    };
}
