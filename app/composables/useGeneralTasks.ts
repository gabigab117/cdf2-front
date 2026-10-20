/**
 * A page of the general tasks, those without an event (D10): open first by
 * due date, then those done. Lazy: the page shows while they come.
 */
export function useGeneralTasks(page: () => number) {
  return useLazyAsyncData(
    () => `board:general-tasks:${page()}`,
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/tasks/general', {
        params: { query: { page: page(), page_size: TASKS_PAGE_SIZE } },
        signal,
      })),
  )
}
