/**
 * Hook for WebSocket Live Price (LTP) Updates
 * Subscribes to LTP updates for a specific symbol
 */

import { useEffect, useState, useCallback } from 'react';
import { useWebSocketManager } from '../contexts/WebSocketManagerContext';

export interface LivePriceUpdate {
    symbol: string;
    ltp: number;
    bid: number;
    ask: number;
    volume: number;
    timestamp: number;
}

/**
 * Hook to subscribe to live price updates for a symbol
 */
export function useWebSocketLivePrice(symbol?: string) {
    const [livePrice, setLivePrice] = useState<LivePriceUpdate | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const { subscribe, unsubscribe, addMessageListener, isConnected } = useWebSocketManager();

    /**
     * Handle live price message
     */
    const handleLivePrice = useCallback((data: any) => {
        console.log(`[useWebSocketLivePrice] 💰 Price update received:`, {
            incomingSymbol: data.symbol,
            watchingSymbol: symbol,
            matchesSymbol: data.symbol === symbol,
            ltp: data.ltp || data.price,
            bid: data.bid,
            ask: data.ask,
            data,
        });

        if (data.symbol === symbol) {
            console.log(`[useWebSocketLivePrice] ✅ Setting price for ${symbol}:`, data);
            setLivePrice({
                symbol: data.symbol,
                ltp: data.ltp || data.price || 0,
                bid: data.bid || 0,
                ask: data.ask || 0,
                volume: data.volume || 0,
                timestamp: data.timestamp || Date.now(),
            });
        } else {
            console.warn(`[useWebSocketLivePrice] ❌ Symbol mismatch - got ${data.symbol} but watching ${symbol}`);
        }
    }, [symbol]);

    /**
     * Subscribe/unsubscribe from live price updates
     */
    useEffect(() => {
        console.log(`[useWebSocketLivePrice] Effect triggered`, {
            symbol,
            isConnected,
            isSubscribed,
        });

        if (!symbol) {
            console.warn(`[useWebSocketLivePrice] ⚠️ No symbol provided`);
            if (isSubscribed) {
                setIsSubscribed(false);
            }
            return;
        }

        if (!isConnected) {
            console.warn(`[useWebSocketLivePrice] ⚠️ WebSocket not connected for symbol: ${symbol}`);
            if (isSubscribed) {
                setIsSubscribed(false);
            }
            return;
        }

        try {
            console.log(`[useWebSocketLivePrice] 📌 Subscribing to symbol: ${symbol}`);
            
            // Subscribe to symbol
            subscribe(symbol);
            setIsSubscribed(true);

            console.log(`[useWebSocketLivePrice] ✅ Successfully subscribed to: ${symbol}`);

            // Add message listener for 'ltp' message type
            const unsubscribeListener = addMessageListener('ltp', handleLivePrice);

            // Cleanup
            return () => {
                console.log(`[useWebSocketLivePrice] 🧹 Unsubscribing from: ${symbol}`);
                unsubscribeListener();
                unsubscribe(symbol);
                setIsSubscribed(false);
            };
        } catch (error) {
            console.error(`[useWebSocketLivePrice] ❌ Error subscribing to ${symbol}:`, error);
        }
    }, [symbol, isConnected, subscribe, unsubscribe, addMessageListener, handleLivePrice]);

    return {
        livePrice,
        isSubscribed,
    };
}

/**
 * Hook to subscribe to multiple live price updates
 */
export function useWebSocketLivePrices(symbols: string[] = []) {
    const [livePrices, setLivePrices] = useState<Record<string, LivePriceUpdate>>({});
    const { subscribe, unsubscribe, addMessageListener, isConnected } = useWebSocketManager();

    const handleLivePrice = useCallback((data: any) => {
        const symbol = data.symbol as string;
        setLivePrices((prev) => ({
            ...prev,
            [symbol]: {
                symbol,
                ltp: data.ltp || data.price || 0,
                bid: data.bid || 0,
                ask: data.ask || 0,
                volume: data.volume || 0,
                timestamp: data.timestamp || Date.now(),
            },
        }));
    }, []);

    useEffect(() => {
        if (!isConnected || symbols.length === 0) {
            return;
        }

        try {
            // Subscribe to all symbols
            symbols.forEach((symbol) => {
                if (symbol) {
                    subscribe(symbol);
                }
            });

            // Add message listener
            const unsubscribeListener = addMessageListener('ltp', handleLivePrice);

            // Cleanup
            return () => {
                unsubscribeListener();
                symbols.forEach((symbol) => {
                    if (symbol) {
                        unsubscribe(symbol);
                    }
                });
            };
        } catch (error) {
            console.error('Error subscribing to live prices:', error);
        }
    }, [symbols, isConnected, subscribe, unsubscribe, addMessageListener, handleLivePrice]);

    return {
        livePrices,
    };
}
