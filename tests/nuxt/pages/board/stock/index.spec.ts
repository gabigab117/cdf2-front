import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StockPage from '~/pages/board/stock/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { stockedItem, stockOverview } from '../../../helpers/stock'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

function mockStock(overview = stockOverview()) {
  mockApi('/api/board/stock', { handler: () => apiResponse(200, overview) })
}

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

function rowOf(page: VueWrapper, name: string) {
  return page.findAll('li').find(row => row.text().includes(name))!
}

describe('the Stock page', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    // Thursday 1 October 2026, the mockup's day, in Paris.
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('shows each item, those below their threshold in amber, as the mockup does', async () => {
    /**
     * Given four items, the juice and the sweets below their threshold
     * When the page shows
     * Then each row tells its quantity, its threshold, its level and its
     * best-before month; the low ones say « Sous le seuil »
     */
    mockStock()

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock' })

    await vi.waitFor(() => expect(stock.findAll('li')).toHaveLength(4))
    expect(stock.get('h1').text()).toBe('Stock')
    expect(stock.text()).toContain('Marchandises de la buvette et des animations')
    const juice = rowOf(stock, 'Jus de fruits 1 L')
    expect(juice.text()).toContain('Sous le seuil')
    expect(juice.classes()).toContain('bg-ambre-25')
    expect(juice.get('a').attributes('href')).toBe('/bureau/stock/articles/3')
    expect(juice.get('output').text()).toBe('18')
    expect(juice.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('38')
    expect(juice.text()).toContain('févr. 2027')
    const sweets = rowOf(stock, 'Bonbons assortis')
    expect(readable(sweets.get('output').text())).toBe('1,5 kg')
    expect(readable(sweets.text())).toContain('3 kg')
    expect(sweets.text()).toContain('—')
    const kegs = rowOf(stock, 'Fûts de bière 20 L')
    expect(kegs.text()).not.toContain('Sous le seuil')
    expect(readable(kegs.get('output').text())).toBe('2 fûts')
    expect(stock.text()).toContain('Les boutons − et + enregistrent un mouvement daté avec votre nom.')
    expect(stock.get('a[href="/bureau/stock/articles/nouveau"]').text()).toBe('Ajouter un article')
  })

  it('counts its chips, « Sous le seuil » in amber, each leading to its filter', async () => {
    mockStock()

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock' })

    const chips = () => stock.findAll('nav[aria-label="Filtrer le stock"] a')
    await vi.waitFor(() => expect(chips().map(chip => chip.text())).toEqual([
      'Tout4', 'Sous le seuil2', 'Boissons3', 'Alimentaire1', 'Consommables0', 'Loto et tombola0',
    ]))
    expect(chips().map(chip => chip.attributes('href'))).toEqual([
      '/bureau/stock',
      '/bureau/stock?filtre=bas',
      '/bureau/stock?filtre=boissons',
      '/bureau/stock?filtre=alimentaire',
      '/bureau/stock?filtre=consommables',
      '/bureau/stock?filtre=loto-et-tombola',
    ])
    expect(chips()[1]!.classes()).toContain('bg-ambre-50')
    expect(chips()[0]!.attributes('aria-current')).toBe('page')
  })

  it('keeps the items below their threshold, as the bell leads to them', async () => {
    mockStock()

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock?filtre=bas' })

    await vi.waitFor(() => expect(stock.findAll('li').map(row => row.get('a').text())).toEqual(['Jus de fruits 1 L', 'Bonbons assortis']))
    expect(stock.get('nav[aria-label="Filtrer le stock"] a[aria-current="page"]').text()).toBe('Sous le seuil2')
  })

  it('searches the items once the typing pauses, and the address keeps the search', async () => {
    /**
     * Given the stock searched for « FUT »
     * Then the kegs alone show
     * When « jus » is typed
     * Then the address takes the search, once the typing pauses
     */
    mockStock()

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock?recherche=FUT' })

    await vi.waitFor(() => expect(stock.findAll('li').map(row => row.get('a').text())).toEqual(['Fûts de bière 20 L']))
    await stock.get('input[type="search"]').setValue('jus')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: { filtre: undefined, recherche: 'jus' } }, { replace: true }))
  })

  it('says when no item answers the search, or when the stock holds none', async () => {
    mockStock()
    const searched = await mountSuspended(StockPage, { route: '/bureau/stock?recherche=sapin' })
    await vi.waitFor(() => expect(searched.text()).toContain('Aucun article ne correspond à cette recherche.'))
    searched.unmount()
    clearNuxtData()
    clearApiMocks()

    mockStock(stockOverview({ items: [], counts: { total: 0, low: 0, drinks: 0, food: 0, supplies: 0, lotto_raffle: 0 } }))
    const empty = await mountSuspended(StockPage, { route: '/bureau/stock' })
    await vi.waitFor(() => expect(empty.text()).toContain('Aucun article pour l’instant.'))
  })

  it('dates the stock by its latest stocktake, and its event', async () => {
    mockStock(stockOverview({ last_stocktake: { created_at: '2026-09-14T16:00:00Z', event: { id: 3, title: 'Brocante' } } }))

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock' })

    await vi.waitFor(() => expect(stock.text()).toContain('Marchandises de la buvette et des animations · dernier inventaire le 14 sept. (Brocante)'))
  })

  it('records a step out on −, and in on +, then reads the stock again', async () => {
    /**
     * Given the juice in stock
     * When a member clicks on − then on +
     * Then each click sends its way, and the stock is read again
     */
    mockStock()
    mockApi('/api/board/stock/items/{item_id}/adjustments', { handler: () => apiResponse(200, stockedItem()) }, { item_id: 3 })
    const sent = recordRequests()

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock' })
    await vi.waitFor(() => expect(stock.findAll('li')).toHaveLength(4))
    const juice = rowOf(stock, 'Jus de fruits 1 L')
    expect(juice.findAll('button').map(button => readable(button.attributes('aria-label') ?? ''))).toEqual([
      'Retirer : 6 Jus de fruits 1 L',
      'Ajouter : 6 Jus de fruits 1 L',
    ])

    await juice.findAll('button')[0]!.trigger('click')
    await vi.waitFor(() => expect(sent.filter(request => request.method === 'POST')).toHaveLength(1))
    await vi.waitFor(() => expect(juice.findAll('button')[1]!.attributes('disabled')).toBeUndefined())
    await juice.findAll('button')[1]!.trigger('click')

    await vi.waitFor(() => expect(sent.filter(request => request.method === 'POST').map(request => request.body)).toEqual([
      { direction: 'out' },
      { direction: 'in' },
    ]))
    await vi.waitFor(() => expect(sent.filter(request => request.url === '/api/board/stock').length).toBeGreaterThan(1))
  })

  it('shows why a click was refused', async () => {
    mockStock()
    mockApi('/api/board/stock/items/{item_id}/adjustments', {
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body'], msg: 'Il n’en reste plus en stock.' }] }),
    }, { item_id: 3 })

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock' })
    await vi.waitFor(() => expect(stock.findAll('li')).toHaveLength(4))
    await rowOf(stock, 'Jus de fruits 1 L').findAll('button')[0]!.trigger('click')

    await vi.waitFor(() => expect(stock.get('[role="alert"]').text()).toBe('Il n’en reste plus en stock.'))
  })

  it('offers to try again when the stock cannot be read', async () => {
    mockApi('/api/board/stock', { handler: () => apiResponse(503, {}) })

    const stock = await mountSuspended(StockPage, { route: '/bureau/stock' })

    await vi.waitFor(() => expect(stock.text()).toContain('Réessayer'))
  })
})
