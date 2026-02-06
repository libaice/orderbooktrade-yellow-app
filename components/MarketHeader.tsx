/**
 * Market Question Header
 * 
 * Displays the prediction market question with probability bar
 */

'use client';

interface MarketHeaderProps {
    question: string;
    lastYesPrice: number | null;
    totalVolume?: number;
}

export function MarketHeader({
    question,
    lastYesPrice,
    totalVolume = 0,
}: MarketHeaderProps) {
    const yesPercent = lastYesPrice !== null ? lastYesPrice * 100 : 50;
    const noPercent = 100 - yesPercent;

    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Question */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {question}
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Binary Prediction Market • Total Volume: ${totalVolume.toFixed(2)}
                </p>
            </div>

            {/* Probability Bar */}
            <div className="p-4">
                {/* Labels */}
                <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">YES</span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {yesPercent.toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {noPercent.toFixed(1)}%
                        </span>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">NO</span>
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-8 bg-red-500 rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-green-500 transition-all duration-500 ease-out flex items-center justify-end pr-2"
                        style={{ width: `${yesPercent}%` }}
                    >
                        {yesPercent >= 15 && (
                            <span className="text-xs font-medium text-white">
                                {yesPercent.toFixed(0)}%
                            </span>
                        )}
                    </div>
                    <div
                        className="h-full flex items-center justify-start pl-2"
                        style={{ width: `${noPercent}%` }}
                    >
                        {noPercent >= 15 && (
                            <span className="text-xs font-medium text-white">
                                {noPercent.toFixed(0)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Binary Constraint Note */}
                <div className="mt-3 text-center text-xs text-zinc-400">
                    Binary constraint: YES price + NO price = $1.00 USDC
                </div>
            </div>
        </div>
    );
}
