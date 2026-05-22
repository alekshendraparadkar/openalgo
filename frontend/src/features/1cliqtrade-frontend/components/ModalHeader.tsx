/**
 * ModalHeader - Header section of the 1CliqTrade modal
 * Displays title and close button
 */

import { X } from 'lucide-react';
import { MarketStatus } from './MarketStatus';

interface ModalHeaderProps {
  onClose: () => void;
}

/**
 * Header component with title and close button
 */
export function ModalHeader({ onClose }: ModalHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-border flex justify-between items-center h-auto">
      {/* Title */}
      <h2 className="text-lg font-semibold">1CliqTrade</h2>

      {/* Market Status (dot) and Close button */}
      <div className="flex items-center gap-3">
        <MarketStatus />
        <button
          onClick={onClose}
          className="bg-transparent hover:bg-muted rounded p-1 cursor-pointer transition-colors hover:opacity-80"
          aria-label="Close modal"
          title="Close (ESC)"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
