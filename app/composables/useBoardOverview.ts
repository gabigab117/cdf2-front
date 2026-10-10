const BOARD_OVERVIEW_KEY = 'board:overview'

/**
 * The board's overview: the dashboard's figures, and what awaits the board,
 * which the layout shows on every page (the bell, the sidebar's badges).
 *
 * Lazy: the page shows without waiting for it. A lazy call fetches it again
 * whenever a component mounts it, so the dashboard reads it afresh on each
 * visit, though the layout keeps its key alive. The layout, both sidebars,
 * the bell and the dashboard mount together: `dedupe: 'defer'` makes them
 * wait for the request under way, where the default would cancel it.
 */
export function useBoardOverview() {
  return useLazyAsyncData(BOARD_OVERVIEW_KEY, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/overview', { signal })), { dedupe: 'defer' })
}

/** Fetches the overview again, after a write changed what awaits the board. */
export function refreshBoardOverview(): Promise<void> {
  return refreshNuxtData(BOARD_OVERVIEW_KEY)
}
