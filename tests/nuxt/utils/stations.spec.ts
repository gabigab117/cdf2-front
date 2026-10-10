import { describe, expect, it } from 'vitest'
import { boardStation } from '../helpers/stations'

describe('the stations of an event', () => {
  it('edits a station, two people by default for a new one, and sends its count as a number', () => {
    expect(stationFields()).toEqual({ name: '', description: '', requiredCount: '2' })
    expect(stationFields(boardStation())).toEqual({ name: 'Buvette', description: 'Bière et soft.', requiredCount: '2' })
    expect(stationPayload({ name: 'Frites', description: '', requiredCount: '3' })).toEqual({ name: 'Frites', description: '', required_count: 3 })
  })

  it('counts the volunteers and the places to fill as the v1 writes them', () => {
    expect(staffing({ assigned_count: 4, required_count: 7 })).toBe('4 / 7 personnes affectées')
    expect(openPlaces(1)).toBe('1 place à pourvoir')
    expect(openPlaces(3)).toBe('3 places à pourvoir')
  })

  it('moves a station up or down a place', () => {
    expect(movedStation([1, 2, 3], 2, -1)).toEqual([1, 3, 2])
    expect(movedStation([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
  })

  it('names the fields of a station for the errors its form cannot place', () => {
    expect(stationFieldLabel('stations')).toBe('Postes')
    expect(stationFieldLabel('other')).toBe('other')
  })

  it('reminds how the former committee staffed its stations', () => {
    expect(FORMER_STAFFING.map(row => `${row.station} ${row.people}`)).toEqual([
      'Vélos 2–3', 'Caisse 2', 'Buvette (brocante) 3', 'Buvette (13 juillet) 4', 'BBQ 3', 'Service 2–3', 'Frites 2',
    ])
  })
})
