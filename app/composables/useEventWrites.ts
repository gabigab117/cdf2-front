import type { components } from '~/types/api'
import type { Written } from '~/utils/api-errors'

type EventIn = components['schemas']['EventIn']
type EventOut = components['schemas']['EventOut']

/**
 * Creates, rewrites and deletes the board's events. After each write, the
 * sidebar fetches its coming events again: no screen can forget it.
 */
export function useEventWrites() {
  const api = useApi()

  /** Creates an event, or rewrites the one of `id`, whole. */
  async function saveEvent(payload: EventIn, id?: number): Promise<Written<EventOut>> {
    const saved = await formWrite(id === undefined
      ? api.POST('/api/board/events', { body: payload })
      : api.PUT('/api/board/events/{event_id}', { params: { path: { event_id: id } }, body: payload }))
    if (!saved.errors) void refreshUpcomingEvents()
    return saved
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
