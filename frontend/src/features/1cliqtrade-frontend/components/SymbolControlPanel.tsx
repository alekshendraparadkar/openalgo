/**
 * SymbolControlPanel - Phase 1 Component
 * Manages symbol selection, exchange, segment, expiry, and trading parameters
 * Uses extended Modal1CliqTradeContext and getMasterContracts() API
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useModal1CliqTrade } from '../contexts/Modal1CliqTradeContext';
import { getMasterContracts } from '../services/cliqtradeAPIEnhanced';
import type { MasterContract, MasterContractFilters, SymbolState } from '../types/index';
import { createLogger } from '../utils/logger';

const logger = createLogger('SymbolControlPanel');

// Available options
const EXCHANGES = ['NSE', 'BSE', 'NFO', 'BFO', 'MCX', 'NCDEX', 'CDS', 'BCD'];
const SEGMENTS = ['Equity', 'Options', 'Futures', 'Currency', 'Commodity', 'Index'];
const PRODUCTS = ['CNC', 'NRML', 'MIS'];

// LocalStorage key for persisting symbol state
const STORAGE_KEY = '1cliqtrade-symbol-state';

interface SymbolControlPanelProps {
    className?: string;
}

export function SymbolControlPanel({ className = '' }: SymbolControlPanelProps) {
    const { selectedSymbol, selectSymbol } = useModal1CliqTrade();
    const [masterContracts, setMasterContracts] = useState<MasterContract[]>([]);
    const [filteredContracts, setFilteredContracts] = useState<MasterContract[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Phase 7: Load symbol state from localStorage on component mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const savedState = JSON.parse(saved) as Partial<SymbolState>;
                selectSymbol(savedState);
                logger.info('📂 Loaded symbol state from localStorage', savedState);
            }
        } catch (err) {
            logger.warn('⚠️ Failed to load symbol state from localStorage', { error: err });
        }
        setIsInitialized(true);
    }, [selectSymbol]);

    // Phase 7: Save symbol state to localStorage whenever it changes
    useEffect(() => {
        if (!isInitialized) return;
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSymbol));
            logger.debug('💾 Saved symbol state to localStorage');
        } catch (err) {
            logger.warn('⚠️ Failed to save symbol state to localStorage', { error: err });
        }
    }, [selectedSymbol, isInitialized]);

    // Fetch master contracts when exchange or segment changes
    useEffect(() => {
        const fetchContracts = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const filters: MasterContractFilters = {
                    exchange: selectedSymbol.exchange,
                    segment: selectedSymbol.segment,
                };

                // Add expiry filter if F&O product
                if (['Options', 'Futures'].includes(selectedSymbol.segment) && selectedSymbol.expiryDate) {
                    filters.expiry = selectedSymbol.expiryDate;
                }

                logger.info('🔄 Fetching master contracts', { filters });
                const response = await getMasterContracts(filters);

                if (response.status === 'success' && response.data) {
                    setMasterContracts(response.data);
                    logger.info(`✅ Loaded ${response.data.length} contracts`, {
                        exchange: selectedSymbol.exchange,
                        segment: selectedSymbol.segment,
                    });
                } else {
                    setError(response.message || 'Failed to load master contracts');
                    logger.warn('❌ Failed to fetch contracts', { response });
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
                setError(errorMsg);
                logger.error('❌ Error fetching master contracts', { error: errorMsg });
            } finally {
                setIsLoading(false);
            }
        };

        fetchContracts();
    }, [selectedSymbol.exchange, selectedSymbol.segment, selectedSymbol.expiryDate]);

    // Filter contracts based on symbol search input
    useEffect(() => {
        if (!selectedSymbol.symbol) {
            setFilteredContracts(masterContracts);
            return;
        }

        const filtered = masterContracts.filter((contract) =>
            contract.symbol.toUpperCase().includes(selectedSymbol.symbol.toUpperCase())
        );

        setFilteredContracts(filtered);
    }, [selectedSymbol.symbol, masterContracts]);

    // When a symbol is selected from autocomplete, update context with lot size
    const handleSymbolSelect = useCallback(
        (contract: MasterContract) => {
            selectSymbol({
                symbol: contract.symbol,
                lotSize: contract.lotsize,
            });
            setShowDropdown(false); // Close dropdown after selection
            logger.info('📊 Symbol selected', { symbol: contract.symbol, lotsize: contract.lotsize });
        },
        [selectSymbol]
    );

    // Handle exchange change
    const handleExchangeChange = useCallback(
        (exchange: string) => {
            selectSymbol({ exchange, symbol: '' }); // Reset symbol on exchange change
            logger.info('🏛️ Exchange changed', { exchange });
        },
        [selectSymbol]
    );

    // Handle segment change
    const handleSegmentChange = useCallback(
        (segment: string) => {
            selectSymbol({ segment, symbol: '' }); // Reset symbol on segment change
            logger.info('📈 Segment changed', { segment });
        },
        [selectSymbol]
    );

    // Handle product type change
    const handleProductChange = useCallback(
        (product: string) => {
            selectSymbol({ productType: product });
            logger.info('💼 Product type changed', { product });
        },
        [selectSymbol]
    );

    // Handle numeric inputs (SL, Target, Protection)
    const handleNumericChange = useCallback(
        (field: 'slLevel' | 'target' | 'protectionPercent', value: string) => {
            const numValue = value === '' ? undefined : parseFloat(value);
            if (numValue !== undefined && isNaN(numValue)) return; // Ignore invalid numbers

            selectSymbol({ [field]: numValue });
            logger.debug('🔢 Numeric value changed', { field, value: numValue });
        },
        [selectSymbol]
    );

    // Handle trial mode toggle
    const handleTrialToggle = useCallback(() => {
        selectSymbol({ isTrial: !selectedSymbol.isTrial });
        logger.info('🧪 Trial mode toggled', { isTrial: !selectedSymbol.isTrial });
    }, [selectSymbol, selectedSymbol.isTrial]);

    // Format lot size display
    const lotSizeDisplay = useMemo(() => {
        return selectedSymbol.lotSize?.toString() || '—';
    }, [selectedSymbol.lotSize]);

    return (
        <div className={`p-1 bg-slate-100 border border-slate-200 rounded ${className}`}>
            {error && (
                <div className="mb-0.5 p-0.5 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
                    ⚠️ {error}
                </div>
            )}

            {/* Single Compact Row */}
            <div className="flex flex-wrap items-center gap-0.5">
                {/* Exchange */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 leading-none">Ex</label>
                    <select
                        value={selectedSymbol.exchange}
                        onChange={(e) => handleExchangeChange(e.target.value)}
                        className="px-1 py-0.5 border border-slate-300 rounded bg-white text-xs text-black focus:outline-none focus:ring-1 focus:ring-blue-400 w-12"
                        disabled={isLoading}
                    >
                        {EXCHANGES.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                </div>

                {/* Segment */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 leading-none">Seg</label>
                    <select
                        value={selectedSymbol.segment}
                        onChange={(e) => handleSegmentChange(e.target.value)}
                        className="px-1 py-0.5 border border-slate-300 rounded bg-white text-xs text-black focus:outline-none focus:ring-1 focus:ring-blue-400 w-14"
                        disabled={isLoading}
                    >
                        {SEGMENTS.map((seg) => <option key={seg} value={seg}>{seg}</option>)}
                    </select>
                </div>

                {/* Symbol (wider) */}
                <div className="flex flex-col relative flex-1 min-w-[90px] max-w-xs">
                    <label className="text-xs font-bold text-slate-600 leading-none">Sym</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="..."
                            value={selectedSymbol.symbol}
                            onChange={(e) => {
                                selectSymbol({ symbol: e.target.value });
                                setShowDropdown(e.target.value.length > 0);
                            }}
                            disabled={isLoading}
                            className="w-full px-1 py-0.5 border border-slate-300 rounded bg-white text-xs text-black focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        {showDropdown && selectedSymbol.symbol && filteredContracts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-300 rounded shadow-md z-20 max-h-24 overflow-y-auto">
                                {filteredContracts.slice(0, 5).map((contract) => (
                                    <div
                                        key={contract.id}
                                        onClick={() => {
                                            handleSymbolSelect(contract);
                                        }}
                                        className="px-1 py-0.5 hover:bg-blue-100 cursor-pointer text-xs text-black border-b border-slate-100"
                                    >
                                        {contract.symbol}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Expiry (F&O only) */}
                {['Options', 'Futures'].includes(selectedSymbol.segment) && (
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-600 leading-none">Exp</label>
                        <input
                            type="text"
                            placeholder="DD-M"
                            value={selectedSymbol.expiryDate || ''}
                            onChange={(e) => selectSymbol({ expiryDate: e.target.value })}
                            className="px-1 py-0.5 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-12"
                        />
                    </div>
                )}

                {/* Lot Size */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 leading-none">Lot</label>
                    <div className="px-1 py-0.5 border border-slate-300 rounded bg-slate-50 text-xs font-semibold w-10 text-center">
                        {lotSizeDisplay}
                    </div>
                </div>

                {/* Product */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 leading-none">Pd</label>
                    <select
                        value={selectedSymbol.productType}
                        onChange={(e) => handleProductChange(e.target.value)}
                        className="px-0.5 py-0.5 border border-slate-300 rounded bg-white text-xs text-black focus:outline-none focus:ring-1 focus:ring-blue-400 w-11"
                    >
                        {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                {/* SL */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 leading-none">SL</label>
                    <input
                        type="number"
                        placeholder="0"
                        value={selectedSymbol.slLevel || ''}
                        onChange={(e) => handleNumericChange('slLevel', e.target.value)}
                        step="0.01"
                        className="px-1 py-0.5 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-10"
                    />
                </div>

                {/* Target */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 leading-none">Tgt</label>
                    <input
                        type="number"
                        placeholder="0"
                        value={selectedSymbol.target || ''}
                        onChange={(e) => handleNumericChange('target', e.target.value)}
                        step="0.01"
                        className="px-1 py-0.5 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-10"
                    />
                </div>

                {/* Protection % */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 leading-none">Prt</label>
                    <input
                        type="number"
                        placeholder="0"
                        value={selectedSymbol.protectionPercent || ''}
                        onChange={(e) => handleNumericChange('protectionPercent', e.target.value)}
                        step="0.01"
                        className="px-1 py-0.5 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-10"
                    />
                </div>

                {/* Trial */}
                <div className="flex items-center">
                    <label className="flex items-center gap-0.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedSymbol.isTrial}
                            onChange={handleTrialToggle}
                            className="w-3 h-3 rounded accent-blue-600"
                        />
                        <span className="text-xs font-bold text-slate-600 leading-none">T</span>
                    </label>
                </div>

                {isLoading && <span className="text-xs text-blue-600">⏳</span>}
            </div>
        </div>
    );
}

export default SymbolControlPanel;
