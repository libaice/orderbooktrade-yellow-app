/**
 * Balance panel component - displays three-tier balance system
 */

'use client';

import { useEffect, useState } from 'react';
import type { BalanceState } from '@/lib/protocol/types';

interface BalancePanelProps {
    balances: BalanceState;
    onRefresh?: () => void;
}

export function BalancePanel({ balances, onRefresh }: BalancePanelProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (onRefresh) {
            setIsRefreshing(true);
            await onRefresh();
            setIsRefreshing(false);
        }
    };

    const formatBalance = (value: string) => {
        const num = parseFloat(value);
        return num.toFixed(4);
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Balances
                </h2>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-3 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Wallet Balance */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Wallet Balance (On-Chain)
                    </span>
                    <span className="text-xs text-zinc-500">🔗</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">ETH</span>
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                            {formatBalance(balances.wallet.eth)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">USDC</span>
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                            {formatBalance(balances.wallet.usdc)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Unified Balance */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Unified Balance (Yellow Network)
                    </span>
                    <span className="text-xs text-zinc-500">🌐</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">ETH</span>
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                            {formatBalance(balances.unified.eth)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">USDC</span>
                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                            {formatBalance(balances.unified.usdc)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Channel Balance */}
            <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Channel Balance (State Channel)
                    </span>
                    <span className="text-xs text-zinc-500">⚡</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">ETH</span>
                        <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {formatBalance(balances.channel.eth)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">USDC</span>
                        <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {formatBalance(balances.channel.usdc)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Total */}
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Total Assets</span>
                    <div className="space-x-3">
                        <span>
                            ETH: {formatBalance(
                                (parseFloat(balances.wallet.eth) +
                                    parseFloat(balances.unified.eth) +
                                    parseFloat(balances.channel.eth)).toString()
                            )}
                        </span>
                        <span>
                            USDC: {formatBalance(
                                (parseFloat(balances.wallet.usdc) +
                                    parseFloat(balances.unified.usdc) +
                                    parseFloat(balances.channel.usdc)).toString()
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
