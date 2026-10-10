import { describe, expect, it } from 'vitest'
import { boardReservation, reservationStats } from '../helpers/reservations'

const TYPES = reservationStats().ticket_types

describe('the reservations of an event', () => {
  it('edits a reservation, no place for a new one, and leaves out the types without places', () => {
    expect(reservationFields(TYPES)).toEqual({ name: '', note: '', quantities: { 81: 0, 82: 0 } })
    expect(reservationFields(TYPES, boardReservation({ lines: [{ ticket_type: 82, quantity: 4 }] })).quantities).toEqual({ 81: 0, 82: 4 })
    expect(reservationPayload({ name: 'Famille Petit', note: '', quantities: { 81: 0, 82: 3 } }, TYPES)).toEqual({
      name: 'Famille Petit', note: '', lines: [{ ticket_type: 82, quantity: 3 }],
    })
  })

  it('reads the places of a reservation by type, none when it has none of it', () => {
    expect(quantityOf(boardReservation(), 82)).toBe(4)
    expect(quantityOf(boardReservation(), 99)).toBe(0)
  })

  it('draws five types at most, the others gathered as « Autres »', () => {
    const types = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name, index) => ({ id: index, name, seats: index + 1, reservations: 1 }))

    expect(seatShares(types).map(share => [share.label, share.value, share.tone])).toEqual([
      ['A', 1, 'azur'], ['B', 2, 'ambre'], ['C', 3, 'sable'], ['D', 4, 'azurLight'], ['E', 5, 'ambreLight'], ['Autres', 13, 'argent'],
    ])
    expect(seatShares(TYPES)).toHaveLength(2)
  })

  it('counts the places taken, out of the capacity when there is one', () => {
    expect(seatsCount({ reserved_seats: 42, capacity: 80 })).toBe('42/80')
    expect(seatsCount({ reserved_seats: 42, capacity: null })).toBe('42')
    expect(seatsTaken({ seats: 42, capacity: 80 })).toBe('42 / 80')
    expect(seatsTaken({ seats: 42, capacity: null })).toBe('42')
  })

  it('names a line after its type, for the errors the form cannot place', () => {
    const sent = [{ name: 'Menu enfant' }]

    expect(reservationFieldLabel('lines.0.quantity', sent)).toBe('Menu enfant')
    expect(reservationFieldLabel('lines.3.quantity', sent)).toBe('Places')
    expect(reservationFieldLabel('note', sent)).toBe('Remarque')
    expect(reservationFieldLabel('other', sent)).toBe('other')
  })
})
