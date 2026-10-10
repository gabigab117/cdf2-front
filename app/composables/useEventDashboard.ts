/** The key of an event's dashboard: the counts of its tabs. */
export function eventDashboardKey(id: number): string {
  return `board:event:${id}:dashboard`
}

/**
 * The figures of an event's page: the counts its tabs show. Lazy: the page
 * shows the event without waiting for them. The tabs that write fetch them
 * again (refreshEventDashboard).
 */
export function useEventDashboard(id: number) {
  return useLazyAsyncData(eventDashboardKey(id), (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events/{event_id}/dashboard', {
      params: { path: { event_id: id } },
      signal,
    })), { dedupe: 'defer' })
}

/** Fetches an event's figures again, after a write changed them. */
export function refreshEventDashboard(id: number): Promise<void> {
  return refreshNuxtData(eventDashboardKey(id))
}
