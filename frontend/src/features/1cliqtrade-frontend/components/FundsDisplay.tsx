/**
 * FundsDisplay - Funds tab component
 * Displays account balance and margin information
 */

import { useEffect, useState } from 'react';
import { useFunds } from '../hooks/useCliqTrade1API';
import { cn } from '@/lib/utils';
import type { Funds } from '../types/index';

/**
 * Funds tab - shows user's account balance and margins
 */
export function FundsDisplay() {
  const { data: funds, isLoading, error, refetch } = useFunds();
  const [localFunds, setLocalFunds] = useState<Funds | null>(null);

  useEffect(() => {
    setLocalFunds(funds || null);
  }, [funds]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p className="text-sm text-muted-foreground">Loading funds...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-sm"><p className="text-sm font-semibold text-red-600 mb-2">Error loading funds</p><p className="text-xs text-red-500 mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p><button onClick={() => refetch()} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">Retry</button></div>
      </div>
    );
  }

  if (!localFunds) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No funds data available
      </div>
    );
  }

  const marginUsagePercent = (localFunds.usedMargin / localFunds.totalMargin) * 100;

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Cash</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Available Cash</span>
              <span className="font-semibold">₹{localFunds.availableCash.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Margin</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Margin</span>
              <span className="font-semibold">₹{localFunds.totalMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Used Margin</span>
              <span className="font-semibold text-orange-600">₹{localFunds.usedMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Available Margin</span>
              <span className="font-semibold text-green-600">₹{localFunds.availableMargin.toFixed(2)}</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">Margin Usage</span>
                <span className="text-xs font-semibold">{marginUsagePercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full transition-colors', marginUsagePercent > 90 ? 'bg-red-500' : marginUsagePercent > 75 ? 'bg-orange-500' : 'bg-green-500')} style={{ width: `${Math.min(marginUsagePercent, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">P&L</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total P&L</span>
              <span className={cn('font-semibold text-lg', localFunds.pnl >= 0 ? 'text-green-600' : 'text-red-600')}>₹{localFunds.pnl.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Collateral</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Collateral Value</span>
              <span className="font-semibold">₹{localFunds.collateral.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
