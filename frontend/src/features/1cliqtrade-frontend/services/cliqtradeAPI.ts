/**
 * 1CliqTrade API Service
 * Wrapper functions for all 1CliqTrade backend endpoints
 * Base URL: /1cliqtrade/api/
 */

import {
    ApiResponse,
    Position,
    Order,
    Trade,
    Holding,
    Funds,
    BrokerInfo,
    MarketStatus,
} from '../types/index';

// Base configuration
const API_BASE_URL = '/1cliqtrade/api';

/**
 * Helper function to make API requests with proper error handling
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    try {
        const url = `${API_BASE_URL}${endpoint}`;

        // Add default headers
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add CSRF token if available (for POST/PUT/DELETE requests)
        if (['POST', 'PUT', 'DELETE'].includes(options.method || 'GET')) {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include', // Include cookies for session validation
        });

        // Handle session expiration (401)
        if (response.status === 401) {
            console.warn('Session expired, redirecting to login');
            // TODO: Redirect to login page or emit session expiration event
            return {
                status: 'error',
                message: 'Session expired. Please login again.',
            };
        }

        // Handle forbidden (403)
        if (response.status === 403) {
            return {
                status: 'error',
                message: 'Forbidden: You do not have permission to access this resource.',
            };
        }

        // Handle server errors (500+)
        if (response.status >= 500) {
            return {
                status: 'error',
                message: 'Server error. Please try again later.',
            };
        }

        const data = await response.json();

        if (!response.ok) {
            return {
                status: 'error',
                message: data.message || 'An error occurred',
            };
        }

        return {
            status: 'success',
            data: data.data || data,
        };
    } catch (error) {
        console.error('API request failed:', error);
        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'An unknown error occurred',
        };
    }
}

/**
 * Positions API Endpoints
 */
export const positionsAPI = {
    /**
     * Fetch user's positions
     */
    async getPositions(): Promise<ApiResponse<Position[]>> {
        return apiRequest<Position[]>('/positions_tab');
    },

    /**
     * Get single position by symbol
     */
    async getPosition(symbol: string): Promise<ApiResponse<Position>> {
        return apiRequest<Position>(`/positions_tab?symbol=${encodeURIComponent(symbol)}`);
    },
};

/**
 * Orders API Endpoints
 */
export const ordersAPI = {
    /**
     * Fetch user's orders
     */
    async getOrders(): Promise<ApiResponse<Order[]>> {
        return apiRequest<Order[]>('/orderbook_tab');
    },

    /**
     * Get single order by ID
     */
    async getOrder(orderId: string): Promise<ApiResponse<Order>> {
        return apiRequest<Order>(`/orderbook_tab?orderid=${encodeURIComponent(orderId)}`);
    },

    /**
     * Modify an order
     */
    async modifyOrder(
        orderId: string,
        updateData: Partial<{ price: number; quantity: number }>
    ): Promise<ApiResponse<Order>> {
        return apiRequest<Order>('/modify_order', {
            method: 'POST',
            body: JSON.stringify({
                orderid: orderId,
                ...updateData,
            }),
        });
    },

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean }>> {
        return apiRequest<{ success: boolean }>('/cancel_order', {
            method: 'POST',
            body: JSON.stringify({ orderid: orderId }),
        });
    },
};

/**
 * Trades API Endpoints
 */
export const tradesAPI = {
    /**
     * Fetch user's trades
     */
    async getTrades(): Promise<ApiResponse<Trade[]>> {
        return apiRequest<Trade[]>('/tradebook_tab');
    },

    /**
     * Get trades for a specific symbol
     */
    async getTradesBySymbol(symbol: string): Promise<ApiResponse<Trade[]>> {
        return apiRequest<Trade[]>(`/tradebook_tab?symbol=${encodeURIComponent(symbol)}`);
    },
};

/**
 * Holdings API Endpoints
 */
export const holdingsAPI = {
    /**
     * Fetch user's holdings
     */
    async getHoldings(): Promise<ApiResponse<Holding[]>> {
        return apiRequest<Holding[]>('/holdings_tab');
    },

    /**
     * Get single holding by symbol
     */
    async getHolding(symbol: string): Promise<ApiResponse<Holding>> {
        return apiRequest<Holding>(`/holdings_tab?symbol=${encodeURIComponent(symbol)}`);
    },
};

/**
 * Funds API Endpoints
 */
export const fundsAPI = {
    /**
     * Fetch user's funds and margin information
     */
    async getFunds(): Promise<ApiResponse<Funds>> {
        return apiRequest<Funds>('/funds_tab');
    },
};

/**
 * Broker Info API Endpoints
 */
export const brokerAPI = {
    /**
     * Fetch broker information
     */
    async getBrokerInfo(): Promise<ApiResponse<BrokerInfo>> {
        return apiRequest<BrokerInfo>('/broker-info');
    },

    /**
     * Get user's API key
     */
    async getUserApiKey(): Promise<ApiResponse<{ apikey: string; status: string }>> {
        return apiRequest<{ apikey: string; status: string }>('/user-api-key');
    },
};

/**
 * Market Status API Endpoints
 */
export const marketAPI = {
    /**
     * Check if market is open or closed
     */
    async getMarketStatus(): Promise<ApiResponse<MarketStatus>> {
        return apiRequest<MarketStatus>('/is_market_open');
    },
};

/**
 * Combined API object for easy access
 */
export const cliqtradeAPI = {
    positions: positionsAPI,
    orders: ordersAPI,
    trades: tradesAPI,
    holdings: holdingsAPI,
    funds: fundsAPI,
    broker: brokerAPI,
    market: marketAPI,
};
