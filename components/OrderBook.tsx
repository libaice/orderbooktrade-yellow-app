/**
 * Order book component - displays real-time bids and asks
 */

'use client';

import { useEffect, useState } from 'react';

export interface OrderBookLevel {
    price: string;
    quantity: string;
    total: string;
}

export interface OrderBookData {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    lastPrice?: string;
}

interface OrderBookProps {
    marketId: string;
    data: OrderBookData;
}

export function OrderBook({ marketId, data }: OrderBookProps) {
    const [maxTotal, setMaxTotal] = useState(0);

    useEffect(() => {
        // Calculate max total for depth visualization
        const allTotals = [
            ...data.bids.map(b => parseFloat(b.total)),
            ...data.asks.map(a => parseFloat(a.total)),
        ];
        setMaxTotal(Math.max(...allTotals, 1));
    }, [data]);

    const getDepthPercentage = (total: string) => {
        return (parseFloat(total) / maxTotal) * 100;
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Order Book - {marketId}
                </h2>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-3 gap-2 px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <div className="text-left">Price (USDC)</div>
                <div className="text-right">Quantity (ETH)</div>
                <div className="text-right">Total</div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                {/* Asks (Sell Orders) - Reversed to show lowest first */}
                <div className="border-b-2 border-red-500/20">
                    {data.asks.slice(0, 10).reverse().map((ask, idx) => (
                        <div
                            key={`ask-${idx}`}
                            className="relative grid grid-cols-3 gap-2 px-4 py-1 text-sm hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                            {/* Depth bar */}
                            <div
                                className="absolute right-0 top-0 h-full bg-red-500/10"
                                style={{ width: `${getDepthPercentage(ask.total)}%` }}
                            />

                            <div className="relative text-red-600 dark:text-red-400 font-mono">
                                {parseFloat(ask.price).toFixed(2)}
                            </div>
                            <div className="relative text-right font-mono text-zinc-700 dark:text-zinc-300">
                                {parseFloat(ask.quantity).toFixed(4)}
                            </div>
                            <div className="relative text-right font-mono text-zinc-600 dark:text-zinc-400">
                                {parseFloat(ask.total).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Last Price */}
                {data.lastPrice && (
                    <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                        <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-50">
                            ${parseFloat(data.lastPrice).toFixed(2)}
                        </span>
                        <span className="ml-2 text-xs text-zinc-500">Last Price</span>
                    </div>
                )}

                {/* Bids (Buy Orders) */}
                <div className="border-t-2 border-green-500/20">
                    {data.bids.slice(0, 10).map((bid, idx) => (
                        <div
                            key={`bid-${idx}`}
                            className="relative grid grid-cols-3 gap-2 px-4 py-1 text-sm hover:bg-green-50 dark:hover:bg-green-950/20"
                        >
                            {/* Depth bar */}
                            <div
                                className="absolute right-0 top-0 h-full bg-green-500/10"
                                style={{ width: `${getDepthPercentage(bid.total)}%` }}
                            />

                            <div className="relative text-green-600 dark:text-green-400 font-mono">
                                {parseFloat(bid.price).toFixed(2)}
                            </div>
                            <div className="relative text-right font-mono text-zinc-700 dark:text-zinc-300">
                                {parseFloat(bid.quantity).toFixed(4)}
                            </div>
                            <div className="relative text-right font-mono text-zinc-600 dark:text-zinc-400">
                                {parseFloat(bid.total).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Market Stats */}
            <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <span className="text-zinc-500">Spread</span>
                        <span className="ml-2 font-mono text-zinc-900 dark:text-zinc-50">
                            {data.asks[0] && data.bids[0]
                                ? (parseFloat(data.asks[0].price) - parseFloat(data.bids[0].price)).toFixed(2)
                                : '-'}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-zinc-500">Depth</span>
                        <span className="ml-2 font-mono text-zinc-900 dark:text-zinc-50">
                            {(data.bids.reduce((sum, b) => sum + parseFloat(b.total), 0) +
                                data.asks.reduce((sum, a) => sum + parseFloat(a.total), 0)).toFixed(0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
