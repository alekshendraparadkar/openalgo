/**
 * Hook for WebSocket Trade Updates
 * Listens for trade execution updates and notifies when trades occur
 */

import { useCallback } from 'react';
import { useWebSocketManager } from '../contexts/WebSocketManagerContext';

export interface TradeUpdateMessage {
  tradeid: string;
  orderid: string;
  symbol: string;
  quantity: number;
  price: number;
  timestamp: number;
  action?: string;
}

/**
 * Hook to listen for trade updates via WebSocket
 * Returns a function to register an update handler
 */
export function useWebSocketTradeUpdates() {
  const { addMessageListener } = useWebSocketManager();

  /**
   * Register a trade update handler
   * Returns an unsubscribe function
   */
  const handleTradeUpdate = useCallback(
    (callback: (update: TradeUpdateMessage) => void): (() => void) => {
      return addMessageListener('trade_update', callback);
    },
    [addMessageListener]
  );

  return {
    handleTradeUpdate,
  };
}
