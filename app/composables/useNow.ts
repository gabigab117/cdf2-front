/**
 * The moment the page is rendered, in milliseconds, read once: the server's
 * render and the browser's hydration write the same countdowns and season,
 * even across midnight.
 */
export function useNow(): Ref<number> {
  return useState('now', () => Date.now())
}
