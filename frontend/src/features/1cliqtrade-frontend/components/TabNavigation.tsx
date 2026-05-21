/**
 * TabNavigation - Tab navigation UI for 1CliqTrade modal
 * Displays 5 tabs: Positions, Orders, Trades, Holdings, Funds
 */

import type { TabType } from '../types/index';
import { TABS, TAB_LABELS } from '../types/index';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

/**
 * Tab navigation component
 */
export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-4 px-6 border-b border-border overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`py-4 px-5 font-medium cursor-pointer relative whitespace-nowrap transition-colors ${activeTab === tab
            ? 'text-primary'
            : 'text-muted-foreground hover:text-primary'
            }`}
        >
          {TAB_LABELS[tab]}
          {/* Active tab indicator */}
          {activeTab === tab && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
