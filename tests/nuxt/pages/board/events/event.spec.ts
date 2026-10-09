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

function mountEvent() {
  return mountSuspended(EventPage, { route: '/bureau/evenements/12' })
}

describe('the board\'s page of an event', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    // The sidebar's coming events, which saving the event fetches again.
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })
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

  it('opens on the public information, edited in its tab', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })

    const eventPage = await mountEvent()

    const tab = eventPage.get('[role="tab"]')
    expect(tab.text()).toBe('Infos publiques')
    expect(tab.attributes('aria-selected')).toBe('true')
    expect(eventPage.find('[role="tabpanel"] form').exists()).toBe(true)
  })

  it('shows the event as saved from its tab', async () => {
    mockApi(EVENT, { handler: () => apiResponse(200, boardEvent()) }, { event_id: 12 })
    mockApi(EVENT, { method: 'PUT', handler: () => apiResponse(200, boardEvent({ published: false })) }, { event_id: 12 })
    const eventPage = await mountEvent()

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
