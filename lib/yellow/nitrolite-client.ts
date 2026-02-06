/**
 * Nitrolite Client for Prediction Market State Channels
 * 
 * Wraps the Yellow Network Nitrolite SDK for prediction market use case
 */

import { createWalletClient, custom, type WalletClient, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import type { PredictionMarketState } from '../prediction/types';

// Nitrolite SDK types (will be imported from @erc7824/nitrolite)
interface NitroliteConfig {
    wsUrl: string;
    chainId: number;
}

interface AppDefinition {
    protocol: string;
    participants: Address[];
    weights: number[];
    quorum: number;
    challenge: number;
    nonce: bigint;
}

interface AppAllocation {
    assetAddress: Address;
    balances: bigint[];
}

/**
 * Prediction Market Nitrolite Client
 */
export class PredictionMarketNitroliteClient {
    private wsUrl: string;
    private ws: WebSocket | null = null;
    private walletClient: WalletClient | null = null;
    private sessionId: string | null = null;
    private isConnected = false;
    private isAuthenticated = false;

    // Event handlers
    private onConnectCallback?: () => void;
    private onDisconnectCallback?: () => void;
    private onStateConfirmedCallback?: (state: PredictionMarketState, signature: string) => void;
    private onErrorCallback?: (error: string) => void;

    constructor(wsUrl: string = 'wss://clearnet-sandbox.yellow.com/ws') {
        this.wsUrl = wsUrl;
    }

    /**
     * Initialize with wallet client
     */
    async initialize(provider: any): Promise<void> {
        // Create viem wallet client from browser provider
        this.walletClient = createWalletClient({
            chain: sepolia,
            transport: custom(provider),
        });
    }

    /**
     * Connect to Yellow ClearNode
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl);

                this.ws.onopen = () => {
                    console.log('Nitrolite: Connected to ClearNode');
                    this.isConnected = true;
                    this.onConnectCallback?.();
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('Nitrolite: Disconnected from ClearNode');
                    this.isConnected = false;
                    this.isAuthenticated = false;
                    this.onDisconnectCallback?.();
                };

                this.ws.onerror = (error) => {
                    console.error('Nitrolite: WebSocket error', error);
                    reject(new Error('WebSocket connection failed'));
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle incoming WebSocket message
     */
    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);
            console.log('Nitrolite message:', message);

            switch (message.type) {
                case 'session_created':
                    this.sessionId = message.sessionId;
                    this.isAuthenticated = true;
                    console.log('Session created:', this.sessionId);
                    break;

                case 'state_confirmed':
                    if (message.state && message.signature) {
                        this.onStateConfirmedCallback?.(message.state, message.signature);
                    }
                    break;

                case 'error':
                    console.error('Nitrolite error:', message.error);
                    this.onErrorCallback?.(message.error);
                    break;
            }
        } catch (error) {
            console.error('Failed to parse Nitrolite message:', error);
        }
    }

    /**
     * Create a new prediction market session
     */
    async createSession(
        marketId: string,
        participants: Address[],
        initialBalances: bigint[]
    ): Promise<string> {
        if (!this.isConnected || !this.walletClient) {
            throw new Error('Not connected or wallet not initialized');
        }

        // Define the prediction market app
        const appDefinition: AppDefinition = {
            protocol: 'prediction-market-v1',
            participants,
            weights: participants.map(() => 1), // Equal weights
            quorum: participants.length, // All must sign
            challenge: 86400, // 24 hours challenge period
            nonce: BigInt(Date.now()),
        };

        // Initial allocation (USDC for this market)
        const allocation: AppAllocation = {
            assetAddress: '0x0000000000000000000000000000000000000000', // Native token or USDC address
            balances: initialBalances,
        };

        // Create session message
        // Note: This is a simplified version. Real implementation would use
        // createAppSessionMessage from @erc7824/nitrolite
        const sessionMessage = {
            type: 'create_session',
            marketId,
            appDefinition,
            allocation,
            timestamp: Date.now(),
        };

        // Sign the message
        const account = await this.walletClient.getAddresses();
        const address = account[0];

        // For now, send unsigned (will add proper signing with Nitrolite SDK)
        this.send(sessionMessage);

        return new Promise((resolve, reject) => {
            // Wait for session_created response
            const timeout = setTimeout(() => {
                reject(new Error('Session creation timeout'));
            }, 10000);

            const originalCallback = this.onStateConfirmedCallback;
            this.onStateConfirmedCallback = (state, signature) => {
                clearTimeout(timeout);
                this.onStateConfirmedCallback = originalCallback;
                if (this.sessionId) {
                    resolve(this.sessionId);
                } else {
                    reject(new Error('Session ID not received'));
                }
            };
        });
    }

    /**
     * Push state update to ClearNode
     */
    async pushStateUpdate(
        state: PredictionMarketState,
        userSignature: string
    ): Promise<void> {
        if (!this.isConnected || !this.sessionId) {
            throw new Error('Not connected or no active session');
        }

        // Serialize state to compact format
        const stateData = {
            marketId: state.marketId,
            sequence: state.sequence,
            timestamp: state.timestamp,
            // Compact representation of orderbook and balances
            orderbookHash: this.hashOrderbook(state),
            balancesHash: this.hashBalances(state),
            lastYesPrice: state.lastYesPrice,
            lastNoPrice: state.lastNoPrice,
        };

        const updateMessage = {
            type: 'state_update',
            sessionId: this.sessionId,
            state: stateData,
            signature: userSignature,
            timestamp: Date.now(),
        };

        this.send(updateMessage);
    }

    /**
     * Close session with final state
     */
    async closeSession(finalState: PredictionMarketState): Promise<void> {
        if (!this.sessionId) {
            throw new Error('No active session');
        }

        const closeMessage = {
            type: 'close_session',
            sessionId: this.sessionId,
            finalState,
            timestamp: Date.now(),
        };

        this.send(closeMessage);
        this.sessionId = null;
        this.isAuthenticated = false;
    }

    /**
     * Send message to ClearNode
     */
    private send(message: any): void {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Hash orderbook for compact state representation
     */
    private hashOrderbook(state: PredictionMarketState): string {
        // Simple hash of orderbook (in production, use proper hashing)
        const orderbookStr = JSON.stringify(state.orderbook);
        return `0x${Buffer.from(orderbookStr).toString('hex').slice(0, 64)}`;
    }

    /**
     * Hash balances for compact state representation
     */
    private hashBalances(state: PredictionMarketState): string {
        // Simple hash of balances (in production, use proper hashing)
        const balancesStr = JSON.stringify(state.balances);
        return `0x${Buffer.from(balancesStr).toString('hex').slice(0, 64)}`;
    }

    /**
     * Disconnect from ClearNode
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.isAuthenticated = false;
        this.sessionId = null;
    }

    /**
     * Event handlers
     */
    onConnect(callback: () => void): void {
        this.onConnectCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.onDisconnectCallback = callback;
    }

    onStateConfirmed(callback: (state: PredictionMarketState, signature: string) => void): void {
        this.onStateConfirmedCallback = callback;
    }

    onError(callback: (error: string) => void): void {
        this.onErrorCallback = callback;
    }

    /**
     * Get connection status
     */
    getStatus(): {
        connected: boolean;
        authenticated: boolean;
        sessionId: string | null;
    } {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
            sessionId: this.sessionId,
        };
    }

    /**
     * Get session ID
     */
    getSessionId(): string | null {
        return this.sessionId;
    }
}

/**
 * Factory function
 */
export function createNitroliteClient(
    wsUrl: string = 'wss://clearnet-sandbox.yellow.com/ws'
): PredictionMarketNitroliteClient {
    return new PredictionMarketNitroliteClient(wsUrl);
}
