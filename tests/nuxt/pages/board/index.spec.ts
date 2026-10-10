import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '~/pages/board/index.vue'
import type { components } from '~/types/api'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { eventItem } from '../../helpers/events'

type BoardOverviewOut = components['schemas']['BoardOverviewOut']

/** The fictitious member signed in. */
const camille = { email: 'camille.martin@example.test', first_name: 'Camille', last_name: 'Martin', position: 'Trésorière' }

function overview(events = [eventItem()], count = events.length): BoardOverviewOut {
  return { upcoming_events: events, upcoming_events_count: count }
}

function mockOverview(body: BoardOverviewOut) {
  mockApi('/api/board/overview', { handler: () => apiResponse(200, body) })
}

function mountDashboard() {
  return mountSuspended(DashboardPage, { route: '/bureau' })
}

describe('the dashboard', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useSessionStore().member = camille
    // Thursday 1 October 2026, the mockup's day, in Paris.
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the pages unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('greets the member by their first name, with the day and the next event', async () => {
    mockOverview(overview())

    const dashboard = await mountDashboard()

    expect(dashboard.get('h1').text()).toBe('Bonjour Camille')
    await vi.waitFor(() => expect(dashboard.get('h1 + p').text()).toBe('Jeudi 1er octobre · Halloween des enfants dans 30 jours'))
  })

  it.each([
    ['while the member is not known yet', null],
    ['for a member without a first name', { ...camille, first_name: '' }],
  ])('says « Bonjour » alone %s', async (_case, member) => {
    mockOverview(overview([], 0))
    useSessionStore().member = member

    const dashboard = await mountDashboard()

    expect(dashboard.get('h1').text()).toBe('Bonjour')
  })

  it('sums up the next event in a card that counts the days and leads to its page', async () => {
    mockOverview(overview())

    const dashboard = await mountDashboard()

    await vi.waitFor(() => expect(dashboard.text()).toContain('Prochain événement'))
    const card = dashboard.findAll('a').find(link => link.text().includes('Prochain événement'))!
    expect(card.attributes('href')).toBe('/bureau/evenements/12')
    expect(card.text()).toContain('J-30')
    expect(card.text()).toContain('Halloween des enfants')
  })

  it.each([
    ['today', '2026-10-31T09:00:00+01:00', eventItem(), 'Halloween des enfants aujourd’hui', 'Aujourd’hui'],
    ['under way', '2026-10-31T09:00:00+01:00', eventItem({ starts_at: '2026-10-30T13:00:00Z', ends_at: '2026-11-01T17:00:00Z' }), 'Halloween des enfants en cours', 'En cours'],
  ])('tells when the next event is %s', async (_case, now, event, inline, pill) => {
    useNow().value = Date.parse(now)
    mockOverview(overview([event]))

    const dashboard = await mountDashboard()

    await vi.waitFor(() => expect(dashboard.get('h1 + p').text()).toBe(`Samedi 31 octobre · ${inline}`))
    expect(dashboard.text()).toContain(pill)
  })

  it('shows the day alone, and no card, when no event is to come', async () => {
    mockOverview(overview([], 0))

    const dashboard = await mountDashboard()

    await vi.waitFor(() => expect(dashboard.text()).toContain('Aucun événement à venir.'))
    expect(dashboard.get('h1 + p').text()).toBe('Jeudi 1er octobre')
    expect(dashboard.text()).not.toContain('Prochain événement')
  })

  it('greets at once, and says nothing of the events while they load', async () => {
    mockApi('/api/board/overview', { handler: () => new Promise<never>(() => {}) })

    const dashboard = await mountDashboard()

    expect(dashboard.get('h1').text()).toBe('Bonjour Camille')
    expect(dashboard.get('section').attributes('aria-busy')).toBe('true')
    expect(dashboard.text()).not.toContain('Aucun événement à venir.')
  })

  it('says why the dashboard could not load, and loads it again on demand', async () => {
    const handler = vi.fn(() => apiResponse(500, 'Internal Server Error'))
    mockApi('/api/board/overview', { handler })
    const dashboard = await mountDashboard()

    await vi.waitFor(() => expect(dashboard.get('[role="alert"]').text()).toContain('Le service est momentanément indisponible.'))

    handler.mockImplementation(() => apiResponse(200, overview()))
    await dashboard.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(dashboard.findAll('li a')).toHaveLength(1))
    expect(dashboard.find('[role="alert"]').exists()).toBe(false)
  })
})
