import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditLoanPage from '~/pages/board/loans/[id]/edit.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { DEPOSITS, availabilityItem, availabilityOut, loanOut } from '../../../helpers/equipment'
import { eventItem, page } from '../../../helpers/events'

const { navigateToMock, showErrorMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), showErrorMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('showError', () => showErrorMock)

// The loan's own marquees are left out of what the API counts: three free.
const MARQUEES = availabilityItem({}, { free: 3 })

function mockForm(loan = loanOut()) {
  mockApi('/api/board/loans/{loan_id}', { method: 'GET', handler: () => apiResponse(200, loan) }, { loan_id: 20 })
  mockApi('/api/board/loans/deposits', { handler: () => apiResponse(200, DEPOSITS) })
  mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  mockApi('/api/board/equipment/availability', { handler: () => apiResponse(200, availabilityOut([MARQUEES])) })
}

function mountPage() {
  return mountSuspended(EditLoanPage, { route: '/bureau/prets/20/modifier', attachTo: document.body, global: { stubs: { teleport: true } } })
}

describe('the page that changes a loan', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    showErrorMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('edits the loan as it stands, its own pieces left out of what is free', async () => {
    /**
     * Given the football club's loan of two marquees
     * When its form shows
     * Then it reads its number, borrower and lines, asks what is free without
     * it, and keeps it a loan to someone
     */
    mockForm()
    const sent = recordRequests()

    const view = await mountPage()

    await vi.waitFor(() => expect(view.text()).toContain('3 libres / 4'))
    expect(view.text()).toContain('P-2026-020')
    expect(view.get('h1').text()).toBe('Modifier le prêt')
    expect(sent.map(request => request.url)).toContain('/api/board/equipment/availability?start=2026-10-16&end=2026-10-18&exclude_loan=20')
    expect(view.findAll('li').find(item => item.text().startsWith('Barnums 3 × 3 m'))?.get('output').text()).toBe('2')
    const committee = view.findAll('button').find(button => button.text() === 'Usage comité')!
    expect(committee.attributes('disabled')).toBeDefined()
  })

  it('saves the loan whole, then opens it', async () => {
    mockForm()
    mockApi('/api/board/loans/{loan_id}', { method: 'PUT', handler: () => apiResponse(200, loanOut({ notes: 'Clés au local.' })) }, { loan_id: 20 })
    const sent = recordRequests()
    const view = await mountPage()
    await vi.waitFor(() => expect(view.text()).toContain('3 libres / 4'))

    await view.get('textarea').setValue('Clés au local.')
    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(sent.find(request => request.method === 'PUT')).toEqual({
      method: 'PUT',
      url: '/api/board/loans/20',
      body: {
        borrower_type: 'association',
        borrower_name: 'Club de football',
        purpose: 'Tournoi jeunes',
        phone: '01 23 45 67 89',
        event: null,
        start_date: '2026-10-16',
        end_date: '2026-10-18',
        deposit_amount: '150.00',
        notes: 'Clés au local.',
        lines: [{ equipment: 5, quantity: 2 }],
      },
    }))
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ path: '/bureau/prets', query: { pret: '20' } }, { replace: true }))
  })

  it('names a reservation of the committee « réservation interne », and keeps its own days', async () => {
    mockForm(loanOut({
      number: null,
      borrower_type: 'committee',
      borrower_name: '',
      display_name: 'Halloween des enfants',
      purpose: '',
      phone: '',
      deposit_amount: '0.00',
      event: { id: 12, title: 'Halloween des enfants' },
      start_date: '2026-10-29',
      end_date: '2026-11-02',
      state: 'committee',
    }))

    const view = await mountPage()

    await vi.waitFor(() => expect(view.text()).toContain('Halloween des enfants'))
    expect(view.text()).toContain('Réservation interne')
    expect((view.get('input[type="date"]').element as HTMLInputElement).value).toBe('2026-10-29')
  })

  it('offers to try again when the loan cannot be read', async () => {
    mockApi('/api/board/loans/{loan_id}', { method: 'GET', handler: () => apiResponse(500, {}) }, { loan_id: 20 })

    const view = await mountPage()

    await vi.waitFor(() => expect(view.text()).toContain('Réessayer'))
  })

  it('is the page not found of a loan that does not exist', async () => {
    mockApi('/api/board/loans/{loan_id}', { method: 'GET', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { loan_id: 20 })
    mockApi('/api/board/loans/deposits', { handler: () => apiResponse(200, DEPOSITS) })
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([])) })

    await mountPage()

    await vi.waitFor(() => expect(showErrorMock).toHaveBeenCalledWith({ status: 404, statusText: 'Not Found' }))
  })
})
