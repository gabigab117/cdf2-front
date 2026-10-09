import type { NuxtApp } from '#app'

const UPCOMING_EVENTS_KEY = 'board:upcoming-events'

// The sidebar's count and its coming events come from a single request, which
// its components share by key. Nuxt keeps the handler the key was first given:
// it is defined once, here.
function fetchUpcomingEvents(_nuxtApp: NuxtApp, { signal }: { signal: AbortSignal }) {
  return loadData(useApi().GET('/api/board/events', {
    params: { query: { period: 'upcoming', page_size: 3 } },
    signal,
  }))
}

/**
 * The next three events and the number of events to come, as the sidebar
 * shows them. Lazy: the board's pages never wait for them.
 */
export function useUpcomingEvents() {
  // The components that mount while the request runs wait for it, rather than
  // cancel it for one of their own: the sidebar's two make a single request,
  // and so do the drawer's, which show the answer already there meanwhile.
  return useLazyAsyncData(UPCOMING_EVENTS_KEY, fetchUpcomingEvents, { dedupe: 'defer' })
}

/** Fetches the sidebar's events again, after an event was written. */
export function refreshUpcomingEvents(): Promise<void> {
  return refreshNuxtData(UPCOMING_EVENTS_KEY)
}
