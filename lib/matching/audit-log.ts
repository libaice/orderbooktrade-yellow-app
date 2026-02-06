/**
 * Audit log for force exit proofs
 * Stores all orders, fills, and state updates for dispute resolution
 */

import type { OrderIntent, Fill, StateUpdate, ForceExitProof } from '../protocol/types';

export interface AuditEntry {
    timestamp: number;
    type: 'order' | 'fill' | 'state_update';
    data: OrderIntent | Fill | StateUpdate;
}

export class AuditLog {
    private logs: Map<string, AuditEntry[]> = new Map();

    /**
     * Record order intent
     */
    recordOrder(channelId: string, order: OrderIntent): void {
        const entry: AuditEntry = {
            timestamp: Date.now(),
            type: 'order',
            data: order,
        };

        this.addEntry(channelId, entry);
    }

    /**
     * Record fill
     */
    recordFill(channelId: string, fill: Fill): void {
        const entry: AuditEntry = {
            timestamp: Date.now(),
            type: 'fill',
            data: fill,
        };

        this.addEntry(channelId, entry);
    }

    /**
     * Record state update
     */
    recordStateUpdate(channelId: string, stateUpdate: StateUpdate): void {
        const entry: AuditEntry = {
            timestamp: Date.now(),
            type: 'state_update',
            data: stateUpdate,
        };

        this.addEntry(channelId, entry);
    }

    /**
     * Add entry to log
     */
    private addEntry(channelId: string, entry: AuditEntry): void {
        if (!this.logs.has(channelId)) {
            this.logs.set(channelId, []);
        }

        const channelLog = this.logs.get(channelId)!;
        channelLog.push(entry);

        // Keep only last 10000 entries per channel (memory management)
        if (channelLog.length > 10000) {
            channelLog.shift();
        }
    }

    /**
     * Get all entries for channel
     */
    getLog(channelId: string): AuditEntry[] {
        return this.logs.get(channelId) || [];
    }

    /**
     * Get entries since timestamp
     */
    getLogSince(channelId: string, timestamp: number): AuditEntry[] {
        const log = this.logs.get(channelId) || [];
        return log.filter(entry => entry.timestamp > timestamp);
    }

    /**
     * Export log as JSON
     */
    exportLog(channelId: string): string {
        const log = this.logs.get(channelId) || [];
        return JSON.stringify(log, null, 2);
    }

    /**
     * Clear log for channel
     */
    clearLog(channelId: string): void {
        this.logs.delete(channelId);
    }

    /**
     * Get statistics
     */
    getStats(channelId: string): {
        totalOrders: number;
        totalFills: number;
        totalStateUpdates: number;
    } {
        const log = this.logs.get(channelId) || [];

        return {
            totalOrders: log.filter(e => e.type === 'order').length,
            totalFills: log.filter(e => e.type === 'fill').length,
            totalStateUpdates: log.filter(e => e.type === 'state_update').length,
        };
    }
}

// Singleton instance
export const auditLog = new AuditLog();
