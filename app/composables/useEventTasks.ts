/**
 * A page of an event's tasks: open first by due date, then those done. Lazy:
 * the page shows its tab while they come.
 */
export function useEventTasks(eventId: number, page: () => number) {
  return useLazyAsyncData(
    () => `board:event:${eventId}:tasks:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/tasks', {
        params: { query: { event: eventId, page: page(), page_size: TASKS_PAGE_SIZE } },
        signal,
      })),
  )
}
