import type { components } from '~/types/api'

type LowStockItemOut = components['schemas']['LowStockItemOut']
type PendingOut = components['schemas']['PendingOut']
type StockItemOut = components['schemas']['StockItemOut']
type StockOperationDetailOut = components['schemas']['StockOperationDetailOut']
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
    initial_cost: null,
    ...changes,
  }
}

/**
 * An item and where its stock stands: 18 litres of juice, below its threshold
 * of 24, worth 21,60 € at 1,20 € a litre.
 */
export function stockedItem(
  changes: Partial<StockItemOut> = {},
  figures: Partial<Omit<StockedItemOut, 'item'>> = {},
): StockedItemOut {
  return {
    item: stockItem(changes),
    quantity: '18.00',
    low: true,
    level: 75,
    average_cost: '1.2000',
    value: '21.60',
    last_unit_cost: '1.2000',
    ...figures,
  }
}

/** The juice of the mockup, as the bell lists it. */
export function lowStockItem(changes: Partial<LowStockItemOut> = {}): LowStockItemOut {
  return { id: 3, name: 'Jus de fruits 1 L', unit: '', quantity: '18.00', threshold: '24.00', ...changes }
}

/**
 * Four items of the mockup: the cans and the kegs at or above their threshold,
 * the juice and the sweets below it; the kegs, of no cost, not valued.
 */
export function stockOverview(changes: Partial<StockOverviewOut> = {}): StockOverviewOut {
  return {
    items: [
      stockedItem(
        { id: 1, name: 'Canettes de soda 33 cl', threshold: '96.00', step: '24.00', best_before: '2027-05-01' },
        { quantity: '144.00', low: false, level: 100, average_cost: '0.5500', value: '79.20', last_unit_cost: '0.5500' },
      ),
      stockedItem(
        { id: 4, name: 'Fûts de bière 20 L', unit: 'fûts', threshold: '2.00', step: '1.00', best_before: '2026-12-01' },
        { quantity: '2.00', low: false, level: 100, average_cost: null, value: null, last_unit_cost: null },
      ),
      stockedItem(),
      stockedItem(
        { id: 6, name: 'Bonbons assortis', category: 'food', unit: 'kg', threshold: '3.00', step: '0.50', best_before: null },
        { quantity: '1.50', low: true, level: 50, average_cost: '9.0000', value: '13.50', last_unit_cost: '9.0000' },
      ),
    ],
    counts: { total: 4, low: 2, drinks: 3, food: 1, supplies: 0, lotto_raffle: 0 },
    last_stocktake: null,
    recent_operations: [],
    shopping_list: [
      { item: { id: 3, name: 'Jus de fruits 1 L', unit: '' }, quantity: '6.00', estimated_cost: '7.20' },
      { item: { id: 6, name: 'Bonbons assortis', unit: 'kg' }, quantity: '1.50', estimated_cost: '13.50' },
    ],
    shopping_list_estimated_cost: { total: '20.70', unpriced_lines: 0 },
    orders: [],
    valuation: {
      value: '114.30',
      categories: [
        { category: 'drinks', value: '100.80' },
        { category: 'food', value: '13.50' },
        { category: 'supplies', value: '0.00' },
        { category: 'lotto_raffle', value: '0.00' },
      ],
      unvalued_items: 1,
      unpriced_purchases: 0,
    },
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
    unpriced: false,
    ...changes,
  }
}

/**
 * The shopping of the bar, as its page shows it: 288 cans for 158,40 €, and 120
 * bottles of water whose cost waits.
 */
export function stockOperationDetail(changes: Partial<StockOperationDetailOut> = {}): StockOperationDetailOut {
  const { movements: _movements, ...operation } = stockOperation()
  return {
    ...operation,
    unpriced: true,
    priceable: true,
    cost: '158.40',
    lines: [
      {
        item: { id: 1, name: 'Canettes de soda 33 cl', unit: '' },
        delta: '288.00',
        cost: '158.40',
        unit_cost: '0.5500',
        value: '158.40',
        unpriced: false,
      },
      {
        item: { id: 2, name: 'Bouteilles d’eau 50 cl', unit: '' },
        delta: '120.00',
        cost: null,
        unit_cost: null,
        value: null,
        unpriced: true,
      },
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
