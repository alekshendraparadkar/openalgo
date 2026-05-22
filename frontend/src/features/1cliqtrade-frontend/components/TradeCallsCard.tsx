/**
 * TradeCallsCard - Phase 3 Component
 * Trading buttons for BUY/SELL CALL options with LTP and LIMIT pricing
 */

import { useState, useCallback, useMemo } from 'react';
import { useModal1CliqTrade } from '../contexts/Modal1CliqTradeContext';
import { useWebSocketLivePrice } from '../hooks/useWebSocketLivePrice';
import { usePlaceOrder } from '../hooks/usePlaceOrder';
import type { PlaceOrderRequest } from '../types/index';
import { createLogger } from '../utils/logger';

const logger = createLogger('TradeCallsCard');

interface TradeCallsCardProps {
    quantity: number;
    buyLevel: number;
    sellLevel: number;
    onOrderPlaced?: (orderId: string) => void;
    className?: string;
}

export function TradeCallsCard({
    quantity,
    buyLevel,
    sellLevel,
    onOrderPlaced,
    className = '',
}: TradeCallsCardProps) {
    const { selectedSymbol } = useModal1CliqTrade();
    const [customPrice, setCustomPrice] = useState<number>(0);
    const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'buy' | 'sell' | null>(null);

    // Subscribe to call option price (e.g., NIFTY26APR2420800CE)
    const callSymbol = useMemo(() => {
        // This would be set by user selecting a strike price
        // For now, placeholder
        return undefined;
    }, []);

    useWebSocketLivePrice(callSymbol);
    const { isLoading, place, reset } = usePlaceOrder();

    // Validate before placing order
    const canPlaceOrder = useMemo(() => {
        return selectedSymbol.symbol && quantity > 0;
    }, [selectedSymbol.symbol, quantity]);

    // Build order request
    const buildOrderRequest = useCallback(
        (action: 'BUY' | 'SELL', priceType: 'MARKET' | 'LIMIT', price: number): PlaceOrderRequest | null => {
            if (!selectedSymbol.symbol) {
                logger.warn('❌ Cannot place order: No symbol selected');
                return null;
            }

            return {
                symbol: selectedSymbol.symbol,
                exchange: selectedSymbol.exchange,
                action,
                quantity,
                price,
                pricetype: priceType,
                product: selectedSymbol.productType as 'CNC' | 'NRML' | 'MIS',
                slprice: selectedSymbol.slLevel,
                targetprice: selectedSymbol.target,
                trial: selectedSymbol.isTrial,
            };
        },
        [selectedSymbol]
    );

    // Place order handler
    const handlePlaceOrder = useCallback(
        async (action: 'BUY' | 'SELL', priceType: 'MARKET' | 'LIMIT', price: number) => {
            if (!canPlaceOrder) {
                logger.warn('❌ Cannot place order: Missing required fields');
                return;
            }

            const orderRequest = buildOrderRequest(action, priceType, price);
            if (!orderRequest) return;

            logger.info(`🔄 Placing ${action} order`, { action, priceType, price, quantity });
            const result = await place(orderRequest);

            if (result) {
                onOrderPlaced?.(result.orderid);
                // Reset custom price modal
                setShowCustomPriceModal(false);
                setCustomPrice(0);
                setPendingAction(null);
                // Auto-dismiss success message after 3 seconds
                setTimeout(() => reset(), 3000);
            }
        },
        [canPlaceOrder, buildOrderRequest, place, onOrderPlaced, reset]
    );

    // Button styles - Ultra Compact
    const buyButtonClass =
        'px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all';
    const sellButtonClass =
        'px-1.5 py-0.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all';

    return (
        <div className={`p-1.5 bg-white border border-slate-200 rounded shadow-sm ${className}`}>
            {/* Header - Ultra Compact */}
            <div className="mb-1 pb-0.5 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">📞 CALL</h3>
                <p className="text-xs text-slate-600">Qty: {quantity}</p>
            </div>

            {/* BUY CALL Section */}
            <div className="mb-1 p-1.5 bg-green-50 border border-green-200 rounded">
                <p className="text-xs font-bold text-green-700 mb-0.5">🟢 BUY</p>
                <div className="flex flex-col gap-0.5">
                    <button
                        onClick={() => handlePlaceOrder('BUY', 'MARKET', 0)}
                        disabled={!canPlaceOrder || isLoading}
                        className={buyButtonClass}
                    >
                        {isLoading && pendingAction === 'buy' ? '⏳...' : 'BUY MKT'}
                    </button>
                    <button
                        onClick={() => handlePlaceOrder('BUY', 'LIMIT', buyLevel)}
                        disabled={!canPlaceOrder || isLoading}
                        className={buyButtonClass}
                    >
                        {isLoading && pendingAction === 'buy' ? '⏳...' : `BUY @ ${buyLevel.toFixed(2)}`}
                    </button>
                    <button
                        onClick={() => {
                            setShowCustomPriceModal(true);
                            setPendingAction('buy');
                        }}
                        disabled={!canPlaceOrder || isLoading}
                        className={buyButtonClass}
                    >
                        BUY LMT
                    </button>
                </div>
            </div>

            {/* SELL CALL Section */}
            <div className="p-1.5 bg-red-50 border border-red-200 rounded">
                <p className="text-xs font-bold text-red-700 mb-0.5">🔴 SELL</p>
                <div className="flex flex-col gap-0.5">
                    <button
                        onClick={() => handlePlaceOrder('SELL', 'MARKET', 0)}
                        disabled={!canPlaceOrder || isLoading}
                        className={sellButtonClass}
                    >
                        {isLoading && pendingAction === 'sell' ? '⏳...' : 'SELL MKT'}
                    </button>
                    <button
                        onClick={() => handlePlaceOrder('SELL', 'LIMIT', sellLevel)}
                        disabled={!canPlaceOrder || isLoading}
                        className={sellButtonClass}
                    >
                        {isLoading && pendingAction === 'sell' ? '⏳...' : `SELL @ ${sellLevel.toFixed(2)}`}
                    </button>
                    <button
                        onClick={() => {
                            setShowCustomPriceModal(true);
                            setPendingAction('sell');
                        }}
                        disabled={!canPlaceOrder || isLoading}
                        className={sellButtonClass}
                    >
                        SELL LMT
                    </button>
                </div>
            </div>

            {/* Custom Price Modal */}
            {showCustomPriceModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-2 rounded shadow-lg max-w-sm w-full mx-4">
                        <h4 className="text-xs font-bold mb-1">
                            Enter {pendingAction === 'buy' ? '🟢 BUY' : '🔴 SELL'} Price
                        </h4>
                        <input
                            type="number"
                            value={customPrice}
                            onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full px-1.5 py-0.5 border border-slate-300 rounded mb-1.5 focus:outline-none focus:border-blue-500 text-xs"
                            autoFocus
                        />
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => {
                                    if (customPrice > 0) {
                                        setPendingAction(pendingAction === 'buy' ? 'buy' : 'sell');
                                        handlePlaceOrder(
                                            pendingAction === 'buy' ? 'BUY' : 'SELL',
                                            'LIMIT',
                                            customPrice
                                        );
                                    }
                                }}
                                className={`flex-1 py-2 rounded font-semibold text-sm ${pendingAction === 'buy' ? buyButtonClass : sellButtonClass
                                    }`}
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => {
                                    setShowCustomPriceModal(false);
                                    setPendingAction(null);
                                    setCustomPrice(0);
                                }}
                                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TradeCallsCard;
