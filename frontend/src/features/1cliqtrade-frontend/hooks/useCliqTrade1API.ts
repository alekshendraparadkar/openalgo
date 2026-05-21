/**
 * TanStack Query Hooks for 1CliqTrade
 * Provides hooks for fetching and managing 1CliqTrade data
 * Configured with proper stale times and refetch intervals
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    positionsAPI,
    ordersAPI,
    tradesAPI,
    holdingsAPI,
    fundsAPI,
    brokerAPI,
    marketAPI,
} from '../services/cliqtradeAPI';

/**
 * Query Keys for consistent cache management
 */
export const cliqtradeQueryKeys = {
    all: ['1cliqtrade'] as const,
    positions: () => [...cliqtradeQueryKeys.all, 'positions'] as const,
    position: (symbol: string) => [...cliqtradeQueryKeys.positions(), symbol] as const,
    orders: () => [...cliqtradeQueryKeys.all, 'orders'] as const,
    order: (orderId: string) => [...cliqtradeQueryKeys.orders(), orderId] as const,
    trades: () => [...cliqtradeQueryKeys.all, 'trades'] as const,
    tradesBySymbol: (symbol: string) => [...cliqtradeQueryKeys.trades(), symbol] as const,
    holdings: () => [...cliqtradeQueryKeys.all, 'holdings'] as const,
    holding: (symbol: string) => [...cliqtradeQueryKeys.holdings(), symbol] as const,
    funds: () => [...cliqtradeQueryKeys.all, 'funds'] as const,
    brokerInfo: () => [...cliqtradeQueryKeys.all, 'brokerInfo'] as const,
    marketStatus: () => [...cliqtradeQueryKeys.all, 'marketStatus'] as const,
};

/**
 * Stale Times Configuration (in milliseconds)
 */
const STALE_TIMES = {
    POSITIONS: 5 * 1000, // 5 seconds
    ORDERS: 3 * 1000, // 3 seconds
    TRADES: 10 * 1000, // 10 seconds
    HOLDINGS: 30 * 1000, // 30 seconds
    FUNDS: 30 * 1000, // 30 seconds
    BROKER_INFO: 60 * 1000, // 60 seconds
    MARKET_STATUS: 30 * 1000, // 30 seconds
};

/**
 * Hook to fetch positions
 * Refetches every 5 seconds
 */
export function usePositions() {
    return useQuery({
        queryKey: cliqtradeQueryKeys.positions(),
        queryFn: async () => {
            const response = await positionsAPI.getPositions();
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch positions');
            }
            return response.data || [];
        },
        staleTime: STALE_TIMES.POSITIONS,
        refetchInterval: STALE_TIMES.POSITIONS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

/**
 * Hook to fetch a single position by symbol
 */
export function usePosition(symbol: string) {
    return useQuery({
        queryKey: cliqtradeQueryKeys.position(symbol),
        queryFn: async () => {
            const response = await positionsAPI.getPosition(symbol);
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch position');
            }
            return response.data;
        },
        staleTime: STALE_TIMES.POSITIONS,
        enabled: !!symbol,
    });
}

/**
 * Hook to fetch orders
 * Refetches every 3 seconds
 */
export function useOrders() {
    return useQuery({
        queryKey: cliqtradeQueryKeys.orders(),
        queryFn: async () => {
            const response = await ordersAPI.getOrders();
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch orders');
            }
            return response.data || [];
        },
        staleTime: STALE_TIMES.ORDERS,
        refetchInterval: STALE_TIMES.ORDERS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(orderId: string) {
    return useQuery({
        queryKey: cliqtradeQueryKeys.order(orderId),
        queryFn: async () => {
            const response = await ordersAPI.getOrder(orderId);
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch order');
            }
            return response.data;
        },
        staleTime: STALE_TIMES.ORDERS,
        enabled: !!orderId,
    });
}

/**
 * Hook to modify an order
 */
export function useModifyOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            orderId,
            price,
            quantity,
        }: {
            orderId: string;
            price?: number;
            quantity?: number;
        }) => {
            const response = await ordersAPI.modifyOrder(orderId, { price, quantity });
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to modify order');
            }
            return response.data;
        },
        onSuccess: () => {
            // Invalidate related queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: cliqtradeQueryKeys.orders() });
            queryClient.invalidateQueries({ queryKey: cliqtradeQueryKeys.positions() });
        },
    });
}

