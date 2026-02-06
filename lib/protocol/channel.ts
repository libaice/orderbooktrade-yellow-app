/**
 * State channel management with force exit capability
 */

import type {
    ChannelState,
    StateUpdate,
    OrderIntent,
    Fill,
    ForceExitProof
} from './types';
import { verifyStateUpdateSignature } from './signatures';

export class StateChannelManager {
    private channels: Map<string, ChannelState> = new Map();
    private auditLog: Map<string, {
        orders: OrderIntent[];
        fills: Fill[];
        states: StateUpdate[];
    }> = new Map();

    /**
     * Initialize a new channel
     */
    initializeChannel(
        channelId: string,
        userAddress: string,
        operatorAddress: string,
        initialBalances: { base: string; quote: string }
    ): ChannelState {
        const channel: ChannelState = {
            id: channelId,
            userAddress,
            operatorAddress,
            sequence: 0,
            balances: initialBalances,
            status: 'opening',
            nextNonce: 0,
        };

        this.channels.set(channelId, channel);
        this.auditLog.set(channelId, {
            orders: [],
            fills: [],
            states: [],
        });

        return channel;
    }

    /**
     * Get channel state
     */
    getChannel(channelId: string): ChannelState | undefined {
        return this.channels.get(channelId);
    }

    /**
     * Update channel state with new dual-signed state
     */
    updateChannelState(
        channelId: string,
        newState: StateUpdate
    ): boolean {
        const channel = this.channels.get(channelId);
        if (!channel) {
            console.error('Channel not found:', channelId);
            return false;
        }

        // Validate sequence number (must be monotonic)
        if (newState.sequence <= channel.sequence) {
            console.error('Invalid sequence number:', newState.sequence, 'expected >', channel.sequence);
            return false;
        }

        // Verify user signature
        const userSigValid = verifyStateUpdateSignature(
            newState,
            newState.userSignature,
            channel.userAddress
        );

        if (!userSigValid) {
            console.error('Invalid user signature');
            return false;
        }

        // Verify operator signature
        const operatorSigValid = verifyStateUpdateSignature(
            newState,
            newState.operatorSignature,
            channel.operatorAddress
        );

        if (!operatorSigValid) {
            console.error('Invalid operator signature');
            return false;
        }

        // Update channel state
        channel.sequence = newState.sequence;
        channel.balances = newState.balances;
        channel.latestState = newState;

        // Store in audit log
        const log = this.auditLog.get(channelId);
        if (log) {
            log.states.push(newState);
        }

        return true;
    }

    /**
     * Record order intent in audit log
     */
    recordOrderIntent(channelId: string, order: OrderIntent): void {
        const log = this.auditLog.get(channelId);
        if (log) {
            log.orders.push(order);
        }
    }

    /**
     * Record fill in audit log
     */
    recordFill(channelId: string, fill: Fill): void {
        const log = this.auditLog.get(channelId);
        if (log) {
            log.fills.push(fill);
        }
    }

    /**
     * Get next nonce for order
     */
    getNextNonce(channelId: string): number {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }
        return channel.nextNonce++;
    }

    /**
     * Generate force exit proof
     * This contains all evidence needed to prove channel state on-chain
     */
    generateForceExitProof(channelId: string): ForceExitProof | null {
        const channel = this.channels.get(channelId);
        const log = this.auditLog.get(channelId);

        if (!channel || !channel.latestState || !log) {
            console.error('Cannot generate proof: missing channel or state');
            return null;
        }

        // Get all orders and fills since last state update
        const lastStateTimestamp = channel.latestState.timestamp;
        const recentOrders = log.orders.filter(o => o.expiresAt > lastStateTimestamp);
        const recentFills = log.fills.filter(f => f.timestamp > lastStateTimestamp);

        return {
            channelId,
            latestState: channel.latestState,
            orderIntents: recentOrders,
            fills: recentFills,
            generatedAt: Date.now(),
        };
    }

    /**
     * Export proof as JSON for user download
     */
    exportProof(channelId: string): string | null {
        const proof = this.generateForceExitProof(channelId);
        if (!proof) return null;
        return JSON.stringify(proof, null, 2);
    }

    /**
     * Import proof from JSON
     */
    importProof(proofJson: string): ForceExitProof | null {
        try {
            return JSON.parse(proofJson) as ForceExitProof;
        } catch (error) {
            console.error('Failed to import proof:', error);
            return null;
        }
    }

    /**
     * Mark channel as closing (cooperative)
     */
    initiateCooperativeClose(channelId: string): void {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.status = 'closing';
        }
    }

    /**
     * Mark channel as disputed (force exit)
     */
    initiateForceExit(channelId: string): void {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.status = 'disputed';
        }
    }

    /**
     * Finalize channel closure
     */
    finalizeClose(channelId: string): void {
        const channel = this.channels.get(channelId);
        if (channel) {
            channel.status = 'closed';
        }
    }

    /**
     * Get full audit log for channel
     */
    getAuditLog(channelId: string) {
        return this.auditLog.get(channelId);
    }

    /**
     * Clear channel data (after successful withdrawal)
     */
    clearChannel(channelId: string): void {
        this.channels.delete(channelId);
        this.auditLog.delete(channelId);
    }
}

// Singleton instance
export const channelManager = new StateChannelManager();
