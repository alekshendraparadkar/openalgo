/**
 * MarketStatus - Displays if market is open or closed
 */

import { useState, useEffect } from 'react';

/**
 * Component that shows market status (open/closed)
 * Can be extended to fetch real data from API
 */
export function MarketStatus() {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // TODO: Fetch market status from API: /1cliqtrade/api/is_market_open
    // For now, assume market is open (can be updated with real data)
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'
          }`}
      />
      <span className="text-sm text-muted-foreground">
        {isOpen ? 'Market Open' : 'Market Closed'}
      </span>
    </div>
  );
}
