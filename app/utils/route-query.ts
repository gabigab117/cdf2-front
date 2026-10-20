/** The id an address names, such as `?materiel=12`, or none. */
export function queryId(value: unknown): number | null {
  const id = Number(value)
  return typeof value === 'string' && Number.isInteger(id) && id > 0 ? id : null
}

/** The page of a list an address asks for (`?page=2`): the first, unless it names another. */
export function queryPage(value: unknown): number {
  return queryId(value) ?? 1
}

/** The page of a list, as an address writes it: the first needs none. */
export function pageParam(page: number): string | undefined {
  return page > 1 ? String(page) : undefined
}
