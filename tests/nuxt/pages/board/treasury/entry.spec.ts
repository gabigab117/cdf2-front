import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EntryPage from '~/pages/board/treasury/entries/[id].vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { eventItem, julie, page } from '../../../helpers/events'
import { ledgerEntry } from '../../../helpers/treasury'

const { navigateToMock, showErrorMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), showErrorMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('showError', () => showErrorMock)

const ENTRY = '/api/board/treasury/entries/{entry_id}'

function mockEntry(entry = ledgerEntry()) {
  mockApi(ENTRY, { method: 'GET', handler: () => apiResponse(200, entry) }, { entry_id: 4 })
  mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
}

function mountPage() {
  return mountSuspended(EntryPage, { route: '/bureau/tresorerie/ecritures/4', attachTo: document.body })
}

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

describe('the page of a line', () => {
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

  enableAutoUnmount(afterEach)

  it('tells what the line is, who advanced it and who recorded it', async () => {
    mockEntry(ledgerEntry({ supplier: 'Supermarché', note: 'Pour la buvette' }))

    const view = await mountPage()

    await vi.waitFor(() => expect(view.find('h1').exists()).toBe(true))
    expect(view.get('h1').text()).toBe('Courses buvette')
    expect(readable(view.text())).toContain('−286,30 €')
    expect(view.text()).toContain('Dépense · Boissons')
    expect(view.findAll('dl div').map(row => readable(row.text()))).toEqual([
      'DateSamedi 12 septembre 2026',
      'TypeDépense',
      'CatégorieBoissons',
      'PaiementAvancé par Julie R.',
      'ÉvénementBrocante',
      'FournisseurSupermarché',
      'SaisieJulie R., le 12/09/2026 · 18 h 00',
    ])
    expect(view.text()).toContain('Pour la buvette')
    // An advance tells its reimbursement.
    expect(view.text()).toContain('À rembourser à Julie R.')
  })

  it('tells no reimbursement for a line paid by the association', async () => {
    mockEntry(ledgerEntry({ payment_method: 'association_card', advanced_by: null }))

    const view = await mountPage()

    await vi.waitFor(() => expect(view.find('h1').exists()).toBe(true))
    expect(view.text()).not.toContain('Remboursement')
  })

  it('corrects the line whole, then shows it corrected', async () => {
    mockEntry()
    mockApi(ENTRY, { method: 'PUT', handler: () => apiResponse(200, ledgerEntry({ label: 'Courses de la buvette' })) }, { entry_id: 4 })
    const sent = recordRequests()
    const view = await mountPage()
    await vi.waitFor(() => expect(view.find('h1').exists()).toBe(true))

    await view.findAll('button').find(button => button.text() === 'Corriger')!.trigger('click')
    await view.get('input[placeholder="Ex. Courses buvette"]').setValue('Courses de la buvette')
    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(view.get('h1').text()).toBe('Courses de la buvette'))
    expect(sent.find(request => request.method === 'PUT')).toEqual({
      method: 'PUT',
      url: '/api/board/treasury/entries/4',
      body: {
        date: '2026-09-12',
        kind: 'expense',
        label: 'Courses de la buvette',
        amount: '286.30',
        category: 'drinks',
        payment_method: 'advance',
        advanced_by: 7,
        event: 3,
        supplier: '',
        note: '',
      },
    })
  })

  it('deletes the line once confirmed, then goes back to the journal of its year', async () => {
    mockEntry()
    mockApi(ENTRY, { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { entry_id: 4 })
    const view = await mountPage()
    await vi.waitFor(() => expect(view.find('h1').exists()).toBe(true))

    await view.findAll('button').find(button => button.text() === 'Supprimer')!.trigger('click')

    expect(view.text()).toContain('Supprimer la ligne « Courses buvette » ?')
    await view.findAll('button').find(button => button.text() === 'Supprimer définitivement')!.trigger('click')
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({
      path: '/bureau/tresorerie',
      query: { exercice: '2026', evenement: undefined, page: undefined, justificatif: undefined },
    }))
  })

  it('shows the page not found for a line that does not exist', async () => {
    mockApi(ENTRY, { method: 'GET', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { entry_id: 4 })

    await mountPage()

    await vi.waitFor(() => expect(showErrorMock).toHaveBeenCalledWith({ status: 404, statusText: 'Not Found' }))
  })
})
