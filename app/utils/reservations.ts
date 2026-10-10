import type { components } from '~/types/api'

type ReservationIn = components['schemas']['ReservationIn']
type ReservationOut = components['schemas']['ReservationOut']
type ReservationStatsOut = components['schemas']['ReservationStatsOut']
type TicketTypeStatsOut = components['schemas']['TicketTypeStatsOut']

/** How many reservations a page of an event's reservations holds. */
export const RESERVATIONS_PAGE_SIZE = 25

/** What the reservation form edits: the places of each type, by its id. */
export interface ReservationFields {
  name: string
  note: string
  quantities: Record<number, number>
}

/** The fields of a reservation to change, or of a new one: no place yet. */
export function reservationFields(ticketTypes: readonly Pick<TicketTypeStatsOut, 'id'>[], reservation?: ReservationOut): ReservationFields {
  const quantities = Object.fromEntries(ticketTypes.map(ticketType => [ticketType.id, 0]))
  for (const line of reservation?.lines ?? []) quantities[line.ticket_type] = line.quantity
  return { name: reservation?.name ?? '', note: reservation?.note ?? '', quantities }
}

/** The reservation to send: its types without places are left out, in the order of the types. */
export function reservationPayload(fields: ReservationFields, ticketTypes: readonly Pick<TicketTypeStatsOut, 'id'>[]): ReservationIn {
  return {
    name: fields.name,
    note: fields.note,
    lines: ticketTypes
      .map(ticketType => ({ ticket_type: ticketType.id, quantity: fields.quantities[ticketType.id] ?? 0 }))
      .filter(line => line.quantity > 0),
  }
}

/** The places of a reservation of a type: 0 when it has none of it. */
export function quantityOf(reservation: ReservationOut, ticketTypeId: number): number {
  return reservation.lines.find(line => line.ticket_type === ticketTypeId)?.quantity ?? 0
}

// The tones of the shares of the bar, in the order of the types. Past them,
// the other types make one share, in grey.
const SHARE_TONES = ['azur', 'ambre', 'sable', 'azurLight', 'ambreLight'] as const

/** A share of the places of a type, in the tones of UiStackedBar. */
export interface SeatShare {
  value: number
  label: string
  tone: typeof SHARE_TONES[number] | 'argent'
}

/** The places by type as the shares of a bar: five types at most, then « Autres ». */
export function seatShares(ticketTypes: readonly TicketTypeStatsOut[]): SeatShare[] {
  const shares: SeatShare[] = ticketTypes.slice(0, SHARE_TONES.length).map((ticketType, index) => ({
    value: ticketType.seats,
    label: ticketType.name,
    tone: SHARE_TONES[index] ?? 'argent',
  }))
  const others = ticketTypes.slice(SHARE_TONES.length)
  if (others.length > 0) {
    shares.push({ value: others.reduce((sum, ticketType) => sum + ticketType.seats, 0), label: 'Autres', tone: 'argent' })
  }
  return shares
}

/** What the tab counts: the places reserved, out of the capacity when there is one. */
export function seatsCount({ reserved_seats, capacity }: { reserved_seats: number, capacity: number | null }): string {
  return capacity === null ? String(reserved_seats) : `${reserved_seats}/${capacity}`
}

/** « 42 / 80 », or « 42 » without a capacity. */
export function seatsTaken(stats: Pick<ReservationStatsOut, 'seats' | 'capacity'>): string {
  return stats.capacity === null ? String(stats.seats) : `${stats.seats} / ${stats.capacity}`
}

/**
 * The name of a field of a reservation, for an error its form cannot show
 * under it: a line is named after its type.
 */
export function reservationFieldLabel(path: string, sentTypes: readonly { name: string }[]): string {
  const line = /^lines\.(\d+)\./.exec(path)
  if (line) return sentTypes[Number(line[1])]?.name ?? 'Places'
  return { name: 'Nom', note: 'Remarque', lines: 'Places', capacity: 'Capacité' }[path] ?? path
}
