import type { Option } from '~/utils/options'

/**
 * The events, the latest first, as the forms that choose one read them. A
 * hundred cover the committee's years: one page serves.
 */
export function useEventList() {
  return useLazyAsyncData('board:event-choices', (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/events', { params: { query: { page_size: 100 } }, signal })), { dedupe: 'defer' })
}

/**
 * The events a document, a line or a loan may belong to, for the forms that
 * choose one: after the choice of none, when `nobody` names it.
 */
export function useEventChoices(nobody?: string) {
  const { day } = useDateFormat()
  const { data } = useEventList()
  return computed(() => {
    const events: Option<number | null>[] = (data.value?.items ?? []).map(event => ({
      value: event.id,
      label: `${event.title} · ${day(event.starts_at, { year: true })}`,
    }))
    return nobody === undefined ? events : [{ value: null, label: nobody }, ...events]
  })
}
