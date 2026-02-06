/**
 * State Manager for Prediction Market
 * 
 * Manages state channel state with signing and verification
 */

import { ethers } from 'ethers';
import type { PredictionMarketState } from './types';
import { createInitialState, initUserBalance } from './matcher';

// EIP-712 Domain
const DOMAIN = {
    name: 'PredictionMarket',
    version: '1',
    chainId: 1, // Will be updated
};

// EIP-712 Types for state signing
const STATE_TYPES = {
    PredictionMarketState: [
        { name: 'marketId', type: 'string' },
        { name: 'sequence', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'stateHash', type: 'bytes32' },
    ],
};

/**
 * State manager class
 */
export class StateManager {
    private state: PredictionMarketState;
    private signer: ethers.Signer | null = null;
    private userAddress: string | null = null;
    private listeners: Set<(state: PredictionMarketState) => void> = new Set();

    constructor(marketId: string, question: string) {
        this.state = createInitialState(marketId, question);
    }

    /**
     * Initialize with signer
     */
    async initialize(signer: ethers.Signer): Promise<void> {
        this.signer = signer;
        this.userAddress = await signer.getAddress();

        // Update domain chainId
        const network = await signer.provider?.getNetwork();
        if (network) {
            DOMAIN.chainId = Number(network.chainId);
        }
    }

    /**
     * Get current state
     */
    getState(): PredictionMarketState {
        return this.state;
    }

    /**
     * Get user address
     */
    getUserAddress(): string | null {
        return this.userAddress;
    }

    /**
     * Update state (after local matching)
     */
    updateState(newState: PredictionMarketState): void {
        this.state = newState;
        this.notifyListeners();
    }

    /**
     * Initialize user with USDC deposit
     */
    depositUSDC(amount: number): void {
        if (!this.userAddress) {
            throw new Error('Not initialized');
        }
        this.state = initUserBalance(this.state, this.userAddress, amount);
        this.notifyListeners();
    }

    /**
     * Sign current state for state channel update
     */
    async signState(): Promise<{ state: PredictionMarketState; signature: string }> {
        if (!this.signer) {
            throw new Error('Signer not initialized');
        }

        // Create hash of full state for compact signing
        const stateHash = ethers.keccak256(
            ethers.toUtf8Bytes(JSON.stringify(this.state))
        );

        const value = {
            marketId: this.state.marketId,
            sequence: this.state.sequence,
            timestamp: this.state.timestamp,
            stateHash,
        };

        const signature = await this.signer.signTypedData(DOMAIN, STATE_TYPES, value);

        return {
            state: this.state,
            signature,
        };
    }

    /**
     * Verify a state signature
     */
    verifyStateSignature(
        state: PredictionMarketState,
        signature: string,
        expectedAddress: string
    ): boolean {
        try {
            const stateHash = ethers.keccak256(
                ethers.toUtf8Bytes(JSON.stringify(state))
            );

            const value = {
                marketId: state.marketId,
                sequence: state.sequence,
                timestamp: state.timestamp,
                stateHash,
            };

            const recoveredAddress = ethers.verifyTypedData(
                DOMAIN,
                STATE_TYPES,
                value,
                signature
            );

            return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
        } catch (error) {
            console.error('State verification failed:', error);
            return false;
        }
    }

    /**
     * Subscribe to state changes
     */
    subscribe(callback: (state: PredictionMarketState) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }

    /**
     * Export state for force exit proof
     */
    exportProof(): string {
        return JSON.stringify({
            state: this.state,
            timestamp: Date.now(),
            exportedBy: this.userAddress,
        }, null, 2);
    }

    /**
     * Get user balance
     */
    getUserBalance(): { usdc: number; yes: number; no: number } | null {
        if (!this.userAddress) return null;
        return this.state.balances[this.userAddress] || null;
    }

    /**
     * Reset state (for testing)
     */
    reset(marketId: string, question: string): void {
        this.state = createInitialState(marketId, question);
        this.notifyListeners();
    }
}

// Singleton instance
export const stateManager = new StateManager(
    'prediction-market-1',
    'Will ETH reach $5000 by end of 2025?'
);
