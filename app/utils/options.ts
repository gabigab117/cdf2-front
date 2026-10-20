/** An option of a select. */
export interface Option<T> {
  value: T
  label: string
}

/** The keys of a record, as their own type: Object.keys() types them as mere strings. */
export function keysOf<K extends string>(record: Readonly<Record<K, unknown>>): K[] {
  return Object.keys(record) as K[]
}
