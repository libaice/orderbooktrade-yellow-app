/**
 * Core protocol types for state channel trading system
 */

export interface OrderIntent {
  /** Unique market identifier (e.g., "ETH-USDC") */
  marketId: string;
  /** Order side: buy or sell */
  side: 'buy' | 'sell';
  /** Order quantity in base asset */
  quantity: string;
  /** Limit price (0 for market orders) */
  limitPrice: string;
  /** Monotonic nonce for replay protection */
  nonce: number;
  /** Unix timestamp when order expires */
  expiresAt: number;
  /** User's EIP-712 signature */
  signature: string;
  /** User's address */
  userAddress: string;
}

export interface Fill {
  /** Reference to original order intent */
  orderId: string;
  /** Actual fill price */
  fillPrice: string;
  /** Actual fill quantity */
  fillQuantity: string;
  /** Trading fee charged */
  fee: string;
  /** Unix timestamp of fill */
  timestamp: number;
  /** Matching batch ID for auditability */
  batchId?: string;
  /** Operator's signature */
  operatorSignature: string;
}

export interface StateUpdate {
  /** Unique channel identifier */
  channelId: string;
  /** Monotonic sequence number */
  sequence: number;
  /** Updated balances after trades */
  balances: {
    base: string;  // e.g., ETH
    quote: string; // e.g., USDC
  };
  /** Cumulative fees paid */
  cumulativeFees: string;
  /** Unix timestamp of state update */
  timestamp: number;
  /** User's signature */
  userSignature: string;
  /** Operator's signature */
  operatorSignature: string;
}

export interface ChannelState {
  /** Channel ID */
  id: string;
  /** User address */
  userAddress: string;
  /** Operator address */
  operatorAddress: string;
  /** Current sequence number */
  sequence: number;
  /** Current balances */
  balances: {
    base: string;
    quote: string;
  };
  /** Channel status */
  status: 'opening' | 'active' | 'closing' | 'closed' | 'disputed';
  /** Latest state update */
  latestState?: StateUpdate;
  /** Nonce for next order */
  nextNonce: number;
}

export interface BalanceState {
  /** On-chain wallet balance */
  wallet: {
    eth: string;
    usdc: string;
  };
  /** Yellow Network unified balance */
  unified: {
    eth: string;
    usdc: string;
  };
  /** State channel locked balance */
  channel: {
    eth: string;
    usdc: string;
  };
}

export interface ForceExitProof {
  /** Channel ID */
  channelId: string;
  /** Latest dual-signed state */
  latestState: StateUpdate;
  /** All order intents since last state */
  orderIntents: OrderIntent[];
  /** All fills since last state */
  fills: Fill[];
  /** Proof generation timestamp */
  generatedAt: number;
}

// EIP-712 Domain
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

// Typed data for OrderIntent
export const ORDER_INTENT_TYPES = {
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

// Typed data for StateUpdate
export const STATE_UPDATE_TYPES = {
  StateUpdate: [
    { name: 'channelId', type: 'string' },
    { name: 'sequence', type: 'uint256' },
    { name: 'baseBalance', type: 'string' },
    { name: 'quoteBalance', type: 'string' },
    { name: 'cumulativeFees', type: 'string' },
    { name: 'timestamp', type: 'uint256' },
  ],
};
