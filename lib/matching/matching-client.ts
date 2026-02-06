/**
 * Matching engine WebSocket client
 * Handles order submission, fills, and state updates
 */

import { EventEmitter } from 'events';
import type { OrderIntent, Fill, StateUpdate } from '../protocol/types';

export interface MatchingEngineConfig {
    wsUrl: string;
}

export class MatchingEngineClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private config: MatchingEngineConfig;
    private connected: boolean = false;
    private pendingOrders: Map<string, OrderIntent> = new Map();

    constructor(config: MatchingEngineConfig) {
        super();
        this.config = config;
    }

    /**
     * Connect to matching engine
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.wsUrl);

                this.ws.onopen = () => {
                    console.log('Connected to matching engine');
                    this.connected = true;
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('Matching engine error:', error);
                    this.emit('error', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from matching engine');
                    this.connected = false;
                    this.emit('disconnected');
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Submit signed order intent
     */
    async submitOrder(order: OrderIntent): Promise<string> {
        if (!this.connected) {
            throw new Error('Not connected to matching engine');
        }

        const orderId = this.generateOrderId(order);
        this.pendingOrders.set(orderId, order);

        const message = {
            type: 'submit_order',
            data: {
                orderId,
                ...order,
            },
        };

        this.send(message);

        return orderId;
    }

    /**
     * Cancel order
     */
    async cancelOrder(orderId: string, signature: string): Promise<void> {
        if (!this.connected) {
            throw new Error('Not connected to matching engine');
        }

        const message = {
            type: 'cancel_order',
            data: {
                orderId,
                signature,
            },
        };

        this.send(message);
    }

    /**
     * Request current state update
     */
    async requestStateUpdate(channelId: string): Promise<void> {
        if (!this.connected) {
            throw new Error('Not connected to matching engine');
        }

        const message = {
            type: 'request_state_update',
            data: {
                channelId,
            },
        };

        this.send(message);
    }

    /**
     * Subscribe to market data
     */
    subscribeToMarket(marketId: string): void {
        const message = {
            type: 'subscribe',
            data: {
                marketId,
            },
        };

        this.send(message);
    }

    /**
     * Unsubscribe from market data
     */
    unsubscribeFromMarket(marketId: string): void {
        const message = {
            type: 'unsubscribe',
            data: {
                marketId,
            },
        };

        this.send(message);
    }

    /**
     * Send message to matching engine
     */
    private send(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket not connected');
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
            console.log('Received from matching engine:', message.type);

            switch (message.type) {
                case 'order_accepted':
                    this.emit('order_accepted', message.data);
                    break;

                case 'order_rejected':
                    this.emit('order_rejected', message.data);
                    this.pendingOrders.delete(message.data.orderId);
                    break;

                case 'fill':
                    this.handleFill(message.data);
                    break;

                case 'state_update':
                    this.handleStateUpdate(message.data);
                    break;

                case 'orderbook_update':
                    this.emit('orderbook_update', message.data);
                    break;

                case 'trade':
                    this.emit('trade', message.data);
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }

            // Emit general message event
            this.emit('message', message);
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    /**
     * Handle fill message
     */
    private handleFill(fill: Fill): void {
        console.log('Order filled:', fill);
        this.emit('fill', fill);

        // Remove from pending if fully filled
        // (In real implementation, track partial fills)
        this.pendingOrders.delete(fill.orderId);
    }

    /**
     * Handle state update message
     */
    private handleStateUpdate(stateUpdate: StateUpdate): void {
        console.log('State update received:', stateUpdate);
        this.emit('state_update', stateUpdate);
    }

    /**
     * Generate deterministic order ID
     */
    private generateOrderId(order: OrderIntent): string {
        const data = `${order.userAddress}-${order.marketId}-${order.nonce}-${order.expiresAt}`;
        // Simple hash (in production, use proper hash function)
        return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get pending orders
     */
    getPendingOrders(): OrderIntent[] {
        return Array.from(this.pendingOrders.values());
    }

    /**
     * Disconnect from matching engine
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
