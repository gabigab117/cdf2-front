import type { LedgerFilter } from '~/utils/treasury'

/** A fiscal year's results: its figures, its events with lines, its years. Lazy. */
export function useTreasuryResults(year: () => number) {
  return useLazyAsyncData(
    () => `board:treasury:results:${year()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/treasury/results', { params: { query: { year: year() } }, signal })),
  )
}

/** A page of the journal: a fiscal year, a filter, and how many lines a page holds. */
export interface LedgerPage {
  year: number
  filter: LedgerFilter
  page: number
  size: number
}

/** A page of the journal, the latest line first. Lazy. */
export function useLedgerEntries(query: () => LedgerPage) {
  return useLazyAsyncData(
    () => {
      const { year, filter, page, size } = query()
      return `board:treasury:entries:${year}:${filter ?? 'all'}:${page}:${size}`
    },
    (_nuxtApp, { signal }) => {
      const { year, filter, page, size } = query()
      return loadData(useApi().GET('/api/board/treasury/entries', {
        params: { query: { ...ledgerFilters(year, filter), page, page_size: size } },
        signal,
      }))
    },
  )
}

/** A line, as its page shows it. Lazy: the page shows while it comes. */
export function useLedgerEntry(id: number) {
  return useLazyAsyncData(`board:treasury:entry:${id}`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/treasury/entries/{entry_id}', { params: { path: { entry_id: id } }, signal })))
}
