/**
 * Modal1CliqTradeContent - Content wrapper for 1CliqTrade modal
 * Manages tab state and renders active tab content
 */

import { useState } from 'react';
import type { TabType } from '../types/index';
import { TabNavigation } from './TabNavigation';
import { PositionTable } from './PositionTable';
import { OrderTable } from './OrderTable';
import { TradeTable } from './TradeTable';
import { HoldingsTable } from './HoldingsTable';
import { FundsDisplay } from './FundsDisplay';

/**
 * Content wrapper component that manages tab switching
 */
export function Modal1CliqTradeContent() {
  const [activeTab, setActiveTab] = useState<TabType>('positions');

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
    <div className="flex flex-col flex-1 overflow-hidden">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      {renderTabContent()}
    </div>
  );
}
