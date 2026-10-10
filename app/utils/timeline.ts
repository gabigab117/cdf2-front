/**
 * Where days lie on a window of days, as the plannings draw them: the
 * occupancy of an equipment, the planning of the loans. The days are those of
 * the Paris calendar, as the API writes them ("2026-10-16"): counted in UTC,
 * they never move with the time zone of the browser.
 */

const DAY_MS = 86_400_000

/** A window of days, both ends counted. */
export interface TimelineWindow {
  start: string
  end: string
}

/** Where a bar lies on its track, as shares of the track's width. */
export interface BarPlacement {
  left: string
  width: string
}

/** A day as a number of days since 1 January 1970: two days subtract. */
export function dayNumber(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS
}

/** The day some days after another: ("2026-10-30", 3) gives "2026-11-02". */
export function addDays(date: string, count: number): string {
  return new Date((dayNumber(date) + count) * DAY_MS).toISOString().slice(0, 10)
}

function span(window: TimelineWindow): number {
  return dayNumber(window.end) - dayNumber(window.start) + 1
}

function share(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

/** Where a day starts on the window, or null when it lies outside. */
export function dayPosition(window: TimelineWindow, date: string): string | null {
  const offset = dayNumber(date) - dayNumber(window.start)
  return offset < 0 || offset >= span(window) ? null : share(offset / span(window))
}

/**
 * Where some days lie on the window, both ends counted, cut at its edges: null
 * when none of them lies within.
 */
export function periodPlacement(window: TimelineWindow, start: string, end: string): BarPlacement | null {
  const first = Math.max(dayNumber(start), dayNumber(window.start))
  const last = Math.min(dayNumber(end), dayNumber(window.end))
  if (last < first) return null
  const origin = dayNumber(window.start)
  return { left: share((first - origin) / span(window)), width: share((last - first + 1) / span(window)) }
}

/** The first day of each stretch of `weeks` weeks from the window's start: its scale. */
export function weekStarts(window: TimelineWindow, weeks = 1): string[] {
  const starts: string[] = []
  for (let day = window.start; dayNumber(day) <= dayNumber(window.end); day = addDays(day, 7 * weeks)) {
    starts.push(day)
  }
  return starts
}

/** The share of the window a week takes: the step of a weekly grid. */
export function weekShare(window: TimelineWindow): string {
  return share(7 / span(window))
}
