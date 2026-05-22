/**
 * MarketStatus - Displays if market is open or closed as a dot indicator
 */

import { useEffect, useState } from 'react';

/**
 * Component that shows market status as a green/red dot
 * Fetches real data from OpenAlgo API
 */
export function MarketStatus() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetch market status from OpenAlgo API
    const fetchMarketStatus = async () => {
      try {
        const response = await fetch('/1cliqtrade/api/is_market_open', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setIsOpen(data.is_open === true || data.status === 'open');
        }
      } catch (error) {
        console.warn('Failed to fetch market status:', error);
        setIsOpen(false);
      }
    };

    // Fetch initially
    fetchMarketStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchMarketStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`w-3 h-3 rounded-full ${
        isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      }`}
      title={isOpen ? 'Market Open' : 'Market Closed'}
    />
  );
}
