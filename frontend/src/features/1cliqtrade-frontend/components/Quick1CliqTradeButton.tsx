/**
 * Quick1CliqTradeButton - Quick Access button for Dashboard
 * Opens the 1CliqTrade modal when clicked
 */

import { TrendingUp } from 'lucide-react';

interface Quick1CliqTradeButtonProps {
  onClick: () => void;
}

/**
 * Quick Access button component
 * Integrates with Dashboard's Quick Access menu
 */
export function Quick1CliqTradeButton({ onClick }: Quick1CliqTradeButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors font-medium text-sm"
      title="Quick Trading Interface"
      aria-label="Open 1CliqTrade trading interface"
    >
      <TrendingUp size={16} />
      <span>1CliqTrade</span>
    </button>
  );
}
