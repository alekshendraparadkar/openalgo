/**
 * Enhanced 1CliqTrade API Service with Error Handling
 * Wrapper functions with retry logic and comprehensive error handling
 * Base URL: /1cliqtrade/api/
 */

import type {
    ApiResponse,
    Position,
    Order,
    Trade,
    Holding,
    Funds,
    BrokerInfo,
    MarketStatus,
    PlaceOrderRequest,
    MasterContract,
    MasterContractFilters,
} from '../types/index';
import { createLogger } from '../utils/logger';
import { retryWithBackoff, handleApiError } from '../utils/errorHandler';

const API_BASE_URL = '/1cliqtrade/api';
const logger = createLogger('CliqTradeAPIEnhanced');

/**
 * Enhanced API request with retry logic
 */
async function apiRequestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';

    return retryWithBackoff(
        async () => {
            return apiRequest<T>(endpoint, options);
        },
        `${method} ${endpoint}`,
        { maxAttempts: 3, delayMs: 1000 }
    );
}

/**
 * Helper function to make API requests with proper error handling
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    const method = options.method || 'GET';

    try {
        const url = `${API_BASE_URL}${endpoint}`;

        logger.info(`📡 API Request: ${method} ${endpoint}`, {
            url,
            timestamp: new Date().toISOString(),
        });

        // Add default headers
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // Add CSRF token if available (for POST/PUT/DELETE requests)
        if (['POST', 'PUT', 'DELETE'].includes(method)) {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (csrfToken) {
                (headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
                logger.debug('CSRF token added to request headers');
            }
        }

        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include', // Include cookies for session validation
        });

        const duration = (performance.now() - startTime).toFixed(2);
        const data = await response.json();

        // Handle session expiration (401)
        if (response.status === 401) {
            const error = {
                status: 401,
                message: 'Session expired. Please login again.',
            };
            const { userMessage } = handleApiError(error, { endpoint, method });
            logger.error('❌ Session expired (401)', {
                endpoint,
                duration: `${duration}ms`,
                userMessage,
            });
            return {
                status: 'error',
                message: userMessage,
            };
        }

        // Handle forbidden (403)
        if (response.status === 403) {
            const error = {
                status: 403,
                message: 'Forbidden',
            };
            const { userMessage } = handleApiError(error, { endpoint, method });
            logger.warn('❌ Forbidden (403)', {
                endpoint,
                duration: `${duration}ms`,
                userMessage,
            });
            return {
                status: 'error',
                message: userMessage,
            };
        }

        // Handle server errors (500+)
        if (response.status >= 500) {
            const error = {
                status: response.status,
                message: 'Server error',
            };
            const { userMessage } = handleApiError(error, { endpoint, method });
            logger.error('❌ Server error (500+)', {
                endpoint,
                status: response.status,
                duration: `${duration}ms`,
                userMessage,
            });
            return {
                status: 'error',
                message: userMessage,
            };
        }

        if (!response.ok) {
            logger.warn('❌ API request failed (not OK)', {
                endpoint,
                status: response.status,
                message: data.message,
                duration: `${duration}ms`,
            });
            return {
                status: 'error',
                message: data.message || 'An error occurred',
            };
        }

        logger.info(`✅ API Request Success: ${method} ${endpoint}`, {
            status: response.status,
            duration: `${duration}ms`,
            dataSize: JSON.stringify(data).length,
        });

        return {
            status: 'success',
            data: data.data || data,
        };
    } catch (error) {
        const duration = (performance.now() - startTime).toFixed(2);
        const { userMessage } = handleApiError(error, { endpoint, method });

        logger.error('❌ API request failed with exception', {
            endpoint,
            method,
            error: String(error),
            duration: `${duration}ms`,
            userMessage,
        });

        return {
            status: 'error',
            message: userMessage,
        };
    }
}

/**
 * Positions API Endpoints
 */
export async function fetchPositions(): Promise<ApiResponse<Position[]>> {
    return apiRequestWithRetry<Position[]>('/positions_tab');
}

export async function fetchPositionDetails(symbol: string): Promise<ApiResponse<Position>> {
    return apiRequestWithRetry<Position>(`/positions_tab?symbol=${encodeURIComponent(symbol)}`);
}

/**
 * Orders API Endpoints
 */
export async function fetchOrders(): Promise<ApiResponse<Order[]>> {
    return apiRequestWithRetry<Order[]>('/orderbook_tab');
}

export async function modifyOrder(orderData: any): Promise<ApiResponse<any>> {
    return apiRequestWithRetry('/modify_order', {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
}

export async function cancelOrder(orderId: string): Promise<ApiResponse<any>> {
    return apiRequestWithRetry('/modify_order', {
        method: 'POST',
        body: JSON.stringify({ orderid: orderId, action: 'cancel' }),
    });
}

/**
 * Trades API Endpoints
 */
export async function fetchTrades(): Promise<ApiResponse<Trade[]>> {
    return apiRequestWithRetry<Trade[]>('/tradebook_tab');
}

/**
 * Holdings API Endpoints
 */
export async function fetchHoldings(): Promise<ApiResponse<Holding[]>> {
    return apiRequestWithRetry<Holding[]>('/holdings_tab');
}

/**
 * Funds API Endpoints
 */
export async function fetchFunds(): Promise<ApiResponse<Funds>> {
    return apiRequestWithRetry<Funds>('/funds_tab');
}

/**
 * Broker Info API Endpoints
 */
export async function fetchBrokerInfo(): Promise<ApiResponse<BrokerInfo>> {
    return apiRequestWithRetry<BrokerInfo>('/broker-info');
}

/**
 * Market Status API Endpoints
 */
export async function fetchMarketStatus(): Promise<ApiResponse<MarketStatus>> {
    return apiRequestWithRetry<MarketStatus>('/is_market_open');
}

/**
 * Master Contract API Endpoints
 */
export async function getMasterContracts(
    filters?: MasterContractFilters
): Promise<ApiResponse<MasterContract[]>> {
    const params = new URLSearchParams();

    if (filters?.exchange) params.append('exchange', filters.exchange);
    if (filters?.segment) params.append('segment', filters.segment);
    if (filters?.expiry) params.append('expiry', filters.expiry);
    if (filters?.instrumenttype) params.append('instrumenttype', filters.instrumenttype);

    const queryString = params.toString();
    const endpoint = `/master-contracts${queryString ? `?${queryString}` : ''}`;

    return apiRequestWithRetry<MasterContract[]>(endpoint);
}

/**
 * Place Order API Endpoint
 */
export async function placeOrder(
    orderData: PlaceOrderRequest
): Promise<ApiResponse<Order>> {
    return apiRequestWithRetry<Order>('/place_order', {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
}
