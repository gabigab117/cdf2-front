import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type ReservationIn = components['schemas']['ReservationIn']

/**
 * Writes the reservations of an event, its types of place and its capacity.
 * Each write gives the errors to show, or null; the tab fetches the
 * reservations and their figures again.
 */
export function useReservationWrites(eventId: number) {
  const api = useApi()
  const event = { event_id: eventId }

  async function createReservation(payload: ReservationIn): Promise<FormErrors | null> {
    return (await formWrite(api.POST('/api/board/events/{event_id}/reservations', { params: { path: event }, body: payload }))).errors
  }

  async function rewriteReservation(id: number, payload: ReservationIn): Promise<FormErrors | null> {
    const path = { reservation_id: id }
    return (await formWrite(api.PUT('/api/board/reservations/{reservation_id}', { params: { path }, body: payload }))).errors
  }

  /** @returns null once deleted, or the message to show. */
  function deleteReservation(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/reservations/{reservation_id}', { params: { path: { reservation_id: id } } }))
  }

  async function addTicketType(name: string): Promise<FormErrors | null> {
    return (await formWrite(api.POST('/api/board/events/{event_id}/ticket-types', { params: { path: event }, body: { name } }))).errors
  }

  /** @returns null once deleted, or why not: a type in use stays. */
  function deleteTicketType(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/ticket-types/{ticket_type_id}', { params: { path: { ticket_type_id: id } } }))
  }

  /** Sets how many places the reservations may take; null lifts the limit. */
  async function setCapacity(capacity: number | null): Promise<FormErrors | null> {
    return (await formWrite(api.PUT('/api/board/events/{event_id}/capacity', { params: { path: event }, body: { capacity } }))).errors
  }

  /**
   * Downloads the reservations as an Excel workbook.
   *
   * @returns null once downloaded, or the message to show.
   */
  async function exportReservations(filename: string): Promise<string | null> {
    try {
      const { error, response } = await downloadFile(
        () => api.GET('/api/board/events/{event_id}/reservations.xlsx', { params: { path: event }, parseAs: 'blob' }),
        filename,
      )
      return response.ok ? null : errorMessage(error, response)
    }
    catch (failure) {
      return errorMessage(failure)
    }
  }

  return { createReservation, rewriteReservation, deleteReservation, addTicketType, deleteTicketType, setCapacity, exportReservations }
}
