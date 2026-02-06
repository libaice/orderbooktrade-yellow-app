/**
 * Performance metrics dashboard
 */

'use client';

import { useEffect, useState } from 'react';

export interface PerformanceMetrics {
    ordersPerSecond: number;
    avgFillLatency: number;
    websocketPing: number;
    stateUpdateFrequency: number;
    totalOrders: number;
    totalFills: number;
}

interface PerformanceMetricsProps {
    metrics: PerformanceMetrics;
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
    const [history, setHistory] = useState<number[]>([]);

    useEffect(() => {
        // Keep last 30 seconds of OPS data for sparkline
        setHistory(prev => [...prev.slice(-29), metrics.ordersPerSecond]);
    }, [metrics.ordersPerSecond]);

    const getLatencyColor = (latency: number) => {
        if (latency < 50) return 'text-green-600 dark:text-green-400';
        if (latency < 100) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Performance Metrics
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Orders Per Second */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        Orders/sec
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {metrics.ordersPerSecond.toFixed(0)}
                    </div>
                    {/* Simple sparkline */}
                    <div className="mt-2 flex items-end gap-0.5 h-8">
                        {history.map((value, idx) => (
                            <div
                                key={idx}
                                className="flex-1 bg-blue-500/30 rounded-t"
                                style={{ height: `${Math.min((value / 150) * 100, 100)}%` }}
                            />
                        ))}
                    </div>
                </div>

                {/* Fill Latency */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        Avg Fill Latency
                    </div>
                    <div className={`text-2xl font-bold ${getLatencyColor(metrics.avgFillLatency)}`}>
                        {metrics.avgFillLatency.toFixed(0)}
                        <span className="text-sm ml-1">ms</span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                        {metrics.avgFillLatency < 50 ? '⚡ Excellent' :
                            metrics.avgFillLatency < 100 ? '✓ Good' : '⚠️ Slow'}
                    </div>
                </div>

                {/* WebSocket Ping */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        WebSocket Ping
                    </div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {metrics.websocketPing.toFixed(0)}
                        <span className="text-sm ml-1">ms</span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                        {metrics.websocketPing < 100 ? '🟢 Connected' : '🟡 Slow'}
                    </div>
                </div>

                {/* State Update Frequency */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        State Updates/sec
                    </div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {metrics.stateUpdateFrequency.toFixed(1)}
                    </div>
                </div>

                {/* Total Orders */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        Total Orders
                    </div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {metrics.totalOrders.toLocaleString()}
                    </div>
                </div>

                {/* Total Fills */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                        Total Fills
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {metrics.totalFills.toLocaleString()}
                    </div>
                    <div className="mt-2 text-xs text-zinc-500">
                        {metrics.totalOrders > 0
                            ? `${((metrics.totalFills / metrics.totalOrders) * 100).toFixed(0)}% fill rate`
                            : '-'}
                    </div>
                </div>
            </div>

            {/* Performance Target Indicators */}
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Hackathon Targets</span>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className={metrics.ordersPerSecond >= 100 ? 'text-green-600' : 'text-zinc-400'}>
                                {metrics.ordersPerSecond >= 100 ? '✓' : '○'}
                            </span>
                            <span className="text-xs">100+ OPS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={metrics.avgFillLatency < 50 ? 'text-green-600' : 'text-zinc-400'}>
                                {metrics.avgFillLatency < 50 ? '✓' : '○'}
                            </span>
                            <span className="text-xs">&lt;50ms latency</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
