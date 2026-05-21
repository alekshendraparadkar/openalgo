/**
 * Hook for WebSocket Position Updates
 * Listens for position changes and notifies when positions are updated
 */

import { useCallback } from 'react';
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
 * Returns a function to register an update handler
 */
export function useWebSocketPositionUpdates() {
    const { addMessageListener } = useWebSocketManager();

    /**
     * Register a position update handler
     * Returns an unsubscribe function
     */
    const handlePositionUpdate = useCallback(
        (callback: (update: PositionUpdateMessage) => void): (() => void) => {
            return addMessageListener('position_update', callback);
        },
        [addMessageListener]
    );

    return {
        handlePositionUpdate,
    };
}
