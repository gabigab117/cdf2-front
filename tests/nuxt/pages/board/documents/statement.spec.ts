import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StatementPage from '~/pages/board/documents/statement.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { boardDocument } from '../../../helpers/documents'
import { eventItem, page } from '../../../helpers/events'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

/** Types a purchase into the page's form: its fields come in this order. */
async function typePurchase(statement: Awaited<ReturnType<typeof mountSuspended>>) {
  const [supplier, date, amount, purchase] = statement.findAll('input')
  await supplier!.setValue('Carrefour')
  await date!.setValue('2026-10-12')
  await amount!.setValue('23,40')
  await purchase!.setValue('Boissons et gobelets pour la buvette')
}

describe('the page of a sworn statement', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
    mockApi('/api/board/documents/statements', {
      method: 'POST',
      handler: () => apiResponse(201, boardDocument({ id: 23, source: 'sworn_statement' })),
    })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('attests a purchase for the event it comes from, then opens the invoice', async () => {
    /**
     * Given the page opened from Halloween's deposit
     * When a member attests a purchase
     * Then the statement is of Halloween, and the invoice made opens in the Documents page
     */
    const sent = recordRequests()
    const statement = await mountSuspended(StatementPage, { route: '/bureau/documents/attestation?evenement=12' })

    await typePurchase(statement)
    await statement.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ path: '/bureau/documents', query: { document: '23' } }))
    expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ supplier: 'Carrefour', event: 12 })
    expect(statement.get('h1').text()).toBe('Attestation sur l’honneur')
  })

  it('attests a purchase of no event when the address names none', async () => {
    const sent = recordRequests()
    const statement = await mountSuspended(StatementPage, { route: '/bureau/documents/attestation?evenement=x' })

    await typePurchase(statement)
    await statement.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalled())
    expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ event: null })
  })
})
