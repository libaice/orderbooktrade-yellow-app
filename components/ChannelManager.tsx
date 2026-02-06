/**
 * Channel manager component - open/close channels and force exit
 */

'use client';

import { useState } from 'react';
import type { ChannelState } from '@/lib/protocol/types';

interface ChannelManagerProps {
    channel: ChannelState | null;
    onOpenChannel: (amount: { base: string; quote: string }) => Promise<void>;
    onCooperativeClose: () => Promise<void>;
    onForceExit: () => Promise<void>;
    onExportProof: () => void;
}

export function ChannelManager({
    channel,
    onOpenChannel,
    onCooperativeClose,
    onForceExit,
    onExportProof,
}: ChannelManagerProps) {
    const [isOpening, setIsOpening] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [baseAmount, setBaseAmount] = useState('');
    const [quoteAmount, setQuoteAmount] = useState('');

    const handleOpenChannel = async () => {
        if (!baseAmount || !quoteAmount) {
            alert('Please enter amounts for both assets');
            return;
        }

        setIsOpening(true);
        try {
            await onOpenChannel({
                base: baseAmount,
                quote: quoteAmount,
            });
            setBaseAmount('');
            setQuoteAmount('');
        } catch (error) {
            alert('Failed to open channel: ' + (error as Error).message);
        } finally {
            setIsOpening(false);
        }
    };

    const handleCooperativeClose = async () => {
        if (!confirm('Close channel and withdraw funds to unified balance?')) {
            return;
        }

        setIsClosing(true);
        try {
            await onCooperativeClose();
        } catch (error) {
            alert('Failed to close channel: ' + (error as Error).message);
        } finally {
            setIsClosing(false);
        }
    };

    const handleForceExit = async () => {
        if (!confirm('Initiate force exit? This should only be used if the operator is unresponsive.')) {
            return;
        }

        try {
            await onForceExit();
            alert('Force exit initiated. Proof exported to downloads.');
        } catch (error) {
            alert('Failed to initiate force exit: ' + (error as Error).message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'text-green-600 dark:text-green-400';
            case 'opening':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'closing':
                return 'text-orange-600 dark:text-orange-400';
            case 'disputed':
                return 'text-red-600 dark:text-red-400';
            case 'closed':
                return 'text-zinc-500';
            default:
                return 'text-zinc-600 dark:text-zinc-400';
        }
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                State Channel
            </h2>

            {!channel || channel.status === 'closed' ? (
                /* Open Channel Form */
                <div className="space-y-4">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Open a state channel to start trading with instant settlement
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            ETH Amount
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={baseAmount}
                            onChange={(e) => setBaseAmount(e.target.value)}
                            placeholder="0.1"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            USDC Amount
                        </label>
                        <input
                            type="number"
                            step="1"
                            value={quoteAmount}
                            onChange={(e) => setQuoteAmount(e.target.value)}
                            placeholder="100"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        onClick={handleOpenChannel}
                        disabled={isOpening}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded transition-colors disabled:opacity-50"
                    >
                        {isOpening ? 'Opening...' : 'Open Channel'}
                    </button>
                </div>
            ) : (
                /* Channel Status */
                <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
                        <span className={`text-sm font-semibold uppercase ${getStatusColor(channel.status)}`}>
                            {channel.status}
                        </span>
                    </div>

                    {/* Channel ID */}
                    <div>
                        <span className="text-xs text-zinc-500">Channel ID</span>
                        <div className="mt-1 px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded font-mono text-xs break-all">
                            {channel.id}
                        </div>
                    </div>

                    {/* Sequence */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">Sequence</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-50">
                            #{channel.sequence}
                        </span>
                    </div>

                    {/* Balances */}
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-3">
                        <div className="text-xs text-zinc-500 mb-2">Channel Balances</div>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">ETH</span>
                                <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                                    {parseFloat(channel.balances.base).toFixed(4)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">USDC</span>
                                <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                                    {parseFloat(channel.balances.quote).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    {channel.status === 'active' && (
                        <div className="space-y-2">
                            <button
                                onClick={handleCooperativeClose}
                                disabled={isClosing}
                                className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium rounded transition-colors disabled:opacity-50"
                            >
                                {isClosing ? 'Closing...' : 'Cooperative Close'}
                            </button>

                            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2">
                                <p className="text-xs text-zinc-500 mb-2">Emergency Actions</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleForceExit}
                                        className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
                                    >
                                        Force Exit
                                    </button>
                                    <button
                                        onClick={onExportProof}
                                        className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 text-sm font-medium rounded transition-colors"
                                    >
                                        Export Proof
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {channel.status === 'disputed' && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                ⚠️ Force exit in progress. Submit proof to chain to recover funds.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
