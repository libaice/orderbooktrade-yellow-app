/**
 * EIP-712 signature utilities for state channel protocol
 */

import { ethers } from 'ethers';
import type {
    OrderIntent,
    StateUpdate,
    EIP712Domain,
    ORDER_INTENT_TYPES,
    STATE_UPDATE_TYPES
} from './types';

const DOMAIN: EIP712Domain = {
    name: 'StateChannelTrading',
    version: '1',
    chainId: 1, // Will be updated based on network
    verifyingContract: '0x0000000000000000000000000000000000000000', // Placeholder
};

/**
 * Sign an order intent using EIP-712
 */
export async function signOrderIntent(
    orderIntent: Omit<OrderIntent, 'signature'>,
    signer: ethers.Signer
): Promise<OrderIntent> {
    const domain = { ...DOMAIN };

    // Update chainId from signer
    const network = await signer.provider?.getNetwork();
    if (network) {
        domain.chainId = Number(network.chainId);
    }

    const types = {
        OrderIntent: [
            { name: 'marketId', type: 'string' },
            { name: 'side', type: 'string' },
            { name: 'quantity', type: 'string' },
            { name: 'limitPrice', type: 'string' },
            { name: 'nonce', type: 'uint256' },
            { name: 'expiresAt', type: 'uint256' },
            { name: 'userAddress', type: 'address' },
        ],
    };

    const value = {
        marketId: orderIntent.marketId,
        side: orderIntent.side,
        quantity: orderIntent.quantity,
        limitPrice: orderIntent.limitPrice,
        nonce: orderIntent.nonce,
        expiresAt: orderIntent.expiresAt,
        userAddress: orderIntent.userAddress,
    };

    const signature = await signer.signTypedData(domain, types, value);

    return {
        ...orderIntent,
        signature,
    };
}

/**
 * Verify an order intent signature
 */
export function verifyOrderIntent(orderIntent: OrderIntent): boolean {
    try {
        const domain = { ...DOMAIN };

        const types = {
            OrderIntent: [
                { name: 'marketId', type: 'string' },
                { name: 'side', type: 'string' },
                { name: 'quantity', type: 'string' },
                { name: 'limitPrice', type: 'string' },
                { name: 'nonce', type: 'uint256' },
                { name: 'expiresAt', type: 'uint256' },
                { name: 'userAddress', type: 'address' },
            ],
        };

        const value = {
            marketId: orderIntent.marketId,
            side: orderIntent.side,
            quantity: orderIntent.quantity,
            limitPrice: orderIntent.limitPrice,
            nonce: orderIntent.nonce,
            expiresAt: orderIntent.expiresAt,
            userAddress: orderIntent.userAddress,
        };

        const recoveredAddress = ethers.verifyTypedData(
            domain,
            types,
            value,
            orderIntent.signature
        );

        return recoveredAddress.toLowerCase() === orderIntent.userAddress.toLowerCase();
    } catch (error) {
        console.error('Order intent verification failed:', error);
        return false;
    }
}

/**
 * Sign a state update (dual signature required)
 */
export async function signStateUpdate(
    stateUpdate: Omit<StateUpdate, 'userSignature' | 'operatorSignature'>,
    signer: ethers.Signer
): Promise<string> {
    const domain = { ...DOMAIN };

    // Update chainId from signer
    const network = await signer.provider?.getNetwork();
    if (network) {
        domain.chainId = Number(network.chainId);
    }

    const types = {
        StateUpdate: [
            { name: 'channelId', type: 'string' },
            { name: 'sequence', type: 'uint256' },
            { name: 'baseBalance', type: 'string' },
            { name: 'quoteBalance', type: 'string' },
            { name: 'cumulativeFees', type: 'string' },
            { name: 'timestamp', type: 'uint256' },
        ],
    };

    const value = {
        channelId: stateUpdate.channelId,
        sequence: stateUpdate.sequence,
        baseBalance: stateUpdate.balances.base,
        quoteBalance: stateUpdate.balances.quote,
        cumulativeFees: stateUpdate.cumulativeFees,
        timestamp: stateUpdate.timestamp,
    };

    return await signer.signTypedData(domain, types, value);
}

/**
 * Verify a state update signature
 */
export function verifyStateUpdateSignature(
    stateUpdate: Omit<StateUpdate, 'userSignature' | 'operatorSignature'>,
    signature: string,
    expectedAddress: string
): boolean {
    try {
        const domain = { ...DOMAIN };

        const types = {
            StateUpdate: [
                { name: 'channelId', type: 'string' },
                { name: 'sequence', type: 'uint256' },
                { name: 'baseBalance', type: 'string' },
                { name: 'quoteBalance', type: 'string' },
                { name: 'cumulativeFees', type: 'string' },
                { name: 'timestamp', type: 'uint256' },
            ],
        };

        const value = {
            channelId: stateUpdate.channelId,
            sequence: stateUpdate.sequence,
            baseBalance: stateUpdate.balances.base,
            quoteBalance: stateUpdate.balances.quote,
            cumulativeFees: stateUpdate.cumulativeFees,
            timestamp: stateUpdate.timestamp,
        };

        const recoveredAddress = ethers.verifyTypedData(
            domain,
            types,
            value,
            signature
        );

        return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
        console.error('State update verification failed:', error);
        return false;
    }
}

/**
 * Generate session key for high-frequency signing (optional optimization)
 */
export async function generateSessionKey(): Promise<ethers.HDNodeWallet> {
    return ethers.Wallet.createRandom();
}

/**
 * Delegate signing authority to session key (EIP-712 delegation)
 */
export async function delegateToSessionKey(
    sessionKeyAddress: string,
    expiresAt: number,
    masterSigner: ethers.Signer
): Promise<string> {
    const domain = { ...DOMAIN };

    const network = await masterSigner.provider?.getNetwork();
    if (network) {
        domain.chainId = Number(network.chainId);
    }

    const types = {
        SessionKeyDelegation: [
            { name: 'sessionKey', type: 'address' },
            { name: 'expiresAt', type: 'uint256' },
        ],
    };

    const value = {
        sessionKey: sessionKeyAddress,
        expiresAt,
    };

    return await masterSigner.signTypedData(domain, types, value);
}
