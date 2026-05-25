/**
 * WebSocket Manager Context for 1CliqTrade
 * Manages WebSocket connection lifecycle and message routing
 * Handles auto-reconnect with exponential backoff
 * INCLUDES: Comprehensive logging and error handling
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage } from '../types/index';
import { createLogger } from '../utils/logger';
import { handleWebSocketError } from '../utils/errorHandler';

/**
 * WebSocket connection states
 */
const WebSocketState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    FAILED: 'failed',
} as const;

type WebSocketStateType = typeof WebSocketState[keyof typeof WebSocketState];

/**
 * WebSocket Manager Context Type
 */
interface WebSocketManagerContextType {
    isConnected: boolean;
    state: WebSocketStateType;
    connect: () => void;
    disconnect: () => void;
    subscribe: (symbol: string) => void;
    unsubscribe: (symbol: string) => void;
    addMessageListener: (
        messageType: string,
        callback: (data: any) => void
    ) => () => void;
}

/**
 * Create WebSocket Manager Context
 */
export const WebSocketManagerContext = createContext<WebSocketManagerContextType | undefined>(
    undefined
);

/**
 * WebSocket Manager Provider Props
 */
interface WebSocketManagerProviderProps {
    children: React.ReactNode;
    wsUrl?: string;
}

/**
 * Constants for reconnection and heartbeat
 */
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const HEARTBEAT_INTERVAL = 30000;

/**
 * WebSocket Manager Provider Component
 */
