/**
 * Prediction Market Order Form
 * 
 * Order placement with YES/NO outcome selection and binary constraint display
 */

'use client';

import { useState, useMemo } from 'react';
import type { Outcome, OrderSide, OrderType, OrderRequest, UserBalance } from '@/lib/prediction/types';

interface PredictionOrderFormProps {
    balance: UserBalance | null;
    lastYesPrice: number | null;
    onSubmitOrder: (request: OrderRequest) => Promise<void>;
    userId: string;
}

export function PredictionOrderForm({
    balance,
    lastYesPrice,
    onSubmitOrder,
    userId,
}: PredictionOrderFormProps) {
    const [outcome, setOutcome] = useState<Outcome>('YES');
    const [side, setSide] = useState<OrderSide>('BUY');
    const [orderType, setOrderType] = useState<OrderType>('LIMIT');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Implied NO price
    const impliedNoPrice = useMemo(() => {
        if (!price || isNaN(parseFloat(price))) return null;
        const yesPrice = parseFloat(price) / 100; // Convert from cents
        return ((1 - yesPrice) * 100).toFixed(1);
    }, [price]);

    // Max quantity user can buy/sell
    const maxQuantity = useMemo(() => {
        if (!balance) return 0;

        if (side === 'BUY') {
            const priceNum = parseFloat(price) / 100 || 1;
            return Math.floor(balance.usdc / priceNum * 100) / 100;
        } else {
            return outcome === 'YES' ? balance.yes : balance.no;
        }
    }, [balance, side, price, outcome]);

    // Total cost/proceeds
    const totalValue = useMemo(() => {
        if (!price || !quantity) return null;
        const priceNum = parseFloat(price) / 100;
        const qtyNum = parseFloat(quantity);
        if (isNaN(priceNum) || isNaN(qtyNum)) return null;
        return (priceNum * qtyNum).toFixed(2);
    }, [price, quantity]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const priceNum = orderType === 'LIMIT' ? parseFloat(price) / 100 : undefined;
        const qtyNum = parseFloat(quantity);

        if (orderType === 'LIMIT' && (!priceNum || priceNum <= 0 || priceNum >= 1)) {
            setError('Price must be between 1¢ and 99¢');
            return;
        }

        if (!qtyNum || qtyNum <= 0) {
            setError('Quantity must be positive');
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmitOrder({
                userId,
                outcome,
                side,
                type: orderType,
                price: priceNum,
                quantity: qtyNum,
            });

            // Reset form
            setQuantity('');
            if (orderType === 'LIMIT') {
                setPrice('');
            }
        } catch (err: any) {
            setError(err.message || 'Order failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const setMaxQuantity = () => {
        setQuantity(maxQuantity.toString());
    };

    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    Place Order
                </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Outcome Selection */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Outcome
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setOutcome('YES')}
                            className={`py-3 rounded-lg font-semibold transition-colors ${outcome === 'YES'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                                }`}
                        >
                            ✓ YES
                        </button>
                        <button
                            type="button"
                            onClick={() => setOutcome('NO')}
                            className={`py-3 rounded-lg font-semibold transition-colors ${outcome === 'NO'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                                }`}
                        >
                            ✗ NO
                        </button>
                    </div>
                </div>

                {/* Buy/Sell Toggle */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Action
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setSide('BUY')}
                            className={`py-2 rounded-lg font-medium transition-colors ${side === 'BUY'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                        >
                            Buy {outcome}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSide('SELL')}
                            className={`py-2 rounded-lg font-medium transition-colors ${side === 'SELL'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                        >
                            Sell {outcome}
                        </button>
                    </div>
                </div>

                {/* Order Type */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Order Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setOrderType('LIMIT')}
                            className={`py-2 rounded-lg text-sm font-medium transition-colors ${orderType === 'LIMIT'
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                        >
                            Limit
                        </button>
                        <button
                            type="button"
                            onClick={() => setOrderType('MARKET')}
                            className={`py-2 rounded-lg text-sm font-medium transition-colors ${orderType === 'MARKET'
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                        >
                            Market
                        </button>
                    </div>
                </div>

                {/* Price (for limit orders) */}
                {orderType === 'LIMIT' && (
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Price (1¢ - 99¢)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder={lastYesPrice ? `${(lastYesPrice * 100).toFixed(0)}` : '50'}
                                min="1"
                                max="99"
                                step="0.1"
                                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                                ¢
                            </span>
                        </div>
                        {impliedNoPrice && (
                            <div className="mt-1 text-xs text-zinc-500">
                                Implied NO price: {impliedNoPrice}¢ (YES + NO = 100¢)
                            </div>
                        )}
                    </div>
                )}

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Quantity (shares)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="10"
                            min="0.01"
                            step="0.01"
                            className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={setMaxQuantity}
                            className="px-4 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors text-sm font-medium"
                        >
                            Max
                        </button>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                        Available: {maxQuantity.toFixed(2)} shares
                    </div>
                </div>

                {/* Order Summary */}
                {totalValue && (
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">
                                {side === 'BUY' ? 'Total Cost' : 'Total Proceeds'}
                            </span>
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                ${totalValue} USDC
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-zinc-500">Potential Payout</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                                ${parseFloat(quantity || '0').toFixed(2)} USDC
                            </span>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting || !quantity}
                    className={`w-full py-4 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${side === 'BUY'
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-red-500 hover:bg-red-600'
                        }`}
                >
                    {isSubmitting ? 'Placing Order...' : `${side} ${outcome} @ ${price || 'Market'}¢`}
                </button>

                {/* Balance Display */}
                {balance && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <div className="text-xs text-zinc-500 space-y-1">
                            <div className="flex justify-between">
                                <span>USDC Balance:</span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    ${balance.usdc.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>YES Shares:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                    {balance.yes.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>NO Shares:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                    {balance.no.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
