/**
 * Recent Trades Component
 * 
 * Displays recent fills in the prediction market
 */

'use client';

import type { Fill } from '@/lib/prediction/types';

interface RecentTradesProps {
    fills: Fill[];
    maxDisplay?: number;
}

export function RecentTrades({ fills, maxDisplay = 20 }: RecentTradesProps) {
    const recentFills = fills.slice(-maxDisplay).reverse();

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Recent Trades
                </h2>
                <span className="text-xs text-zinc-500">
                    {fills.length} total
                </span>
            </div>

            {/* Trades List */}
            <div className="max-h-60 overflow-y-auto">
                {recentFills.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400">
                        No trades yet
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {recentFills.map((fill) => (
                            <div
                                key={fill.id}
                                className="px-4 py-2 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${fill.outcome === 'YES'
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            }`}
                                    >
                                        {fill.outcome}
                                    </span>
                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                        {(fill.price * 100).toFixed(1)}¢
                                    </span>
                                    <span className="text-sm text-zinc-500">
                                        × {fill.quantity.toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-zinc-400">
                                        {formatTime(fill.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
