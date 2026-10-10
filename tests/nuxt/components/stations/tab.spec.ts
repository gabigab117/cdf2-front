import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StationsTab from '~/components/stations/Tab.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardEvent } from '../../helpers/events'
import { boardStation, stationBoard } from '../../helpers/stations'

const { refreshNuxtDataMock } = vi.hoisted(() => ({ refreshNuxtDataMock: vi.fn() }))
// The count of the tab is the page's: the tab only asks for it again.
mockNuxtImport('refreshNuxtData', () => refreshNuxtDataMock)

const BOARD = '/api/board/events/{event_id}/stations'
const STATION = '/api/board/stations/{station_id}'

function mountTab() {
  return mountSuspended(StationsTab, { props: { event: boardEvent() }, attachTo: document.body })
}

type Mounted = Awaited<ReturnType<typeof mountTab>>

function button(wrapper: Mounted, name: string) {
  return wrapper.findAll('button').find(element => element.text() === name || element.attributes('aria-label') === name)
}

function serve(board = stationBoard()) {
  const handler = vi.fn(() => apiResponse(200, board))
  mockApi(BOARD, { handler }, { event_id: 12 })
  return handler
}

describe('the « Postes » tab', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    refreshNuxtDataMock.mockReset()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('counts the volunteers and the places to fill, then shows each station with its people', async () => {
    /**
     * Given the bar, short of a person, and the till, complete
     * When the tab shows them
     * Then the event counts 2 people out of 3, with 1 place to fill
     * And each station shows its edge, its count, its people and their roles
     */
    serve()

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))
    expect(tab.get('[aria-live="polite"]').findAll('span').map(pill => pill.text())).toEqual(['2 / 3 personnes affectées', '1 place à pourvoir'])
    const [bar, till] = tab.findAll('article')
    expect(bar!.classes()).toContain('border-t-ambre-500')
    expect(till!.classes()).toContain('border-t-azur-600')
    expect(bar!.get('h3').text()).toBe('Buvette')
    expect(bar!.text()).toContain('1/2')
    expect(bar!.get('li').text().replace(/\s+/g, ' ')).toBe('Alice bière uniquement')
    expect(tab.text()).toContain('Rappel — organisation de l’ancien comité')
  })

  it('says « Complet » once every station is', async () => {
    serve(stationBoard({ open_places: 0, complete: true }))

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.find('[aria-live="polite"]').exists()).toBe(true))
    expect(tab.get('[aria-live="polite"]').text()).toContain('Complet')
  })

  it('says when an event has no station yet', async () => {
    serve(stationBoard({ stations: [], required_count: 0, assigned_count: 0, open_places: 0 }))

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.text()).toContain('Aucun poste pour cet événement.'))
    expect(tab.find('[aria-live="polite"]').exists()).toBe(false)
  })

  it('adds a station, then fetches the stations and the count of their tab again', async () => {
    const handler = serve()
    mockApi(BOARD, { method: 'POST', handler: () => apiResponse(201, boardStation()) }, { event_id: 12 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce())

    const form = tab.findAll('form').at(-1)!
    await form.get('input:not([type])').setValue('Frites')
    await form.get('input[type="number"]').setValue('2')
    await form.trigger('submit')

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(2))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({ name: 'Frites', description: '', required_count: 2 })
    expect(refreshNuxtDataMock).toHaveBeenCalledWith('board:event:12:dashboard')
  })

  it('shows under its field why a station was refused', async () => {
    serve()
    mockApi(BOARD, { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body', 'required_count'], msg: 'Assurez-vous que cette valeur est supérieure ou égale à 1.' }],
    }) }, { event_id: 12 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))

    const form = tab.findAll('form').at(-1)!
    await form.get('input:not([type])').setValue('Frites')
    await form.trigger('submit')

    await vi.waitFor(() => expect(form.get('input[type="number"]').attributes('aria-invalid')).toBe('true'))
    expect(form.text()).toContain('Assurez-vous que cette valeur est supérieure ou égale à 1.')
  })

  it('puts a volunteer at a station, and takes one off, the counts fetched again each time', async () => {
    const handler = serve()
    mockApi('/api/board/stations/{station_id}/assignments', { method: 'POST', handler: () => apiResponse(201, { id: 73, name: 'Chloé', role: '' }) }, { station_id: 61 })
    mockApi('/api/board/assignments/{assignment_id}', { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { assignment_id: 71 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))
    const bar = tab.findAll('article')[0]!

    await bar.get('input[aria-label="Nom"]').setValue('Chloé')
    await bar.get('form').trigger('submit')
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(2))
    await button(tab, 'Retirer Alice du poste')!.trigger('click')
    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(3))

    expect(sent.filter(request => request.method !== 'GET').map(request => [request.method, request.url, request.body])).toEqual([
      ['POST', '/api/board/stations/61/assignments', { name: 'Chloé', role: '' }],
      ['DELETE', '/api/board/assignments/71', undefined],
    ])
    expect(refreshNuxtDataMock).toHaveBeenCalledTimes(2)
  })

  it('says why a volunteer was refused, after the name of the field', async () => {
    serve()
    mockApi('/api/board/stations/{station_id}/assignments', { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body', 'name'], msg: 'Ce champ ne peut pas être vide.' }],
    }) }, { station_id: 61 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))
    const bar = tab.findAll('article')[0]!

    await bar.get('form').trigger('submit')

    await vi.waitFor(() => expect(bar.find('[role="alert"]').exists()).toBe(true))
    expect(bar.get('[role="alert"]').text()).toBe('Nom : Ce champ ne peut pas être vide.')
    expect(bar.get('input[aria-label="Nom"]').attributes('aria-invalid')).toBe('true')
  })

  it('moves a station down, sending the whole new order', async () => {
    serve()
    mockApi('/api/board/events/{event_id}/stations/order', { method: 'PUT', handler: () => apiResponse(200, stationBoard()) }, { event_id: 12 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))
    const [first, last] = tab.findAll('article')

    expect(first!.get('button[aria-label="Monter le poste"]').attributes('disabled')).toBeDefined()
    expect(last!.get('button[aria-label="Descendre le poste"]').attributes('disabled')).toBeDefined()
    await first!.get('button[aria-label="Descendre le poste"]').trigger('click')

    await vi.waitFor(() => expect(sent.find(request => request.method === 'PUT')?.body).toEqual({ stations: [62, 61] }))
  })

  it('rewrites a station in place', async () => {
    serve()
    mockApi(STATION, { method: 'PUT', handler: () => apiResponse(200, boardStation()) }, { station_id: 61 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))
    const bar = tab.findAll('article')[0]!

    await bar.get('button[aria-label="Modifier le poste"]').trigger('click')
    await bar.get('input[type="number"]').setValue('3')
    await bar.get('form').trigger('submit')

    await vi.waitFor(() => expect(sent.find(request => request.method === 'PUT')?.body).toEqual({
      name: 'Buvette', description: 'Bière et soft.', required_count: 3,
    }))
  })

  it('deletes a station with its people, once asked in the page', async () => {
    serve()
    const handler = vi.fn(() => new Response(null, { status: 204 }))
    mockApi(STATION, { method: 'DELETE', handler }, { station_id: 61 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))
    const bar = tab.findAll('article')[0]!

    await bar.get('button[aria-label="Supprimer le poste"]').trigger('click')
    expect(bar.text()).toContain('Supprimer le poste « Buvette » et toutes ses affectations ?')
    await button(tab, 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce())
  })

  it('says why the stations could not load', async () => {
    mockApi(BOARD, { handler: () => apiResponse(503, 'Service Unavailable') }, { event_id: 12 })

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.find('[role="alert"]').text()).toContain('Le service est momentanément indisponible.'))
  })

  it('says why a volunteer could not be taken off, or a station moved', async () => {
    serve()
    mockApi('/api/board/assignments/{assignment_id}', { method: 'DELETE', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { assignment_id: 71 })
    mockApi('/api/board/events/{event_id}/stations/order', { method: 'PUT', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body', 'stations'], msg: 'Donnez chaque poste de l’événement, une fois chacun.' }],
    }) }, { event_id: 12 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))

    await button(tab, 'Retirer Alice du poste')!.trigger('click')
    await tab.findAll('article')[0]!.get('button[aria-label="Descendre le poste"]').trigger('click')

    await vi.waitFor(() => expect(tab.findAll('[role="alert"]').map(alert => alert.text())).toEqual([
      'Donnez chaque poste de l’événement, une fois chacun.',
      'Introuvable.',
    ]))
  })
})
