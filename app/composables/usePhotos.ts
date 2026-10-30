/**
 * The albums, the latest first: all of them, for the Photos page, or those of an
 * event, for its tab. Lazy: the page shows while they come.
 */
export function usePhotoAlbums(event: number | null = null) {
  return useLazyAsyncData(`board:albums:${event ?? 'all'}`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/albums', {
      params: { query: { event, page_size: ALBUMS_PAGE_SIZE } },
      signal,
    })))
}

/** An album and every photo of it: 300 at most. Lazy: its page shows while it comes. */
export function usePhotoAlbum(id: number) {
  return useLazyAsyncData(`board:album:${id}`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/albums/{album_id}', {
      params: { path: { album_id: id } },
      signal,
    })))
}

/**
 * An event's cover, whether the site shows it, and the albums it is chosen from:
 * the event's and its previous edition's. Lazy: the tab shows while it comes.
 */
export function useEventCover(eventId: number) {
  return useLazyAsyncData(`board:event:${eventId}:cover`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events/{event_id}/cover', {
      params: { path: { event_id: eventId } },
      signal,
    })))
}
