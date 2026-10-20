import type { LocationQuery, LocationQueryRaw, RouteLocationRaw } from 'vue-router'
import type { components } from '~/types/api'

type StockItemCategory = components['schemas']['StockItemCategory']
type StockItemIn = components['schemas']['StockItemIn']
type StockItemOut = components['schemas']['StockItemOut']
type StockedItemOut = components['schemas']['StockedItemOut']

/** The Stock page: the goods of the bar and the games, item by item. */
export const STOCK_PATH = '/bureau/stock'

/** The page of a new item. */
export const NEW_ITEM_PATH = `${STOCK_PATH}/articles/nouveau`

/** The page of an item, to correct or delete it. */
export function itemPath(id: number): string {
  return `${STOCK_PATH}/articles/${id}`
}

/** Each category of the stock: its name, and the word of the address that filters it, in the order of the chips. */
export const STOCK_CATEGORIES: Readonly<Record<StockItemCategory, { label: string, slug: string }>> = {
  drinks: { label: 'Boissons', slug: 'boissons' },
  food: { label: 'Alimentaire', slug: 'alimentaire' },
  supplies: { label: 'Consommables', slug: 'consommables' },
  lotto_raffle: { label: 'Loto et tombola', slug: 'loto-et-tombola' },
}

/** The categories, in the order of the chips. */
export const STOCK_CATEGORY_VALUES = Object.keys(STOCK_CATEGORIES) as StockItemCategory[]

// The word of the address that keeps the items below their threshold.
const LOW = 'bas'

/** What the stock shows: every item, those below their threshold, or a category. */
export type StockFilter = 'low' | StockItemCategory | null

/** What the address of the Stock page holds. */
export interface StockQuery {
  filter: StockFilter
  search: string
}

/**
 * What an address of the Stock page asks for: `?filtre=bas`, `?filtre=boissons`,
 * `?recherche=jus`. A value the page does not know is left out.
 */
export function parseStockQuery(query: LocationQuery): StockQuery {
  const filter = query.filtre === LOW ? 'low' : STOCK_CATEGORY_VALUES.find(category => STOCK_CATEGORIES[category].slug === query.filtre) ?? null
  return { filter, search: typeof query.recherche === 'string' ? query.recherche : '' }
}

/** The address of the Stock page, in the form parseStockQuery() reads. */
export function stockQuery({ filter, search }: StockQuery): LocationQueryRaw {
  return {
    filtre: filter === null ? undefined : filter === 'low' ? LOW : STOCK_CATEGORIES[filter].slug,
    recherche: search || undefined,
  }
}

/** The items below their threshold, where the bell leads. */
export const LOW_STOCK_LOCATION: RouteLocationRaw = { path: STOCK_PATH, query: { filtre: LOW } }

// A name as a search compares it: without case or accents, « cafe » finds « Café ».
function searchable(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** The items the filter and the search keep, in the order the API gave them. */
export function shownItems(items: readonly StockedItemOut[], { filter, search }: StockQuery): StockedItemOut[] {
  const words = searchable(search.trim())
  return items.filter(({ item, low }) =>
    (filter === null || (filter === 'low' ? low : item.category === filter))
    && searchable(item.name).includes(words))
}

/** What the item form edits. The numbers are texts, as their fields hold them. */
export interface ItemFields {
  name: string
  category: StockItemCategory | ''
  unit: string
  threshold: string
  step: string
  /** The first of the best-before month (« 2027-05-01 »), or empty without one. */
  bestBefore: string
}

/** The fields of a new item, moved one by one. */
export function newItemFields(): ItemFields {
  return { name: '', category: '', unit: '', threshold: '', step: '1', bestBefore: '' }
}

// « 24 » rather than « 24.00 », « 0,5 » rather than « 0.50 »: as a member types it.
function typed(decimal: string): string {
  return String(Number(decimal)).replace('.', ',')
}

/** The fields of an item to correct, as the API gave it. */
export function itemFields(item: StockItemOut): ItemFields {
  return {
    name: item.name,
    category: item.category,
    unit: item.unit,
    threshold: typed(item.threshold),
    step: typed(item.step),
    bestBefore: item.best_before ?? '',
  }
}

/** The item to send, whole. */
export function itemPayload(fields: ItemFields): StockItemIn {
  return {
    name: fields.name,
    // An empty category is no choice: the API says what it lacks.
    category: fields.category as StockItemCategory,
    unit: fields.unit,
    threshold: amountInput(fields.threshold) ?? '',
    step: amountInput(fields.step) ?? '',
    best_before: fields.bestBefore || null,
  }
}

// The best-before months a member chooses from: from a year ago, for goods past
// their date, to four years ahead.
const MONTHS_BEFORE = 12
const MONTHS_AFTER = 47

/**
 * The best-before months the item form offers, as the first of each month
 * (« 2027-05-01 »), counted in Paris from `now`. The month an item already has
 * stays among them, however far.
 */
export function bestBeforeMonths(now: number, current: string | null = null): string[] {
  const { year, month } = parisCalendar(now)
  const months = Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - MONTHS_BEFORE + index, 1))
    return date.toISOString().slice(0, 10)
  })
  return current && !months.includes(current) ? [...months, current].sort() : months
}

/** The fields of the item form, by their name in the API. */
export const ITEM_FIELD_LABELS: Readonly<Record<string, string>> = {
  name: 'Nom',
  category: 'Catégorie',
  unit: 'Unité',
  threshold: 'Seuil',
  step: 'Pas',
  best_before: 'DLUO',
}

/** The name of a field of the item form, before an error the form does not show under it. */
export function itemFieldLabel(path: string): string {
  return ITEM_FIELD_LABELS[path] ?? path
}
