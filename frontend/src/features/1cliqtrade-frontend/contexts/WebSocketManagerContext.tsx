/**
 * WebSocket Manager Context for 1CliqTrade
 * Manages WebSocket connection lifecycle and message routing
 * Handles auto-reconnect with exponential backoff
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '../types/index';

/**
 * WebSocket connection states
 */
enum WebSocketState {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    FAILED = 'failed',
}

/**
 * WebSocket Manager Context Type
 */
interface WebSocketManagerContextType {
    isConnected: boolean;
    state: WebSocketState;
    connect: () => void;
    disconnect: () => void;
    subscribe: (symbol: string) => void;
    unsubscribe: (symbol: string) => void;
    addMessageListener: (
        messageType: string,
        callback: (data: any) => void
    ) => () => void; // Returns unsubscribe function
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
 * WebSocket Manager Provider Component
 */
export function WebSocketManagerProvider({
    children,
    wsUrl = `ws://${window.location.hostname}:8765`,
}: WebSocketManagerProviderProps) {
    const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const subscribedSymbolsRef = useRef<Set<string>>(new Set());
    const messageListenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Maximum reconnection attempts before giving up
     */
    const MAX_RECONNECT_ATTEMPTS = 10;

    /**
     * Base delay for exponential backoff (in ms)
     */
    const BASE_RECONNECT_DELAY = 1000;

    /**
     * Maximum delay for exponential backoff (in ms)
     */
    const MAX_RECONNECT_DELAY = 30000;

    /**
     * Heartbeat interval (in ms)
     */
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds

    /**
     * Calculate exponential backoff delay
     */
    const getReconnectDelay = (attempts: number): number => {
        const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempts), MAX_RECONNECT_DELAY);
        // Add random jitter to avoid thundering herd problem
        return delay + Math.random() * 1000;
    };

    /**
     * Setup heartbeat mechanism
     */
    const setupHeartbeat = useCallback(() => {
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
        }

        heartbeatTimeoutRef.current = setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send(JSON.stringify({ type: 'ping' }));
                } catch (error) {
                    console.error('Failed to send heartbeat ping:', error);
                }
            }
            setupHeartbeat();
        }, HEARTBEAT_INTERVAL);
    }, []);

    /**
     * Clear heartbeat
     */
    const clearHeartbeat = useCallback(() => {
        if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
        }
    }, []);

    /**
     * Handle WebSocket message
     */
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            // Handle pong response
            if (message.type === 'pong') {
                console.debug('Received pong from server');
                return;
            }

            // Route message to registered listeners
            const listeners = messageListenersRef.current.get(message.type);
            if (listeners) {
                listeners.forEach((callback) => {
                    try {
                        callback(message.data || message);
                    } catch (error) {
                        console.error(`Error in message listener for ${message.type}:`, error);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }, []);

    /**
     * Handle WebSocket error
     */
    const handleError = useCallback((event: Event) => {
        console.error('WebSocket error:', event);
        setState(WebSocketState.FAILED);
    }, []);

    /**
     * Handle WebSocket close
     */
    const handleClose = useCallback(() => {
        console.log('WebSocket connection closed');
        clearHeartbeat();
        setState(WebSocketState.DISCONNECTED);

        // Attempt reconnection if not explicitly disconnected
        if (wsRef.current !== null) {
            // Mark as null to indicate explicit disconnection
            // reconnection will only happen if connect() is called again
        }
    }, [clearHeartbeat]);

    /**
     * Connect to WebSocket
     */
    const connect = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket connection already in progress');
            return;
        }

        setState(WebSocketState.CONNECTING);
        reconnectAttemptsRef.current = 0;

        try {
            wsRef.current = new WebSocket(wsUrl);
            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                setState(WebSocketState.CONNECTED);
                reconnectAttemptsRef.current = 0;
                setupHeartbeat();

                // Resubscribe to previously subscribed symbols
                subscribedSymbolsRef.current.forEach((symbol) => {
                    try {
                        wsRef.current?.send(
                            JSON.stringify({
                                type: 'subscribe',
                                symbol,
                            })
                        );
                    } catch (error) {
                        console.error(`Failed to resubscribe to ${symbol}:`, error);
                    }
                });
            };
            wsRef.current.onmessage = handleMessage;
            wsRef.current.onerror = handleError;
            wsRef.current.onclose = handleClose;
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setState(WebSocketState.FAILED);
            attemptReconnect();
        }
    }, [wsUrl, handleMessage, handleError, handleClose, setupHeartbeat]);

    /**
     * Attempt reconnection with exponential backoff
     */
    const attemptReconnect = useCallback(() => {
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached, giving up');
            setState(WebSocketState.FAILED);
            return;
        }

        reconnectAttemptsRef.current += 1;
        const delay = getReconnectDelay(reconnectAttemptsRef.current - 1);

        console.log(
            `Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`
        );

        setState(WebSocketState.RECONNECTING);

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
            connect();
        }, delay);
    }, [connect]);

    /**
     * Disconnect from WebSocket
     */
    const disconnect = useCallback(() => {
        console.log('Disconnecting WebSocket');

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        clearHeartbeat();

        if (wsRef.current) {
            wsRef.current.onclose = null; // Prevent auto-reconnect on manual disconnect
            wsRef.current.close();
            wsRef.current = null;
        }

        subscribedSymbolsRef.current.clear();
        messageListenersRef.current.clear();
        setState(WebSocketState.DISCONNECTED);
    }, [clearHeartbeat]);

    /**
     * Subscribe to symbol
     */
    const subscribe = useCallback(
        (symbol: string) => {
            if (!symbol) return;

            subscribedSymbolsRef.current.add(symbol);

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send(
                        JSON.stringify({
                            type: 'subscribe',
                            symbol,
                        })
                    );
                } catch (error) {
                    console.error(`Failed to subscribe to ${symbol}:`, error);
                }
            }
        },
        []
    );

    /**
     * Unsubscribe from symbol
     */
    const unsubscribe = useCallback(
        (symbol: string) => {
            if (!symbol) return;

            subscribedSymbolsRef.current.delete(symbol);

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send(
                        JSON.stringify({
                            type: 'unsubscribe',
                            symbol,
                        })
                    );
                } catch (error) {
                    console.error(`Failed to unsubscribe from ${symbol}:`, error);
                }
            }
        },
        []
    );

    /**
     * Add message listener
     * Returns a function to remove the listener
     */
    const addMessageListener = useCallback(
        (messageType: string, callback: (data: any) => void): (() => void) => {
            if (!messageListenersRef.current.has(messageType)) {
                messageListenersRef.current.set(messageType, new Set());
            }

            const listeners = messageListenersRef.current.get(messageType)!;
            listeners.add(callback);

            // Return unsubscribe function
            return () => {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    messageListenersRef.current.delete(messageType);
                }
            };
        },
        []
    );

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

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
