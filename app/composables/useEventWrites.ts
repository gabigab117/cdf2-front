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
    try {
      const { data, error, response } = id === undefined
        ? await api.POST('/api/board/events', { body: payload })
        : await api.PUT('/api/board/events/{event_id}', { params: { path: { event_id: id } }, body: payload })
      if (!data) return { event: null, errors: toFormErrors(error) ?? { form: [errorMessage(error, response)], fields: {} } }
      void refreshUpcomingEvents()
      return { event: data, errors: null }
    }
    catch (failure) {
      return { event: null, errors: { form: [errorMessage(failure)], fields: {} } }
    }
  }

  /**
   * Deletes an event, with its programme and « Bon à savoir ».
   *
   * @returns null once deleted, or the message to show.
   */
  async function deleteEvent(id: number): Promise<string | null> {
    try {
      const { error, response } = await api.DELETE('/api/board/events/{event_id}', {
        params: { path: { event_id: id } },
      })
      if (!response.ok) return errorMessage(error, response)
    }
    catch (failure) {
      return errorMessage(failure)
    }
    void refreshUpcomingEvents()
    return null
  }

  return { saveEvent, deleteEvent }
}
