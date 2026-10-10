const BOARD_MEMBERS_KEY = 'board:members'

/**
 * The active board members, by name, for the forms that choose one: the lead
 * of an event, the assignee of a task. A board counts a handful of members:
 * one page serves. Lazy: a form is used without waiting for them, its current
 * choice being always among its options.
 */
export function useBoardMembers() {
  return useLazyAsyncData(BOARD_MEMBERS_KEY, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/members', { params: { query: { page_size: 100 } }, signal })), { dedupe: 'defer' })
}
