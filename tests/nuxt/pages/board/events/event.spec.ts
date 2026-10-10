import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventPage from '~/pages/board/events/[id]/index.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../../helpers/api'
import { boardEvent, page } from '../../../helpers/events'

const { showErrorMock } = vi.hoisted(() => ({ showErrorMock: vi.fn() }))
mockNuxtImport('showError', () => showErrorMock)

const EVENT = '/api/board/events/{event_id}'

function readable(text: string): string {
  return text.replaceAll(' ', ' ')
}

function mountEvent(route = '/bureau/evenements/12') {
  return mountSuspended(EventPage, { route })
}

describe('the board\'s page of an event', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    // The sidebar's coming events, which saving the event fetches again.
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })
    // The counts of the tabs, and the notes of the first tab.
    mockApi('/api/board/events/{event_id}/dashboard', { handler: () => apiResponse(200, { notes_count: 6, tasks_done: 9, tasks_total: 14, next_tasks: [], recently_done_tasks: [], assigned_count: 4, required_count: 7, reserved_seats: 42, capacity: 80 }) }, { event_id: 12 })
    mockApi('/api/board/notes', { handler: () => apiResponse(200, page([])) })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    showErrorMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the pages unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('shows the event as the mockup does', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })

    const eventPage = await mountEvent()

    expect(eventPage.get('nav[aria-label="Fil d’Ariane"]').text()).toBe('Événements/Halloween des enfants')
    expect(eventPage.get('h1').text()).toBe('Halloween des enfants')
    expect(readable(eventPage.text())).toContain('Publié sur le siteEnfants')
    expect(readable(eventPage.text())).toContain('Sam. 31 oct. 2026 · 15 h 00 – 18 h 30 Salle des fêtes Responsable : Julie R.')
    expect(eventPage.get('a[href="/bureau/evenements/12/modifier"]').text()).toBe('Modifier')
    expect(eventPage.get('a[href="/evenements/halloween-des-enfants-2026"]').text()).toBe('Page publique')
  })

  it('says an event is not published, and has no lead', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, boardEvent({ published: false, lead: null })) }, { event_id: 12 })

    const eventPage = await mountEvent()

    expect(eventPage.text()).toContain('Non publié')
    expect(eventPage.text()).not.toContain('Responsable')
    expect(eventPage.text()).not.toContain('Page publique')
  })

  it('opens on the board\'s notes, counted in their tab, the public information last', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })

    const eventPage = await mountEvent()

    await vi.waitFor(() => expect(eventPage.get('[role="tab"]').text()).toBe('Notes du bureau 6'))
    expect(eventPage.findAll('[role="tab"]').map(tab => [tab.text(), tab.attributes('aria-selected')])).toEqual([
      ['Notes du bureau 6', 'true'],
      ['Tâches 9/14', 'false'],
      ['Postes 4/7', 'false'],
      ['Réservations 42/80', 'false'],
      ['Infos publiques', 'false'],
    ])
    expect(eventPage.get('[role="tabpanel"] textarea').attributes('placeholder')).toBe('Écrire une note pour le bureau…')
    expect(eventPage.get('[role="tabpanel"] aside h2').text()).toBe('Tâches')
  })

  it('shows the tab its address asks for, and writes the tab chosen in it', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })
    const eventPage = await mountEvent('/bureau/evenements/12?onglet=infos-publiques')

    expect(eventPage.get('[role="tab"][aria-selected="true"]').text()).toBe('Infos publiques')
    expect(eventPage.find('[role="tabpanel"] input[type="checkbox"]').exists()).toBe(true)

    await eventPage.get('[role="tab"]').trigger('click')

    await vi.waitFor(() => expect(useRoute().query.onglet).toBeUndefined())
    expect(eventPage.get('[role="tab"][aria-selected="true"]').text()).toContain('Notes du bureau')
  })

  it('shows the event as saved from its tab', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })
    mockApi(EVENT, { method: 'PUT', handler: () => apiResponse(200, boardEvent({ published: false })) }, { event_id: 12 })
    const eventPage = await mountEvent('/bureau/evenements/12?onglet=infos-publiques')

    await eventPage.get('form').trigger('submit')

    await vi.waitFor(() => expect(eventPage.text()).toContain('Non publié'))
  })

  it('is the page not found of an event that does not exist', async () => {
    mockApi(EVENT, { handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { event_id: 12 })

    await mountEvent()

    expect(showErrorMock).toHaveBeenCalledWith({ status: 404, statusText: 'Not Found' })
  })

  it('says why the event could not load, and loads it again on demand', async () => {
    const handler = vi.fn(() => apiResponse(503, 'Service Unavailable'))
    mockApi(EVENT, { handler }, { event_id: 12 })
    const eventPage = await mountEvent()

    expect(eventPage.get('[role="alert"]').text()).toContain('Le service est momentanément indisponible.')
    expect(showErrorMock).not.toHaveBeenCalled()

    handler.mockImplementation(() => apiResponse(200, boardEvent()))
    await eventPage.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(eventPage.find('h1').exists()).toBe(true))
  })
})
