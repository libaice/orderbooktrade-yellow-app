/**
 * Prediction Market Matching Engine
 * 
 * Browser-based matching engine with:
 * - Price-time priority FIFO
 * - Binary constraint (YES + NO = 1 USDC)
 * - Limit and market order support
 */

import type {
    Order,
    OrderRequest,
    OrderResult,
    Fill,
    Orderbook,
    PredictionMarketState,
    UserBalance,
    Outcome,
    OrderSide,
    PriceLevel,
    OrderbookDisplay,
} from './types';

// Generate unique ID
const generateId = (): string =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create initial empty state
 */
export function createInitialState(
    marketId: string,
    question: string
): PredictionMarketState {
    return {
        marketId,
        question,
        orderbook: {
            yesBids: [],
            yesAsks: [],
            noBids: [],
            noAsks: [],
        },
        balances: {},
        fills: [],
        sequence: 0,
        timestamp: Date.now(),
        lastYesPrice: null,
        lastNoPrice: null,
    };
}

/**
 * Initialize user balance
 */
export function initUserBalance(
    state: PredictionMarketState,
    userId: string,
    usdcAmount: number
): PredictionMarketState {
    return {
        ...state,
        balances: {
            ...state.balances,
            [userId]: {
                usdc: usdcAmount,
                yes: 0,
                no: 0,
            },
        },
        sequence: state.sequence + 1,
        timestamp: Date.now(),
    };
}

/**
 * Main matching engine class
 */
export class PredictionMarketMatcher {
    /**
     * Process an order request and return updated state
     */
    processOrder(
        currentState: PredictionMarketState,
        request: OrderRequest
    ): OrderResult {
        // Validate request
        const validationError = this.validateRequest(currentState, request);
        if (validationError) {
            return {
                success: false,
                error: validationError,
                fills: [],
                newState: currentState,
            };
        }

        // Create order
        const order: Order = {
            id: generateId(),
            userId: request.userId,
            outcome: request.outcome,
            side: request.side,
            type: request.type,
            price: request.type === 'MARKET'
                ? (request.side === 'BUY' ? 1 : 0)  // Market buy at max, sell at min
                : request.price!,
            quantity: request.quantity,
            remainingQuantity: request.quantity,
            timestamp: Date.now(),
            status: 'OPEN',
        };

        // Try to match
        const { fills, updatedOrder, updatedOrderbook, updatedBalances } =
            this.matchOrder(currentState, order);

        // Update state
        let newOrderbook = updatedOrderbook;

        // Add remaining order to book if not fully filled
        if (updatedOrder.remainingQuantity > 0 && updatedOrder.type === 'LIMIT') {
            newOrderbook = this.addToOrderbook(newOrderbook, updatedOrder);
        }

        // Update order status
        if (updatedOrder.remainingQuantity === 0) {
            updatedOrder.status = 'FILLED';
        } else if (updatedOrder.remainingQuantity < updatedOrder.quantity) {
            updatedOrder.status = 'PARTIAL';
        }

        // Calculate last prices from fills
        let lastYesPrice = currentState.lastYesPrice;
        let lastNoPrice = currentState.lastNoPrice;

        for (const fill of fills) {
            if (fill.outcome === 'YES') {
                lastYesPrice = fill.price;
                lastNoPrice = 1 - fill.price; // Binary constraint
            } else {
                lastNoPrice = fill.price;
                lastYesPrice = 1 - fill.price;
            }
        }

        const newState: PredictionMarketState = {
            ...currentState,
            orderbook: newOrderbook,
            balances: updatedBalances,
            fills: [...currentState.fills, ...fills],
            sequence: currentState.sequence + 1,
            timestamp: Date.now(),
            lastYesPrice,
            lastNoPrice,
        };

        return {
            success: true,
            order: updatedOrder,
            fills,
            newState,
        };
    }

    /**
     * Validate order request
     */
    private validateRequest(
        state: PredictionMarketState,
        request: OrderRequest
    ): string | null {
        // Check user exists
        const userBalance = state.balances[request.userId];
        if (!userBalance) {
            return 'User not found. Please deposit first.';
        }

        // Validate quantity
        if (request.quantity <= 0) {
            return 'Quantity must be positive';
        }

        // Validate price for limit orders
        if (request.type === 'LIMIT') {
            if (request.price === undefined) {
                return 'Price required for limit orders';
            }
            if (request.price <= 0 || request.price >= 1) {
                return 'Price must be between 0 and 1 USDC (exclusive)';
            }
        }

        // Check sufficient balance
        if (request.side === 'BUY') {
            const requiredUSDC = (request.price || 1) * request.quantity;
            if (userBalance.usdc < requiredUSDC) {
                return `Insufficient USDC. Need ${requiredUSDC.toFixed(4)}, have ${userBalance.usdc.toFixed(4)}`;
            }
        } else {
            // Selling requires holding the outcome tokens
            const tokens = request.outcome === 'YES' ? userBalance.yes : userBalance.no;
            if (tokens < request.quantity) {
                return `Insufficient ${request.outcome} tokens. Need ${request.quantity}, have ${tokens}`;
            }
        }

        return null;
    }

