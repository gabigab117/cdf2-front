/** How many notes a page of an event's notes holds. */
export const NOTES_PAGE_SIZE = 25

/**
 * A page of an event's notes, the pinned ones first, then the latest, each
 * with its replies. Lazy: the page shows its tab while they come.
 */
export function useEventNotes(eventId: number, page: () => number) {
  return useLazyAsyncData(
    () => `board:event:${eventId}:notes:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/notes', {
        params: { query: { event: eventId, page: page(), page_size: NOTES_PAGE_SIZE } },
        signal,
      })),
  )
}
