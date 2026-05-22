/**
 * Modal1CliqTradeContent - Content wrapper for 1CliqTrade modal
 * Manages tab state and renders active tab content
 * Integrates Phase 1-6: Symbol Control, Real-Time Prices, Trading Cards, Notifications
 */

import { useState, useCallback } from 'react';
import type { TabType } from '../types/index';
import { TabNavigation } from './TabNavigation';
import { PositionTable } from './PositionTable';
import { OrderTable } from './OrderTable';
import { TradeTable } from './TradeTable';
import { HoldingsTable } from './HoldingsTable';
import { FundsDisplay } from './FundsDisplay';
import { SymbolControlPanel } from './SymbolControlPanel';
import { RealtimePriceCard } from './RealtimePriceCard';
import { TradeCallsCard } from './TradeCallsCard';
import { TradePutsCard } from './TradePutsCard';
import { OrderNotification } from './OrderNotification';
import { useOrderNotification } from '../hooks/useOrderNotification';

/**
 * Content wrapper component that manages tab switching and trading interface
 */
export function Modal1CliqTradeContent() {
  const [activeTab, setActiveTab] = useState<TabType>('positions');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [buyLevel, setBuyLevel] = useState<number>(0);
  const [sellLevel, setSellLevel] = useState<number>(0);

  // Phase 5: Notification system
  const { notifications, removeNotification, success } = useOrderNotification();

  // Handle quantity changes from RealtimePriceCard
  const handleQuantityChange = useCallback((quantity: number) => {
    setSelectedQuantity(quantity);
  }, []);

  // Handle buy/sell level changes
  const handlePriceLevelsChange = useCallback((buy: number, sell: number) => {
    setBuyLevel(buy);
    setSellLevel(sell);
  }, []);

  // Handle order placed
  const handleOrderPlaced = useCallback((orderId: string) => {
    // Show success notification
    success('Order placed successfully!', `Order ID: ${orderId}`, 4000);
    // Auto-switch to orders tab to show the new order
    setActiveTab('orders');
  }, [success]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'positions':
        return <PositionTable />;
      case 'orders':
        return <OrderTable />;
      case 'trades':
        return <TradeTable />;
      case 'holdings':
        return <HoldingsTable />;
      case 'funds':
        return <FundsDisplay />;
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50 h-screen">
      {/* Phase 1: Symbol Control Panel - Ultra Compact */}
      <div className="px-1.5 py-1 flex-shrink-0">
        <SymbolControlPanel className="w-full" />
      </div>

      {/* Phase 2-4: Trading Area (3-Column Layout) - Compact */}
      <div className="px-1.5 py-0.5 flex-1 overflow-hidden min-h-0">
        <div className="grid grid-cols-3 gap-1 h-full">
          {/* Phase 3: Left Column - Call Options */}
          <TradeCallsCard
            quantity={selectedQuantity}
            buyLevel={buyLevel}
            sellLevel={sellLevel}
            onOrderPlaced={handleOrderPlaced}
            className="h-full min-h-0 overflow-hidden"
          />

          {/* Phase 2: Middle Column - Real-Time Prices */}
          <RealtimePriceCard
            className="h-full min-h-0 overflow-hidden"
            onQuantityChange={handleQuantityChange}
            onPriceLevelsChange={handlePriceLevelsChange}
          />

          {/* Phase 4: Right Column - Put Options */}
          <TradePutsCard
            quantity={selectedQuantity}
            buyLevel={buyLevel}
            sellLevel={sellLevel}
            onOrderPlaced={handleOrderPlaced}
            className="h-full min-h-0 overflow-hidden"
          />
        </div>
      </div>

      {/* Tabs and Tab Content - Ultra Compact */}
      <div className="flex flex-col flex-1 overflow-hidden px-1.5 py-0.5 border-t border-slate-200 min-h-0">
        <div className="flex-shrink-0">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {renderTabContent()}
        </div>
      </div>

      {/* Phase 5: Notification System */}
      <OrderNotification
        notifications={notifications}
        onDismiss={removeNotification}
      />
    </div>
  );
}
