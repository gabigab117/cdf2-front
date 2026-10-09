import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiResponse, clearApiMocks, mockApi } from '../helpers/api'
import { boardEvent } from '../helpers/events'
import type { components } from '~/types/api'

const { refreshNuxtDataMock } = vi.hoisted(() => ({ refreshNuxtDataMock: vi.fn() }))
mockNuxtImport('refreshNuxtData', () => refreshNuxtDataMock)

const EVENT = '/api/board/events/{event_id}'

const payload: components['schemas']['EventIn'] = {
  title: 'Halloween des enfants',
  slug: '',
  category: 'children',
  starts_at: '2026-10-31T15:00:00+01:00',
  ends_at: null,
  start_label: '',
  venue_name: 'Salle des fêtes',
  venue_address: '',
  latitude: null,
  longitude: null,
  price_label: '',
  price_detail: '',
  summary: '',
  published: false,
  lead: null,
  previous_edition: null,
  programme: [],
  practical_infos: [],
}

describe('useEventWrites', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    vi.restoreAllMocks()
    refreshNuxtDataMock.mockReset()
    useSessionStore().clear()
  })

  it.each([
    ['creates', undefined],
    ['rewrites', 12],
  ])('%s an event, then has the sidebar fetch its coming events again', async (_case, id) => {
    mockApi('/api/board/events', { method: 'POST', handler: () => apiResponse(201, boardEvent()) })
    mockApi(EVENT, { method: 'PUT', handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })

    const saved = await useEventWrites().saveEvent(payload, id)

    expect(saved).toEqual({ event: boardEvent(), errors: null })
    expect(refreshNuxtDataMock).toHaveBeenCalledWith('board:upcoming-events')
  })

  it('lays a refusal out on the form, and leaves the sidebar alone', async () => {
    mockApi('/api/board/events', {
      method: 'POST',
      handler: () => apiResponse(422, {
        detail: [{ type: 'missing', loc: ['body', 'payload', 'title'], msg: 'Ce champ est obligatoire.' }],
      }),
    })

    const saved = await useEventWrites().saveEvent(payload)

    expect(saved).toEqual({ event: null, errors: { form: [], fields: { title: ['Ce champ est obligatoire.'] } } })
    expect(refreshNuxtDataMock).not.toHaveBeenCalled()
  })

  it.each([
    ['a server error', () => mockApi('/api/board/events', { method: 'POST', handler: () => apiResponse(502, 'Bad Gateway') }), 'Le service est momentanément indisponible. Réessayez dans quelques instants.'],
    ['the network', () => vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch')), 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.'],
  ])('says why saving failed when %s fails it', async (_case, fail, message) => {
    fail()

    expect(await useEventWrites().saveEvent(payload)).toEqual({ event: null, errors: { form: [message], fields: {} } })
  })

  it('deletes an event, then has the sidebar fetch its coming events again', async () => {
    mockApi(EVENT, { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { event_id: 12 })

    expect(await useEventWrites().deleteEvent(12)).toBeNull()
    expect(refreshNuxtDataMock).toHaveBeenCalledWith('board:upcoming-events')
  })

  it.each([
    ['a refusal', () => mockApi(EVENT, { method: 'DELETE', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { event_id: 12 }), 'Introuvable.'],
    ['the network', () => vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch')), 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.'],
  ])('says why deleting failed on %s', async (_case, fail, message) => {
    fail()

    expect(await useEventWrites().deleteEvent(12)).toBe(message)
    expect(refreshNuxtDataMock).not.toHaveBeenCalled()
  })
})
