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
    <div className="px-6 py-4 border-b border-border flex justify-between items-center h-[60px]">
      {/* Title and market status */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">1CliqTrade</h2>
        <MarketStatus />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="bg-transparent hover:bg-muted rounded p-2 cursor-pointer transition-colors hover:opacity-80"
        aria-label="Close modal"
        title="Close (ESC)"
      >
        <X size={20} />
      </button>
    </div>
  );
}
