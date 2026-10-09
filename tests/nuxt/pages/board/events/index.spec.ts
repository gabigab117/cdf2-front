import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EventsPage from '~/pages/board/events/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { eventItem, page } from '../../../helpers/events'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

function readable(text: string): string {
  return text.replaceAll(' ', ' ')
}

function mountList(route = '/bureau/evenements') {
  return mountSuspended(EventsPage, { route })
}

describe('the board\'s list of events', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the pages unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('shows the events to come, with their day, category and publication', async () => {
    mockApi('/api/board/events', {
      handler: () => apiResponse(200, page([
        eventItem(),
        eventItem({ id: 13, title: 'Loto d’automne', category: 'games', starts_at: '2026-11-15T13:00:00Z', ends_at: null, start_label: 'Ouverture', published: false }),
      ])),
    })
    const sent = recordRequests()

    const list = await mountList()

    expect(sent.map(request => request.url)).toEqual(['/api/board/events?period=upcoming&page=1&page_size=25'])
    const rows = list.findAll('li a')
    expect(rows.map(row => row.attributes('href'))).toEqual(['/bureau/evenements/12', '/bureau/evenements/13'])
    expect(readable(rows[0]!.text())).toBe('Halloween des enfantssam. 31 oct. 2026 · 15 h 00 – 18 h 30 · Salle des fêtesEnfantsPublié')
    expect(readable(rows[1]!.text())).toBe('Loto d’automnedim. 15 nov. 2026 · Ouverture 14 h 00 · Salle des fêtesJeuxNon publié')
    expect(list.get('input[value="upcoming"]').element).toHaveProperty('checked', true)
  })

  it('shows the page of past events its address asks for, and leads to the others', async () => {
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem({ id: 3 })], 60)) })
    const sent = recordRequests()

    const list = await mountList('/bureau/evenements?periode=passes&page=2')

    expect(sent.map(request => request.url)).toEqual(['/api/board/events?period=past&page=2&page_size=25'])
    expect(list.get('input[value="past"]').element).toHaveProperty('checked', true)
    expect(list.get('nav[aria-label="Pagination"]').text()).toContain('Page 2 sur 3')
    expect(list.findAll('nav[aria-label="Pagination"] a').map(link => link.attributes('href'))).toEqual([
      '/bureau/evenements?periode=passes',
      '/bureau/evenements?periode=passes&page=3',
    ])
  })

  it('keeps the period chosen in its address', async () => {
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })
    const list = await mountList()

    await list.get('input[value="past"]').setValue(true)

    expect(navigateToMock).toHaveBeenCalledWith({ query: { periode: 'passes', page: undefined } })
  })

  it.each([
    ['/bureau/evenements', 'Aucun événement à venir.'],
    ['/bureau/evenements?periode=passes', 'Aucun événement passé.'],
  ])('says when %s holds no event', async (route, message) => {
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })

    const list = await mountList(route)

    expect(list.text()).toContain(message)
    expect(list.find('nav[aria-label="Pagination"]').exists()).toBe(false)
  })

  it('leads back to the first page from a page past the end of the list', async () => {
    /**
     * Given an old link to the ninth page of a list that holds two now
     * Then the page says it holds nothing, and leads to the first one
     */
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([], 30)) })

    const list = await mountList('/bureau/evenements?page=9')

    expect(list.text()).toContain('Cette page ne contient aucun événement.')
    expect(list.get('a[href="/bureau/evenements"]').text()).toBe('Revenir à la première page')
  })

  it('says why the list could not load, and loads it again on demand', async () => {
    const handler = vi.fn(() => apiResponse(500, 'Internal Server Error'))
    mockApi('/api/board/events', { handler })
    const list = await mountList()

    expect(list.get('[role="alert"]').text()).toContain('Le service est momentanément indisponible.')

    handler.mockImplementation(() => apiResponse(200, page([eventItem()])))
    await list.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(list.findAll('li a')).toHaveLength(1))
    expect(list.find('[role="alert"]').exists()).toBe(false)
  })
})
