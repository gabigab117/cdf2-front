import { describe, expect, it } from 'vitest'
import { useDateFormat } from '~/composables/useDateFormat'

const { dayMonth, day, time, period, schedule, eventWhen } = useDateFormat()

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
})
