/**
 * RealtimePriceCard - Phase 2 Component
 * Displays real-time market prices (SPOT, FUTURES, OPTIONS) and quantity management
 * Uses WebSocket for live price updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useModal1CliqTrade } from '../contexts/Modal1CliqTradeContext';
import { useWebSocketLivePrice } from '../hooks/useWebSocketLivePrice';
import { createLogger } from '../utils/logger';

const logger = createLogger('RealtimePriceCard');

interface RealtimePriceCardProps {
    className?: string;
    onQuantityChange?: (quantity: number) => void;
    onPriceLevelsChange?: (buyLevel: number, sellLevel: number) => void;
}

export function RealtimePriceCard({ className = '', onQuantityChange, onPriceLevelsChange }: RealtimePriceCardProps) {
    const { selectedSymbol } = useModal1CliqTrade();
    const [quantity, setQuantity] = useState<number>(selectedSymbol.lotSize || 1);
    const [buyLevel, setBuyLevel] = useState<number>(0);
    const [sellLevel, setSellLevel] = useState<number>(0);

    console.log('[RealtimePriceCard] Selected symbol:', {
        symbol: selectedSymbol.symbol,
        segment: selectedSymbol.segment,
        exchange: selectedSymbol.exchange,
        lotSize: selectedSymbol.lotSize,
    });

    // Subscribe to spot price
    const { livePrice: spotPrice } = useWebSocketLivePrice(
        selectedSymbol.segment === 'Equity' ? selectedSymbol.symbol : undefined
    );

    // Subscribe to futures price (if F&O)
    const futuresSymbol = useMemo(() => {
        if (['Options', 'Futures'].includes(selectedSymbol.segment) && selectedSymbol.symbol) {
            // Format: SYMBOL+EXPIRYDATE+FUT (e.g., NIFTY26APR24FUT)
            return `${selectedSymbol.symbol}${selectedSymbol.expiryDate?.replace(/-/g, '')}FUT`;
        }
        return undefined;
    }, [selectedSymbol.symbol, selectedSymbol.segment, selectedSymbol.expiryDate]);

    const { livePrice: futuresPrice } = useWebSocketLivePrice(futuresSymbol);

    // Subscribe to options price (if Options segment)
    const optionsSymbol = useMemo(() => {
        if (selectedSymbol.segment === 'Options' && selectedSymbol.symbol) {
            // Format: SYMBOL+EXPIRY+STRIKE+CE/PE (e.g., NIFTY26APR2420800CE)
            // For now, we'll use a placeholder - this would be determined by strike selection
            return undefined; // Will be set when user selects strike
        }
        return undefined;
    }, [selectedSymbol.symbol, selectedSymbol.segment]);

    const { livePrice: optionsPrice } = useWebSocketLivePrice(optionsSymbol);

    // Update quantity when lot size changes
    useEffect(() => {
        const newQuantity = selectedSymbol.lotSize || 1;
        setQuantity(newQuantity);
        onQuantityChange?.(newQuantity);
        logger.debug('📦 Quantity updated', { quantity: newQuantity });
    }, [selectedSymbol.lotSize, onQuantityChange]);

    // Initialize buy/sell levels to current LTP
    useEffect(() => {
        const ltp = spotPrice?.ltp || futuresPrice?.ltp || 0;
        if (ltp > 0 && buyLevel === 0) {
            setBuyLevel(ltp);
            setSellLevel(ltp);
            logger.info('💰 Initialized buy/sell levels', { ltp });
        }
    }, [spotPrice?.ltp, futuresPrice?.ltp, buyLevel]);

    // Handle quantity change
    const handleQuantityChange = useCallback((newQuantity: number) => {
        if (newQuantity > 0) {
            setQuantity(newQuantity);
            onQuantityChange?.(newQuantity);
            logger.debug('📊 Quantity changed', { quantity: newQuantity });
        }
    }, [onQuantityChange]);

    // Handle buy level change
    const handleBuyLevelChange = useCallback((value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setBuyLevel(numValue);
            onPriceLevelsChange?.(numValue, sellLevel);
            logger.debug('💵 Buy level changed', { level: numValue });
        }
    }, [sellLevel, onPriceLevelsChange]);

    // Handle sell level change
    const handleSellLevelChange = useCallback((value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
            setSellLevel(numValue);
            onPriceLevelsChange?.(buyLevel, numValue);
            logger.debug('📤 Sell level changed', { level: numValue });
        }
    }, [buyLevel, onPriceLevelsChange]);

    // Format price for display
    const formatPrice = (price?: number) => {
        if (!price || price === 0) return '—';
        return price.toFixed(2);
    };

    // Calculate price changes
    const currentSpotLTP = spotPrice?.ltp || 0;
    const currentFuturesLTP = futuresPrice?.ltp || 0;
    const currentOptionsLTP = optionsPrice?.ltp || 0;

    // Determine price change color (green for up, red for down)
    const getPriceChangeColor = (current: number, previous: number) => {
        if (current > previous) return 'text-green-600 font-semibold';
        if (current < previous) return 'text-red-600 font-semibold';
        return 'text-slate-600';
    };

    return (
        <div className={`p-1.5 bg-white border border-slate-200 rounded shadow-sm ${className}`}>
            {/* Header - Ultra Compact */}
            <div className="mb-1 pb-0.5 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">📊 Prices</h3>
            </div>

            {/* Price Display - Ultra Compact */}
            <div className="grid grid-cols-3 gap-0.5 mb-1">
                <div className="p-1 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-bold text-blue-700">SPOT</p>
                    <p className={`text-sm font-bold ${getPriceChangeColor(currentSpotLTP, buyLevel)}`}>
                        {formatPrice(currentSpotLTP)}
                    </p>
                </div>
                {futuresPrice && (
                    <div className="p-1 bg-purple-50 border border-purple-200 rounded">
                        <p className="text-xs font-bold text-purple-700">FUT</p>
                        <p className={`text-sm font-bold ${getPriceChangeColor(currentFuturesLTP, buyLevel)}`}>
                            {formatPrice(currentFuturesLTP)}
                        </p>
                    </div>
                )}
                {optionsPrice && (
                    <div className="p-1 bg-amber-50 border border-amber-200 rounded">
                        <p className="text-xs font-bold text-amber-700">OPT</p>
                        <p className={`text-sm font-bold ${getPriceChangeColor(currentOptionsLTP, buyLevel)}`}>
                            {formatPrice(currentOptionsLTP)}
                        </p>
                    </div>
                )}
            </div>

            {/* Buy/Sell Inputs */}
            <div className="grid grid-cols-2 gap-0.5 pb-1 border-b border-slate-200">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-green-700 leading-none">🟢 Buy</label>
                    <input
                        type="number"
                        value={buyLevel}
                        onChange={(e) => handleBuyLevelChange(e.target.value)}
                        step="0.01"
                        className="px-1 py-0.5 border border-green-300 rounded bg-green-50 text-xs font-semibold text-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder="0.00"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-red-700 leading-none">🔴 Sell</label>
                    <input
                        type="number"
                        value={sellLevel}
                        onChange={(e) => handleSellLevelChange(e.target.value)}
                        step="0.01"
                        className="px-1 py-0.5 border border-red-300 rounded bg-red-50 text-xs font-semibold text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="0.00"
                    />
                </div>
            </div>

            {/* Quantity */}
            <div className="flex flex-col mt-0.5">
                <label className="text-xs font-bold text-slate-700 leading-none">Qty: {quantity}</label>
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={() => handleQuantityChange(Math.max(1, quantity - selectedSymbol.lotSize))}
                        disabled={quantity <= selectedSymbol.lotSize}
                        className="px-1 py-0.5 bg-red-100 hover:bg-red-200 border border-red-300 rounded font-bold text-red-700 text-xs disabled:opacity-50"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0) handleQuantityChange(val);
                        }}
                        min={selectedSymbol.lotSize}
                        step={selectedSymbol.lotSize}
                        className="flex-1 px-0.5 py-0.5 border border-blue-300 rounded bg-blue-50 text-xs font-bold text-center text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => handleQuantityChange(quantity + selectedSymbol.lotSize)}
                        className="px-1 py-0.5 bg-green-100 hover:bg-green-200 border border-green-300 rounded font-bold text-green-700 text-xs"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Status */}
            <div className="mt-0.5 pt-0.5 border-t border-slate-200 text-xs text-slate-600 flex justify-center">
                <span>{spotPrice ? '🟢' : '🔴'}</span>
            </div>
        </div>
    );
}

export default RealtimePriceCard;
