/**
 * Yellow Network ClearNode WebSocket client
 * Handles authentication, unified balance queries, and channel operations
 */

import { EventEmitter } from 'events';
import type { BalanceState } from '../protocol/types';

export interface YellowConfig {
    wsUrl: string;
    apiKey?: string;
    sessionKey?: string;
}

export interface YellowMessage {
    type: string;
    data: any;
    timestamp?: number;
}

export class YellowNetworkClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private config: YellowConfig;
    private authenticated: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private messageQueue: YellowMessage[] = [];

    constructor(config: YellowConfig) {
        super();
        this.config = config;
    }

    /**
     * Connect to Yellow Network ClearNode
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.wsUrl);

                this.ws.onopen = () => {
                    console.log('Connected to Yellow Network');
                    this.reconnectAttempts = 0;
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from Yellow Network');
                    this.authenticated = false;
                    this.emit('disconnected');
                    this.attemptReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Authenticate with Yellow Network
     */
    async authenticate(address: string, signature: string): Promise<void> {
        const authMessage = {
            type: 'auth_request',
            data: {
                address,
                signature,
                timestamp: Date.now(),
            },
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Authentication timeout'));
            }, 10000);

            this.once('auth_response', (response) => {
                clearTimeout(timeout);
                if (response.success) {
                    this.authenticated = true;
                    this.flushMessageQueue();
                    resolve();
                } else {
                    reject(new Error(response.error || 'Authentication failed'));
                }
            });

            this.send(authMessage);
        });
    }

    /**
     * Get unified balance from Yellow Network
     */
    async getUnifiedBalance(address: string): Promise<{ eth: string; usdc: string }> {
        const message = {
            type: 'get_unified_balance',
            data: { address },
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Balance query timeout'));
            }, 5000);

            this.once('unified_balance_response', (response) => {
                clearTimeout(timeout);
                if (response.success) {
                    resolve(response.balances);
                } else {
                    reject(new Error(response.error || 'Failed to get balance'));
                }
            });

            this.send(message);
        });
    }

    /**
     * Allocate balance to state channel
     */
    async allocateToChannel(
        channelId: string,
        amount: { base: string; quote: string }
    ): Promise<void> {
        const message = {
            type: 'allocate_to_channel',
            data: {
                channelId,
                amount,
            },
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Allocation timeout'));
            }, 10000);

            this.once('allocation_response', (response) => {
                clearTimeout(timeout);
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error || 'Allocation failed'));
                }
            });

            this.send(message);
        });
    }

    /**
     * Withdraw from channel back to unified balance
     */
    async withdrawFromChannel(
        channelId: string,
        amount: { base: string; quote: string }
    ): Promise<void> {
        const message = {
            type: 'withdraw_from_channel',
            data: {
                channelId,
                amount,
            },
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Withdrawal timeout'));
            }, 10000);

            this.once('withdrawal_response', (response) => {
                clearTimeout(timeout);
                if (response.success) {
                    resolve();
                } else {
                    reject(new Error(response.error || 'Withdrawal failed'));
                }
            });

            this.send(message);
        });
    }

    /**
     * Send message to Yellow Network
     */
    private send(message: YellowMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, queueing message');
            this.messageQueue.push(message);
            return;
        }

        if (!this.authenticated && message.type !== 'auth_request') {
            console.warn('Not authenticated, queueing message');
            this.messageQueue.push(message);
            return;
        }

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Handle incoming messages
     */
    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);
            console.log('Received message:', message.type);

            // Emit specific event for message type
            this.emit(message.type, message.data);

            // Emit general message event
            this.emit('message', message);
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    /**
     * Flush queued messages after authentication
     */
    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.send(message);
            }
        }
    }

    /**
     * Attempt to reconnect
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            this.emit('max_reconnect_attempts');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch((error) => {
                console.error('Reconnect failed:', error);
            });
        }, delay);
    }

    /**
     * Disconnect from Yellow Network
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.authenticated = false;
    }

    /**
     * Check if connected and authenticated
     */
    isReady(): boolean {
        return this.ws !== null &&
            this.ws.readyState === WebSocket.OPEN &&
            this.authenticated;
    }
}
