/**
 * Three-tier balance management
 * Tracks: Wallet (on-chain) -> Unified (Yellow) -> Channel (state channel)
 */

import { ethers } from 'ethers';
import type { BalanceState } from '../protocol/types';
import type { YellowNetworkClient } from './yellow-client';

export class BalanceManager {
    private balances: BalanceState = {
        wallet: { eth: '0', usdc: '0' },
        unified: { eth: '0', usdc: '0' },
        channel: { eth: '0', usdc: '0' },
    };

    private provider: ethers.Provider | null = null;
    private yellowClient: YellowNetworkClient | null = null;
    private userAddress: string | null = null;

    /**
     * Initialize balance manager
     */
    initialize(
        provider: ethers.Provider,
        yellowClient: YellowNetworkClient,
        userAddress: string
    ): void {
        this.provider = provider;
        this.yellowClient = yellowClient;
        this.userAddress = userAddress;
    }

    /**
     * Refresh all balance tiers
     */
    async refreshAll(): Promise<BalanceState> {
        if (!this.provider || !this.yellowClient || !this.userAddress) {
            throw new Error('Balance manager not initialized');
        }

        // Refresh wallet balance (on-chain)
        await this.refreshWalletBalance();

        // Refresh unified balance (Yellow Network)
        await this.refreshUnifiedBalance();

        // Channel balance is managed by state channel manager
        // (updated via state updates)

        return this.balances;
    }

    /**
     * Refresh wallet balance from blockchain
     */
    async refreshWalletBalance(): Promise<void> {
        if (!this.provider || !this.userAddress) {
            throw new Error('Provider or address not set');
        }

        try {
            // Get ETH balance
            const ethBalance = await this.provider.getBalance(this.userAddress);
            this.balances.wallet.eth = ethers.formatEther(ethBalance);

            // Get USDC balance (example ERC20)
            // TODO: Replace with actual USDC contract address
            const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
            const usdcContract = new ethers.Contract(
                USDC_ADDRESS,
                ['function balanceOf(address) view returns (uint256)'],
                this.provider
            );

            const usdcBalance = await usdcContract.balanceOf(this.userAddress);
            this.balances.wallet.usdc = ethers.formatUnits(usdcBalance, 6); // USDC has 6 decimals
        } catch (error) {
            console.error('Failed to refresh wallet balance:', error);
        }
    }

    /**
     * Refresh unified balance from Yellow Network
     */
    async refreshUnifiedBalance(): Promise<void> {
        if (!this.yellowClient || !this.userAddress) {
            throw new Error('Yellow client or address not set');
        }

        try {
            const unified = await this.yellowClient.getUnifiedBalance(this.userAddress);
            this.balances.unified = unified;
        } catch (error) {
            console.error('Failed to refresh unified balance:', error);
        }
    }

    /**
     * Update channel balance (called by state channel manager)
     */
    updateChannelBalance(base: string, quote: string): void {
        this.balances.channel.eth = base;
        this.balances.channel.usdc = quote;
    }

    /**
     * Get current balances
     */
    getBalances(): BalanceState {
        return { ...this.balances };
    }

    /**
     * Deposit from wallet to unified balance
     * (Requires on-chain transaction to Yellow Network)
     */
    async depositToUnified(
        amount: { eth?: string; usdc?: string }
    ): Promise<void> {
        // TODO: Implement Yellow Network deposit contract interaction
        console.log('Deposit to unified:', amount);
        throw new Error('Not implemented - requires Yellow Network deposit contract');
    }

    /**
     * Withdraw from unified balance to wallet
     * (Requires Yellow Network withdrawal)
     */
    async withdrawToWallet(
        amount: { eth?: string; usdc?: string }
    ): Promise<void> {
        // TODO: Implement Yellow Network withdrawal
        console.log('Withdraw to wallet:', amount);
        throw new Error('Not implemented - requires Yellow Network withdrawal API');
    }

    /**
     * Allocate from unified to channel
     */
    async allocateToChannel(
        channelId: string,
        amount: { base: string; quote: string }
    ): Promise<void> {
        if (!this.yellowClient) {
            throw new Error('Yellow client not initialized');
        }

        // Check sufficient unified balance
        const ethNeeded = parseFloat(amount.base);
        const usdcNeeded = parseFloat(amount.quote);
        const ethAvailable = parseFloat(this.balances.unified.eth);
        const usdcAvailable = parseFloat(this.balances.unified.usdc);

        if (ethNeeded > ethAvailable) {
            throw new Error(`Insufficient ETH in unified balance: need ${ethNeeded}, have ${ethAvailable}`);
        }

        if (usdcNeeded > usdcAvailable) {
            throw new Error(`Insufficient USDC in unified balance: need ${usdcNeeded}, have ${usdcAvailable}`);
        }

        // Allocate via Yellow Network
        await this.yellowClient.allocateToChannel(channelId, amount);

        // Update local balances
        this.balances.unified.eth = (ethAvailable - ethNeeded).toString();
        this.balances.unified.usdc = (usdcAvailable - usdcNeeded).toString();
        this.balances.channel.eth = (parseFloat(this.balances.channel.eth) + ethNeeded).toString();
        this.balances.channel.usdc = (parseFloat(this.balances.channel.usdc) + usdcNeeded).toString();
    }

    /**
     * Withdraw from channel to unified
     */
    async withdrawFromChannel(
        channelId: string,
        amount: { base: string; quote: string }
    ): Promise<void> {
        if (!this.yellowClient) {
            throw new Error('Yellow client not initialized');
        }

        // Withdraw via Yellow Network
        await this.yellowClient.withdrawFromChannel(channelId, amount);

        // Update local balances
        const ethAmount = parseFloat(amount.base);
        const usdcAmount = parseFloat(amount.quote);

        this.balances.channel.eth = (parseFloat(this.balances.channel.eth) - ethAmount).toString();
        this.balances.channel.usdc = (parseFloat(this.balances.channel.usdc) - usdcAmount).toString();
        this.balances.unified.eth = (parseFloat(this.balances.unified.eth) + ethAmount).toString();
        this.balances.unified.usdc = (parseFloat(this.balances.unified.usdc) + usdcAmount).toString();
    }

    /**
     * Get total balance across all tiers
     */
    getTotalBalance(): { eth: string; usdc: string } {
        const totalEth =
            parseFloat(this.balances.wallet.eth) +
            parseFloat(this.balances.unified.eth) +
            parseFloat(this.balances.channel.eth);

        const totalUsdc =
            parseFloat(this.balances.wallet.usdc) +
            parseFloat(this.balances.unified.usdc) +
            parseFloat(this.balances.channel.usdc);

        return {
            eth: totalEth.toString(),
            usdc: totalUsdc.toString(),
        };
    }
}

// Singleton instance
export const balanceManager = new BalanceManager();
