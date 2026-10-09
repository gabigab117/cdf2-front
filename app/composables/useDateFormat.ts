import type { components } from '~/types/api'

/** The dates of an event, as every schema of the events holds them. */
type EventDates = Pick<components['schemas']['EventItemOut'], 'starts_at' | 'ends_at' | 'start_label'>

function paris(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS_TIME_ZONE, ...options })
}

// The abbreviations are French's own (« sam. », « juil. », « sept. »): only
// the first of the month, the hours and the capital are written here.
const FORMATS = {
  numeric: paris({ day: '2-digit', month: '2-digit' }),
  time: paris({ hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }),
  weekdayAndDay: paris({ weekday: 'short', day: 'numeric' }),
  day: paris({ day: 'numeric', month: 'short' }),
  dayAndYear: paris({ day: 'numeric', month: 'short', year: 'numeric' }),
  weekday: paris({ weekday: 'short', day: 'numeric', month: 'short' }),
  weekdayAndYear: paris({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  // The day, month and year of an instant in Paris, to compare days.
  calendar: paris({ year: 'numeric', month: 'numeric', day: 'numeric' }),
}

// « 1er novembre », as French writes the first of a month.
function written(format: Intl.DateTimeFormat, iso: string): string {
  return format
    .formatToParts(new Date(iso))
    .map(part => (part.type === 'day' && part.value === '1' ? '1er' : part.value))
    .join('')
}

function calendar(iso: string): { year: string, month: string, day: string } {
  const parts = Object.fromEntries(FORMATS.calendar.formatToParts(new Date(iso)).map(part => [part.type, part.value]))
  return { year: parts.year ?? '', month: parts.month ?? '', day: parts.day ?? '' }
}

/** « 31/10 ». */
function dayMonth(iso: string): string {
  return FORMATS.numeric.format(new Date(iso))
}

/** « sam. 31 oct. », « dim. 1er nov. 2026 », « 31 oct. 2025 ». */
function day(iso: string, { weekday = true, year = false }: { weekday?: boolean, year?: boolean } = {}): string {
  const format = weekday
    ? (year ? FORMATS.weekdayAndYear : FORMATS.weekday)
    : (year ? FORMATS.dayAndYear : FORMATS.day)
  return written(format, iso)
}

// The spaces of a time never break: « 1 h » never ends a line before « 00 ».
const NO_BREAK_SPACE = '\u00A0'

/** « 15 h 00 », « 9 h 05 ». */
function time(iso: string): string {
  const parts = Object.fromEntries(FORMATS.time.formatToParts(new Date(iso)).map(part => [part.type, part.value]))
  return [parts.hour, 'h', parts.minute].join(NO_BREAK_SPACE)
}

/**
 * The days of an event: « sam. 31 oct. 2026 » on a single day, or « du sam. 13
 * au dim. 14 juin 2026 », « du ven. 30 oct. au dim. 1er nov. 2026 », each
 * day in Paris.
 */
function period(start: string, end: string | null): string {
  if (end === null) return day(start, { year: true })
  const first = calendar(start)
  const last = calendar(end)
  if (first.year !== last.year) return `du ${written(FORMATS.weekdayAndYear, start)} au ${day(end, { year: true })}`
  if (first.month !== last.month) return `du ${written(FORMATS.weekday, start)} au ${day(end, { year: true })}`
  if (first.day !== last.day) return `du ${written(FORMATS.weekdayAndDay, start)} au ${day(end, { year: true })}`
  return day(start, { year: true })
}

/** « 15 h 00 – 18 h 30 », « Ouverture 13 h 00 ». */
function schedule({ starts_at, ends_at, start_label }: EventDates): string {
  const start = start_label ? `${start_label} ${time(starts_at)}` : time(starts_at)
  return ends_at ? `${start} – ${time(ends_at)}` : start
}

/**
 * When an event takes place, days and hours: « sam. 31 oct. 2026 · 15 h 00 –
 * 18 h 30 ». At the start of a sentence, it takes a capital.
 */
function eventWhen(event: EventDates, { sentence = false }: { sentence?: boolean } = {}): string {
  const text = `${period(event.starts_at, event.ends_at)} · ${schedule(event)}`
  return sentence ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text
}

/**
 * The dates as the committee writes them, in Paris whatever the time zone of
 * the browser: the formats of the mockup.
 */
export function useDateFormat() {
  return { dayMonth, day, time, period, schedule, eventWhen }
}
