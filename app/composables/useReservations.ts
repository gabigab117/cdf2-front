/** The key of the figures of an event's reservations. */
export function reservationStatsKey(eventId: number): string {
  return `board:event:${eventId}:reservation-stats`
}

/**
 * The figures of an event's reservations, whole: places taken and free, and
 * the places by type. Lazy: the page shows its tab while they come.
 */
export function useReservationStats(eventId: number) {
  return useLazyAsyncData(reservationStatsKey(eventId), (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events/{event_id}/reservations/stats', {
      params: { path: { event_id: eventId } },
      signal,
    })), { dedupe: 'defer' })
}

/** A page of an event's reservations, the latest first. */
export function useEventReservations(eventId: number, page: () => number) {
  return useLazyAsyncData(
    () => `board:event:${eventId}:reservations:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/events/{event_id}/reservations', {
        params: { path: { event_id: eventId }, query: { page: page(), page_size: RESERVATIONS_PAGE_SIZE } },
        signal,
      })),
  )
}
