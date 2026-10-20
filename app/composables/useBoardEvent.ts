/**
 * An event of the board, with all its content. Its page and its edit form
 * share it: the event saved by one is shown by the other without a request.
 */
export function useBoardEvent(id: number) {
  return useAsyncData(`board:event:${id}`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events/{event_id}', {
      params: { path: { event_id: id } },
      signal,
    })),
  )
}
