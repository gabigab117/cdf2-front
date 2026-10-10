import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BoardTopBar from '~/components/board/TopBar.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { documentItem } from '../../helpers/documents'

function mockPending(total: number, items = [documentItem()], counted = total) {
  mockApi('/api/board/overview', { handler: () => apiResponse(200, {
    pending: { total, documents: { counts: { total: counted, invoice: counted, order: 0, minutes: 0, misc: 0 }, items } },
  }) })
}

describe('BoardTopBar', () => {
  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  it('opens the « Nouveau » menu with the browser\'s own popover, which leads to a new event', async () => {
    const bar = await mountSuspended(BoardTopBar)

    const button = bar.findAll('button').find(candidate => candidate.text() === 'Nouveau')!
    const menu = bar.get(`[popover][id="${button.attributes('popovertarget')}"]`)
    expect(menu.get('nav').attributes('aria-label')).toBe('Nouveau')
    expect(menu.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Événement', '/bureau/evenements/nouveau'],
      ['Tâche', '/bureau/taches/nouvelle'],
      ['Document', '/bureau/documents/nouveau'],
    ])
  })

  it('asks to open the navigation, on a phone', async () => {
    const bar = await mountSuspended(BoardTopBar)

    await bar.get('button[aria-label="Ouvrir la navigation"]').trigger('click')

    expect(bar.emitted('openNavigation')).toHaveLength(1)
  })

  it('leaves its place to the action of a page that has one', async () => {
    /**
     * Given the Documents page, whose action is « Importer »
     * Then the bar holds the place where the page renders it, and no « Nouveau » menu
     */
    useSessionStore().accessToken = 'access-1'
    const bar = await mountSuspended(BoardTopBar, { route: '/bureau/documents' })

    expect(bar.find('#board-top-bar-action').exists()).toBe(true)
    expect(bar.findAll('button').some(candidate => candidate.text() === 'Nouveau')).toBe(false)
  })

  it('shows a dot on the bell when something awaits the board, and lists it in its panel', async () => {
    /**
     * Given twelve documents to review, the latest of which the overview lists
     * Then the bell says how many await, with a dot, and its panel lists the
     * latest, each leading to its panel, then leads to them all
     */
    useSessionStore().accessToken = 'access-1'
    mockPending(12, [documentItem(), documentItem({ id: 22, title: 'Bon de commande — Bonbons', category: 'order', date: '2026-09-25' })])

    const bar = await mountSuspended(BoardTopBar, { route: '/bureau' })

    const bell = bar.findAll('button').find(candidate => candidate.attributes('aria-label')?.startsWith('À traiter'))!
    await vi.waitFor(() => expect(bell.attributes('aria-label')).toBe('À traiter (12)'))
    expect(bell.find('span[aria-hidden="true"]').exists()).toBe(true)
    const panel = bar.get(`[popover][id="${bell.attributes('popovertarget')}"]`)
    expect(panel.get('h2').text()).toBe('À traiter')
    const links = panel.findAll('a')
    expect(links.map(link => [link.text(), link.attributes('href')])).toEqual([
      [expect.stringContaining('Facture — Location sono'), '/bureau/documents?document=21'],
      [expect.stringContaining('Bon de commande — Bonbons'), '/bureau/documents?document=22'],
      ['Voir les 12 documents à vérifier', '/bureau/documents?statut=a-verifier'],
    ])
  })

  it('says nothing awaits the board, without a dot', async () => {
    useSessionStore().accessToken = 'access-1'
    mockPending(0, [])

    const bar = await mountSuspended(BoardTopBar, { route: '/bureau' })

    await vi.waitFor(() => expect(bar.text()).toContain('Rien à traiter pour l’instant.'))
    const bell = bar.findAll('button').find(candidate => candidate.attributes('aria-label') === 'À traiter')!
    expect(bell.find('span').exists()).toBe(false)
  })
})
