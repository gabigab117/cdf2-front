/** The key of a page of the general tasks. */
export function generalTasksKey(page: number): string {
  return `board:general-tasks:${page}`
}

/**
 * A page of the general tasks, those without an event (D10): open first by
 * due date, then those done. Lazy: the page shows while they come.
 */
export function useGeneralTasks(page: () => number) {
  return useLazyAsyncData(
    () => generalTasksKey(page()),
    (_nuxtApp, { signal }) =>
      loadData(useApi().GET('/api/board/tasks/general', {
        params: { query: { page: page(), page_size: TASKS_PAGE_SIZE } },
        signal,
      })),
  )
}
