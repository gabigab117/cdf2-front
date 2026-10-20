import type { components } from '~/types/api'

type LowStockItemOut = components['schemas']['LowStockItemOut']
type PendingOut = components['schemas']['PendingOut']
type StockItemOut = components['schemas']['StockItemOut']
type StockOperationOut = components['schemas']['StockOperationOut']
type StockOrderOut = components['schemas']['StockOrderOut']
type StockedItemOut = components['schemas']['StockedItemOut']
type StockOverviewOut = components['schemas']['StockOverviewOut']

/** No item of the stock below its threshold. */
export const NO_LOW_STOCK: PendingOut['stock'] = { count: 0, items: [] }

/** The juice of the mockup, as its form writes it. */
export function stockItem(changes: Partial<StockItemOut> = {}): StockItemOut {
  return {
    id: 3,
    name: 'Jus de fruits 1 L',
    category: 'drinks',
    unit: '',
    threshold: '24.00',
    step: '6.00',
    best_before: '2027-02-01',
    ...changes,
  }
}

/** An item and where its stock stands: 18 litres of juice, below its threshold of 24. */
export function stockedItem(
  changes: Partial<StockItemOut> = {},
  figures: Partial<Omit<StockedItemOut, 'item'>> = {},
): StockedItemOut {
  return { item: stockItem(changes), quantity: '18.00', low: true, level: 38, ...figures }
}

/** The juice of the mockup, as the bell lists it. */
export function lowStockItem(changes: Partial<LowStockItemOut> = {}): LowStockItemOut {
  return { id: 3, name: 'Jus de fruits 1 L', unit: '', quantity: '18.00', threshold: '24.00', ...changes }
}

/**
 * Four items of the mockup: the cans and the kegs at or above their threshold,
 * the juice and the sweets below it.
 */
export function stockOverview(changes: Partial<StockOverviewOut> = {}): StockOverviewOut {
  return {
    items: [
      stockedItem({ id: 1, name: 'Canettes de soda 33 cl', threshold: '96.00', step: '24.00', best_before: '2027-05-01' }, { quantity: '144.00', low: false, level: 75 }),
      stockedItem({ id: 4, name: 'Fûts de bière 20 L', unit: 'fûts', threshold: '2.00', step: '1.00', best_before: '2026-12-01' }, { quantity: '2.00', low: false, level: 50 }),
      stockedItem(),
      stockedItem({ id: 6, name: 'Bonbons assortis', category: 'food', unit: 'kg', threshold: '3.00', step: '0.50', best_before: null }, { quantity: '1.50', low: true, level: 25 }),
    ],
    counts: { total: 4, low: 2, drinks: 3, food: 1, supplies: 0, lotto_raffle: 0 },
    last_stocktake: null,
    recent_operations: [],
    shopping_list: [
      { item: { id: 3, name: 'Jus de fruits 1 L', unit: '' }, quantity: '30.00' },
      { item: { id: 6, name: 'Bonbons assortis', unit: 'kg' }, quantity: '4.50' },
    ],
    orders: [],
    ...changes,
  }
}

/** The shopping of the bar for the brocante, by Julie, as « Mouvements récents » lists it. */
export function stockOperation(changes: Partial<StockOperationOut> = {}): StockOperationOut {
  return {
    id: 12,
    reason: 'purchase',
    label: 'Courses buvette',
    event: { id: 3, title: 'Brocante' },
    author: { id: 2, email: 'julie.roux@example.test', first_name: 'Julie', last_name: 'Roux' },
    created_at: '2026-09-12T16:00:00Z',
    movements: [
      { item: { id: 1, name: 'Canettes de soda 33 cl', unit: '' }, delta: '288.00' },
      { item: { id: 2, name: 'Bouteilles d’eau 50 cl', unit: '' }, delta: '120.00' },
    ],
    ...changes,
  }
}

/** The order of sweets for Halloween, validated, to be delivered on 27 October, not received yet. */
export function stockOrder(changes: Partial<StockOrderOut> = {}): StockOrderOut {
  return {
    id: 21,
    title: 'Bon de commande — Bonbons et goûter',
    issuer: 'Confiserie du Nord',
    delivery_date: '2026-10-27',
    event: { id: 12, title: 'Halloween des enfants' },
    validated: true,
    lines: [
      { item: { id: 6, name: 'Bonbons assortis', unit: 'kg' }, quantity: '12.00' },
      { item: { id: 3, name: 'Jus de fruits 1 L', unit: '' }, quantity: '60.00' },
    ],
    delivery: null,
    undoable: false,
    ...changes,
  }
}
