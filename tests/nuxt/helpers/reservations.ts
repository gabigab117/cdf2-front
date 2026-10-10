import type { components } from '~/types/api'

type ReservationOut = components['schemas']['ReservationOut']
type ReservationStatsOut = components['schemas']['ReservationStatsOut']

/** The figures of a meal of 80 places: two menus, 7 places in two reservations. */
export function reservationStats(changes: Partial<ReservationStatsOut> = {}): ReservationStatsOut {
  return {
    capacity: 80,
    reservations: 2,
    seats: 7,
    remaining: 73,
    ticket_types: [
      { id: 81, name: 'Menu adulte', seats: 2, reservations: 1 },
      { id: 82, name: 'Menu enfant', seats: 5, reservations: 2 },
    ],
    ...changes,
  }
}

/** The Martin family: 2 adults and 4 children, table 4, recorded on 3 October 2026 at 9:30 in Paris. */
export function boardReservation(changes: Partial<ReservationOut> = {}): ReservationOut {
  return {
    id: 91,
    name: 'Famille Martin',
    note: 'Table 4',
    created_at: '2026-10-03T07:30:00Z',
    lines: [{ ticket_type: 81, quantity: 2 }, { ticket_type: 82, quantity: 4 }],
    seats: 6,
    ...changes,
  }
}
