import { afterEach, describe, expect, it, vi } from 'vitest'
import { fromDateTimeInput, parisCalendar, parisDate, parisDay, toDateTimeInput } from '~/utils/paris-time'

describe('fromDateTimeInput', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each([
    ['in winter', '2026-12-05T15:00', '2026-12-05T15:00:00+01:00'],
    ['in summer', '2026-07-14T22:00', '2026-07-14T22:00:00+02:00'],
    ['on the day the clocks go forward', '2026-03-29T10:00', '2026-03-29T10:00:00+02:00'],
    ['on the day the clocks go back', '2026-10-25T10:00', '2026-10-25T10:00:00+01:00'],
    ['with its seconds', '2026-10-31T15:00:30', '2026-10-31T15:00:30+01:00'],
  ])('gives the time typed its offset in Paris, %s', (_case, typed, instant) => {
    expect(fromDateTimeInput(typed)).toBe(instant)
  })

  it('takes the hour that comes twice the first time, when the clocks go back', () => {
    expect(fromDateTimeInput('2026-10-25T02:30')).toBe('2026-10-25T02:30:00+02:00')
  })

  it('moves the hour skipped when the clocks go forward an hour later', () => {
    expect(fromDateTimeInput('2026-03-29T02:30')).toBe('2026-03-29T03:30:00+02:00')
  })

  it.each(['', 'demain', '2026-10-31'])('leaves a value that is not a date and time to the API (%j)', (typed) => {
    expect(fromDateTimeInput(typed)).toBe(typed)
  })

  it.each(['UTC', 'America/New_York', 'Pacific/Auckland'])('reads the time in Paris whatever the time zone of the browser (%s)', (zone) => {
    /**
     * Given a board member whose device is set to another time zone
     * When they type a date and time
     * Then it is read as a time in Paris
     */
    vi.stubEnv('TZ', zone)

    expect(fromDateTimeInput('2026-10-31T15:00')).toBe('2026-10-31T15:00:00+01:00')
    expect(toDateTimeInput('2026-10-31T14:00:00Z')).toBe('2026-10-31T15:00')
  })
})

describe('toDateTimeInput', () => {
  it.each([
    ['in winter', '2026-10-31T14:00:00Z', '2026-10-31T15:00'],
    ['in summer', '2026-07-14T20:00:00+00:00', '2026-07-14T22:00'],
    ['on the next day in Paris', '2026-10-31T23:30:00Z', '2026-11-01T00:30'],
    ['given with its own offset', '2026-10-31T15:00:00+01:00', '2026-10-31T15:00'],
  ])('shows an instant as its time in Paris, %s', (_case, instant, shown) => {
    expect(toDateTimeInput(instant)).toBe(shown)
  })

  it('gives back the instant it was typed for', () => {
    expect(fromDateTimeInput(toDateTimeInput('2026-10-31T15:00:00+01:00'))).toBe('2026-10-31T15:00:00+01:00')
  })
})

describe('parisCalendar', () => {
  it('reads the day an instant falls on in Paris, whatever the time zone', () => {
    expect(parisCalendar('2026-12-31T23:30:00Z')).toEqual({ year: 2027, month: 1, day: 1 })
    expect(parisCalendar(Date.parse('2026-10-31T14:00:00Z'))).toEqual({ year: 2026, month: 10, day: 31 })
  })
})

describe('parisDay', () => {
  it('counts the days between two instants by their days in Paris', () => {
    // 23:30 and 00:30 the next day in Paris, an hour apart.
    expect(parisDay('2026-10-30T23:30:00Z') - parisDay('2026-10-30T22:30:00Z')).toBe(1)
    // Over the night the clocks go back: two days, though 49 hours apart.
    expect(parisDay('2026-10-26T12:00:00Z') - parisDay('2026-10-24T11:00:00Z')).toBe(2)
  })
})

describe('parisDate', () => {
  it('writes the day an instant falls on in Paris, as the API writes a day', () => {
    expect(parisDate('2026-12-31T23:30:00Z')).toBe('2027-01-01')
    expect(parisDate(Date.parse('2026-10-01T08:00:00Z'))).toBe('2026-10-01')
  })
})
