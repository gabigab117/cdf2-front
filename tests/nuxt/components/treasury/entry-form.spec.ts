import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreasuryEntryForm from '~/components/treasury/EntryForm.vue'
import type { FormErrors } from '~/utils/api-errors'
import type { EntryFields } from '~/utils/treasury'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { eventItem, julie, page } from '../../helpers/events'
import { chooseFile } from '../../helpers/files'
import { button, field } from '../../helpers/form'

const marc = { id: 9, first_name: 'Marc', last_name: 'Durand', email: 'marc.durand@example.test' }

function mountForm(props: Partial<InstanceType<typeof TreasuryEntryForm>['$props']> = {}) {
  return mountSuspended(TreasuryEntryForm, {
    props: {
      title: 'Nouvelle ligne',
      initial: newEntryFields('expense', '2026-10-01'),
      save: vi.fn(() => Promise.resolve(null)),
      clearsAfterSave: true,
      ...props,
    },
  })
}

describe('the form of a line', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useSessionStore().member = { id: julie.id, email: julie.email, first_name: 'Julie', last_name: 'Roux', position: 'Trésorier·e', is_superuser: false }
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
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

  it('starts an expense, which goes out of the treasury of the general running', async () => {
    /**
     * Given the card of a new line
     * Then it is an expense of food, paid with the association's card, with a
     * minus before its amount, and no event: a line of the general running
     */
    const form = await mountForm()

    expect(form.get('[role="radiogroup"]').attributes('aria-label')).toBe('Type de ligne')
    expect(form.get('input[value="expense"]').element).toHaveProperty('checked', true)
    expect((field(form, 'Catégorie').element as HTMLSelectElement).value).toBe('food')
    expect((field(form, 'Moyen de paiement').element as HTMLSelectElement).value).toBe('association_card')
    expect(form.text()).toContain('−')
    expect(form.text()).toContain('Ligne de fonctionnement général du comité.')
    expect(form.get('button[type="submit"]').text()).toBe('Ajouter la dépense')
  })

  it('switches to an income, its categories and its payment methods', async () => {
    /**
     * Given the card of a new line
     * When the member chooses « Recette »
     * Then the line is of the bar, in cash, with a plus before its amount, and
     * cannot be advanced by a member
     */
    // happy-dom keeps a reused option selected: the line sent tells the choice.
    const save = vi.fn((_fields: EntryFields) => Promise.resolve(null))
    const form = await mountForm({ save })

    await form.get('input[value="income"]').setValue(true)
    await form.get('input[placeholder="Ex. Recette buvette"]').setValue('Recette buvette')
    await form.get('input[inputmode="decimal"]').setValue('1862,50')
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce())
    expect(save.mock.calls[0]![0]).toMatchObject({ kind: 'income', category: 'bar', paymentMethod: 'cash' })
    expect(field(form, 'Moyen de paiement').findAll('option').map(option => option.text())).not.toContain('Avancé par un membre')
    expect(form.text()).toContain('+')
    expect(form.get('button[type="submit"]').text()).toBe('Ajouter la recette')
  })

  it('tells the event a line counts for', async () => {
    const form = await mountForm()
    await vi.waitFor(() => expect(field(form, 'Événement').findAll('option')).toHaveLength(2))

    await field(form, 'Événement').setValue('12')

    expect(form.text()).toContain('Comptera dans le résultat de « Halloween des enfants ».')
  })

  it('names the member signed in for an advance, until another is chosen', async () => {
    const form = await mountForm()

    await field(form, 'Moyen de paiement').setValue('advance')

    await vi.waitFor(() => expect((field(form, 'Avancé par').element as HTMLSelectElement).value).toBe(String(julie.id)))
  })

  it('tells what is missing before anything is sent', async () => {
    /**
     * Given a line without a label, or of nothing
     * When the member adds it
     * Then the form says so, in the mockup's words, and sends nothing
     */
    const save = vi.fn(() => Promise.resolve(null))
    const form = await mountForm({ save })

    await form.get('form').trigger('submit')

    expect(form.get('[role="alert"]').text()).toContain('Indiquez un libellé et un montant supérieur à zéro.')
    expect(save).not.toHaveBeenCalled()
  })

  it('gives the focus to what it refuses, as every form of the board', async () => {
    const form = await mountSuspended(TreasuryEntryForm, {
      props: { title: 'Nouvelle ligne', initial: newEntryFields('expense', '2026-10-01'), save: () => Promise.resolve(null) },
      attachTo: document.body,
    })

    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('alert'))
  })

  it('sends the line, then empties its label and amount for the next one', async () => {
    const save = vi.fn((_fields: EntryFields) => Promise.resolve(null))
    const form = await mountForm({ save })

    await form.get('input[placeholder="Ex. Courses buvette"]').setValue('Courses buvette')
    await form.get('input[inputmode="decimal"]').setValue('286,30')
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce())
    expect(save.mock.calls[0]![0]).toMatchObject({ label: 'Courses buvette', amount: '286,30', kind: 'expense', category: 'food' })
    await vi.waitFor(() => expect((form.get('input[inputmode="decimal"]').element as HTMLInputElement).value).toBe(''))
    expect((form.get('input[placeholder="Ex. Courses buvette"]').element as HTMLInputElement).value).toBe('')
  })

  it('sends the receipt chosen with the line, and leaves it out once removed', async () => {
    const save = vi.fn((_fields: EntryFields, _receipt: File | null) => Promise.resolve(null))
    const form = await mountForm({ save, attachable: true })
    const ticket = new File(['%PDF-1.4'], 'ticket.pdf', { type: 'application/pdf' })
    const input = form.get('input[type="file"]')

    await chooseFile(input, ticket)
    expect(form.text()).toContain('ticket.pdf')
    await form.get('button[aria-label="Retirer le justificatif"]').trigger('click')
    expect(form.text()).toContain('Joindre le justificatif')
    await chooseFile(input, ticket)
    await form.get('input[placeholder="Ex. Courses buvette"]').setValue('Courses')
    await form.get('input[inputmode="decimal"]').setValue('12')
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce())
    expect(save.mock.calls[0]![1]).toBe(ticket)
    await vi.waitFor(() => expect(form.text()).toContain('Joindre le justificatif'))
  })

  it('shows the refusals of the API under their fields, and the others on the form', async () => {
    const refusal: FormErrors = {
      form: [],
      fields: { date: ['La date ne peut pas être dans le futur.'], receipt: ['Ce document justifie déjà une autre ligne.'] },
    }
    const form = await mountForm({ save: () => Promise.resolve(refusal) })

    await form.get('input[placeholder="Ex. Courses buvette"]').setValue('Courses')
    await form.get('input[inputmode="decimal"]').setValue('12')
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.text()).toContain('La date ne peut pas être dans le futur.'))
    expect(form.get('[role="alert"]').text()).toContain('receipt : Ce document justifie déjà une autre ligne.')
  })

  it('corrects a line advanced by a member who left, its supplier and note too', async () => {
    /**
     * Given an advance of Marc, who has left the board
     * When it is corrected
     * Then Marc is still offered, the supplier and the note are shown, and
     * « Annuler » gives up
     */
    const fields = { ...newEntryFields('expense', '2026-09-12'), label: 'Courses', amount: '12,50', paymentMethod: 'advance' as const, advancedBy: marc.id }
    const form = await mountForm({ title: 'Corriger la ligne', initial: fields, advancer: marc, full: true, cancelable: true, clearsAfterSave: false, submitLabel: 'Enregistrer' })

    await vi.waitFor(() => expect(field(form, 'Avancé par').findAll('option').map(option => option.text())).toContain('Marc Durand'))
    expect(form.findAll('label').map(label => label.text())).toEqual(expect.arrayContaining(['Fournisseur (facultatif)', 'Note (facultatif)']))
    expect(form.get('button[type="submit"]').text()).toBe('Enregistrer')

    await button(form, 'Annuler')!.trigger('click')

    expect(form.emitted('cancel')).toHaveLength(1)
  })
})
