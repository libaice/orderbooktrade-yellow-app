/**
 * Prediction Market Trading Page
 * 
 * Main trading interface for binary prediction market
 * with browser-based matching and Yellow Network state channel
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { MarketHeader } from '@/components/MarketHeader';
import { PredictionOrderbook } from '@/components/PredictionOrderbook';
import { PredictionOrderForm } from '@/components/PredictionOrderForm';
import { RecentTrades } from '@/components/RecentTrades';
import {
    matcher,
    stateManager,
    createClearNodeClient,
    type PredictionMarketState,
    type OrderRequest,
    type UserBalance,
    type OrderbookDisplay,
} from '@/lib/prediction';

export default function PredictionMarketPage() {
    // Wallet state
    const [address, setAddress] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [network, setNetwork] = useState<string | null>(null);

    // Market state
    const [state, setState] = useState<PredictionMarketState | null>(null);
    const [orderbookDisplay, setOrderbookDisplay] = useState<OrderbookDisplay | null>(null);
    const [balance, setBalance] = useState<UserBalance | null>(null);

    // Connection state
    const [clearNodeStatus, setClearNodeStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    // Performance metrics
    const [metrics, setMetrics] = useState({
        ordersProcessed: 0,
        avgLatency: 0,
        lastUpdateTime: 0,
    });

    // Initialize market state
    useEffect(() => {
        const currentState = stateManager.getState();
        setState(currentState);
        setOrderbookDisplay(matcher.getOrderbookDisplay(currentState));

        // Subscribe to state changes
        const unsubscribe = stateManager.subscribe((newState) => {
            setState(newState);
            setOrderbookDisplay(matcher.getOrderbookDisplay(newState));
            setBalance(stateManager.getUserBalance());
            setMetrics(prev => ({
                ...prev,
                ordersProcessed: newState.fills.length,
                lastUpdateTime: newState.timestamp,
            }));
        });

        return () => unsubscribe();
    }, []);

    // Connect wallet
    const connectWallet = async () => {
        if (typeof window === 'undefined' || !window.ethereum) {
            alert('Please install MetaMask');
            return;
        }

        setIsConnecting(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send('eth_requestAccounts', []);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();

            // Get network info
            const networkInfo = await provider.getNetwork();
            setNetwork(networkInfo.name);

            setAddress(walletAddress);

            // Initialize state manager with signer
            await stateManager.initialize(signer);

            // Deposit initial USDC (demo: 1000 USDC)
            stateManager.depositUSDC(1000);
            setBalance(stateManager.getUserBalance());

            // Try to connect to ClearNode (may fail in demo mode)
            try {
                setClearNodeStatus('connecting');
                const clearNode = createClearNodeClient('wss://clearnet.yellow.com/ws');

                clearNode.onConnect(() => {
                    console.log('Connected to ClearNode');
                    setClearNodeStatus('connected');
                });

                clearNode.onError((error) => {
                    console.warn('ClearNode connection failed (demo mode):', error);
                    setClearNodeStatus('disconnected');
                });

                // Don't await - continue in demo mode if ClearNode unavailable
                clearNode.connect().catch(() => {
                    console.log('Running in demo mode (no ClearNode)');
                    setClearNodeStatus('disconnected');
                });
            } catch (e) {
                console.log('ClearNode unavailable, running in demo mode');
                setClearNodeStatus('disconnected');
            }

        } catch (error) {
            console.error('Failed to connect wallet:', error);
            alert('Failed to connect wallet');
        } finally {
            setIsConnecting(false);
        }
    };

    // Disconnect wallet
    const disconnectWallet = () => {
        setAddress(null);
        setNetwork(null);
        setBalance(null);
        setClearNodeStatus('disconnected');
        stateManager.reset('prediction-market-1', 'Will ETH reach $5000 by end of 2025?');
    };

    // Submit order
    const handleSubmitOrder = useCallback(async (request: OrderRequest) => {
        const startTime = performance.now();

        // Get current state
        const currentState = stateManager.getState();

        // Run local matcher
        const result = matcher.processOrder(currentState, request);

        if (!result.success) {
            throw new Error(result.error);
        }

        // Update local state
        stateManager.updateState(result.newState);

        // Calculate latency
        const latency = performance.now() - startTime;
        setMetrics(prev => ({
            ...prev,
            avgLatency: prev.avgLatency === 0
                ? latency
                : (prev.avgLatency * 0.9 + latency * 0.1), // Exponential moving average
        }));

        console.log(`Order processed in ${latency.toFixed(2)}ms`);

        // If connected to ClearNode, push state update
        // (In demo mode, we skip this and just process locally)
        if (clearNodeStatus === 'connected') {
            try {
                const { state: signedState, signature } = await stateManager.signState();
                // Push to ClearNode would happen here
                console.log('Would push to ClearNode:', signedState.sequence);
            } catch (e) {
                console.warn('Failed to sync with ClearNode:', e);
            }
        }
    }, [clearNodeStatus]);

    // Price click handler
    const handlePriceClick = (price: number, side: 'BUY' | 'SELL') => {
        // Could pre-fill the order form with this price
        console.log(`Clicked ${side} at ${(price * 100).toFixed(1)}¢`);
    };

    // Export force exit proof
    const handleExportProof = () => {
        const proof = stateManager.exportProof();
        const blob = new Blob([proof], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `force-exit-proof-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Seed demo orders (for testing)
    const seedDemoOrders = async () => {
        if (!address) return;

        // Create some random demo orders
        const demoOrders: OrderRequest[] = [];

        // YES bids from 0.30 to 0.45
        for (let i = 0; i < 5; i++) {
            demoOrders.push({
                userId: `demo-user-${i}`,
                outcome: 'YES',
                side: 'BUY',
                type: 'LIMIT',
                price: 0.30 + i * 0.03,
                quantity: 10 + Math.random() * 20,
            });
        }

        // YES asks from 0.55 to 0.70
        for (let i = 0; i < 5; i++) {
            demoOrders.push({
                userId: `demo-user-${i + 5}`,
                outcome: 'YES',
                side: 'SELL',
                type: 'LIMIT',
                price: 0.55 + i * 0.03,
                quantity: 10 + Math.random() * 20,
            });
        }

        // Initialize demo users with balance
        let currentState = stateManager.getState();
        for (let i = 0; i < 10; i++) {
            currentState = {
                ...currentState,
                balances: {
                    ...currentState.balances,
                    [`demo-user-${i}`]: { usdc: 1000, yes: 100, no: 100 },
                },
            };
        }
        stateManager.updateState(currentState);

        // Process each order
        for (const order of demoOrders) {
            const result = matcher.processOrder(stateManager.getState(), order);
            if (result.success) {
                stateManager.updateState(result.newState);
            }
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            {/* Header */}
            <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                                ⚡ Prediction Market
                            </h1>
                            <span className={`px-2 py-1 text-xs rounded ${clearNodeStatus === 'connected'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : clearNodeStatus === 'connecting'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                }`}>
                                {clearNodeStatus === 'connected' ? '🟢 ClearNode' :
                                    clearNodeStatus === 'connecting' ? '🟡 Connecting...' :
                                        '⚪ Demo Mode'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {!address ? (
                                <button
                                    onClick={connectWallet}
                                    disabled={isConnecting}
                                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                </button>
                            ) : (
                                <>
                                    {/* Network Badge */}
                                    {network && (
                                        <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                                            <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                                🟢 {network}
                                            </span>
                                        </div>
                                    )}

                                    {/* Address */}
                                    <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                                            {address.slice(0, 6)}...{address.slice(-4)}
                                        </span>
                                    </div>

                                    {/* Disconnect */}
                                    <button
                                        onClick={disconnectWallet}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Disconnect
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {!address ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🎲</div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                            State Channel Prediction Market
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                            Trade binary outcomes at 100+ orders/sec with 0 gas fees.
                            Browser-based matching with Yellow Network state channels.
                        </p>
                        <button
                            onClick={connectWallet}
                            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                        >
                            Connect Wallet to Start Trading
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Market Header */}
                        {state && (
                            <MarketHeader
                                question={state.question}
                                lastYesPrice={state.lastYesPrice}
                                totalVolume={state.fills.reduce((sum, f) => sum + f.price * f.quantity, 0)}
                            />
                        )}

                        {/* Demo Controls */}
                        <div className="flex gap-4">
                            <button
                                onClick={seedDemoOrders}
                                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                🎮 Seed Demo Orders
                            </button>
                            <button
                                onClick={handleExportProof}
                                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                            >
                                📥 Export Force Exit Proof
                            </button>
                            <div className="flex-1"></div>
                            <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm">
                                <span className="text-zinc-500">Avg Latency: </span>
                                <span className="font-mono text-zinc-900 dark:text-zinc-50">
                                    {metrics.avgLatency.toFixed(1)}ms
                                </span>
                            </div>
                            <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm">
                                <span className="text-zinc-500">Orders: </span>
                                <span className="font-mono text-zinc-900 dark:text-zinc-50">
                                    {metrics.ordersProcessed}
                                </span>
                            </div>
                        </div>

                        {/* Trading Interface */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Order Book */}
                            <div>
                                {orderbookDisplay && state && (
                                    <PredictionOrderbook
                                        display={orderbookDisplay}
                                        lastYesPrice={state.lastYesPrice}
                                        onPriceClick={handlePriceClick}
                                    />
                                )}
                            </div>

                            {/* Order Form */}
                            <div>
                                <PredictionOrderForm
                                    balance={balance}
                                    lastYesPrice={state?.lastYesPrice || null}
                                    onSubmitOrder={handleSubmitOrder}
                                    userId={address}
                                />
                            </div>

                            {/* Recent Trades */}
                            <div>
                                {state && <RecentTrades fills={state.fills} />}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                <div className="container mx-auto px-4 py-4">
                    <p className="text-center text-xs text-zinc-400">
                        Built for ETHGlobal • State Channels + Yellow Network • Binary Constraint: YES + NO = $1
                    </p>
                </div>
            </footer>
        </div>
    );
}
