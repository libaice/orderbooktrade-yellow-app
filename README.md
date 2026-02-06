# ⚡ State Channel Trading System

A **trustless, high-frequency trading system** built with state channels for ETHGlobal hackathon. Trade at lightning speed with the security guarantee that you can always recover your funds, even if the operator goes offline.

## 🎯 Key Features

- ⚡ **High-Frequency Trading**: Off-chain order settlement (targeting 100+ orders/sec)
- 🔒 **Trustless Security**: Dual-signature state updates + force exit capability
- 🌐 **Yellow Network Integration**: Three-tier balance system (Wallet → Unified → Channel)
- 📊 **Real-Time Performance**: Live metrics dashboard with <50ms fill latency
- 💪 **Force Exit Protection**: Export proof bundle for on-chain dispute resolution

## 🏗️ Architecture

### Hub-and-Spoke Model
```
User A ↔ [State Channel] ↔ Operator
User B ↔ [State Channel] ↔ Operator  
User C ↔ [State Channel] ↔ Operator
```

Each user maintains one channel to the operator. The operator performs internal matching and netting, then updates each user's channel state with dual signatures.

### Trust Model

✅ **Operator CANNOT:**
- Steal funds (all state updates require dual signatures)
- Prevent withdrawal (users can force exit with proof)
- Replay old states (nonce protection)

⚠️ **Operator CAN:**
- Match orders (centralized matching)
- Censor orders (refuse to sign updates)

💪 **User Protection:**
- Latest dual-signed state stored locally
- Force exit exports complete proof bundle
- On-chain dispute resolution available

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) and connect your MetaMask wallet.

## 📦 Project Structure

```
lib/
├── protocol/
│   ├── types.ts          # Core protocol types
│   ├── signatures.ts     # EIP-712 signature utilities
│   └── channel.ts        # State channel manager
├── yellow/
│   ├── yellow-client.ts  # Yellow Network WebSocket client
│   └── balance-manager.ts # Three-tier balance tracking
└── matching/
    ├── matching-client.ts # Matching engine WebSocket client
    └── audit-log.ts       # Audit trail for force exit proofs

components/
├── BalancePanel.tsx       # Three-tier balance display
├── OrderForm.tsx          # Order placement with signatures
├── OrderBook.tsx          # Real-time order book
├── ChannelManager.tsx     # Channel lifecycle management
└── PerformanceMetrics.tsx # Live performance dashboard

app/
└── page.tsx              # Main trading interface
```

## 🔐 Security Features

### EIP-712 Typed Signatures
All protocol messages use EIP-712 for human-readable, type-safe signatures:
- `OrderIntent`: User signs before order submission
- `StateUpdate`: Dual signatures (user + operator)
- `SessionKeyDelegation`: Optional high-frequency optimization

### Nonce Protection
- Monotonic sequence numbers prevent replay attacks
- Each order has unique nonce
- State updates have monotonic sequence

### Force Exit Capability
```typescript
// Generate proof bundle
const proof = channelManager.exportProof(channelId);
// Contains: latest state + all orders + all fills
// Submit to chain for dispute resolution
```

## 💻 Usage Example

### 1. Connect Wallet
```typescript
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
```

### 2. Open Channel
```typescript
await balanceManager.allocateToChannel(channelId, {
  base: '0.1',    // 0.1 ETH
  quote: '100'    // 100 USDC
});
```

### 3. Place Order
```typescript
const signedOrder = await signOrderIntent({
  marketId: 'ETH-USDC',
  side: 'buy',
  quantity: '0.01',
  limitPrice: '2000',
  nonce: 42,
  expiresAt: Date.now() + 60000
}, signer);

await matchingClient.submitOrder(signedOrder);
```

### 4. Receive Fill
```typescript
matchingClient.on('fill', (fill) => {
  console.log('Order filled:', fill);
});

matchingClient.on('state_update', (stateUpdate) => {
  // New balances after trade
  channelManager.updateChannelState(channelId, stateUpdate);
});
```

### 5. Close Channel
```typescript
// Cooperative close
await balanceManager.withdrawFromChannel(channelId, finalBalances);

// OR force exit (emergency)
channelManager.initiateForceExit(channelId);
const proof = channelManager.exportProof(channelId);
```

## 🎯 Hackathon Demo Flow

1. **Connect wallet** → Show three-tier balances
2. **Open channel** → Allocate 0.1 ETH + 100 USDC
3. **Rapid-fire orders** → Place 50+ orders in seconds
4. **Show metrics** → Real-time fills, <50ms latency
5. **Cooperative close** → Withdraw to unified balance
6. **Force exit demo** → Simulate operator offline → export proof

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Orders/sec | 100+ | ⏳ Needs real matching engine |
| Fill latency | <50ms | ⏳ Needs real matching engine |
| Force exit | ✅ | ✅ Proof export implemented |
| Dual signatures | ✅ | ✅ All state updates verified |

## 🔧 Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **Blockchain**: ethers.js v6
- **WebSocket**: Native WebSocket API
- **Signatures**: EIP-712 typed data

## 🚧 Next Steps

### For Production
- [ ] Deploy `StateChannel.sol` for on-chain disputes
- [ ] Integrate real Yellow Network endpoints
- [ ] Connect to production matching engine
- [ ] Add comprehensive test suite
- [ ] Security audit

### For Hackathon
- [ ] Create mock Yellow Network server
- [ ] Create mock matching engine
- [ ] Generate realistic order book data
- [ ] Prepare demo script
- [ ] Create pitch deck

## 📝 Documentation

- [Implementation Plan](/.gemini/antigravity/brain/1dc0192e-58b3-48f9-9061-7ebe6a798540/implementation_plan.md)
- [Walkthrough](/.gemini/antigravity/brain/1dc0192e-58b3-48f9-9061-7ebe6a798540/walkthrough.md)
- [Task Breakdown](/.gemini/antigravity/brain/1dc0192e-58b3-48f9-9061-7ebe6a798540/task.md)

## 🤝 Contributing

This is a hackathon project. For production use, please conduct thorough security audits.

## 📄 License

MIT

---

Built for ETHGlobal with ❤️ by the OrderBook.trade team
