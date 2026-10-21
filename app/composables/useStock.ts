import type { OperationsQuery } from '~/utils/stock'

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

/** A page of the operations of the stock, the latest first: all, or those waiting for a cost. Lazy. */
export function useStockOperations(query: () => OperationsQuery) {
  return useLazyAsyncData(
    () => {
      const { unpriced, page } = query()
      return `board:stock:operations:${unpriced ? 'unpriced' : 'all'}:${page}`
    },
    (_nuxtApp, { signal }) => {
      const { unpriced, page } = query()
      return loadData(useApi().GET('/api/board/stock/operations', {
        params: { query: { unpriced, page, page_size: OPERATIONS_PAGE_SIZE } },
        signal,
      }))
    },
  )
}

/** An operation of the stock, its lines valued, for its page. Lazy. */
export function useStockOperation(id: number) {
  return useLazyAsyncData(`board:stock:operation:${id}`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/stock/operations/{operation_id}', { params: { path: { operation_id: id } }, signal })))
}

/** A page of an item's stock card (« fiche de stock »), the latest movement first. Lazy. */
export function useItemHistory(id: number, page: () => number) {
  return useLazyAsyncData(
    () => `board:stock:item:${id}:history:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/stock/items/{item_id}/history', {
        params: { path: { item_id: id }, query: { page: page(), page_size: OPERATIONS_PAGE_SIZE } },
        signal,
      })),
  )
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
