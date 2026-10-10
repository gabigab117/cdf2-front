import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../helpers/api'
import { boardNote, noteReply } from '../helpers/notes'

const NOTE = '/api/board/notes/{note_id}'

describe('useNoteWrites', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  it('publishes, rewrites, answers and deletes notes', async () => {
    mockApi('/api/board/notes', { method: 'POST', handler: () => apiResponse(201, boardNote()) })
    mockApi(NOTE, { method: 'PUT', handler: () => apiResponse(200, boardNote()) }, { note_id: 31 })
    mockApi(NOTE, { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { note_id: 31 })
    mockApi('/api/board/notes/{note_id}/replies', { method: 'POST', handler: () => apiResponse(201, noteReply()) }, { note_id: 31 })
    const sent = recordRequests()
    const { publishNote, rewriteNote, replyTo, deleteNote } = useNoteWrites()

    expect(await publishNote({ event: 12, text: 'Salle réservée.', tag: 'logistics', pinned: false })).toBeNull()
    expect(await rewriteNote(31, { text: 'Salle réservée.', tag: null, pinned: true })).toBeNull()
    expect(await replyTo(31, { text: 'Merci.' })).toBeNull()
    expect(await deleteNote(31)).toBeNull()

    expect(sent.map(request => [request.method, request.url, request.body])).toEqual([
      ['POST', '/api/board/notes', { event: 12, text: 'Salle réservée.', tag: 'logistics', pinned: false }],
      ['PUT', '/api/board/notes/31', { text: 'Salle réservée.', tag: null, pinned: true }],
      ['POST', '/api/board/notes/31/replies', { text: 'Merci.' }],
      ['DELETE', '/api/board/notes/31', undefined],
    ])
  })

  it('gives the errors of a refused note, and why a deletion failed', async () => {
    mockApi('/api/board/notes', {
      method: 'POST',
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body', 'text'], msg: 'Ce champ ne peut pas être vide.' }] }),
    })
    mockApi(NOTE, { method: 'DELETE', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { note_id: 31 })
    const { publishNote, deleteNote } = useNoteWrites()

    expect(await publishNote({ event: 12, text: '', tag: null, pinned: false }))
      .toEqual({ form: [], fields: { text: ['Ce champ ne peut pas être vide.'] } })
    expect(await deleteNote(31)).toBe('Introuvable.')
  })
})
