import { describe, expect, it } from 'vitest'
import { useDateFormat } from '~/composables/useDateFormat'

const formats = useDateFormat()
const { dayMonth, day, writtenDay, calendarDay, longDay, dayParts, clock, period, eventDays, countdown, countdownText, season } = formats

// The texts as they read: the spaces of a time do not break, which a test
// checks once.
function readable(text: string): string {
  return text.replaceAll('\u00A0', ' ')
}

const time = (iso: string) => readable(formats.time(iso))
const schedule = (...args: Parameters<typeof formats.schedule>) => readable(formats.schedule(...args))
const eventWhen = (...args: Parameters<typeof formats.eventWhen>) => readable(formats.eventWhen(...args))

// Saturday 31 October 2026, 15:00 in Paris.
const HALLOWEEN = '2026-10-31T14:00:00Z'

describe('useDateFormat', () => {
  it('writes a day as numbers', () => {
    expect(dayMonth(HALLOWEEN)).toBe('31/10')
  })

  it.each([
    ['with its weekday', HALLOWEEN, {}, 'sam. 31 oct.'],
    ['the first of a month', '2026-11-01T09:00:00Z', {}, 'dim. 1er nov.'],
    ['with its year', '2026-11-01T09:00:00Z', { year: true }, 'dim. 1er nov. 2026'],
    ['without its weekday', '2025-10-31T14:00:00Z', { weekday: false, year: true }, '31 oct. 2025'],
    ['without its weekday nor its year', HALLOWEEN, { weekday: false }, '31 oct.'],
  ])('writes a day %s', (_case, instant, options, written) => {
    expect(day(instant, options)).toBe(written)
  })

  it.each([
    ['of this year without its year', '2026-09-24T18:00:00Z', '24 sept.'],
    ['of another year with its year', '2025-12-31T22:30:00Z', '31 déc. 2025'],
    ['by the year of Paris, on the last night of a year', '2025-12-31T23:30:00Z', '1er janv.'],
  ])('writes the day something was written, %s', (_case, instant, written) => {
    expect(writtenDay(instant, Date.parse('2026-10-10T08:00:00Z'))).toBe(written)
  })

  it('writes a day of the calendar as it is, whatever the time zone', () => {
    const now = Date.parse('2026-10-10T08:00:00Z')

    expect(calendarDay('2026-10-08', now)).toBe('8 oct.')
    expect(calendarDay('2027-01-01', now)).toBe('1er janv. 2027')
  })

  it('keeps the parts of a time together on a line', () => {
    expect(formats.time(HALLOWEEN)).toBe('15\u00A0h\u00A000')
  })

  it.each([
    ['15 h 00', HALLOWEEN],
    ['9 h 05', '2026-11-01T08:05:00Z'],
    ['0 h 30', '2026-10-31T23:30:00Z'],
  ])('writes a time as %s', (written, instant) => {
    expect(time(instant)).toBe(written)
  })

  it.each([
    ['a day without an end', HALLOWEEN, null, 'sam. 31 oct. 2026'],
    ['a day with its end', HALLOWEEN, '2026-10-31T17:30:00Z', 'sam. 31 oct. 2026'],
    ['a day that starts before midnight in UTC', '2026-10-30T23:30:00Z', '2026-10-31T10:00:00Z', 'sam. 31 oct. 2026'],
    ['an evening that ends past midnight', '2026-06-20T19:00:00Z', '2026-06-20T23:00:00Z', 'du sam. 20 au dim. 21 juin 2026'],
    ['two days of a month', '2026-06-13T08:00:00Z', '2026-06-14T16:00:00Z', 'du sam. 13 au dim. 14 juin 2026'],
    ['two months', '2026-10-30T17:00:00Z', '2026-11-01T17:00:00Z', 'du ven. 30 oct. au dim. 1er nov. 2026'],
    ['two years', '2026-12-31T19:00:00Z', '2027-01-01T01:00:00Z', 'du jeu. 31 déc. 2026 au ven. 1er janv. 2027'],
  ])('writes the days of %s', (_case, start, end, written) => {
    expect(period(start, end)).toBe(written)
  })

  it.each([
    ['its start', { ends_at: null, start_label: '' }, '15 h 00'],
    ['its start and end', { ends_at: '2026-10-31T17:30:00Z', start_label: '' }, '15 h 00 – 18 h 30'],
    ['the label of its start', { ends_at: null, start_label: 'Ouverture' }, 'Ouverture 15 h 00'],
    ['the label of its start and its end', { ends_at: '2026-10-31T17:00:00Z', start_label: 'Ouverture' }, 'Ouverture 15 h 00 – 18 h 00'],
  ])('writes the hours of an event with %s', (_case, dates, written) => {
    expect(schedule({ starts_at: HALLOWEEN, ...dates })).toBe(written)
  })

  it('writes when an event takes place, as the mockup does', () => {
    const event = { starts_at: HALLOWEEN, ends_at: '2026-10-31T17:30:00Z', start_label: '' }

    expect(eventWhen(event)).toBe('sam. 31 oct. 2026 · 15 h 00 – 18 h 30')
    expect(eventWhen(event, { sentence: true })).toBe('Sam. 31 oct. 2026 · 15 h 00 – 18 h 30')
  })

  it.each([
    ['with its weekday', HALLOWEEN, {}, 'samedi 31 octobre'],
    ['the first of a month', '2026-11-01T09:00:00Z', {}, 'dimanche 1er novembre'],
    ['at the start of a sentence, with its year', HALLOWEEN, { year: true, sentence: true }, 'Samedi 31 octobre 2026'],
    ['with a short weekday', HALLOWEEN, { weekday: 'short' as const, sentence: true }, 'Sam. 31 octobre'],
    ['without its weekday', '2026-09-30T08:00:00Z', { weekday: 'none' as const }, '30 septembre'],
  ])('writes a day with its month in full, %s', (_case, instant, options, written) => {
    expect(longDay(instant, options)).toBe(written)
  })

  it('gives the parts of a day for a date tile', () => {
    expect(dayParts(HALLOWEEN)).toEqual({ day: '31', month: 'oct.', weekday: 'sam.', longWeekday: 'samedi' })
    expect(dayParts('2026-11-01T09:00:00Z').day).toBe('1')
  })

  it('writes the time of a programme line as the API gives it, without any time zone', () => {
    expect(clock('15:00:00')).toBe('15:00')
    expect(clock('09:05:00')).toBe('09:05')
  })

  it.each([
    ['a day', { starts_at: HALLOWEEN, ends_at: '2026-10-31T17:30:00Z' }, 'Samedi 31 octobre 2026'],
    ['a day without an end', { starts_at: HALLOWEEN, ends_at: null }, 'Samedi 31 octobre 2026'],
    ['an evening past midnight', { starts_at: '2026-06-20T19:00:00Z', ends_at: '2026-06-20T23:00:00Z' }, 'Du sam. 20 au dim. 21 juin 2026'],
  ])('writes the days of %s on a line of their own', (_case, event, written) => {
    expect(eventDays(event)).toBe(written)
  })

  describe('countdown', () => {
    const halloween = { starts_at: HALLOWEEN, ends_at: '2026-10-31T17:30:00Z' }

    it.each([
      ['days ahead', '2026-10-09T08:00:00Z', { kind: 'ahead', days: 22 }],
      ['the day before, at 23:30 in Paris', '2026-10-30T22:30:00Z', { kind: 'ahead', days: 1 }],
      ['the day itself, from midnight in Paris', '2026-10-30T23:30:00Z', { kind: 'today' }],
      ['the day itself, once over', '2026-10-31T20:00:00Z', { kind: 'today' }],
      ['the day after', '2026-11-01T08:00:00Z', { kind: 'past' }],
    ])('counts the days to an event, %s', (_case, now, expected) => {
      expect(countdown(halloween, Date.parse(now))).toEqual(expected)
    })

    it('counts the days of Paris over the night the clocks go back', () => {
      const event = { starts_at: '2026-10-26T12:00:00Z', ends_at: null }

      expect(countdown(event, Date.parse('2026-10-24T11:00:00Z'))).toEqual({ kind: 'ahead', days: 2 })
    })

    it('tells an event under way since a day before from one that is over', () => {
      const evening = { starts_at: '2026-06-20T19:00:00Z', ends_at: '2026-06-21T23:00:00Z' }
      const withoutEnd = { starts_at: '2026-06-20T19:00:00Z', ends_at: null }
      const now = Date.parse('2026-06-21T10:00:00Z')

      expect(countdown(evening, now)).toEqual({ kind: 'ongoing' })
      expect(countdown(withoutEnd, now)).toEqual({ kind: 'past' })
    })

    it.each([
      [{ kind: 'ahead', days: 30 } as const, 'J-30', 'Dans 30 jours', 'dans 30 jours'],
      [{ kind: 'ahead', days: 1 } as const, 'J-1', 'Demain', 'demain'],
      [{ kind: 'today' } as const, 'Aujourd’hui', 'Aujourd’hui', 'aujourd’hui'],
      [{ kind: 'ongoing' } as const, 'En cours', 'En cours', 'en cours'],
      [{ kind: 'past' } as const, 'Passé', 'Événement passé', 'événement passé'],
    ])('writes %o as %s, %s and %s', (state, short, long, inline) => {
      expect(countdownText(state, 'short')).toBe(short)
      expect(countdownText(state, 'long')).toBe(long)
      expect(countdownText(state, 'inline')).toBe(inline)
    })
  })

  it.each([
    ['the last day of August, at 23:59 in Paris', '2026-08-31T21:59:59Z', '2025 – 2026'],
    ['the first of September, at midnight in Paris', '2026-08-31T22:00:00Z', '2026 – 2027'],
    ['in January', '2027-01-17T11:00:00Z', '2026 – 2027'],
  ])('names the season from September to August, on %s', (_case, now, written) => {
    expect(season(Date.parse(now))).toBe(written)
  })
})
