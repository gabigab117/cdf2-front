import type { LoansQuery } from '~/utils/loans'

/** A page of the loans the Prêts page shows, of a state or all. Lazy. */
export function useLoanList(query: () => LoansQuery) {
  return useLazyAsyncData(
    () => `board:loans:${query().state ?? 'all'}:${query().page}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/loans', {
        params: { query: { state: query().state, page: query().page, page_size: LOANS_PAGE_SIZE } },
        signal,
      })),
  )
}

/** The loans over the nine weeks of the planning. Lazy. */
export function useLoanPlanning() {
  return useLazyAsyncData('board:loans:planning', (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/loans/planning', { signal })))
}

/** How many loans in all, and in each state: the counts of the chips. */
export function useLoanCounts() {
  return useLazyAsyncData('board:loans:counts', (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/loans/counts', { signal })))
}

/** The key of a loan, as its form and its panel read it. */
export function loanKey(id: number): string {
  return `board:loan:${id}`
}

/** A loan, as its form or its panel shows it. Lazy: the page shows while it comes. */
export function useLoan(id: number) {
  return useLazyAsyncData(loanKey(id), (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/loans/{loan_id}', { params: { path: { loan_id: id } }, signal })))
}

/** The days a loan form looks at, and the loan it edits, if any. */
export interface AvailabilityPeriod {
  start: string
  end: string
  excludeLoan: number | null
}

/**
 * What each equipment offers over the days of a loan being written: read again
 * at each change of its days. None while its days do not make a period.
 */
export function useAvailability(period: () => AvailabilityPeriod | null) {
  return useLazyAsyncData(
    () => {
      const asked = period()
      return asked ? `board:availability:${asked.start}:${asked.end}:${asked.excludeLoan ?? 'new'}` : 'board:availability:none'
    },
    (_nuxtApp, { signal }) => {
      const asked = period()
      if (!asked) return Promise.resolve(null)
      return loadData(useApi().GET('/api/board/equipment/availability', {
        params: { query: { start: asked.start, end: asked.end, exclude_loan: asked.excludeLoan } },
        signal,
      }))
    },
  )
}

/** The deposit each type of borrower leaves by default (A16), for the loan form. */
export function useLoanDeposits() {
  return useLazyAsyncData('board:loan-deposits', (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/loans/deposits', { signal })))
}
