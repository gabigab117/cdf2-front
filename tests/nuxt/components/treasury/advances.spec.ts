import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreasuryAdvances from '~/components/treasury/Advances.vue'
import type { components } from '~/types/api'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { ledgerEntry, NOTHING_PENDING } from '../../helpers/treasury'
import { button } from '../../helpers/form'
import { readable } from '../../helpers/text'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

function mockAdvances(items: LedgerEntryOut[], count = items.length, total = '286.30') {
  mockApi('/api/board/overview', { handler: () => apiResponse(200, {
    pending: { ...NOTHING_PENDING, total: count, advances: { count, total, items } },
  }) })
}

const REIMBURSEMENT = '/api/board/treasury/entries/{entry_id}/reimbursement'

describe('the advances to pay back', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('tells what the committee owes, the oldest advance first, and leads to them all', async () => {
    /**
     * Given 3 advances owed, 512,80 € in all, the bell holding the first two
     * Then the card tells the total, each advance with its member, day and
     * amount, and leads to the journal of the 3
     */
    mockAdvances([ledgerEntry(), ledgerEntry({ id: 5, label: 'Lots du loto', amount: '226.50', date: '2026-09-20' })], 3, '512.80')

    const card = await mountSuspended(TreasuryAdvances)

    await vi.waitFor(() => expect(readable(card.text())).toContain('Total dû : 512,80 €'))
    const items = card.findAll('li')
    expect(items.map(item => readable(item.get('a').text()))).toEqual(['Courses buvetteJulie R. · 12 sept.', 'Lots du lotoJulie R. · 20 sept.'])
    expect(readable(items[0]!.text())).toContain('286,30 €')
    expect(items[0]!.get('a').attributes('href')).toBe('/bureau/tresorerie/ecritures/4')
    const all = card.findAll('a').find(link => link.text() === 'Voir les 3 avances à rembourser')!
    expect(all.attributes('href')).toBe('/bureau/tresorerie/journal?avance=a-rembourser')
  })

  it('says when nothing is owed', async () => {
    mockAdvances([], 0, '0.00')

    const card = await mountSuspended(TreasuryAdvances)

    await vi.waitFor(() => expect(card.text()).toContain('Aucune avance à rembourser.'))
    expect(card.text()).not.toContain('Total dû')
    expect(card.findAll('a')).toHaveLength(0)
  })

  it('marks an advance reimbursed in place, by transfer today unless told otherwise', async () => {
    /**
     * Given the drinks of the brocante's bar, advanced by Julie
     * When the member marks them reimbursed by cheque on 25 September
     * Then the API completes the advance, and the page reads its lines again
     */
    mockAdvances([ledgerEntry()])
    mockApi(REIMBURSEMENT, { method: 'POST', handler: () => apiResponse(200, ledgerEntry({ reimbursed_on: '2026-09-25', reimbursement_method: 'cheque' })) }, { entry_id: 4 })
    const sent = recordRequests()
    const card = await mountSuspended(TreasuryAdvances)
    await vi.waitFor(() => expect(card.findAll('li')).toHaveLength(1))

    await button(card, 'Marquer remboursée')!.trigger('click')
    const form = card.get('form')
    expect((form.get('input[type="date"]').element as HTMLInputElement).value).toBe('2026-10-01')
    expect(form.get('input[type="date"]').attributes('min')).toBe('2026-09-12')
    expect(form.get('input[type="radio"][value="transfer"]').element).toHaveProperty('checked', true)
    await form.get('input[type="date"]').setValue('2026-09-25')
    await form.get('input[type="radio"][value="cheque"]').setValue(true)
    await form.trigger('submit')

    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(1))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({ reimbursed_on: '2026-09-25', reimbursement_method: 'cheque' })
    expect(card.find('form').exists()).toBe(false)
  })

  it('shows the refusal of the API with the form', async () => {
    mockAdvances([ledgerEntry()])
    mockApi(REIMBURSEMENT, { method: 'POST', handler: () => apiResponse(422, {
      detail: [
        { type: 'value_error', loc: ['body', 'reimbursed_on'], msg: 'Le remboursement ne peut pas précéder l’avance.' },
        { type: 'value_error', loc: ['body'], msg: 'Cette avance est déjà remboursée.' },
      ],
    }) }, { entry_id: 4 })
    const card = await mountSuspended(TreasuryAdvances, { attachTo: document.body })
    await vi.waitFor(() => expect(card.findAll('li')).toHaveLength(1))

    await button(card, 'Marquer remboursée')!.trigger('click')
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.get('[role="alert"]').text()).toBe('Cette avance est déjà remboursée.'))
    expect(card.text()).toContain('Le remboursement ne peut pas précéder l’avance.')
    // The first error takes the focus: the date, before the form's own.
    expect(document.activeElement?.getAttribute('type')).toBe('date')
    expect(card.emitted('changed')).toBeUndefined()
  })
})
