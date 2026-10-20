/**
 * A page of the general notes, those without an event (A11): the pinned ones
 * first, then the latest, each with its replies. Lazy: the page shows while
 * they come.
 */
export function useGeneralNotes(page: () => number) {
  return useLazyAsyncData(
    () => `board:general-notes:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/notes/general', {
        params: { query: { page: page(), page_size: NOTES_PAGE_SIZE } },
        signal,
      })),
  )
}
