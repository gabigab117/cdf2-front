import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NewExpensePage from '~/pages/board/treasury/new.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { eventItem, page } from '../../../helpers/events'
import { chooseFile } from '../../../helpers/files'
import { ledgerEntry } from '../../../helpers/treasury'
import { button, field } from '../../../helpers/form'
import { readable } from '../../../helpers/text'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

function record(expense: VueWrapper) {
  return button(expense, 'Enregistrer la dépense')!.trigger('click')
}

describe('the expense entered on a phone', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useSessionStore().member = { id: 9, email: 'sophie.lambert@example.test', first_name: 'Sophie', last_name: 'Lambert', position: 'Trésorier·e', is_superuser: false }
    // Wednesday 30 September 2026, the mockup's day, in Paris.
    useNow().value = Date.parse('2026-09-30T18:00:00+02:00')
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem({ id: 12, title: 'Halloween des enfants' })])) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('records the ticket advanced by the member, its photo as its receipt, then shows its line', async () => {
    /**
     * Given the ticket of the goûter of Halloween, paid with the member's own money
     * When the member takes its photo, types its amount, supplier and note,
     * and records it
     * Then the API receives an advance of the member, named by its note, with
     * the photo as its receipt
     * And the page of the new line shows
     */
    mockApi('/api/board/treasury/entries', { method: 'POST', handler: () => apiResponse(201, ledgerEntry({ id: 31 })) })
    const sent = recordRequests()
    const expense = await mountSuspended(NewExpensePage, { route: '/bureau/tresorerie/nouvelle' })

    await chooseFile(expense.get('input[type="file"]'), new File(['jpeg'], 'ticket.jpg', { type: 'image/jpeg' }))
    await expense.get('input[aria-label="Montant TTC"]').setValue('47,85')
    await field(expense, 'Fournisseur').setValue('Supermarché, Beauvais')
    await vi.waitFor(() => expect(field(expense, 'Événement').findAll('option')).toHaveLength(2))
    await field(expense, 'Événement').setValue('12')
    await field(expense, 'Note').setValue('Jus de fruits et gâteaux pour le goûter')
    await expense.get('input[type="radio"][value="advance"]').setValue(true)
    expect(expense.text()).toContain('Avancé par vous. Le remboursement sera ajouté aux écritures à traiter.')
    expect(expense.text()).toContain('Reprendre')
    await record(expense)

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/tresorerie/ecritures/31'))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      date: '2026-09-30',
      kind: 'expense',
      label: 'Jus de fruits et gâteaux pour le goûter',
      amount: '47.85',
      category: 'food',
      payment_method: 'advance',
      advanced_by: '9',
      event: '12',
      supplier: 'Supermarché, Beauvais',
      file: { name: 'ticket.jpg', type: 'image/jpeg' },
    })
  })

  it('names the expense after its supplier when it has no note, paid by the card', async () => {
    mockApi('/api/board/treasury/entries', { method: 'POST', handler: () => apiResponse(201, ledgerEntry({ id: 32 })) })
    const sent = recordRequests()
    const expense = await mountSuspended(NewExpensePage, { route: '/bureau/tresorerie/nouvelle' })

    await expense.get('input[aria-label="Montant TTC"]').setValue('12')
    await field(expense, 'Fournisseur').setValue('Boulangerie')
    await record(expense)

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/tresorerie/ecritures/32'))
    expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ label: 'Boulangerie', payment_method: 'association_card', supplier: 'Boulangerie' })
  })

  it('shows its day, its photo field and the categories of an expense', async () => {
    const expense = await mountSuspended(NewExpensePage, { route: '/bureau/tresorerie/nouvelle' })

    expect(expense.get('h1').text()).toBe('Nouvelle dépense')
    expect(readable(expense.text())).toContain('TTC · mercredi 30 septembre')
    const photo = expense.get('input[type="file"]')
    expect(photo.attributes('accept')).toBe('image/*')
    expect(photo.attributes('capture')).toBe('environment')
    expect(field(expense, 'Catégorie').findAll('option').map(option => option.text())).toContain('Achats alimentaires')
    expect(field(expense, 'Date').attributes('max')).toBe('2026-09-30')
    expect(expense.get('a[aria-label="Retour à la trésorerie"]').attributes('href')).toBe('/bureau/tresorerie')
  })

  it('asks for a supplier or a note, and an amount, before sending anything', async () => {
    const sent = recordRequests()
    // Attached to the document, which gives the focus.
    const expense = await mountSuspended(NewExpensePage, { route: '/bureau/tresorerie/nouvelle', attachTo: document.body })

    await record(expense)

    await vi.waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('alert'))
    const alert = expense.get('[role="alert"]')
    expect(alert.text()).toContain('Indiquez un fournisseur ou une note.')
    expect(alert.text()).toContain('Indiquez un montant supérieur à zéro.')
    expect(sent.filter(request => request.method === 'POST')).toHaveLength(0)
  })

  it('shows the refusals of the API, each after the name of its field', async () => {
    mockApi('/api/board/treasury/entries', { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'value_error', loc: ['form', 'date'], msg: 'La date ne peut pas être dans le futur.' }],
    }) })
    const expense = await mountSuspended(NewExpensePage, { route: '/bureau/tresorerie/nouvelle' })

    await expense.get('input[aria-label="Montant TTC"]').setValue('12')
    await field(expense, 'Note').setValue('Pain')
    await record(expense)

    await vi.waitFor(() => expect(expense.get('[role="alert"]').text()).toContain('Date : La date ne peut pas être dans le futur.'))
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
