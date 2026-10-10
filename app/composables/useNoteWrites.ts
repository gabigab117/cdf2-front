import type { components } from '~/types/api'
import type { FormErrors } from '~/utils/api-errors'

type NoteIn = components['schemas']['NoteIn']
type NoteUpdateIn = components['schemas']['NoteUpdateIn']
type ReplyIn = components['schemas']['ReplyIn']

/**
 * Writes the board's notes and their replies. Each write gives the errors to
 * show on its form, or null; the tab that shows the notes fetches them again.
 */
export function useNoteWrites() {
  const api = useApi()

  async function publishNote(payload: NoteIn): Promise<FormErrors | null> {
    return (await formWrite(api.POST('/api/board/notes', { body: payload }))).errors
  }

  /** Rewrites a note or a reply, by its author. */
  async function rewriteNote(id: number, payload: NoteUpdateIn): Promise<FormErrors | null> {
    const path = { note_id: id }
    return (await formWrite(api.PUT('/api/board/notes/{note_id}', { params: { path }, body: payload }))).errors
  }

  async function replyTo(id: number, payload: ReplyIn): Promise<FormErrors | null> {
    const path = { note_id: id }
    return (await formWrite(api.POST('/api/board/notes/{note_id}/replies', { params: { path }, body: payload }))).errors
  }

  /**
   * Deletes a note with its replies, or a reply.
   *
   * @returns null once deleted, or the message to show.
   */
  function deleteNote(id: number): Promise<string | null> {
    return plainWrite(api.DELETE('/api/board/notes/{note_id}', { params: { path: { note_id: id } } }))
  }

  return { publishNote, rewriteNote, replyTo, deleteNote }
}
