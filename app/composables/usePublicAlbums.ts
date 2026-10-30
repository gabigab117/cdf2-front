/** « Souvenirs » on the home page: the latest albums of the site. */
export function useMemories() {
  return useAsyncData(
    'site:memories',
    (_nuxtApp, { signal }) => loadData(useApi().GET('/api/public/albums', {
      params: { query: { page_size: MEMORIES_ON_HOME } },
      signal,
    })),
    { timeout: PUBLIC_API_TIMEOUT },
  )
}

/** A page of the albums of the site, the latest first. */
export function usePublicAlbums(page: MaybeRefOrGetter<number>) {
  return useAsyncData(
    () => `site:albums:${toValue(page)}`,
    (_nuxtApp, { signal }) => loadData(useApi().GET('/api/public/albums', {
      params: { query: { page: toValue(page), page_size: MEMORIES_PAGE_SIZE } },
      signal,
    })),
    { timeout: PUBLIC_API_TIMEOUT },
  )
}

/** An album of the site with its photos: one with a visible photo, or a 404. */
export function usePublicAlbum(id: number) {
  return useAsyncData(
    `site:album:${id}`,
    (_nuxtApp, { signal }) => loadData(useApi().GET('/api/public/albums/{album_id}', {
      params: { path: { album_id: id } },
      signal,
    })),
    { timeout: PUBLIC_API_TIMEOUT },
  )
}
