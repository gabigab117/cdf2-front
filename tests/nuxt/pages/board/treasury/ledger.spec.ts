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
})
