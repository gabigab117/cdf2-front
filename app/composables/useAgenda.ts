import type { components } from '~/types/api'

type PublicEventItemOut = components['schemas']['PublicEventItemOut']

/** The categories the agenda holds, and the day the board last changed it. */
export function useAgendaOverview() {
  return useAsyncData(
    'site:agenda',
    (_nuxtApp, { signal }) => loadData(useApi().GET('/api/public/agenda', { signal })),
    { timeout: PUBLIC_API_TIMEOUT },
  )
}

/** A page of the agenda, whole or of a category, as the home page's address asks for it. */
export function useAgendaEvents(query: MaybeRefOrGetter<AgendaQuery>) {
  return useAsyncData(
    () => `site:events:${toValue(query).category ?? 'all'}:${toValue(query).page}`,
    (_nuxtApp, { signal }) => {
      const { category, page } = toValue(query)
      return loadData(useApi().GET('/api/public/events', {
        params: { query: { category: category ?? undefined, page, page_size: AGENDA_PAGE_SIZE } },
        signal,
      }))
    },
    { timeout: PUBLIC_API_TIMEOUT },
  )
}

/**
 * The next event of the agenda, « Prochain rendez-vous », whatever the page of
 * the agenda shown: the first of a filtered page is not always the next one.
 */
export function useSpotlight() {
  return useAsyncData(
    'site:spotlight',
    async (_nuxtApp, { signal }): Promise<PublicEventItemOut | null> => {
      const { items } = await loadData(useApi().GET('/api/public/events', {
        params: { query: { page_size: 1 } },
        signal,
      }))
      return items[0] ?? null
    },
    { timeout: PUBLIC_API_TIMEOUT },
  )
}
