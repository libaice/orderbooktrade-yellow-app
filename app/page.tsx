/**
 * Main trading page - integrates all components
 */

'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { BalancePanel } from '@/components/BalancePanel';
import { OrderForm } from '@/components/OrderForm';
import { OrderBook, type OrderBookData } from '@/components/OrderBook';
import { ChannelManager } from '@/components/ChannelManager';
import { PerformanceMetrics, type PerformanceMetrics as MetricsType } from '@/components/PerformanceMetrics';
import type { BalanceState, ChannelState, OrderIntent } from '@/lib/protocol/types';
import { channelManager } from '@/lib/protocol/channel';
import { signOrderIntent } from '@/lib/protocol/signatures';
import { balanceManager } from '@/lib/yellow/balance-manager';
import { YellowNetworkClient } from '@/lib/yellow/yellow-client';
import { MatchingEngineClient } from '@/lib/matching/matching-client';
import { auditLog } from '@/lib/matching/audit-log';

export default function TradingPage() {
  // Wallet state
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);

  // Balance state
  const [balances, setBalances] = useState<BalanceState>({
    wallet: { eth: '0', usdc: '0' },
    unified: { eth: '0', usdc: '0' },
    channel: { eth: '0', usdc: '0' },
  });

  // Channel state
  const [channel, setChannel] = useState<ChannelState | null>(null);

  // Order book state
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bids: [],
    asks: [],
    lastPrice: '2000.00',
  });

  // Performance metrics
  const [metrics, setMetrics] = useState<MetricsType>({
    ordersPerSecond: 0,
    avgFillLatency: 0,
    websocketPing: 0,
    stateUpdateFrequency: 0,
    totalOrders: 0,
    totalFills: 0,
  });

  // Clients
  const [yellowClient, setYellowClient] = useState<YellowNetworkClient | null>(null);
  const [matchingClient, setMatchingClient] = useState<MatchingEngineClient | null>(null);

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const walletSigner = await browserProvider.getSigner();
      const walletAddress = await walletSigner.getAddress();

      // Get network info
      const networkInfo = await browserProvider.getNetwork();
      setNetwork(networkInfo.name);

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAddress(walletAddress);

      // Initialize balance manager
      // Note: Yellow client would be initialized here with real credentials
      // For demo, we'll use mock data
      const mockYellowClient = new YellowNetworkClient({
        wsUrl: 'ws://localhost:8080', // Mock URL
      });
      setYellowClient(mockYellowClient);

      balanceManager.initialize(browserProvider, mockYellowClient, walletAddress);

      // Refresh balances
      await refreshBalances();

      // Initialize matching engine client
      const matching = new MatchingEngineClient({
        wsUrl: 'ws://localhost:8081', // Mock URL
      });
      setMatchingClient(matching);

      // Set up event listeners
      setupEventListeners(matching);

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    // Disconnect clients
    if (yellowClient) {
      yellowClient.disconnect();
      setYellowClient(null);
    }
    if (matchingClient) {
      matchingClient.disconnect();
      setMatchingClient(null);
    }

    // Clear channel if exists
    if (channel) {
      channelManager.clearChannel(channel.id);
      setChannel(null);
    }

    // Reset all state
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setNetwork(null);
    setBalances({
      wallet: { eth: '0', usdc: '0' },
      unified: { eth: '0', usdc: '0' },
      channel: { eth: '0', usdc: '0' },
    });
    setMetrics({
      ordersPerSecond: 0,
      avgFillLatency: 0,
      websocketPing: 0,
      stateUpdateFrequency: 0,
      totalOrders: 0,
      totalFills: 0,
    });
  };

  // Refresh balances
  const refreshBalances = async () => {
    try {
      const newBalances = await balanceManager.refreshAll();
      setBalances(newBalances);
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    }
  };

  // Setup event listeners for matching engine
  const setupEventListeners = (client: MatchingEngineClient) => {
    client.on('fill', (fill) => {
      console.log('Fill received:', fill);
      auditLog.recordFill(channel?.id || 'default', fill);

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        totalFills: prev.totalFills + 1,
      }));
    });

    client.on('state_update', (stateUpdate) => {
      console.log('State update received:', stateUpdate);

      if (channel) {
        channelManager.updateChannelState(channel.id, stateUpdate);
        const updatedChannel = channelManager.getChannel(channel.id);
        if (updatedChannel) {
          setChannel(updatedChannel);
          balanceManager.updateChannelBalance(
            updatedChannel.balances.base,
            updatedChannel.balances.quote
          );
          setBalances(balanceManager.getBalances());
        }
      }
    });

    client.on('orderbook_update', (data) => {
      setOrderBook(data);
    });
  };

  // Open channel
  const handleOpenChannel = async (amount: { base: string; quote: string }) => {
    if (!address) return;

    try {
      // Allocate from unified to channel
      const channelId = `channel_${address}_${Date.now()}`;
      await balanceManager.allocateToChannel(channelId, amount);

      // Initialize channel
      const newChannel = channelManager.initializeChannel(
        channelId,
        address,
        '0x0000000000000000000000000000000000000001', // Mock operator address
        amount
      );

      newChannel.status = 'active';
      setChannel(newChannel);
      setBalances(balanceManager.getBalances());

    } catch (error) {
      throw error;
    }
  };

  // Submit order
  const handleSubmitOrder = async (orderData: Omit<OrderIntent, 'signature' | 'userAddress'>) => {
    if (!signer || !address || !channel) {
      throw new Error('Wallet not connected or channel not open');
    }

    try {
      // Get nonce from channel manager
      const nonce = channelManager.getNextNonce(channel.id);

      // Create order intent
      const orderIntent: Omit<OrderIntent, 'signature'> = {
        ...orderData,
        nonce,
        userAddress: address,
      };

      // Sign order
      const signedOrder = await signOrderIntent(orderIntent, signer);

      // Record in audit log
      auditLog.recordOrder(channel.id, signedOrder);

      // Submit to matching engine
      if (matchingClient) {
        await matchingClient.submitOrder(signedOrder);
      }

      // Update metrics
      setMetrics(prev => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
      }));

    } catch (error) {
      console.error('Failed to submit order:', error);
      throw error;
    }
  };

  // Cooperative close
  const handleCooperativeClose = async () => {
    if (!channel) return;

    try {
      channelManager.initiateCooperativeClose(channel.id);

      // Withdraw from channel to unified
      await balanceManager.withdrawFromChannel(
        channel.id,
        channel.balances
      );

      channelManager.finalizeClose(channel.id);
      setChannel(null);
      setBalances(balanceManager.getBalances());

    } catch (error) {
      throw error;
    }
  };

  // Force exit
  const handleForceExit = async () => {
    if (!channel) return;

    try {
      channelManager.initiateForceExit(channel.id);
      const updatedChannel = channelManager.getChannel(channel.id);
      if (updatedChannel) {
        setChannel(updatedChannel);
      }

      // Export proof
      handleExportProof();

    } catch (error) {
      throw error;
    }
  };

  // Export proof
  const handleExportProof = () => {
    if (!channel) return;

    const proof = channelManager.exportProof(channel.id);
    if (proof) {
      // Download as JSON
      const blob = new Blob([proof], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `force-exit-proof-${channel.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Mock order book data for demo
  useEffect(() => {
    // Generate mock order book
    const mockBids: any[] = [];
    const mockAsks: any[] = [];

    let basePrice = 2000;
    for (let i = 0; i < 15; i++) {
      const bidPrice = basePrice - i * 0.5;
      const askPrice = basePrice + i * 0.5;
      const quantity = (Math.random() * 2 + 0.1).toFixed(4);

      mockBids.push({
        price: bidPrice.toFixed(2),
        quantity,
        total: (bidPrice * parseFloat(quantity)).toFixed(2),
      });

      mockAsks.push({
        price: askPrice.toFixed(2),
        quantity,
        total: (askPrice * parseFloat(quantity)).toFixed(2),
      });
    }

    setOrderBook({
      bids: mockBids,
      asks: mockAsks,
      lastPrice: '2000.00',
    });
  }, []);

  // Listen for account changes in MetaMask
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        disconnectWallet();
      } else if (address && accounts[0].toLowerCase() !== address.toLowerCase()) {
        // User switched to a different account
        disconnectWallet();
        // Optionally auto-reconnect with new account
        // connectWallet();
      }
    };

    const handleChainChanged = () => {
      // Reload page on chain change (recommended by MetaMask)
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Cleanup listeners
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              ⚡ State Channel Trading
            </h1>

            {!address ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Network Badge */}
                {network && (
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      🟢 {network}
                    </span>
                  </div>
                )}

                {/* Address Display */}
                <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <span className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                  title="Disconnect Wallet"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!address ? (
          <div className="text-center py-20">
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              Connect your wallet to start trading
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <PerformanceMetrics metrics={metrics} />

            {/* Trading Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <BalancePanel balances={balances} onRefresh={refreshBalances} />
                <ChannelManager
                  channel={channel}
                  onOpenChannel={handleOpenChannel}
                  onCooperativeClose={handleCooperativeClose}
                  onForceExit={handleForceExit}
                  onExportProof={handleExportProof}
                />
              </div>

              {/* Middle Column */}
              <div>
                <OrderBook marketId="ETH-USDC" data={orderBook} />
              </div>

              {/* Right Column */}
              <div>
                <OrderForm
                  marketId="ETH-USDC"
                  onSubmitOrder={handleSubmitOrder}
                  channelBalance={channel?.balances || { base: '0', quote: '0' }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
