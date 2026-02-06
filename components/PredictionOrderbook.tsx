/**
 * Prediction Market Orderbook Component
 * 
 * Displays YES/NO orderbook with binary constraint visualization
 */

'use client';

import { useMemo } from 'react';
import type { OrderbookDisplay, PriceLevel } from '@/lib/prediction/types';

interface PredictionOrderbookProps {
    display: OrderbookDisplay;
    lastYesPrice: number | null;
    onPriceClick?: (price: number, side: 'BUY' | 'SELL') => void;
}

export function PredictionOrderbook({
    display,
    lastYesPrice,
    onPriceClick,
}: PredictionOrderbookProps) {
    const maxQuantity = useMemo(() => {
        const allLevels = [...display.yesBids, ...display.yesAsks];
        return Math.max(...allLevels.map(l => l.quantity), 1);
    }, [display]);

    const formatPrice = (price: number) => (price * 100).toFixed(1) + '¢';
    const formatQuantity = (qty: number) => qty.toFixed(2);

    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        Order Book
                    </h2>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            YES
                        </span>
                        <span className="text-zinc-400">+</span>
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                            NO
                        </span>
                        <span className="text-zinc-400">=</span>
                        <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded">
                            $1.00
                        </span>
                    </div>
                </div>
            </div>

            {/* Asks (Sells) */}
            <div className="border-b border-zinc-200 dark:border-zinc-800">
                <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="grid grid-cols-3 text-xs text-zinc-500">
                        <span>Price (YES)</span>
                        <span className="text-right">Quantity</span>
                        <span className="text-right">Total</span>
                    </div>
                </div>
                <div className="max-h-40 overflow-y-auto">
                    {display.yesAsks.length === 0 ? (
                        <div className="py-4 text-center text-zinc-400 text-sm">
                            No asks
                        </div>
                    ) : (
                        [...display.yesAsks].reverse().map((level, idx) => (
                            <PriceLevelRow
                                key={`ask-${level.price}`}
                                level={level}
                                maxQuantity={maxQuantity}
                                isAsk={true}
                                onClick={() => onPriceClick?.(level.price, 'BUY')}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Spread / Last Price */}
            <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-between">
                <div>
                    <span className="text-xs text-zinc-500">Spread: </span>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {display.spread !== null ? formatPrice(display.spread) : '-'}
                    </span>
                </div>
                <div className="text-center">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {lastYesPrice !== null ? formatPrice(lastYesPrice) : '-'}
                    </span>
                    <div className="text-xs text-zinc-500">Last YES Price</div>
                </div>
                <div>
                    <span className="text-xs text-zinc-500">Implied NO: </span>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {lastYesPrice !== null ? formatPrice(1 - lastYesPrice) : '-'}
                    </span>
                </div>
            </div>

            {/* Bids (Buys) */}
            <div>
                <div className="max-h-40 overflow-y-auto">
                    {display.yesBids.length === 0 ? (
                        <div className="py-4 text-center text-zinc-400 text-sm">
                            No bids
                        </div>
                    ) : (
                        display.yesBids.map((level, idx) => (
                            <PriceLevelRow
                                key={`bid-${level.price}`}
                                level={level}
                                maxQuantity={maxQuantity}
                                isAsk={false}
                                onClick={() => onPriceClick?.(level.price, 'SELL')}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Market Stats */}
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex justify-between text-xs text-zinc-500">
                    <span>Best Bid: {display.bestYesBid ? formatPrice(display.bestYesBid) : '-'}</span>
                    <span>Mid: {display.midPrice ? formatPrice(display.midPrice) : '-'}</span>
                    <span>Best Ask: {display.bestYesAsk ? formatPrice(display.bestYesAsk) : '-'}</span>
                </div>
            </div>
        </div>
    );
}

function PriceLevelRow({
    level,
    maxQuantity,
    isAsk,
    onClick,
}: {
    level: PriceLevel;
    maxQuantity: number;
    isAsk: boolean;
    onClick?: () => void;
}) {
    const depthPercent = (level.quantity / maxQuantity) * 100;
    const bgColor = isAsk ? 'bg-red-500/10' : 'bg-green-500/10';
    const textColor = isAsk ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';

    return (
        <div
            className="relative px-4 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            onClick={onClick}
        >
            {/* Depth visualization */}
            <div
                className={`absolute inset-y-0 ${isAsk ? 'right-0' : 'left-0'} ${bgColor}`}
                style={{ width: `${depthPercent}%` }}
            />

            <div className="relative grid grid-cols-3 text-sm">
                <span className={textColor}>
                    {(level.price * 100).toFixed(1)}¢
                </span>
                <span className="text-right text-zinc-700 dark:text-zinc-300">
                    {level.quantity.toFixed(2)}
                </span>
                <span className="text-right text-zinc-500">
                    ${(level.price * level.quantity).toFixed(2)}
                </span>
            </div>
        </div>
    );
}
