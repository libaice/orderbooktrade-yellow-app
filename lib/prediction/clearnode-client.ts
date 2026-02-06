/**
 * ClearNode WebSocket Client
 * 
 * Connects to Yellow Network ClearNode for state channel updates
 */

import type { PredictionMarketState } from './types';

export interface ClearNodeConfig {
    wsUrl: string;
    sessionId?: string;
}

export type ClearNodeMessageType =
    | 'auth'
    | 'auth_success'
    | 'auth_error'
    | 'state_update'
    | 'state_confirmed'
    | 'state_rejected'
    | 'error';

export interface ClearNodeMessage {
    type: ClearNodeMessageType;
    sessionId?: string;
    signature?: string;
    state?: PredictionMarketState;
    clearNodeSignature?: string;
    error?: string;
    timestamp?: number;
}

/**
 * ClearNode WebSocket Client
 */
export class ClearNodeClient {
    private ws: WebSocket | null = null;
    private config: ClearNodeConfig;
    private isConnected = false;
    private isAuthenticated = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private pendingStateUpdates: Map<number, {
        resolve: (signature: string) => void;
        reject: (error: Error) => void;
    }> = new Map();

    // Event handlers
    private onConnectCallback?: () => void;
    private onDisconnectCallback?: () => void;
    private onAuthenticatedCallback?: () => void;
    private onStateConfirmedCallback?: (state: PredictionMarketState, signature: string) => void;
    private onErrorCallback?: (error: string) => void;

    constructor(config: ClearNodeConfig) {
        this.config = config;
    }

    /**
     * Connect to ClearNode
     */
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.wsUrl);

                this.ws.onopen = () => {
                    console.log('ClearNode: Connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.onConnectCallback?.();
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('ClearNode: Disconnected');
                    this.isConnected = false;
                    this.isAuthenticated = false;
                    this.onDisconnectCallback?.();
                    this.attemptReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('ClearNode: WebSocket error', error);
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
     * Handle incoming message
     */
    private handleMessage(data: string): void {
        try {
            const message: ClearNodeMessage = JSON.parse(data);

            switch (message.type) {
                case 'auth_success':
                    console.log('ClearNode: Authenticated');
                    this.isAuthenticated = true;
                    this.onAuthenticatedCallback?.();
                    break;

                case 'auth_error':
                    console.error('ClearNode: Auth error', message.error);
                    this.onErrorCallback?.(message.error || 'Authentication failed');
                    break;

                case 'state_confirmed':
                    console.log('ClearNode: State confirmed', message.state?.sequence);
                    if (message.state && message.clearNodeSignature) {
                        this.onStateConfirmedCallback?.(message.state, message.clearNodeSignature);

                        // Resolve pending promise
                        const pending = this.pendingStateUpdates.get(message.state.sequence);
                        if (pending) {
                            pending.resolve(message.clearNodeSignature);
                            this.pendingStateUpdates.delete(message.state.sequence);
                        }
                    }
                    break;

                case 'state_rejected':
                    console.error('ClearNode: State rejected', message.error);
                    this.onErrorCallback?.(message.error || 'State update rejected');
                    break;

                case 'error':
                    console.error('ClearNode: Error', message.error);
                    this.onErrorCallback?.(message.error || 'Unknown error');
                    break;
            }
        } catch (error) {
            console.error('ClearNode: Failed to parse message', error);
        }
    }

    /**
     * Authenticate with ClearNode
     */
    async authenticate(sessionId: string, signature: string): Promise<void> {
        if (!this.isConnected) {
            throw new Error('Not connected to ClearNode');
        }

        this.send({
            type: 'auth',
            sessionId,
            signature,
        });
    }

    /**
     * Push state update to ClearNode
     */
    async pushStateUpdate(
        state: PredictionMarketState,
        userSignature: string
    ): Promise<string> {
        if (!this.isConnected) {
            throw new Error('Not connected to ClearNode');
        }

        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with ClearNode');
        }

        return new Promise((resolve, reject) => {
            // Store pending promise
            this.pendingStateUpdates.set(state.sequence, { resolve, reject });

            // Send state update
            this.send({
                type: 'state_update',
                state,
                signature: userSignature,
                timestamp: Date.now(),
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                const pending = this.pendingStateUpdates.get(state.sequence);
                if (pending) {
                    pending.reject(new Error('State update timeout'));
                    this.pendingStateUpdates.delete(state.sequence);
                }
            }, 10000);
        });
    }

    /**
     * Send message
     */
    private send(message: ClearNodeMessage): void {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Attempt reconnection
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('ClearNode: Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`ClearNode: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch(console.error);
        }, delay);
    }

    /**
     * Disconnect
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.isAuthenticated = false;
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

    onAuthenticated(callback: () => void): void {
        this.onAuthenticatedCallback = callback;
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
    getStatus(): { connected: boolean; authenticated: boolean } {
        return {
            connected: this.isConnected,
            authenticated: this.isAuthenticated,
        };
    }
}

// Factory function
export function createClearNodeClient(wsUrl: string): ClearNodeClient {
    return new ClearNodeClient({ wsUrl });
}
