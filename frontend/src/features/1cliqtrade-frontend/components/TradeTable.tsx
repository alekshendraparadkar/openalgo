/**
 * TradeTable - Trades (TradeBook) tab component
 * Displays executed trades/filled orders
 */

import { useState, useEffect } from 'react';
import { Trade } from '../types/index';

/**
 * Trades tab - shows user's executed trades
 */
export function TradeTable() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch trades from API: /1cliqtrade/api/tradebook_tab
    // For now, set loading state
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading trades...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No trades
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* TODO: Render trades table */}
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2">Symbol</th>
              <th className="text-center py-2 px-2">Action</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Fill Price</th>
              <th className="text-left py-2 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.tradeId} className="border-b border-border hover:bg-muted/50">
                <td className="py-2 px-2">{trade.symbol}</td>
                <td className="text-center py-2 px-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${trade.action === 'BUY'
                        ? 'text-green-600'
                        : 'text-red-600'
                      }`}
                  >
                    {trade.action}
                  </span>
                </td>
                <td className="text-right py-2 px-2">{trade.filledQuantity}</td>
                <td className="text-right py-2 px-2">₹{trade.fillPrice.toFixed(2)}</td>
                <td className="text-left py-2 px-2">
                  {new Date(trade.timestamp * 1000).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
