/**
 * TradeTable - Trades (TradeBook) tab component
 * Displays executed trades with real-time updates
 */

import { useEffect, useState, useCallback } from 'react';
import { useTrades } from '../hooks/useCliqTrade1API';
import { useWebSocketTradeUpdates } from '../hooks/useWebSocketTrades';
import type { TradeUpdateMessage } from '../hooks/useWebSocketTrades';
import { cn } from '@/lib/utils';
import type { Trade } from '../types/index';

/**
 * Trades tab - shows user's executed trades with real-time updates
 */
export function TradeTable() {
  const { data: trades = [], isLoading, error, refetch } = useTrades();
  const [localTrades, setLocalTrades] = useState<Trade[]>([]);
  const [newTradeIds, setNewTradeIds] = useState<Set<string>>(new Set());
  const { handleTradeUpdate } = useWebSocketTradeUpdates();

  useEffect(() => {
    setLocalTrades(trades);
  }, [trades]);

  const onTradeUpdate = useCallback((tradeUpdate: TradeUpdateMessage) => {
    const newTrade: Trade = {
      tradeId: tradeUpdate.tradeid,
      orderid: tradeUpdate.orderid,
      symbol: tradeUpdate.symbol,
      exchange: 'NSE', // Default exchange, should come from API
      action: (tradeUpdate.action === 'sell' || tradeUpdate.action === 'SELL') ? 'SELL' : 'BUY',
      filledQuantity: tradeUpdate.quantity,
      fillPrice: tradeUpdate.price,
      timestamp: tradeUpdate.timestamp,
    };
    setNewTradeIds((prev) => new Set([...prev, newTrade.tradeId]));
    setLocalTrades((prev) => [newTrade, ...prev]);
    setTimeout(() => {
      setNewTradeIds((prev) => { const next = new Set(prev); next.delete(newTrade.tradeId); return next; });
    }, 1500);
  }, []);

  useEffect(() => {
    return handleTradeUpdate(onTradeUpdate);
  }, [handleTradeUpdate, onTradeUpdate]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p className="text-sm text-muted-foreground">Loading trades...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm"><p className="text-sm font-semibold text-red-600 mb-2">Error loading trades</p><p className="text-xs text-red-500 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p><button onClick={() => refetch()} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Retry</button></div>
      </div>
    );
  }

  if (localTrades.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No trades executed
      </div>
    );
  }

  const totalQuantity = localTrades.reduce((sum, t) => sum + t.filledQuantity, 0);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="border-b border-border px-4 py-3 bg-muted/50">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div><p className="text-muted-foreground mb-1">Total Trades</p><p className="font-semibold">{localTrades.length}</p></div>
          <div><p className="text-muted-foreground mb-1">Total Quantity</p><p className="font-semibold">{totalQuantity}</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 border-b border-border">
            <tr><th className="text-left py-2 px-3 font-semibold">Symbol</th><th className="text-center py-2 px-3 font-semibold">Action</th><th className="text-right py-2 px-3 font-semibold">Qty</th><th className="text-right py-2 px-3 font-semibold">Fill Price</th><th className="text-left py-2 px-3 font-semibold">Time</th></tr>
          </thead>
          <tbody>
            {localTrades.map((trade) => {
              const safeFillPrice = Number(trade.fillPrice ?? 0) || 0;
              return (
                <tr key={trade.tradeId} className={cn('border-b border-border hover:bg-muted/50 transition-colors', newTradeIds.has(trade.tradeId) && 'animate-pulse bg-green-50 dark:bg-green-950/20')}>
                  <td className="py-2 px-3 font-medium">{trade.symbol}</td>
                  <td className="text-center py-2 px-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${trade.action === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{trade.action}</span></td>
                  <td className="text-right py-2 px-3">{trade.filledQuantity}</td>
                  <td className="text-right py-2 px-3 font-medium">₹{safeFillPrice.toFixed(2)}</td>
                  <td className="text-left py-2 px-3 text-xs text-muted-foreground">{new Date(trade.timestamp * 1000).toLocaleTimeString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
