import type { DocumentsQuery } from '~/utils/documents'

/**
 * A page of the documents the Documents page shows: of a category, awaiting
 * review, holding the words searched. Lazy: the page shows while they come.
 */
export function useDocuments(query: () => DocumentsQuery) {
  return useLazyAsyncData(
    () => {
      const { category, toReview, search, page } = query()
      return `board:documents:${category ?? 'all'}:${toReview}:${search}:${page}`
    },
    (_nuxtApp, { signal }) => {
      const { category, toReview, search, page } = query()
      return loadData(useApi().GET('/api/board/documents', {
        params: {
          query: {
            category,
            status: toReview ? 'to_review' : null,
            search: search || null,
            page,
            page_size: DOCUMENTS_PAGE_SIZE,
          },
        },
        signal,
      }))
    },
  )
}

/**
 * How many documents answer the search, in all and by category, whatever the
 * category shown: the counts of the chips.
 */
export function useDocumentCounts(query: () => DocumentsQuery) {
  return useLazyAsyncData(
    () => `board:documents:counts:${query().toReview}:${query().search}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/documents/counts', {
        params: { query: { status: query().toReview ? 'to_review' : null, search: query().search || null } },
        signal,
      })),
  )
}

/**
 * A page of an event's documents, for its tab, the latest date first. Lazy: the
 * page shows its tab while they come.
 */
export function useEventDocuments(eventId: number, page: () => number) {
  return useLazyAsyncData(
    () => `board:event:${eventId}:documents:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/documents', {
        params: { query: { event: eventId, page: page(), page_size: DOCUMENTS_PAGE_SIZE } },
        signal,
      })),
  )
}

/** The key of a document, as its panel reads it. */
export function documentKey(id: number): string {
  return `board:document:${id}`
}

/** A document, as its panel shows it. Lazy: the panel opens while it comes. */
export function useDocument(id: number) {
  return useLazyAsyncData(documentKey(id), (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/documents/{document_id}', {
      params: { path: { document_id: id } },
      signal,
    })))
}

/**
 * The events a document may belong to, the latest first, for the forms that
 * choose one. A hundred cover the committee's years: one page serves.
 */
export function useEventChoices() {
  const { day } = useDateFormat()
  const { data } = useLazyAsyncData('board:event-choices', (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events', { params: { query: { page_size: 100 } }, signal })), { dedupe: 'defer' })
  return computed(() =>
    (data.value?.items ?? []).map(event => ({ value: event.id, label: `${event.title} · ${day(event.starts_at, { year: true })}` })),
  )
}
