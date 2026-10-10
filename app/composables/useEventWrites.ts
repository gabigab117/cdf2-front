import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type EventIn = components['schemas']['EventIn']
type EventOut = components['schemas']['EventOut']

/** How saving an event ends: the event as the API saved it, or the errors to show. */
export type EventSave = { event: EventOut, errors: null } | { event: null, errors: FormErrors }

/**
 * Creates, rewrites and deletes the board's events. After each write, the
 * sidebar fetches its coming events again: no screen can forget it.
 */
export function useEventWrites() {
  const api = useApi()

  /** Creates an event, or rewrites the one of `id`, whole. */
  async function saveEvent(payload: EventIn, id?: number): Promise<EventSave> {
    const saved = await formWrite(id === undefined
      ? api.POST('/api/board/events', { body: payload })
      : api.PUT('/api/board/events/{event_id}', { params: { path: { event_id: id } }, body: payload }))
    if (saved.errors) return { event: null, errors: saved.errors }
    void refreshUpcomingEvents()
    return { event: saved.data, errors: null }
  }

  /**
   * Deletes an event, with everything attached to it (EventsDeletion says what).
   *
   * @returns null once deleted, or the message to show.
   */
  async function deleteEvent(id: number): Promise<string | null> {
    const failure = await plainWrite(api.DELETE('/api/board/events/{event_id}', { params: { path: { event_id: id } } }))
    if (failure === null) void refreshUpcomingEvents()
    return failure
  }

  return { saveEvent, deleteEvent }
}
