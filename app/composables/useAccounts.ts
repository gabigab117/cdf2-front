/** The accounts of the board, by page: the superuser's alone. Lazy. */
export function useAccounts(page: () => number) {
  return useLazyAsyncData(
    () => `board:accounts:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/accounts', { params: { query: { page: page(), page_size: ACCOUNTS_PAGE_SIZE } }, signal })),
  )
}
