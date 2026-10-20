import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BoardNav from '~/components/board/Nav.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { eventItem, page } from '../../helpers/events'
import { NOTHING_PENDING } from '../../helpers/treasury'

describe('BoardNav', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([], 0)) })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('leads to a page from every entry', async () => {
    /**
     * Given the board's navigation
     * Then each of its entries opens a page, even before its screen exists
     */
    const nav = await mountSuspended(BoardNav, { route: '/bureau' })
    const router = useRouter()

    const links = nav.findAll('a')
    expect(links.map(link => link.text())).toEqual([
      'Tableau de bord', 'Événements', 'Photos', 'Documents', 'Trésorerie', 'Stock', 'Matériel', 'Prêts',
    ])
    for (const link of links) {
      expect(router.resolve(link.attributes('href') ?? '').matched, link.text()).not.toHaveLength(0)
    }
  })

  it('marks the entry of the current page, and only that one', async () => {
    /**
     * Given a member on the Stock screen
     * Then "Stock" is the current entry, and the dashboard, which every board
     * page is under, is not
     */
    const nav = await mountSuspended(BoardNav, { route: '/bureau/stock' })

    const current = nav.findAll('a[aria-current="page"]')
    expect(current.map(link => link.text())).toEqual(['Stock'])
  })

  it('counts the events to come', async () => {
    /**
     * Given five events to come
     * Then the « Événements » entry shows how many, for screen readers too
     */
    clearApiMocks()
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()], 5)) })

    const nav = await mountSuspended(BoardNav, { route: '/bureau' })

    await vi.waitFor(() => expect(nav.get('a[href="/bureau/evenements"]').text()).toBe('Événements5 à venir'))
  })

  it('shows on « Documents » how many await review', async () => {
    /**
     * Given four documents awaiting review
     * Then the « Documents » entry shows their number in its badge, for screen readers too
     */
    mockApi('/api/board/overview', { handler: () => apiResponse(200, {
      pending: { ...NOTHING_PENDING, total: 4, documents: { counts: { total: 4, invoice: 2, order: 1, minutes: 1, misc: 0 }, items: [] } },
    }) })

    const nav = await mountSuspended(BoardNav, { route: '/bureau' })

    const documents = nav.findAll('a').find(link => link.attributes('href') === '/bureau/documents')!
    await vi.waitFor(() => expect(documents.text()).toBe('Documents4 à vérifier'))
    expect(nav.get('a[href="/bureau/prets"]').text()).toBe('Prêts')
  })

  it('shows on « Prêts » how many are to prepare or late', async () => {
    mockApi('/api/board/overview', { handler: () => apiResponse(200, {
      pending: { ...NOTHING_PENDING, total: 3, loans: { overdue: 1, to_prepare: 2, items: [] } },
    }) })

    const nav = await mountSuspended(BoardNav, { route: '/bureau' })

    const loans = nav.get('a[href="/bureau/prets"]')
    await vi.waitFor(() => expect(loans.text()).toBe('Prêts3 à préparer ou en retard'))
    expect(nav.get('a[href="/bureau/documents"]').text()).toBe('Documents')
  })

  it('counts on « Stock » the items below their threshold', async () => {
    /**
     * Given three items of the stock below their threshold
     * Then the « Stock » entry reads « 3 bas », and screen readers hear what
     * they are
     */
    mockApi('/api/board/overview', { handler: () => apiResponse(200, {
      pending: { ...NOTHING_PENDING, total: 3, stock: { count: 3, items: [] } },
    }) })

    const nav = await mountSuspended(BoardNav, { route: '/bureau' })

    const stock = nav.get('a[href="/bureau/stock"]')
    await vi.waitFor(() => expect(stock.text()).toBe('Stock3 bas sous le seuil'))
    expect(stock.get('span[aria-hidden="true"]').text()).toBe('bas')
  })

  it('shows « Membres » to the superuser alone', async () => {
    const session = useSessionStore()
    session.member = { id: 1, email: 'gabriel@example.fr', first_name: 'Gabriel', last_name: 'T.', position: '', is_superuser: false }

    const nav = await mountSuspended(BoardNav, { route: '/bureau' })
    expect(nav.find('a[href="/bureau/membres"]').exists()).toBe(false)

    session.member = { ...session.member, is_superuser: true }
    await vi.waitFor(() => expect(nav.find('a[href="/bureau/membres"]').exists()).toBe(true))
    expect(nav.get('a[href="/bureau/membres"]').text()).toBe('Membres')
  })
})
