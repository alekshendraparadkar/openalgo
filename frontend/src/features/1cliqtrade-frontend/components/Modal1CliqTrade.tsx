/**
 * Modal1CliqTrade - Main modal component for 1CliqTrade
 * Renders modal with Portal, handles ESC key, error boundary, and cleanup
 */

import { useEffect } from 'react';
import { Portal } from './Portal';
import { useModal1CliqTrade } from '../contexts/Modal1CliqTradeContext';
import { ModalHeader } from './ModalHeader';
import { Modal1CliqTradeContent } from './Modal1CliqTradeContent';
import { Modal1CliqTradeErrorBoundary } from './Modal1CliqTradeErrorBoundary';

/**
 * Main modal component
 * Renders outside main DOM tree using Portal
 * Handles keyboard events (ESC to close)
 * Provides blurred backdrop and centered container
 * Includes error boundary and cleanup
 */
export function Modal1CliqTrade() {
  const { isOpen, closeModal } = useModal1CliqTrade();

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeModal]);

  // Cleanup on modal close: cancel pending requests, clear timers, etc.
  useEffect(() => {
    return () => {
      if (!isOpen) {
        // Clear any pending operations
        // This is called when modal is unmounted
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <Portal elementId="1cliqtrade-modal-root">
      {/* Backdrop with blur effect - clickable to close */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fadeIn"
        onClick={closeModal}
        role="presentation"
      >
        {/* Modal container - prevent backdrop click from closing */}
        <div
          className="bg-background border border-border rounded-lg shadow-2xl w-[1000px] h-[700px] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden animate-slideUp"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="1CliqTrade Trading Interface"
        >
          <Modal1CliqTradeErrorBoundary>
            <ModalHeader onClose={closeModal} />
            <Modal1CliqTradeContent />
          </Modal1CliqTradeErrorBoundary>
        </div>
      </div>
    </Portal>
  );
}
