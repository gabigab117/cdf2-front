/** The public page of an event: published, or a 404. */
export function usePublicEvent(slug: string) {
  return useAsyncData(
    `site:event:${slug}`,
    (_nuxtApp, { signal }) => loadData(useApi().GET('/api/public/events/{slug}', {
      params: { path: { slug } },
      signal,
    })),
    { timeout: PUBLIC_API_TIMEOUT },
  )
}
