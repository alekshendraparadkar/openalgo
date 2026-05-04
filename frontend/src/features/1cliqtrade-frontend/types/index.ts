/**
 * TypeScript interfaces and types for 1CliqTrade modal
 */

// Modal Context Types
export interface Modal1CliqTradeContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

// Tab Types
export type TabType = 'positions' | 'orders' | 'trades' | 'holdings' | 'funds';

export const TABS: TabType[] = ['positions', 'orders', 'trades', 'holdings', 'funds'];

export const TAB_LABELS: Record<TabType, string> = {
  positions: 'Positions',
  orders: 'Orders',
  trades: 'Trades',
  holdings: 'Holdings',
  funds: 'Funds',
};

// Position Types
export interface Position {
  symbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  ltp: number;
  pnl: number;
  pnlPercent: number;
  product: string;
}

// Order Types
export interface Order {
  orderid: string;
  symbol: string;
  exchange: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  filledQuantity: number;
  pendingQuantity: number;
  averagePrice: number;
  status: 'PENDING' | 'COMPLETE' | 'REJECTED' | 'CANCELLED';
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  product: string;
  timestamp: number;
}

// Trade Types
export interface Trade {
  tradeId: string;
  orderid: string;
  symbol: string;
  exchange: string;
  action: 'BUY' | 'SELL';
  filledQuantity: number;
  fillPrice: number;
  timestamp: number;
}

// Holding Types
export interface Holding {
  symbol: string;
  exchange: string;
  quantity: number;
  t1Quantity: number;
  collateral: number;
  ltp: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
}

// Funds Types
export interface Funds {
  availableCash: number;
  usedMargin: number;
  availableMargin: number;
  totalMargin: number;
  pnl: number;
  collateral: number;
}

// Broker Info Types
export interface BrokerInfo {
  brokerName: string;
  userId: string;
  clientId: string;
}

// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

// Market Status Types
export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
}

// WebSocket Message Types
export type WebSocketMessageType = 'ltp' | 'position_update' | 'order_update' | 'trade_update';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: Record<string, any>;
  timestamp: number;
}
