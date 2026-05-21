/**
 * PositionTable - Positions tab component
 * Displays real-time positions with P&L calculations with WebSocket integration
 */

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Position } from '../types/index';
import { usePositions } from '../hooks/useCliqTrade1API';
import { useWebSocketPositionUpdates } from '../hooks/useWebSocketPositions';

/**
 * Positions tab - shows user's open positions with real-time updates
 */
export function PositionTable() {
  const { data: positions = [], isLoading, error, refetch } = usePositions();
  const [localPositions, setLocalPositions] = useState<Position[]>([]);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const { handlePositionUpdate } = useWebSocketPositionUpdates();

  useEffect(() => {
    setLocalPositions(positions);
  }, [positions]);

  const onPositionUpdate = useCallback((updatedPos: Partial<Position> & { symbol: string }) => {
    setUpdating((prev) => new Set([...prev, updatedPos.symbol]));
    setLocalPositions((prev) =>
      prev.map((pos) => pos.symbol === updatedPos.symbol ? { ...pos, ...updatedPos } : pos)
    );
    setTimeout(() => {
      setUpdating((prev) => { const next = new Set(prev); next.delete(updatedPos.symbol); return next; });
    }, 500);
  }, []);

  useEffect(() => {
    return handlePositionUpdate(onPositionUpdate);
  }, [handlePositionUpdate, onPositionUpdate]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-red-600 mb-2">Error loading positions</p>
          <p className="text-xs text-red-500 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onClick={() => refetch()} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Retry</button>
        </div>
      </div>
    );
  }

  if (localPositions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No open positions
      </div>
    );
  }

  const safeTotalPnL = Number(localPositions.reduce((sum, pos) => sum + (Number(pos.pnl ?? 0) || 0), 0) || 0);
  const safeTotalValue = Number(localPositions.reduce((sum, pos) => sum + ((Number(pos.quantity ?? 0) || 0) * (Number(pos.ltp ?? 0) || 0)), 0) || 0);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="border-b border-border px-4 py-3 bg-muted/50">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div><p className="text-muted-foreground mb-1">Total Value</p><p className="font-semibold">₹{safeTotalValue.toFixed(2)}</p></div>
          <div><p className="text-muted-foreground mb-1">Portfolio P&L</p><p className={cn('font-semibold', safeTotalPnL >= 0 ? 'text-green-600' : 'text-red-600')}>₹{safeTotalPnL.toFixed(2)}</p></div>
          <div><p className="text-muted-foreground mb-1">Positions</p><p className="font-semibold">{localPositions.length}</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 border-b border-border">
            <tr><th className="text-left py-2 px-3 font-semibold">Symbol</th><th className="text-right py-2 px-3 font-semibold">Qty</th><th className="text-right py-2 px-3 font-semibold">Avg Price</th><th className="text-right py-2 px-3 font-semibold">LTP</th><th className="text-right py-2 px-3 font-semibold">P&L</th></tr>
          </thead>
          <tbody>
            {localPositions.map((pos) => {
              const safeAvgPrice = Number(pos.averagePrice ?? 0) || 0;
              const safeLtp = Number(pos.ltp ?? 0) || 0;
              const safePnl = Number(pos.pnl ?? 0) || 0;
              const safePnlPercent = Number(pos.pnlPercent ?? 0) || 0;
              return (
                <tr key={pos.symbol} className={cn('border-b border-border hover:bg-muted/50 transition-colors', updating.has(pos.symbol) && 'animate-pulse bg-yellow-50 dark:bg-yellow-950/20')}>
                  <td className="py-2 px-3 font-medium">{pos.symbol}</td><td className="text-right py-2 px-3">{pos.quantity}</td><td className="text-right py-2 px-3">₹{safeAvgPrice.toFixed(2)}</td><td className="text-right py-2 px-3 font-medium">₹{safeLtp.toFixed(2)}</td>
                  <td className={cn('text-right py-2 px-3 font-semibold', safePnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>₹{safePnl.toFixed(2)} ({safePnlPercent.toFixed(2)}%)</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
