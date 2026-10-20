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

/** Fetches the stock again, after a write changed it. */
export function refreshStock(): Promise<void> {
  return refreshNuxtData(STOCK_KEY)
}
