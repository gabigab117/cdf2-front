import type { components } from '~/types/api'

/** The dates of an event, as every schema of the events holds them. */
type EventDates = Pick<components['schemas']['EventItemOut'], 'starts_at' | 'ends_at' | 'start_label'>

/**
 * Where an event stands, as of a moment: a number of days ahead, today, under
 * way since a day before, or over. Days are counted in Paris.
 */
export type Countdown
  = | { kind: 'ahead', days: number }
    | { kind: 'today' }
    | { kind: 'ongoing' }
    | { kind: 'past' }

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
  longWeekday: paris({ weekday: 'long' }),
}

// The days with their month in full (« samedi 31 octobre »), by the weekday
// they show, with or without their year.
function longFormats(weekday?: 'long' | 'short'): { withYear: Intl.DateTimeFormat, withoutYear: Intl.DateTimeFormat } {
  return {
    withYear: paris({ weekday, day: 'numeric', month: 'long', year: 'numeric' }),
    withoutYear: paris({ weekday, day: 'numeric', month: 'long' }),
  }
}

const LONG_FORMATS = {
  long: longFormats('long'),
  short: longFormats('short'),
  none: longFormats(),
}

// « 1er novembre », as French writes the first of a month.
function written(format: Intl.DateTimeFormat, iso: string): string {
  return format
    .formatToParts(new Date(iso))
    .map(part => (part.type === 'day' && part.value === '1' ? '1er' : part.value))
    .join('')
}

function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
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

/**
 * A day with its month in full: « samedi 31 octobre », « sam. 31 octobre »,
 * « 30 septembre », with its year if asked. At the start of a sentence, it
 * takes a capital: « Samedi 31 octobre 2026 ».
 */
function longDay(
  iso: string,
  { weekday = 'long', year = false, sentence = false }: { weekday?: 'long' | 'short' | 'none', year?: boolean, sentence?: boolean } = {},
): string {
  const formats = LONG_FORMATS[weekday]
  const text = written(year ? formats.withYear : formats.withoutYear, iso)
  return sentence ? capitalized(text) : text
}

/**
 * The parts of a day for a date tile: « 31 », « oct. », « sam. », « samedi ».
 * The number of the day stands alone, without « er ».
 */
function dayParts(iso: string): { day: string, month: string, weekday: string, longWeekday: string } {
  const parts = Object.fromEntries(FORMATS.weekday.formatToParts(new Date(iso)).map(part => [part.type, part.value]))
  return {
    day: parts.day ?? '',
    month: parts.month ?? '',
    weekday: parts.weekday ?? '',
    longWeekday: FORMATS.longWeekday.format(new Date(iso)),
  }
}

// The spaces of a time never break: « 1 h » never ends a line before « 00 ».
const NO_BREAK_SPACE = ' '

/** « 15 h 00 », « 9 h 05 ». */
function time(iso: string): string {
  const parts = Object.fromEntries(FORMATS.time.formatToParts(new Date(iso)).map(part => [part.type, part.value]))
  return [parts.hour, 'h', parts.minute].join(NO_BREAK_SPACE)
}

/**
 * « 15:00 », the time of a programme line as the mockup writes it. The API
 * gives it as a wall-clock time without a day ("15:00:00"): it is never read
 * as an instant, which would move it to another time zone.
 */
function clock(wallTime: string): string {
  return wallTime.slice(0, 5)
}

/**
 * The days of an event: « sam. 31 oct. 2026 » on a single day, or « du sam. 13
 * au dim. 14 juin 2026 », « du ven. 30 oct. au dim. 1er nov. 2026 », each
 * day in Paris.
 */
function period(start: string, end: string | null): string {
  if (end === null) return day(start, { year: true })
  const first = parisCalendar(start)
  const last = parisCalendar(end)
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
  return sentence ? capitalized(text) : text
}

/**
 * The days of an event on a line of their own: « Samedi 31 octobre 2026 », or
 * « Du sam. 20 au dim. 21 juin 2026 » over several days, in Paris.
 */
function eventDays({ starts_at, ends_at }: Pick<EventDates, 'starts_at' | 'ends_at'>): string {
  const oneDay = ends_at === null || parisDay(ends_at) === parisDay(starts_at)
  return oneDay ? longDay(starts_at, { year: true, sentence: true }) : capitalized(period(starts_at, ends_at))
}

/**
 * Where an event stands at `now`. Like the agenda of the API, an event stays
 * to come until the end of its last day in Paris: one without an end is over
 * once the day it started on has passed.
 */
function countdown(event: Pick<EventDates, 'starts_at' | 'ends_at'>, now: number): Countdown {
  const today = parisDay(now)
  const days = parisDay(event.starts_at) - today
  if (days > 0) return { kind: 'ahead', days }
  if (days === 0) return { kind: 'today' }
  return event.ends_at !== null && parisDay(event.ends_at) >= today ? { kind: 'ongoing' } : { kind: 'past' }
}

/**
 * A countdown in words:
 * - `short`, for a pill: « J-30 », « J-1 », « Aujourd’hui », « En cours », « Passé » ;
 * - `long`, on its own line: « Dans 30 jours », « Demain », « Événement passé »… ;
 * - `inline`, within a sentence: « dans 30 jours », « demain », « aujourd’hui »…
 */
function countdownText(state: Countdown, form: 'short' | 'long' | 'inline'): string {
  if (form === 'inline') {
    const text = countdownText(state, 'long')
    return `${text.charAt(0).toLowerCase()}${text.slice(1)}`
  }
  switch (state.kind) {
    case 'ahead':
      if (form === 'short') return `J-${state.days}`
      return state.days === 1 ? 'Demain' : `Dans ${state.days} jours`
    case 'today':
      return 'Aujourd’hui'
    case 'ongoing':
      return 'En cours'
    case 'past':
      return form === 'short' ? 'Passé' : 'Événement passé'
  }
}

/**
 * « 2026 – 2027 »: the committee's season at `now`, from September to August,
 * in Paris.
 */
function season(now: number): string {
  const { year, month } = parisCalendar(now)
  const first = month >= 9 ? year : year - 1
  return `${first} – ${first + 1}`
}

/**
 * The dates as the committee writes them, in Paris whatever the time zone of
 * the browser: the formats of the mockup.
 */
export function useDateFormat() {
  return { dayMonth, day, longDay, dayParts, time, clock, period, schedule, eventWhen, eventDays, countdown, countdownText, season }
}