/**
 * Hook to cancel an order
 */
export function useCancelOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId: string) => {
            const response = await ordersAPI.cancelOrder(orderId);
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to cancel order');
            }
            return response.data;
        },
        onSuccess: () => {
            // Invalidate related queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: cliqtradeQueryKeys.orders() });
            queryClient.invalidateQueries({ queryKey: cliqtradeQueryKeys.positions() });
        },
    });
}

/**
 * Hook to fetch trades
 * Refetches every 10 seconds
 */
export function useTrades() {
    return useQuery({
        queryKey: cliqtradeQueryKeys.trades(),
        queryFn: async () => {
            const response = await tradesAPI.getTrades();
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch trades');
            }
            return response.data || [];
        },
        staleTime: STALE_TIMES.TRADES,
        refetchInterval: STALE_TIMES.TRADES,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

/**
 * Hook to fetch trades for a specific symbol
 */
export function useTradesBySymbol(symbol: string) {
    return useQuery({
        queryKey: cliqtradeQueryKeys.tradesBySymbol(symbol),
        queryFn: async () => {
            const response = await tradesAPI.getTradesBySymbol(symbol);
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch trades');
            }
            return response.data || [];
        },
        staleTime: STALE_TIMES.TRADES,
        enabled: !!symbol,
    });
}

/**
 * Hook to fetch holdings
 * Refetches every 30 seconds
 */
export function useHoldings() {
    return useQuery({
        queryKey: cliqtradeQueryKeys.holdings(),
        queryFn: async () => {
            const response = await holdingsAPI.getHoldings();
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch holdings');
            }
            return response.data || [];
        },
        staleTime: STALE_TIMES.HOLDINGS,
        refetchInterval: STALE_TIMES.HOLDINGS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

/**
 * Hook to fetch a single holding by symbol
 */
export function useHolding(symbol: string) {
    return useQuery({
        queryKey: cliqtradeQueryKeys.holding(symbol),
        queryFn: async () => {
            const response = await holdingsAPI.getHolding(symbol);
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch holding');
            }
            return response.data;
        },
        staleTime: STALE_TIMES.HOLDINGS,
        enabled: !!symbol,
    });
}

/**
 * Hook to fetch funds/margin information
 * Refetches every 30 seconds
 */
export function useFunds() {
    return useQuery({
        queryKey: cliqtradeQueryKeys.funds(),
        queryFn: async () => {
            const response = await fundsAPI.getFunds();
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch funds');
            }
            return response.data || {
                availableCash: 0,
                usedMargin: 0,
                availableMargin: 0,
                totalMargin: 0,
                pnl: 0,
                collateral: 0,
            };
        },
        staleTime: STALE_TIMES.FUNDS,
        refetchInterval: STALE_TIMES.FUNDS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}

/**
 * Hook to fetch broker information
 */
export function useBrokerInfo() {
    return useQuery({
        queryKey: cliqtradeQueryKeys.brokerInfo(),
        queryFn: async () => {
            const response = await brokerAPI.getBrokerInfo();
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch broker info');
            }
            return response.data;
        },
        staleTime: STALE_TIMES.BROKER_INFO,
    });
}

/**
 * Hook to fetch market status
 * Refetches every 30 seconds
 */
export function useMarketStatus() {
    return useQuery({
        queryKey: cliqtradeQueryKeys.marketStatus(),
        queryFn: async () => {
            const response = await marketAPI.getMarketStatus();
            if (response.status === 'error') {
                throw new Error(response.message || 'Failed to fetch market status');
            }
            return response.data;
        },
        staleTime: STALE_TIMES.MARKET_STATUS,
        refetchInterval: STALE_TIMES.MARKET_STATUS,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    });
}
