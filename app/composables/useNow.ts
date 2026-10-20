/**
 * The moment the page is rendered, in milliseconds, read once: the server's
 * render and the browser's hydration write the same countdowns and season,
 * even across midnight.
 */
export function useNow(): Ref<number> {
  return useState('now', () => Date.now())
}

/** Today in Paris, as a date field holds it ("2026-10-16"): the day of useNow(). */
export function useToday(): ComputedRef<string> {
  const now = useNow()
  return computed(() => parisDate(now.value))
}
