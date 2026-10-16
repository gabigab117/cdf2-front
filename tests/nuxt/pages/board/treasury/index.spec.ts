import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreasuryPage from '~/pages/board/treasury/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { eventItem, julie, page } from '../../../helpers/events'
import { fiscalYearResults, ledgerEntry } from '../../../helpers/treasury'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

function mockPage(entries = [ledgerEntry()]) {
  mockApi('/api/board/treasury/results', { handler: () => apiResponse(200, fiscalYearResults()) })
  mockApi('/api/board/treasury/entries', { method: 'GET', handler: () => apiResponse(200, page(entries, 19)) })
  mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
}

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

describe('the Trésorerie page', () => {
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

  it('shows the figures of the fiscal year, as the mockup tells them', async () => {
    /**
     * Given the ledger of the mockup
     * When the page shows
     * Then it brought in 11 490,00 € and cost 6 921,25 €, a result of +4 568,75 €
     * And the journal reads the ten latest lines of 2026, with a chip for each
     * event that has lines
     */
    mockPage()
    const sent = recordRequests()

    const treasury = await mountSuspended(TreasuryPage, { route: '/bureau/tresorerie' })

    await vi.waitFor(() => expect(readable(treasury.text())).toContain('11 490,00 €'))
    expect(treasury.get('h1').text()).toBe('Trésorerie')
    expect(readable(treasury.text())).toContain('6 921,25 €')
    expect(readable(treasury.text())).toContain('+4 568,75 €')
    expect(treasury.text()).toContain('Depuis le 1er janvier')
    expect(sent.map(request => request.url)).toContain('/api/board/treasury/entries?year=2026&page=1&page_size=10')
    expect(treasury.findAll('nav[aria-label="Filtrer par événement"] a').map(chip => chip.text())).toEqual([
      'Toutes19', 'Hors événement5', 'Brocante5', 'Halloween des enfants2',
    ])
    expect(treasury.text()).toContain('19 lignes')
    expect(treasury.get('a[href="/bureau/tresorerie/journal"]').text()).toBe('Voir tout le journal de l’exercice')
    // On a phone, a ticket is taken in photo.
    expect(treasury.get('a[href="/bureau/tresorerie/nouvelle"]').text()).toBe('Photographier un ticket')
  })

  it('shows the result of each event, whose rows filter the journal of the year shown', async () => {
    /**
     * Given the journal of 2025 filtered on the brocante
     * When the page shows
     * Then the result of each event leads the brocante back to the whole
     * journal of 2025, and the other rows to theirs
     */
    mockPage()

    const treasury = await mountSuspended(TreasuryPage, { route: '/bureau/tresorerie?exercice=2025&evenement=3' })

    await vi.waitFor(() => expect(readable(treasury.text())).toContain('+3 140,00 €'))
    const title = treasury.findAll('h2').find(heading => heading.text() === 'Résultat par événement')!
    const rows = treasury.get(`section[aria-labelledby="${title.attributes('id')}"]`).findAll('li a')
    expect(rows.map(row => row.attributes('href'))).toEqual([
      '/bureau/tresorerie?exercice=2025',
      '/bureau/tresorerie?exercice=2025&evenement=12',
      '/bureau/tresorerie?exercice=2025&evenement=aucun',
    ])
    expect(rows[0]!.attributes('aria-current')).toBe('page')
  })

  it('shows a line of the journal: its date, label, category, event, payment and amount', async () => {
    mockPage()

    const treasury = await mountSuspended(TreasuryPage, { route: '/bureau/tresorerie' })

    await vi.waitFor(() => expect(treasury.find('a[href="/bureau/tresorerie/ecritures/4"]').exists()).toBe(true))
    const row = treasury.get('a[href="/bureau/tresorerie/ecritures/4"]')
    expect(readable(row.text())).toBe('12 sept.Courses buvetteBoissonsBrocanteAvancé par Julie R.−286,30 €!')
  })

  it('filters the journal by the event of the address', async () => {
    mockPage()
    const sent = recordRequests()

    const treasury = await mountSuspended(TreasuryPage, { route: '/bureau/tresorerie?exercice=2025&evenement=aucun' })

    await vi.waitFor(() => expect(sent.map(request => request.url)).toContain('/api/board/treasury/entries?year=2025&general=true&page=1&page_size=10'))
    expect(treasury.text()).toContain('Du 1er janvier au 31 décembre 2025')
    await vi.waitFor(() => expect(treasury.get('a[aria-current="page"]').text()).toBe('Hors événement5'))
  })

  it('records a line, then shows it first in the journal of its year', async () => {
    /**
     * Given the card of a new line
     * When the member adds the drinks of the bar
     * Then the form goes to the API, without what is left empty, and the page
     * goes to the journal of 2026, without filter
     */
    mockPage()
    mockApi('/api/board/treasury/entries', { method: 'POST', handler: () => apiResponse(201, ledgerEntry({ id: 21, payment_method: 'association_card', advanced_by: null })) })
    const sent = recordRequests()
    const treasury = await mountSuspended(TreasuryPage, { route: '/bureau/tresorerie' })

    await treasury.get('input[placeholder="Ex. Courses buvette"]').setValue('Courses buvette')
    await treasury.get('input[inputmode="decimal"]').setValue('286,30')
    await treasury.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: { exercice: '2026', evenement: undefined, page: undefined, justificatif: undefined } }))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      date: '2026-10-01',
      kind: 'expense',
      label: 'Courses buvette',
      amount: '286.30',
      category: 'food',
      payment_method: 'association_card',
    })
  })

  it('says when a fiscal year has no line', async () => {
    mockPage([])

    const treasury = await mountSuspended(TreasuryPage, { route: '/bureau/tresorerie' })

    await vi.waitFor(() => expect(treasury.text()).toContain('Aucune ligne pour l’exercice 2026.'))
  })
})