export function WebSocketManagerProvider({
    children,
    wsUrl = `ws://${window.location.hostname}:8765`,
}: WebSocketManagerProviderProps) {
    const [state, setState] = useState<WebSocketStateType>(WebSocketState.DISCONNECTED);
    const logger = useRef(createLogger('WebSocketManager')).current;
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const subscribedSymbolsRef = useRef<Set<string>>(new Set());
    const messageListenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
    const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messageCountRef = useRef<Record<string, number>>({});
    const isExplicitlyDisconnectedRef = useRef(false);
    const authenticationAttemptedRef = useRef(false);

    /**
     * Fetch API key from localStorage or /apikey endpoint
     * BUG #2 FIX: Retrieve API key for WebSocket authentication
     */
    const fetchApiKey = useCallback(async (): Promise<string | null> => {
        try {
            // Try to get from localStorage first (authStore persists to "openalgo-auth")
            const authStoreJson = localStorage.getItem('openalgo-auth');
            if (authStoreJson) {
                try {
                    const authStore = JSON.parse(authStoreJson);
                    if (authStore.state?.apiKey) {
                        logger.debug('✅ API key retrieved from localStorage');
                        return authStore.state.apiKey;
                    }
                } catch (e) {
                    logger.debug('⚠️ Failed to parse localStorage auth store', { error: String(e) });
                }
            }

            // Fallback: Fetch from /apikey endpoint
            logger.debug('📡 Fetching API key from /apikey endpoint');
            const response = await fetch('/apikey', {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                if (data.api_key) {
                    logger.debug('✅ API key retrieved from /apikey endpoint');
                    return data.api_key;
                }
            } else if (response.status === 401) {
                logger.warn('⚠️ Not authenticated - cannot get API key');
                return null;
            }
        } catch (error) {
            logger.error('Failed to fetch API key', { error: String(error) });
        }

        return null;
    }, [logger]);

    /**
     * Send WebSocket authentication message
     * BUG #1 FIX: Send auth message within grace period (15 seconds)
     */
    const sendAuthentication = useCallback(async () => {
        if (authenticationAttemptedRef.current) {
            logger.debug('⚠️ Authentication already attempted for this connection');
            return;
        }

        authenticationAttemptedRef.current = true;

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            logger.warn('⚠️ WebSocket not ready for authentication');
            return;
        }

        const apiKey = await fetchApiKey();
        if (!apiKey) {
            logger.error('🔴 Cannot authenticate - no API key available');
            return;
        }

        try {
            const authMessage = {
                action: 'authenticate',
                apikey: apiKey,
            };

            wsRef.current.send(JSON.stringify(authMessage));
            logger.info('📌 WebSocket authentication message sent', {
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Failed to send authentication message', { error: String(error) });
        }
    }, [fetchApiKey, logger]);

    /**
     * Calculate exponential backoff delay
     */
    const getReconnectDelay = (attempts: number): number => {
        const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempts), MAX_RECONNECT_DELAY);
        return delay + Math.random() * 1000;
    };

    /**
     * Clear heartbeat mechanism
     */
    const clearHeartbeat = useCallback(() => {
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
            logger.debug('💓 Heartbeat cleared');
        }
    }, [logger]);

    /**
     * Setup heartbeat mechanism
     */
    const setupHeartbeat = useCallback(() => {
        clearHeartbeat();

        heartbeatTimeoutRef.current = setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    logger.debug('💓 Sending heartbeat ping');
                    wsRef.current.send(JSON.stringify({ type: 'ping' }));
                } catch (error) {
                    logger.error('Failed to send heartbeat ping', { error: String(error) });
                }
            }
            setupHeartbeat();
        }, HEARTBEAT_INTERVAL);
    }, [clearHeartbeat, logger]);

    /**
     * Handle WebSocket message
     */
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            messageCountRef.current[message.type] = (messageCountRef.current[message.type] || 0) + 1;

            if (message.type === 'pong') {
                logger.debug('💓 Received pong from server');
                return;
            }

            if (message.type === 'ltp') {
                logger.info('📊 LTP Update received', {
                    symbol: (message.data as any)?.symbol,
                    ltp: (message.data as any)?.ltp,
                    bid: (message.data as any)?.bid,
                    ask: (message.data as any)?.ask,
                    volume: (message.data as any)?.volume,
                    timestamp: (message.data as any)?.timestamp,
                    totalMessages: messageCountRef.current['ltp'],
                });
            } else if (message.type === 'position_update') {
                logger.info('📈 Position Update received', {
                    symbol: (message.data as any)?.symbol,
                    quantity: (message.data as any)?.quantity,
                    average_price: (message.data as any)?.average_price,
                    ltp: (message.data as any)?.ltp,
                    pnl: (message.data as any)?.pnl,
                    pnl_percent: (message.data as any)?.pnl_percent,
                    totalMessages: messageCountRef.current['position_update'],
                });
            } else if (message.type === 'order_update') {
                logger.info('📝 Order Update received', {
                    orderid: (message.data as any)?.orderid,
                    symbol: (message.data as any)?.symbol,
                    status: (message.data as any)?.status,
                    quantity: (message.data as any)?.quantity,
                    filled_quantity: (message.data as any)?.filled_quantity,
                    totalMessages: messageCountRef.current['order_update'],
                });
            } else if (message.type === 'trade_update') {
                logger.info('💰 Trade Update received', {
                    tradeid: (message.data as any)?.tradeid,
                    orderid: (message.data as any)?.orderid,
                    symbol: (message.data as any)?.symbol,
                    quantity: (message.data as any)?.quantity,
                    price: (message.data as any)?.price,
                    totalMessages: messageCountRef.current['trade_update'],
                });
            }

            const listeners = messageListenersRef.current.get(message.type);
            if (listeners && listeners.size > 0) {
                listeners.forEach((callback) => {
                    try {
                        callback(message.data || message);
                    } catch (error) {
                        logger.error(`Error in message listener for ${message.type}`, {
                            error: String(error),
                        });
                    }
                });
            }
        } catch (error) {
            logger.error('Failed to parse WebSocket message', {
                error: String(error),
            });
        }
    }, [logger]);

    /**
     * Attempt reconnection with exponential backoff
     */
    const attemptReconnect = useCallback(() => {
        if (isExplicitlyDisconnectedRef.current) {
            logger.info('Reconnection skipped - manually disconnected');
            return;
        }

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            logger.error('❌ Max reconnection attempts reached', {
                attempts: reconnectAttemptsRef.current,
            });
            setState(WebSocketState.FAILED);
            return;
        }

        reconnectAttemptsRef.current += 1;
        const delay = getReconnectDelay(reconnectAttemptsRef.current - 1);

        logger.warn(
            `⏳ Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
            {
                delayMs: Math.round(delay),
                nextRetryIn: `${(delay / 1000).toFixed(1)}s`,
            }
        );

        setState(WebSocketState.RECONNECTING);

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
            connect();
        }, delay);
    }, [logger]);

    /**
     * Connect to WebSocket
     */
    const connect = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            logger.info('⚠️ WebSocket already connected');
            return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            logger.info('⚠️ WebSocket connection already in progress');
            return;
        }

        logger.info('🌐 Initiating WebSocket connection', { url: wsUrl });
        setState(WebSocketState.CONNECTING);
        reconnectAttemptsRef.current = 0;
        isExplicitlyDisconnectedRef.current = false;
        authenticationAttemptedRef.current = false;
        messageCountRef.current = {};

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                logger.info('✅ WebSocket connected successfully', {
                    url: wsUrl,
                    readyState: wsRef.current?.readyState,
                    timestamp: new Date().toISOString(),
                });
                setState(WebSocketState.CONNECTED);
                reconnectAttemptsRef.current = 0;
                setupHeartbeat();

                // BUG #1 FIX: Send authentication immediately after connection
                sendAuthentication().then(() => {
                    logger.info('🔄 Authentication successful - resubscribing to symbols');

                    const symbolsArray = Array.from(subscribedSymbolsRef.current);
                    if (symbolsArray.length > 0) {
                        logger.info(`🔄 Resubscribing to ${symbolsArray.length} symbols`, {
                            symbols: symbolsArray,
                        });

                        symbolsArray.forEach((symbol) => {
                            try {
                                wsRef.current?.send(
                                    JSON.stringify({
                                        type: 'subscribe',
                                        symbol,
                                    })
                                );
                                logger.debug(`✅ Subscribed to symbol: ${symbol}`);
                            } catch (error) {
                                logger.error(`Failed to resubscribe to ${symbol}`, {
                                    error: String(error),
                                });
                            }
                        });
                    }
                }).catch((error) => {
                    logger.error('Authentication failed', { error: String(error) });
                });
            };

            wsRef.current.onmessage = handleMessage;

            wsRef.current.onerror = () => {
                const error = { name: 'WebSocketError' };
                const { userMessage, shouldReconnect } = handleWebSocketError(error, {
                    operation: 'connection',
                    wsUrl,
                });

                logger.error('🔴 WebSocket error occurred', {
                    timestamp: new Date().toISOString(),
                    userMessage,
                    shouldReconnect,
                });
                setState(WebSocketState.FAILED);

                if (shouldReconnect) {
                    attemptReconnect();
                }
            };

            wsRef.current.onclose = () => {
                logger.info('🔌 WebSocket connection closed', {
                    subscribedSymbols: Array.from(subscribedSymbolsRef.current),
                    messageStats: messageCountRef.current,
                });
                clearHeartbeat();
                setState(WebSocketState.DISCONNECTED);

                if (!isExplicitlyDisconnectedRef.current) {
                    attemptReconnect();
                }
            };
        } catch (error) {
            logger.error('❌ Failed to create WebSocket', {
                error: String(error),
                url: wsUrl,
            });
            setState(WebSocketState.FAILED);
            attemptReconnect();
        }
    }, [wsUrl, handleMessage, setupHeartbeat, clearHeartbeat, attemptReconnect, sendAuthentication, logger]);

    /**
     * Disconnect from WebSocket
     */
    const disconnect = useCallback(() => {
        logger.info('🛑 Disconnecting WebSocket', {
            subscribedSymbols: Array.from(subscribedSymbolsRef.current),
            messageStats: messageCountRef.current,
        });

        isExplicitlyDisconnectedRef.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        clearHeartbeat();

        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        subscribedSymbolsRef.current.clear();
        messageListenersRef.current.clear();
        setState(WebSocketState.DISCONNECTED);

        logger.info('✅ WebSocket disconnected successfully');
    }, [clearHeartbeat, logger]);

    /**
     * Subscribe to symbol
     */
    const subscribe = useCallback((symbol: string) => {
        if (!symbol) return;

        subscribedSymbolsRef.current.add(symbol);
        logger.info(`📌 Subscribed to symbol: ${symbol}`, {
            totalSubscriptions: subscribedSymbolsRef.current.size,
        });

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(
                    JSON.stringify({
                        type: 'subscribe',
                        symbol,
                    })
                );
                logger.debug(`Send subscribe message for: ${symbol}`);
            } catch (error) {
                logger.error(`Failed to subscribe to ${symbol}`, { error: String(error) });
            }
        }
    }, [logger]);

    /**
     * Unsubscribe from symbol
     */
    const unsubscribe = useCallback((symbol: string) => {
        if (!symbol) return;

        subscribedSymbolsRef.current.delete(symbol);
        logger.info(`🗑️ Unsubscribed from symbol: ${symbol}`, {
            remainingSubscriptions: subscribedSymbolsRef.current.size,
        });

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
                wsRef.current.send(
                    JSON.stringify({
                        type: 'unsubscribe',
                        symbol,
                    })
                );
                logger.debug(`Send unsubscribe message for: ${symbol}`);
            } catch (error) {
                logger.error(`Failed to unsubscribe from ${symbol}`, { error: String(error) });
            }
        }
    }, [logger]);

    /**
     * Add message listener
     */
    const addMessageListener = useCallback(
        (messageType: string, callback: (data: any) => void): (() => void) => {
            if (!messageListenersRef.current.has(messageType)) {
                messageListenersRef.current.set(messageType, new Set());
            }

            const listeners = messageListenersRef.current.get(messageType)!;
            listeners.add(callback);

            logger.debug(`Registered listener for message type: ${messageType}`, {
                totalListeners: listeners.size,
            });

            return () => {
                listeners.delete(callback);
                logger.debug(`Unregistered listener for message type: ${messageType}`, {
                    remainingListeners: listeners.size,
                });
                if (listeners.size === 0) {
                    messageListenersRef.current.delete(messageType);
                }
            };
        },
        [logger]
    );

    /**
     * Auto-connect on mount
     */
    useEffect(() => {
        logger.info('🚀 WebSocketManagerProvider mounted - attempting auto-connect');
        connect();

        return () => {
            logger.info('🧹 WebSocketManagerProvider unmounting, cleaning up...');
            disconnect();
        };
    }, [connect, disconnect, logger]);

    const contextValue: WebSocketManagerContextType = {
        isConnected: state === WebSocketState.CONNECTED,
        state,
        connect,
        disconnect,
        subscribe,
        unsubscribe,
        addMessageListener,
    };

    return (
        <WebSocketManagerContext.Provider value={contextValue}>
            {children}
        </WebSocketManagerContext.Provider>
    );
}

/**
 * Hook to use WebSocket Manager
 */
export function useWebSocketManager(): WebSocketManagerContextType {
    const context = useContext(WebSocketManagerContext);
    if (!context) {
        throw new Error(
            'useWebSocketManager must be used within WebSocketManagerProvider'
        );
    }
    return context;
}
