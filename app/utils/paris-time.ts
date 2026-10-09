/** The time zone of every date the committee shows or types. */
export const PARIS_TIME_ZONE = 'Europe/Paris'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

// The wall-clock time in Paris of any instant, part by part: it never depends
// on the time zone of the browser.
const parisClock = new Intl.DateTimeFormat('en-US', {
  timeZone: PARIS_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

interface WallTime {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function wallTimeAt(instant: number): WallTime {
  const parts = Object.fromEntries(
    parisClock.formatToParts(instant).map(part => [part.type, Number(part.value)]),
  )
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  }
}

function asUtc({ year, month, day, hour, minute, second }: WallTime): number {
  return Date.UTC(year, month - 1, day, hour, minute, second)
}

/** The year, month (1 to 12) and day of an instant in Paris. */
export function parisCalendar(instant: string | number): { year: number, month: number, day: number } {
  const { year, month, day } = wallTimeAt(typeof instant === 'string' ? Date.parse(instant) : instant)
  return { year, month, day }
}

/**
 * The day an instant falls on in Paris, as a number of days since 1 January
 * 1970: two days compare, and subtract into a number of days between them.
 */
export function parisDay(instant: string | number): number {
  const { year, month, day } = parisCalendar(instant)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

// How far ahead of UTC Paris is at an instant, in milliseconds: one hour in
// winter, two in summer.
function offsetAt(instant: number): number {
  const wholeSecond = Math.floor(instant / 1000) * 1000
  return asUtc(wallTimeAt(wholeSecond)) - wholeSecond
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function localText({ year, month, day, hour, minute }: WallTime): string {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

function offsetText(offset: number): string {
  const minutes = Math.abs(offset) / 60_000
  return `${offset < 0 ? '-' : '+'}${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/**
 * The value of a date and time field (`<input type="datetime-local">`) for an
 * instant of the API: its wall-clock time in Paris, to the minute.
 */
export function toDateTimeInput(iso: string): string {
  return localText(wallTimeAt(Date.parse(iso)))
}

const DATE_TIME_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/**
 * The instant of the API, with its offset (ISO 8601), for a wall-clock time in
 * Paris typed in a date and time field: "2026-10-31T15:00" gives
 * "2026-10-31T15:00:00+01:00".
 *
 * When the clocks go back, the hour that comes twice is taken the first time.
 * When they go forward, the hour that does not exist is taken as if they had
 * not changed yet: 2:30 becomes 3:30. A value that is not a date and time,
 * such as an empty field, is returned as it is, for the API to refuse.
 */
export function fromDateTimeInput(value: string): string {
  const match = DATE_TIME_INPUT.exec(value)
  if (!match) return value
  const [, year, month, day, hour, minute, second = '0'] = match
  const wall = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  // Paris's offsets a day before and a day after cover both sides of a change
  // of time. Of the instants they lead to, the right one is the earliest that
  // Paris reads back as the time typed.
  const before = offsetAt(wall - DAY_MS)
  const after = offsetAt(wall + DAY_MS)
  const summer = Math.max(before, after)
  const winter = Math.min(before, after)
  const candidates = [wall - summer, wall - winter]
  // None fits an hour skipped when the clocks went forward: it is read with
  // the offset of before the change.
  const instant = candidates.find(candidate => asUtc(wallTimeAt(candidate)) === wall) ?? wall - winter
  const time = wallTimeAt(instant)
  return `${localText(time)}:${pad(time.second)}${offsetText(offsetAt(instant))}`
}
