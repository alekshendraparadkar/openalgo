/**
 * Hook for WebSocket Trade Updates
 * Listens for trade execution updates and notifies when trades occur
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocketManager } from '../../1cliqtrade/contexts/WebSocketManagerContext';

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
 * Triggers a callback when trades occur
 */
export function useWebSocketTradeUpdates(
  onUpdate?: (update: TradeUpdateMessage) => void
) {
  const [lastUpdate, setLastUpdate] = useState<TradeUpdateMessage | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const { addMessageListener, isConnected } = useWebSocketManager();

  /**
   * Handle trade update message
   */
  const handleTradeUpdate = useCallback(
    (data: any) => {
      const update: TradeUpdateMessage = {
        tradeid: data.tradeid || data.trade_id || '',
        orderid: data.orderid || data.order_id || '',
        symbol: data.symbol || '',
        quantity: data.quantity || 0,
        price: data.price || 0,
        timestamp: data.timestamp || Date.now(),
        action: data.action || 'executed',
      };

      setLastUpdate(update);
      setUpdateCount((prev) => prev + 1);

      // Call user callback if provided
      if (onUpdate) {
        try {
          onUpdate(update);
        } catch (error) {
          console.error('Error in trade update callback:', error);
        }
      }
    },
    [onUpdate]
  );

  /**
   * Subscribe to trade updates
   */
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    try {
      const unsubscribeListener = addMessageListener('trade_update', handleTradeUpdate);

      return () => {
        unsubscribeListener();
      };
    } catch (error) {
      console.error('Error subscribing to trade updates:', error);
    }
  }, [isConnected, addMessageListener, handleTradeUpdate]);

  return {
    lastUpdate,
    updateCount,
  };
}
