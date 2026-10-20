const STOCK_KEY = 'board:stock'

/**
 * The stock, item by item, with its figures: the Stock page reads it, and the
 * pages that write it, for its items and what each holds. Lazy: the page shows
 * while it comes.
 */
export function useStock() {
  return useLazyAsyncData(STOCK_KEY, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/stock', { signal })))
}

/** What an order brings to the stock, and its delivery, for its panel. Lazy. */
export function useStockOrder(id: number) {
  return useLazyAsyncData(`board:stock:order:${id}`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/stock/orders/{document_id}', { params: { path: { document_id: id } }, signal })))
}

/** Fetches the stock again, after a write changed it. */
export function refreshStock(): Promise<void> {
  return refreshNuxtData(STOCK_KEY)
}
