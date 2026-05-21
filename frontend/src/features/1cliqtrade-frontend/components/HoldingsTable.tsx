/**
 * HoldingsTable - Holdings tab component
 * Displays holdings with portfolio stats
 */

import { useEffect, useState } from 'react';
import { useHoldings } from '../hooks/useCliqTrade1API';
import { cn } from '@/lib/utils';
import type { Holding } from '../types/index';

/**
 * Holdings tab - shows user's holdings
 */
export function HoldingsTable() {
  const { data: holdings = [], isLoading, error, refetch } = useHoldings();
  const [localHoldings, setLocalHoldings] = useState<Holding[]>([]);

  useEffect(() => {
    setLocalHoldings(holdings);
  }, [holdings]);

  const totalValue = localHoldings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalPnL = localHoldings.reduce((sum, h) => sum + h.pnl, 0);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p className="text-sm text-muted-foreground">Loading holdings...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm"><p className="text-sm font-semibold text-red-600 mb-2">Error loading holdings</p><p className="text-xs text-red-500 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p><button onClick={() => refetch()} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Retry</button></div>
      </div>
    );
  }

  if (localHoldings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No holdings
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="border-b border-border px-4 py-3 bg-muted/50">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div><p className="text-muted-foreground mb-1">Total Value</p><p className="font-semibold">₹{totalValue.toFixed(2)}</p></div>
          <div><p className="text-muted-foreground mb-1">Total P&L</p><p className={cn('font-semibold', totalPnL >= 0 ? 'text-green-600' : 'text-red-600')}>₹{totalPnL.toFixed(2)}</p></div>
          <div><p className="text-muted-foreground mb-1">Holdings</p><p className="font-semibold">{localHoldings.length}</p></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50 border-b border-border">
            <tr><th className="text-left py-2 px-3 font-semibold">Symbol</th><th className="text-right py-2 px-3 font-semibold">Qty</th><th className="text-right py-2 px-3 font-semibold">T1 Qty</th><th className="text-right py-2 px-3 font-semibold">LTP</th><th className="text-right py-2 px-3 font-semibold">Value</th><th className="text-right py-2 px-3 font-semibold">P&L</th></tr>
          </thead>
          <tbody>
            {localHoldings.map((holding) => (
              <tr key={holding.symbol} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-2 px-3 font-medium">{holding.symbol}</td>
                <td className="text-right py-2 px-3">{holding.quantity}</td>
                <td className="text-right py-2 px-3">{holding.t1Quantity}</td>
                <td className="text-right py-2 px-3 font-medium">₹{holding.ltp.toFixed(2)}</td>
                <td className="text-right py-2 px-3">₹{holding.totalValue.toFixed(2)}</td>
                <td className={cn('text-right py-2 px-3 font-semibold', holding.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>₹{holding.pnl.toFixed(2)} ({holding.pnlPercent.toFixed(2)}%)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
