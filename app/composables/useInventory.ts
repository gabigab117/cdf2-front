/** Today's inventory, as the Matériel page shows it. Lazy: the page shows while it comes. */
export function useInventory() {
  return useLazyAsyncData('board:inventory', (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/equipment', { signal })))
}

/** The loans of an equipment over the weeks to come, for its panel. Lazy. */
export function useEquipmentOccupancy(id: number) {
  return useLazyAsyncData(`board:equipment:${id}:occupancy`, (_nuxtApp, { signal }) =>
    loadData(useApi().GET('/api/board/equipment/{equipment_id}/occupancy', {
      params: { path: { equipment_id: id } },
      signal,
    })))
}
