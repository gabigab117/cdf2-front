import { describe, expect, it } from 'vitest'

// Eleven weeks from Monday 28 September 2026, as the occupancy of an equipment.
const ELEVEN_WEEKS = { start: '2026-09-28', end: '2026-12-13' }

describe('the days of a planning', () => {
  it('count and add days of the calendar, across the change of time', () => {
    expect(dayNumber('2026-10-26') - dayNumber('2026-10-24')).toBe(2)
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
  })

  it('place a day on the window, or nowhere outside it', () => {
    expect(dayPosition(ELEVEN_WEEKS, '2026-09-28')).toBe('0.00%')
    expect(dayPosition(ELEVEN_WEEKS, '2026-10-01')).toBe('3.90%')
    expect(dayPosition(ELEVEN_WEEKS, '2026-09-27')).toBeNull()
    expect(dayPosition(ELEVEN_WEEKS, '2026-12-14')).toBeNull()
  })

  it('place some days on the window, cut at its edges', () => {
    expect(periodPlacement(ELEVEN_WEEKS, '2026-10-16', '2026-10-18')).toEqual({ left: '23.38%', width: '3.90%' })
    expect(periodPlacement(ELEVEN_WEEKS, '2026-09-25', '2026-09-29')).toEqual({ left: '0.00%', width: '2.60%' })
    expect(periodPlacement(ELEVEN_WEEKS, '2026-12-11', '2026-12-20')).toEqual({ left: '96.10%', width: '3.90%' })
    expect(periodPlacement(ELEVEN_WEEKS, '2026-09-18', '2026-09-21')).toBeNull()
  })

  it('mark its weeks, every week or every other one', () => {
    expect(weekStarts(ELEVEN_WEEKS, 2)).toEqual(['2026-09-28', '2026-10-12', '2026-10-26', '2026-11-09', '2026-11-23', '2026-12-07'])
    expect(weekStarts({ start: '2026-09-21', end: '2026-10-04' })).toEqual(['2026-09-21', '2026-09-28'])
    expect(weekShare({ start: '2026-09-21', end: '2026-10-04' })).toBe('50.00%')
  })
})
