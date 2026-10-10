import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '~/pages/board/index.vue'
import type { components } from '~/types/api'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { julie, overviewEvent } from '../../helpers/events'
import { boardTask } from '../../helpers/tasks'

type BoardOverviewOut = components['schemas']['BoardOverviewOut']

/** The fictitious member signed in. */
const camille = { email: 'camille.martin@example.test', first_name: 'Camille', last_name: 'Martin', position: 'Trésorière' }

/** No general task yet. */
const NO_GENERAL_TASK: BoardOverviewOut['general_tasks'] = { tasks_done: 0, tasks_total: 0, next_tasks: [], recently_done_tasks: [] }

function overview(
  events = [overviewEvent()],
  count = events.length,
  notes: BoardOverviewOut['latest_notes'] = [],
  generalTasks = NO_GENERAL_TASK,
): BoardOverviewOut {
  return { upcoming_events: events, upcoming_events_count: count, latest_notes: notes, general_tasks: generalTasks }
}

function mockOverview(body: BoardOverviewOut) {
  mockApi('/api/board/overview', { handler: () => apiResponse(200, body) })
}

function mountDashboard() {
  return mountSuspended(DashboardPage, { route: '/bureau' })
}

/** The block of the dashboard under the given title. */
function block(dashboard: Awaited<ReturnType<typeof mountDashboard>>, title: string) {
  return dashboard.findAll('section').find(section => section.find('h2').exists() && section.get('h2').text() === title)!
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
    expect(card.text().replace(/\s+/g, ' ')).toContain('Tâches 9 / 14')
    expect(card.get('[role="progressbar"]').attributes()).toMatchObject({ 'aria-valuenow': '9', 'aria-valuemax': '14' })
  })

  it('shows the board\'s latest notes beside the events, each leading to its event', async () => {
    /**
     * Given a note of Julie on Halloween, two hours ago, and a general note of
     * a former member, the day before
     * When the member opens the dashboard
     * Then the block « Notes du bureau » shows them, the event and the time
     * gone by after the author, the first leading to its event
     */
    mockOverview(overview([overviewEvent()], 1, [
      { id: 31, author: julie, text: 'Salle réservée de 13 h à 20 h.', created_at: '2026-10-01T06:00:00Z', event: { id: 12, title: 'Halloween des enfants' } },
      { id: 32, author: null, text: 'Assemblée générale en janvier.', created_at: '2026-09-30T15:00:00Z', event: null },
    ]))

    const dashboard = await mountDashboard()

    await vi.waitFor(() => expect(block(dashboard, 'Notes du bureau').findAll('li')).toHaveLength(2))
    const notes = block(dashboard, 'Notes du bureau')
    expect(notes.find('[aria-label="Privé"]').exists()).toBe(true)
    const [julieNote, general] = notes.findAll('li')
    expect(julieNote!.get('a').attributes('href')).toBe('/bureau/evenements/12')
    expect(julieNote!.text().replaceAll('\u00A0', ' ')).toContain('Julie R.Halloween des enfants · il y a 2 h')
    expect(general!.find('a').exists()).toBe(false)
    expect(general!.text()).toContain('Ancien membrehier')
  })

  it('says when the board has no note yet', async () => {
    mockOverview(overview())

    const dashboard = await mountDashboard()

    await vi.waitFor(() => expect(dashboard.text()).toContain('Aucune note pour l’instant.'))
  })

  it.each([
    ['today', '2026-10-31T09:00:00+01:00', overviewEvent(), 'Halloween des enfants aujourd’hui', 'Aujourd’hui'],
    ['under way', '2026-10-31T09:00:00+01:00', overviewEvent({ starts_at: '2026-10-30T13:00:00Z', ends_at: '2026-11-01T17:00:00Z' }), 'Halloween des enfants en cours', 'En cours'],
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

  it('sums up the general tasks beside the notes, and leads to them all', async () => {
    /**
     * Given two general tasks, the next one open and the other done
     * When the dashboard shows
     * Then its block counts one done out of two, lists both, and leads to the page of them all
     */
    const open = boardTask({ id: 61, event: null, title: 'Renouveler l’assurance' })
    const done = boardTask({ id: 62, event: null, title: 'Payer la cotisation', done_at: '2026-09-29T10:00:00+02:00' })
    mockOverview(overview([], 0, [], { tasks_done: 1, tasks_total: 2, next_tasks: [open], recently_done_tasks: [done] }))

    const dashboard = await mountDashboard()

    await vi.waitFor(() => expect(dashboard.text()).toContain('Tâches générales'))
    const tasks = block(dashboard, 'Tâches générales')
    expect(tasks.text()).toContain('1 / 2')
    expect(tasks.findAll('li').map(item => item.text())).toEqual([
      expect.stringContaining('Renouveler l’assurance'),
      expect.stringContaining('Payer la cotisation'),
    ])
    expect(tasks.get('a').attributes('href')).toBe('/bureau/taches')
    expect(tasks.get('a').text()).toBe('Voir les 2 tâches')
  })
})
