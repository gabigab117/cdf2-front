import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreasuryReimbursement from '~/components/treasury/Reimbursement.vue'
import type { components } from '~/types/api'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { ledgerEntry } from '../../helpers/treasury'
import { button } from '../../helpers/form'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

const REIMBURSEMENT = '/api/board/treasury/entries/{entry_id}/reimbursement'

describe('the reimbursement of an advance', () => {
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

  it('tells an advance owed to its member, and marks it reimbursed', async () => {
    const paid = ledgerEntry({ reimbursed_on: '2026-09-20', reimbursement_method: 'transfer' })
    mockApi(REIMBURSEMENT, { method: 'POST', handler: () => apiResponse(200, paid) }, { entry_id: 4 })
    const card = await mountSuspended(TreasuryReimbursement, { props: { entry: ledgerEntry() } })

    expect(card.text()).toContain('À rembourser à Julie R.')
    await button(card, 'Marquer remboursée')!.trigger('click')
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.emitted('changed')).toEqual([[paid]]))
    expect(card.find('form').exists()).toBe(false)
  })

  it('tells why an advance could not be marked reimbursed, and takes the focus to it', async () => {
    mockApi(REIMBURSEMENT, { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'value_error', loc: ['body'], msg: 'Cette avance est déjà remboursée.' }],
    }) }, { entry_id: 4 })
    const card = await mountSuspended(TreasuryReimbursement, { props: { entry: ledgerEntry() }, attachTo: document.body })

    await button(card, 'Marquer remboursée')!.trigger('click')
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.find('form [role="alert"]').exists()).toBe(true))
    expect(card.get('form [role="alert"]').text()).toBe('Cette avance est déjà remboursée.')
    expect(document.activeElement).toBe(card.get('form [role="alert"]').element)
    expect(card.emitted('changed')).toBeUndefined()
  })

  it('names a member who has left the board', async () => {
    const card = await mountSuspended(TreasuryReimbursement, { props: { entry: ledgerEntry({ advanced_by: null }) } })

    expect(card.text()).toContain('À rembourser à un ancien membre')
  })

  it('tells an advance paid back, and cancels its reimbursement once confirmed', async () => {
    /**
     * Given the drinks of the brocante's bar, paid back to Julie by transfer
     * When the member cancels the reimbursement, a click too many
     * Then the question tells what follows, and once confirmed the advance is
     * owed again
     */
    mockApi(REIMBURSEMENT, { method: 'DELETE', handler: () => apiResponse(200, ledgerEntry()) }, { entry_id: 4 })
    const sent = recordRequests()
    const card = await mountSuspended(TreasuryReimbursement, {
      props: { entry: ledgerEntry({ reimbursed_on: '2026-09-20', reimbursement_method: 'transfer' }) },
    })

    expect(card.text()).toContain('Remboursée le 20 sept. par virement')
    await button(card, 'Annuler le remboursement')!.trigger('click')
    expect(card.text()).toContain('Annuler le remboursement de cette avance ?')
    expect(card.findAll('button').map(button => button.text())).toEqual(['Annuler le remboursement', 'Garder le remboursement'])
    await card.findAll('button')[0]!.trigger('click')

    await vi.waitFor(() => expect(card.emitted('changed')).toEqual([[ledgerEntry()]]))
    expect(sent.filter(request => request.method === 'DELETE').map(request => request.url)).toEqual(['/api/board/treasury/entries/4/reimbursement'])
  })

  it('gives the focus back to the button in place, once the reimbursement is cancelled or its form closed', async () => {
    mockApi(REIMBURSEMENT, { method: 'DELETE', handler: () => apiResponse(200, ledgerEntry()) }, { entry_id: 4 })
    const card = await mountSuspended(TreasuryReimbursement, {
      props: {
        entry: ledgerEntry({ reimbursed_on: '2026-09-20', reimbursement_method: 'transfer' }),
        // The page shows the line the API gives back.
        onChanged: (updated: LedgerEntryOut) => card.setProps({ entry: updated }),
      },
      attachTo: document.body,
    })

    await button(card, 'Annuler le remboursement')!.trigger('click')
    await card.findAll('button')[0]!.trigger('click')
    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Marquer remboursée'))
    await button(card, 'Marquer remboursée')!.trigger('click')
    await button(card, 'Annuler')!.trigger('click')
    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Marquer remboursée'))
  })

  it('shows the refusal of a cancellation with its question', async () => {
    mockApi(REIMBURSEMENT, { method: 'DELETE', handler: () => apiResponse(422, {
      detail: [{ type: 'value_error', loc: ['body'], msg: 'Cette avance n’est pas remboursée.' }],
    }) }, { entry_id: 4 })
    const card = await mountSuspended(TreasuryReimbursement, {
      props: { entry: ledgerEntry({ reimbursed_on: '2026-09-20', reimbursement_method: 'cash' }) },
    })

    expect(card.text()).toContain('Remboursée le 20 sept. en espèces')
    await button(card, 'Annuler le remboursement')!.trigger('click')
    await card.findAll('button')[0]!.trigger('click')

    await vi.waitFor(() => expect(card.get('[role="alert"]').text()).toBe('Cette avance n’est pas remboursée.'))
    expect(card.emitted('changed')).toBeUndefined()
  })
})
