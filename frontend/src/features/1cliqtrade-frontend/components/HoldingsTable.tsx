/**
 * HoldingsTable - Holdings tab component
 * Displays holdings with portfolio stats
 */

import { useState, useEffect } from 'react';
import { Holding } from '../types/index';

/**
 * Holdings tab - shows user's holdings
 */
export function HoldingsTable() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);

  useEffect(() => {
    // TODO: Fetch holdings from API: /1cliqtrade/api/holdings_tab
    // For now, set loading state
    setLoading(false);
  }, []);

  useEffect(() => {
    // Calculate totals
    const total = holdings.reduce((sum, h) => sum + h.totalValue, 0);
    const pnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
    setTotalValue(total);
    setTotalPnL(pnl);
  }, [holdings]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading holdings...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No holdings
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Holdings summary */}
      <div className="p-4 border-b border-border bg-muted/50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-lg font-semibold">₹{totalValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <p className={`text-lg font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{totalPnL.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2">Symbol</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">T1 Qty</th>
              <th className="text-right py-2 px-2">LTP</th>
              <th className="text-right py-2 px-2">Value</th>
              <th className="text-right py-2 px-2">P&L</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={holding.symbol} className="border-b border-border hover:bg-muted/50">
                <td className="py-2 px-2">{holding.symbol}</td>
                <td className="text-right py-2 px-2">{holding.quantity}</td>
                <td className="text-right py-2 px-2">{holding.t1Quantity}</td>
                <td className="text-right py-2 px-2">₹{holding.ltp.toFixed(2)}</td>
                <td className="text-right py-2 px-2">₹{holding.totalValue.toFixed(2)}</td>
                <td
                  className={`text-right py-2 px-2 font-semibold ${holding.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                >
                  ₹{holding.pnl.toFixed(2)} ({holding.pnlPercent.toFixed(2)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