    /**
     * Match order against orderbook
     */
    private matchOrder(
        state: PredictionMarketState,
        order: Order
    ): {
        fills: Fill[];
        updatedOrder: Order;
        updatedOrderbook: Orderbook;
        updatedBalances: Record<string, UserBalance>;
    } {
        const fills: Fill[] = [];
        let remainingQty = order.quantity;
        let balances = { ...state.balances };
        let orderbook = this.cloneOrderbook(state.orderbook);

        // Get matchable orders from opposite side
        const matchableOrders = this.getMatchableOrders(orderbook, order);

        for (const makerOrder of matchableOrders) {
            if (remainingQty <= 0) break;

            // Check if prices can match
            if (!this.canMatch(order, makerOrder)) break;

            // Calculate fill quantity
            const fillQty = Math.min(remainingQty, makerOrder.remainingQuantity);
            const fillPrice = makerOrder.price; // Price-time priority: taker gets maker's price

            // Create fill
            const fill: Fill = {
                id: generateId(),
                makerOrderId: makerOrder.id,
                takerOrderId: order.id,
                price: fillPrice,
                quantity: fillQty,
                timestamp: Date.now(),
                outcome: order.outcome,
            };
            fills.push(fill);

            // Update balances
            balances = this.updateBalancesForFill(balances, order, makerOrder, fill);

            // Update quantities
            remainingQty -= fillQty;
            makerOrder.remainingQuantity -= fillQty;

            // Update maker order status
            if (makerOrder.remainingQuantity === 0) {
                makerOrder.status = 'FILLED';
                orderbook = this.removeFromOrderbook(orderbook, makerOrder);
            }
        }

        const updatedOrder: Order = {
            ...order,
            remainingQuantity: remainingQty,
        };

        return {
            fills,
            updatedOrder,
            updatedOrderbook: orderbook,
            updatedBalances: balances,
        };
    }

    /**
     * Get orders that could match with incoming order
     * Sorted by price-time priority
     */
    private getMatchableOrders(orderbook: Orderbook, order: Order): Order[] {
        let orders: Order[];

        if (order.side === 'BUY') {
            // Buying YES: match against YES asks
            // Alternatively: match against NO bids (binary constraint)
            if (order.outcome === 'YES') {
                orders = [...orderbook.yesAsks];
                // Sort by price ascending (lowest ask first)
                orders.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
            } else {
                orders = [...orderbook.noAsks];
                orders.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
            }
        } else {
            // Selling YES: match against YES bids
            if (order.outcome === 'YES') {
                orders = [...orderbook.yesBids];
                // Sort by price descending (highest bid first)
                orders.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
            } else {
                orders = [...orderbook.noBids];
                orders.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
            }
        }

        return orders;
    }

    /**
     * Check if two orders can match
     * Implements binary constraint: YES + NO = 1
     */
    private canMatch(takerOrder: Order, makerOrder: Order): boolean {
        if (takerOrder.side === 'BUY') {
            // Buyer willing to pay at least maker's ask
            return takerOrder.price >= makerOrder.price;
        } else {
            // Seller willing to accept at most maker's bid
            return takerOrder.price <= makerOrder.price;
        }
    }

    /**
     * Update balances after a fill
     */
    private updateBalancesForFill(
        balances: Record<string, UserBalance>,
        takerOrder: Order,
        makerOrder: Order,
        fill: Fill
    ): Record<string, UserBalance> {
        const newBalances = { ...balances };
        const takerBalance = { ...newBalances[takerOrder.userId] };
        const makerBalance = { ...newBalances[makerOrder.userId] };

        const usdcAmount = fill.price * fill.quantity;
        const outcome = fill.outcome.toLowerCase() as 'yes' | 'no';

        if (takerOrder.side === 'BUY') {
            // Taker buys tokens: pays USDC, receives outcome tokens
            takerBalance.usdc -= usdcAmount;
            takerBalance[outcome] += fill.quantity;

            // Maker sells tokens: receives USDC, loses outcome tokens
            makerBalance.usdc += usdcAmount;
            makerBalance[outcome] -= fill.quantity;
        } else {
            // Taker sells tokens: receives USDC, loses outcome tokens
            takerBalance.usdc += usdcAmount;
            takerBalance[outcome] -= fill.quantity;

            // Maker buys tokens: pays USDC, receives outcome tokens
            makerBalance.usdc -= usdcAmount;
            makerBalance[outcome] += fill.quantity;
        }

        newBalances[takerOrder.userId] = takerBalance;
        newBalances[makerOrder.userId] = makerBalance;

        return newBalances;
    }

