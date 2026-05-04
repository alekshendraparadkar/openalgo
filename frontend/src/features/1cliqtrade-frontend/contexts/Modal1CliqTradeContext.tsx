/**
 * Modal1CliqTradeContext - Manages modal open/close state
 * Provides hooks for opening and closing the 1CliqTrade modal
 */

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Modal1CliqTradeContextType } from '../types/index';

const Modal1CliqTradeContext = createContext<Modal1CliqTradeContextType | undefined>(undefined);

interface Modal1CliqTradeContextProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the app with modal state management
 */
export function Modal1CliqTradeContextProvider({
  children,
}: Modal1CliqTradeContextProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value: Modal1CliqTradeContextType = {
    isOpen,
    openModal,
    closeModal,
  };

  return (
    <Modal1CliqTradeContext.Provider value={value}>
      {children}
    </Modal1CliqTradeContext.Provider>
  );
}

/**
 * Hook to access modal context
 * Must be used within Modal1CliqTradeContextProvider
 */
export function useModal1CliqTrade(): Modal1CliqTradeContextType {
  const context = useContext(Modal1CliqTradeContext);

  if (!context) {
    throw new Error(
      'useModal1CliqTrade must be used within Modal1CliqTradeContextProvider'
    );
  }

  return context;
}
