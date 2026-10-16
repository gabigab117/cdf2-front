import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LedgerPage from '~/pages/board/treasury/ledger.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { page } from '../../../helpers/events'
import { fiscalYearResults, ledgerEntry } from '../../../helpers/treasury'

describe('the page of the whole journal', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
    mockApi('/api/board/treasury/results', { handler: () => apiResponse(200, fiscalYearResults()) })
    mockApi('/api/board/treasury/entries', { method: 'GET', handler: () => apiResponse(200, page([ledgerEntry()], 30)) })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('reads the journal of the year and event of the address, by pages of 25', async () => {
    /**
     * Given 30 lines of the brocante in 2026
     * When the second page of its journal shows
     * Then the API is asked for that page of 25, and the pages lead back to
     * the first, the filter kept
     */
    const sent = recordRequests()

    const ledger = await mountSuspended(LedgerPage, { route: '/bureau/tresorerie/journal?exercice=2026&evenement=3&page=2' })

    await vi.waitFor(() => expect(sent.map(request => request.url)).toContain('/api/board/treasury/entries?year=2026&event=3&page=2&page_size=25'))
    expect(ledger.get('h1').text()).toBe('Journal')
    await vi.waitFor(() => expect(ledger.text()).toContain('Page 2 sur 2'))
    expect(ledger.find('a[href="/bureau/tresorerie/journal?exercice=2026&evenement=3"]').exists()).toBe(true)
    expect(ledger.get('nav[aria-label="Fil d’Ariane"] a').attributes('href')).toBe('/bureau/tresorerie?exercice=2026')
  })

  it('lists every year’s lines missing their receipt, without the chips of a year', async () => {
    mockApi('/api/board/treasury/entries', { method: 'GET', handler: () => apiResponse(200, page([ledgerEntry()])) })
    const sent = recordRequests()

    const ledger = await mountSuspended(LedgerPage, { route: '/bureau/tresorerie/journal?justificatif=manquant' })

    await vi.waitFor(() => expect(sent.map(request => request.url)).toContain('/api/board/treasury/entries?receipt_state=missing&page=1&page_size=25'))
    expect(ledger.get('h1').text()).toBe('Justificatifs manquants')
    expect(ledger.find('nav[aria-label="Filtrer par événement"]').exists()).toBe(false)
    expect(ledger.find('select[aria-label="Exercice"]').exists()).toBe(false)
    // The way back leads to the Trésorerie page, not to its missing receipts.
    expect(ledger.get('nav[aria-label="Fil d’Ariane"] a').attributes('href')).toBe('/bureau/tresorerie')
  })

  it('lists every year’s advances to pay back, and tells one paid back', async () => {
    mockApi('/api/board/treasury/entries', { method: 'GET', handler: () => apiResponse(200, page([
      ledgerEntry(),
      ledgerEntry({ id: 5, reimbursed_on: '2026-09-20', reimbursement_method: 'transfer' }),
    ])) })
    const sent = recordRequests()

    const ledger = await mountSuspended(LedgerPage, { route: '/bureau/tresorerie/journal?avance=a-rembourser' })

    await vi.waitFor(() => expect(sent.map(request => request.url)).toContain('/api/board/treasury/entries?to_reimburse=true&page=1&page_size=25'))
    expect(ledger.get('h1').text()).toBe('Avances à rembourser')
    expect(ledger.find('nav[aria-label="Filtrer par événement"]').exists()).toBe(false)
    await vi.waitFor(() => expect(ledger.find('a[href="/bureau/tresorerie/ecritures/5"]').exists()).toBe(true))
    expect(ledger.get('a[href="/bureau/tresorerie/ecritures/4"]').text()).toContain('À rembourser')
    expect(ledger.get('a[href="/bureau/tresorerie/ecritures/5"]').text()).toContain('Remboursée le 20 sept.')
  })

  it('says when no advance is owed', async () => {
    mockApi('/api/board/treasury/entries', { method: 'GET', handler: () => apiResponse(200, page([])) })

    const ledger = await mountSuspended(LedgerPage, { route: '/bureau/tresorerie/journal?avance=a-rembourser' })

    await vi.waitFor(() => expect(ledger.text()).toContain('Aucune avance à rembourser.'))
  })

  it('says when every receipt is joined', async () => {
    mockApi('/api/board/treasury/entries', { method: 'GET', handler: () => apiResponse(200, page([])) })

    const ledger = await mountSuspended(LedgerPage, { route: '/bureau/tresorerie/journal?justificatif=manquant' })

    await vi.waitFor(() => expect(ledger.text()).toContain('Tous les justificatifs sont joints.'))
  })
})