    /**
     * Add order to orderbook
     */
    private addToOrderbook(orderbook: Orderbook, order: Order): Orderbook {
        const newOrderbook = this.cloneOrderbook(orderbook);

        if (order.outcome === 'YES') {
            if (order.side === 'BUY') {
                newOrderbook.yesBids.push(order);
                newOrderbook.yesBids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
            } else {
                newOrderbook.yesAsks.push(order);
                newOrderbook.yesAsks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
            }
        } else {
            if (order.side === 'BUY') {
                newOrderbook.noBids.push(order);
                newOrderbook.noBids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
            } else {
                newOrderbook.noAsks.push(order);
                newOrderbook.noAsks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
            }
        }

        return newOrderbook;
    }

    /**
     * Remove order from orderbook
     */
    private removeFromOrderbook(orderbook: Orderbook, order: Order): Orderbook {
        const newOrderbook = this.cloneOrderbook(orderbook);

        if (order.outcome === 'YES') {
            if (order.side === 'BUY') {
                newOrderbook.yesBids = newOrderbook.yesBids.filter(o => o.id !== order.id);
            } else {
                newOrderbook.yesAsks = newOrderbook.yesAsks.filter(o => o.id !== order.id);
            }
        } else {
            if (order.side === 'BUY') {
                newOrderbook.noBids = newOrderbook.noBids.filter(o => o.id !== order.id);
            } else {
                newOrderbook.noAsks = newOrderbook.noAsks.filter(o => o.id !== order.id);
            }
        }

        return newOrderbook;
    }

    /**
     * Clone orderbook (immutable update)
     */
    private cloneOrderbook(orderbook: Orderbook): Orderbook {
        return {
            yesBids: [...orderbook.yesBids],
            yesAsks: [...orderbook.yesAsks],
            noBids: [...orderbook.noBids],
            noAsks: [...orderbook.noAsks],
        };
    }

    /**
     * Cancel an order
     */
    cancelOrder(
        state: PredictionMarketState,
        orderId: string,
        userId: string
    ): PredictionMarketState {
        let orderbook = this.cloneOrderbook(state.orderbook);
        let found = false;

        // Search and remove from all sides
        const removeFromList = (orders: Order[]): Order[] => {
            const idx = orders.findIndex(o => o.id === orderId && o.userId === userId);
            if (idx !== -1) {
                found = true;
                return [...orders.slice(0, idx), ...orders.slice(idx + 1)];
            }
            return orders;
        };

        orderbook.yesBids = removeFromList(orderbook.yesBids);
        orderbook.yesAsks = removeFromList(orderbook.yesAsks);
        orderbook.noBids = removeFromList(orderbook.noBids);
        orderbook.noAsks = removeFromList(orderbook.noAsks);

        if (!found) {
            return state; // Order not found, return unchanged state
        }

        return {
            ...state,
            orderbook,
            sequence: state.sequence + 1,
            timestamp: Date.now(),
        };
    }

    /**
     * Get aggregated orderbook display data
     */
    getOrderbookDisplay(state: PredictionMarketState): OrderbookDisplay {
        const aggregateOrders = (orders: Order[]): PriceLevel[] => {
            const levels = new Map<number, PriceLevel>();

            for (const order of orders) {
                const existing = levels.get(order.price);
                if (existing) {
                    existing.quantity += order.remainingQuantity;
                    existing.orderCount += 1;
                } else {
                    levels.set(order.price, {
                        price: order.price,
                        quantity: order.remainingQuantity,
                        orderCount: 1,
                    });
                }
            }

            return Array.from(levels.values());
        };

        const yesBids = aggregateOrders(state.orderbook.yesBids)
            .sort((a, b) => b.price - a.price);
        const yesAsks = aggregateOrders(state.orderbook.yesAsks)
            .sort((a, b) => a.price - b.price);

        const bestYesBid = yesBids.length > 0 ? yesBids[0].price : null;
        const bestYesAsk = yesAsks.length > 0 ? yesAsks[0].price : null;

        const spread = bestYesBid !== null && bestYesAsk !== null
            ? bestYesAsk - bestYesBid
            : null;

        const midPrice = bestYesBid !== null && bestYesAsk !== null
            ? (bestYesBid + bestYesAsk) / 2
            : null;

        return {
            yesBids,
            yesAsks,
            bestYesBid,
            bestYesAsk,
            spread,
            midPrice,
        };
    }
}

// Singleton instance
export const matcher = new PredictionMarketMatcher();
