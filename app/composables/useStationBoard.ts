/** The key of an event's stations. */
export function stationBoardKey(eventId: number): string {
  return `board:event:${eventId}:stations`
}

/**
 * The stations of an event, their people and their totals, whole. Lazy: the
 * page shows its tab while they come.
 */
export function useStationBoard(eventId: number) {
  return useLazyAsyncData(stationBoardKey(eventId), (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events/{event_id}/stations', {
      params: { path: { event_id: eventId } },
      signal,
    })))
}
