/**
 * Market Lifecycle Component
 * 
 * Shows market status and admin controls for lifecycle management
 */

'use client';

import { type MarketStatus, type Outcome } from '@/lib/prediction/types';

interface MarketLifecycleProps {
    status: MarketStatus;
    resolutionOutcome?: Outcome;
    resolutionTimestamp?: number;
    onLockMarket: () => void;
    onResolveMarket: (outcome: Outcome) => void;
    onSettleMarket: () => void;
    settlementAmount?: number;
    isAdmin?: boolean;
}

export function MarketLifecycle({
    status,
    resolutionOutcome,
    resolutionTimestamp,
    onLockMarket,
    onResolveMarket,
    onSettleMarket,
    settlementAmount,
    isAdmin = true, // For demo, everyone is admin
}: MarketLifecycleProps) {
    const getStatusBadge = () => {
        const badges = {
            ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
            LOCKED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
            PENDING_RESOLUTION: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
            SETTLED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        };
        return badges[status];
    };

    const getStatusIcon = () => {
        const icons = {
            ACTIVE: '🟢',
            LOCKED: '🔒',
            PENDING_RESOLUTION: '⏳',
            SETTLED: '✅',
        };
        return icons[status];
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Market Lifecycle
                </h2>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge()}`}>
                    {getStatusIcon()} {status}
                </span>
            </div>

            {/* Resolution Info */}
            {resolutionOutcome && (
                <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        Resolved Outcome:
                    </div>
                    <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        {resolutionOutcome === 'YES' ? '✅ YES' : '❌ NO'}
                    </div>
                    {resolutionTimestamp && (
                        <div className="text-xs text-zinc-500 mt-1">
                            {new Date(resolutionTimestamp).toLocaleString()}
                        </div>
                    )}
                </div>
            )}

            {/* Settlement Amount */}
            {status === 'SETTLED' && settlementAmount !== undefined && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="text-sm text-green-600 dark:text-green-400">
                        Your Settlement:
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {settlementAmount.toFixed(2)} USDC
                    </div>
                </div>
            )}

            {/* Admin Controls */}
            {isAdmin && (
                <div className="space-y-3">
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                        Admin Controls
                    </div>

                    {/* Lock Market */}
                    {status === 'ACTIVE' && (
                        <button
                            onClick={onLockMarket}
                            className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                        >
                            🔒 Lock Market
                        </button>
                    )}

                    {/* Resolve Market */}
                    {status === 'LOCKED' && (
                        <div className="space-y-2">
                            <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                                Choose Winning Outcome:
                            </div>
                            <button
                                onClick={() => onResolveMarket('YES')}
                                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                            >
                                ✅ Resolve: YES
                            </button>
                            <button
                                onClick={() => onResolveMarket('NO')}
                                className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                            >
                                ❌ Resolve: NO
                            </button>
                        </div>
                    )}

                    {/* Settle Market */}
                    {status === 'PENDING_RESOLUTION' && (
                        <button
                            onClick={onSettleMarket}
                            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                        >
                            ✅ Finalize Settlement
                        </button>
                    )}

                    {/* Settled State */}
                    {status === 'SETTLED' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                                Market is settled. Users can claim winnings.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Lifecycle Flow Diagram */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500 mb-2">Lifecycle Flow:</div>
                <div className="flex items-center gap-2 text-xs">
                    <span className={status === 'ACTIVE' ? 'font-bold text-green-600' : 'text-zinc-400'}>
                        ACTIVE
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className={status === 'LOCKED' ? 'font-bold text-yellow-600' : 'text-zinc-400'}>
                        LOCKED
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className={status === 'PENDING_RESOLUTION' ? 'font-bold text-orange-600' : 'text-zinc-400'}>
                        PENDING
                    </span>
                    <span className="text-zinc-400">→</span>
                    <span className={status === 'SETTLED' ? 'font-bold text-blue-600' : 'text-zinc-400'}>
                        SETTLED
                    </span>
                </div>
            </div>
        </div>
    );
}
