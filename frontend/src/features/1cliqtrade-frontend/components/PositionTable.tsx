/**
 * PositionTable - Positions tab component
 * Displays real-time positions with P&L calculations
 */

import { useState, useEffect } from 'react';
import { Position } from '../types/index';

/**
 * Positions tab - shows user's open positions
 */
export function PositionTable() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch positions from API: /1cliqtrade/api/positions_tab
    // For now, set loading state
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading positions...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        Error: {error}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No open positions
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* TODO: Render positions table */}
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2">Symbol</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Avg Price</th>
              <th className="text-right py-2 px-2">LTP</th>
              <th className="text-right py-2 px-2">P&L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr key={pos.symbol} className="border-b border-border hover:bg-muted/50">
                <td className="py-2 px-2">{pos.symbol}</td>
                <td className="text-right py-2 px-2">{pos.quantity}</td>
                <td className="text-right py-2 px-2">₹{pos.averagePrice.toFixed(2)}</td>
                <td className="text-right py-2 px-2">₹{pos.ltp.toFixed(2)}</td>
                <td
                  className={`text-right py-2 px-2 font-semibold ${\n                    pos.pnl >= 0 ? 'text-green-600' : 'text-red-600'\n                  }`}
                >
                ₹{pos.pnl.toFixed(2)} ({pos.pnlPercent.toFixed(2)}%)
              </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
    </div >
  );
}
