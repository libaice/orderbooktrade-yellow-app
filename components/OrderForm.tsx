/**
 * Order form component - place buy/sell orders with EIP-712 signature
 */

'use client';

import { useState } from 'react';
import type { OrderIntent } from '@/lib/protocol/types';

interface OrderFormProps {
    marketId: string;
    onSubmitOrder: (order: Omit<OrderIntent, 'signature' | 'userAddress'>) => Promise<void>;
    channelBalance: { base: string; quote: string };
}

export function OrderForm({ marketId, onSubmitOrder, channelBalance }: OrderFormProps) {
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [quantity, setQuantity] = useState('');
    const [limitPrice, setLimitPrice] = useState('');
    const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!quantity || (orderType === 'limit' && !limitPrice)) {
            alert('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const order: Omit<OrderIntent, 'signature' | 'userAddress'> = {
                marketId,
                side,
                quantity,
                limitPrice: orderType === 'market' ? '0' : limitPrice,
                nonce: 0, // Will be set by channel manager
                expiresAt: Date.now() + 60000, // 1 minute expiry
            };

            await onSubmitOrder(order);

            // Reset form
            setQuantity('');
            setLimitPrice('');
        } catch (error) {
            console.error('Failed to submit order:', error);
            alert('Failed to submit order: ' + (error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getMaxQuantity = () => {
        if (side === 'buy') {
            // Max buy = quote balance / price
            const price = parseFloat(limitPrice) || 1;
            return (parseFloat(channelBalance.quote) / price).toFixed(4);
        } else {
            // Max sell = base balance
            return parseFloat(channelBalance.base).toFixed(4);
        }
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Place Order
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Side Selector */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setSide('buy')}
                        className={`flex-1 py-2 rounded font-medium transition-colors ${side === 'buy'
                                ? 'bg-green-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                    >
                        Buy
                    </button>
                    <button
                        type="button"
                        onClick={() => setSide('sell')}
                        className={`flex-1 py-2 rounded font-medium transition-colors ${side === 'sell'
                                ? 'bg-red-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                    >
                        Sell
                    </button>
                </div>

                {/* Order Type */}
                <div className="flex gap-2 text-sm">
                    <button
                        type="button"
                        onClick={() => setOrderType('limit')}
                        className={`px-3 py-1 rounded ${orderType === 'limit'
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                    >
                        Limit
                    </button>
                    <button
                        type="button"
                        onClick={() => setOrderType('market')}
                        className={`px-3 py-1 rounded ${orderType === 'market'
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                    >
                        Market
                    </button>
                </div>

                {/* Price Input (for limit orders) */}
                {orderType === 'limit' && (
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Price (USDC)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}

                {/* Quantity Input */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Quantity (ETH)
                        </label>
                        <button
                            type="button"
                            onClick={() => setQuantity(getMaxQuantity())}
                            className="text-xs text-blue-500 hover:text-blue-600"
                        >
                            Max: {getMaxQuantity()}
                        </button>
                    </div>
                    <input
                        type="number"
                        step="0.0001"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0.0000"
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Order Summary */}
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Total</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-50">
                            {orderType === 'market'
                                ? '~'
                                : (parseFloat(quantity || '0') * parseFloat(limitPrice || '0')).toFixed(2)
                            } USDC
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600 dark:text-zinc-400">Fee</span>
                        <span className="font-mono text-zinc-900 dark:text-zinc-50">
                            ~0.1%
                        </span>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting || !quantity}
                    className={`w-full py-3 rounded font-semibold transition-colors ${side === 'buy'
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isSubmitting ? 'Signing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${marketId.split('-')[0]}`}
                </button>
            </form>
        </div>
    );
}
