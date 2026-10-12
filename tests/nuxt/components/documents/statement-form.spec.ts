import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsStatementForm from '~/components/documents/StatementForm.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardDocument } from '../../helpers/documents'
import { eventItem, page } from '../../helpers/events'

const STATEMENTS = '/api/board/documents/statements'

function mountForm(event: number | null = null) {
  return mountSuspended(DocumentsStatementForm, { props: { event }, attachTo: document.body })
}

type Form = Awaited<ReturnType<typeof mountForm>>

/** Types a purchase into the form: its fields come in this order. */
async function typePurchase(form: Form) {
  const [supplier, date, amount, purchase] = form.findAll('input')
  await supplier!.setValue('Carrefour')
  await date!.setValue('2026-10-12')
  await amount!.setValue('23,40')
  await purchase!.setValue('Boissons et gobelets pour la buvette')
}

describe('the sworn statement of a purchase', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('asks for the purchase, the event it comes from chosen, and a date of the past', async () => {
    /**
     * Given the form opened from Halloween's deposit
     * Then it asks for a supplier, a date, an amount and the purchase, all required
     * And Halloween is chosen among the events, no event first
     * And the date's calendar stops at today
     */
    const form = await mountForm(12)

    const inputs = form.findAll('input')
    expect(inputs.map(input => input.attributes('required'))).toEqual(['', '', '', ''])
    expect(inputs[1]!.attributes('max')).toBe(parisDate(useNow().value))
    const event = form.get('select')
    await vi.waitFor(() => expect(event.findAll('option').map(option => option.text())).toEqual([
      'Fonctionnement (aucun événement)', 'Halloween des enfants · sam. 31 oct. 2026',
    ]))
    expect(event.element.value).toBe('12')
  })

  it('sends the purchase as the member typed it, then gives the invoice made', async () => {
    /**
     * Given a purchase typed, of 23,40 €, for no event
     * When the member makes the statement
     * Then the API receives the purchase, its amount as it reads one
     * And the form gives the invoice the API made
     */
    mockApi(STATEMENTS, { method: 'POST', handler: () => apiResponse(201, boardDocument({ source: 'sworn_statement' })) })
    const sent = recordRequests()
    const form = await mountForm()

    await typePurchase(form)
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.emitted('made')).toEqual([[boardDocument({ source: 'sworn_statement' })]]))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      supplier: 'Carrefour',
      purchase_date: '2026-10-12',
      purchase: 'Boissons et gobelets pour la buvette',
      amount: '23.40',
      event: null,
    })
  })

  it('shows what the API refused, on its field or on the form', async () => {
    /**
     * Given an account without a last name, and a supplier the API finds empty
     * When the member makes the statement
     * Then the refusal of the account shows on the form, the supplier's under it
     * And no invoice is given
     */
    mockApi(STATEMENTS, { method: 'POST', handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body'], msg: 'Une attestation porte le prénom et le nom de la personne qui la fait.' },
      { type: 'validation_error', loc: ['body', 'supplier'], msg: 'Ce champ ne peut pas être vide.' },
    ] }) })
    const form = await mountForm()

    await typePurchase(form)
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.get('[role="alert"]').text()).toBe('Une attestation porte le prénom et le nom de la personne qui la fait.'))
    expect(form.findAll('input')[0]!.attributes('aria-invalid')).toBe('true')
    expect(form.text()).toContain('Ce champ ne peut pas être vide.')
    expect(form.emitted('made')).toBeUndefined()
  })
})
