/**
 * Modal1CliqTradeContext - Manages modal open/close state
 * Provides hooks for opening and closing the 1CliqTrade modal
 */

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Modal1CliqTradeContextType, SymbolState } from '../types/index';

const Modal1CliqTradeContext = createContext<Modal1CliqTradeContextType | undefined>(undefined);

interface Modal1CliqTradeContextProviderProps {
  children: ReactNode;
}

// Default symbol state
const DEFAULT_SYMBOL_STATE: SymbolState = {
  exchange: 'NSE',
  segment: 'Equity',
  symbol: '',
  lotSize: 1,
  productType: 'CNC',
  isTrial: false,
};

/**
 * Provider component that wraps the app with modal and symbol state management
 */
export function Modal1CliqTradeContextProvider({
  children,
}: Modal1CliqTradeContextProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolState>(DEFAULT_SYMBOL_STATE);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectSymbol = useCallback((symbolState: Partial<SymbolState>) => {
    setSelectedSymbol((prev) => ({
      ...prev,
      ...symbolState,
    }));
  }, []);

  const resetSymbolState = useCallback(() => {
    setSelectedSymbol(DEFAULT_SYMBOL_STATE);
  }, []);

  const value: Modal1CliqTradeContextType = {
    isOpen,
    openModal,
    closeModal,
    selectedSymbol,
    selectSymbol,
    resetSymbolState,
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
