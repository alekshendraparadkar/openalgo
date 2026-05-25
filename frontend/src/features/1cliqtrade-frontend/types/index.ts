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
export type WebSocketMessageType = 'ltp' | 'position_update' | 'order_update' | 'trade_update' | 'pong' | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: Record<string, any>;
  timestamp: number;
}

// ==================== Trading Interface Types ====================

// Symbol Selection State
export interface SymbolState {
  exchange: string;           // 'NSE', 'BSE', 'NFO', 'BFO', 'MCX', 'NCDEX', 'CDS', 'BCD'
  symbol: string;             // 'NIFTY', 'SBIN', etc.
  expiryDate?: string;        // '07-APR-26' format, for F&O only
  lotSize: number;            // e.g., 65
  productType: string;        // 'CNC', 'NRML', 'MIS'
  slLevel?: number;           // Stop Loss price
  target?: number;            // Target price
  protectionPercent?: number; // Protection percentage
  isTrial: boolean;           // Sandbox/analyzer mode
  expiry?: string | null;     // Bug #3: Expiry date from master contract
  instrumentType?: string;    // Bug #3: Instrument type from master contract (EQUITY, OPTION, FUTURE, etc.)
}

// Master Contract Types
export interface MasterContract {
  id: number;
  symbol: string;             // e.g., 'SBIN'
  exchange: string;           // 'NSE', 'BSE', etc.
  brsymbol: string;          // Broker-specific symbol
  lotsize: number;           // Lot size for the instrument
  token: number;             // Broker token/instrument ID
  instrumenttype: string;    // 'EQUITY', 'OPTION', 'FUTURE', 'INDEX', 'CURRENCY', 'COMMODITY'
  tick_size: number;         // Minimum tick size
  expiry?: string;           // Expiry date for F&O (ISO format)
}

// Master Contract Filters
export interface MasterContractFilters {
  exchange?: string;
  expiry?: string;
  instrumentType?: string;  // Use instrumentType directly (EQUITY, OPTION, FUTURE, etc.)
}

// Place Order Request
export interface PlaceOrderRequest {
  symbol: string;            // Full symbol with expiry for F&O
  exchange: string;          // Exchange code
  action: 'BUY' | 'SELL';    // Action
  quantity: number;          // Quantity in lots
  price: number;             // Order price (0 for MARKET)
  pricetype: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M'; // Price type
  product: 'CNC' | 'NRML' | 'MIS'; // Product type
  slprice?: number;          // Stop loss price
  targetprice?: number;      // Target price
  trial?: boolean;           // Sandbox mode flag
}

// Update Modal Context Type to include symbol state
export interface Modal1CliqTradeContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  // Symbol selection state
  selectedSymbol: SymbolState;
  selectSymbol: (symbolState: Partial<SymbolState>) => void;
  resetSymbolState: () => void;
}
