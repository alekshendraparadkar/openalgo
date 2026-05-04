/**
 * FundsDisplay - Funds tab component
 * Displays account balance and margin information
 */

import { useState, useEffect } from 'react';
import { Funds } from '../types/index';

/**
 * Funds tab - shows user's account balance and margins
 */
export function FundsDisplay() {
  const [funds, setFunds] = useState<Funds | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch funds from API: /1cliqtrade/api/funds_tab
    // For now, set loading state
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading funds...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!funds) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No funds data available
      </div>
    );
  }

  const marginUsagePercent = (funds.usedMargin / funds.totalMargin) * 100;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cash Section */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Cash</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Available Cash</span>
              <span className="font-semibold">₹{funds.availableCash.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Margin Section */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Margin</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Margin</span>
              <span className="font-semibold">₹{funds.totalMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Used Margin</span>
              <span className="font-semibold text-orange-600">₹{funds.usedMargin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Available Margin</span>
              <span className="font-semibold text-green-600">₹{funds.availableMargin.toFixed(2)}</span>
            </div>
          </div>

          {/* Margin usage bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Margin Usage</span>
              <span className="text-xs font-semibold">{marginUsagePercent.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-colors ${marginUsagePercent > 90
                    ? 'bg-red-500'
                    : marginUsagePercent > 75
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}
                style={{ width: `${Math.min(marginUsagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* P&L Section */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">P&L</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total P&L</span>
              <span
                className={`font-semibold text-lg ${funds.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
              >
                ₹{funds.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Collateral Section */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Collateral</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Collateral Value</span>
              <span className="font-semibold">₹{funds.collateral.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
