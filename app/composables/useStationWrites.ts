import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type StationIn = components['schemas']['StationIn']
type AssignmentIn = components['schemas']['AssignmentIn']

/**
 * Writes the stations of an event and their volunteers. Each write gives the
 * errors to show, or null; the tab fetches the stations and their totals again.
 */
export function useStationWrites(eventId: number) {
  const api = useApi()
  const event = { event_id: eventId }

  async function createStation(payload: StationIn): Promise<FormErrors | null> {
    return (await formWrite(api.POST('/api/board/events/{event_id}/stations', { params: { path: event }, body: payload }))).errors
  }

  async function rewriteStation(id: number, payload: StationIn): Promise<FormErrors | null> {
    const path = { station_id: id }
    return (await formWrite(api.PUT('/api/board/stations/{station_id}', { params: { path }, body: payload }))).errors
  }

  /** @returns null once deleted, or the message to show. */
  function deleteStation(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/stations/{station_id}', { params: { path: { station_id: id } } }))
  }

  /** Gives the stations of the event their new order: each of them, once. */
  function reorderStations(ids: number[]): Promise<string | null> {
    return plainWrite(api.PUT('/api/board/events/{event_id}/stations/order', { params: { path: event }, body: { stations: ids } }))
  }

  async function assign(stationId: number, payload: AssignmentIn): Promise<FormErrors | null> {
    const path = { station_id: stationId }
    return (await formWrite(api.POST('/api/board/stations/{station_id}/assignments', { params: { path }, body: payload }))).errors
  }

  /** @returns null once the volunteer is off the station, or the message to show. */
  function unassign(assignmentId: number): Promise<string | null> {
    const path = { assignment_id: assignmentId }
    return plainWrite(api.DELETE('/api/board/assignments/{assignment_id}', { params: { path } }))
  }

  return { createStation, rewriteStation, deleteStation, reorderStations, assign, unassign }
}
