import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreasuryReceipt from '~/components/treasury/Receipt.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { chooseFile } from '../../helpers/files'
import { ledgerEntry } from '../../helpers/treasury'

const RECEIPT = { id: 61, title: 'Courses buvette', original_name: 'ticket.pdf', size: 1200 }

describe('the receipt of a line', () => {
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

  it('opens the receipt joined, and leads to it among the documents', async () => {
    const card = await mountSuspended(TreasuryReceipt, { props: { entry: ledgerEntry({ receipt: RECEIPT, receipt_state: 'attached' }) } })

    expect(card.text()).toContain('Courses buvette')
    expect(card.findAll('button').map(button => button.text())).toContain('Ouvrir le justificatif')
    expect(card.get('a[href="/bureau/documents?document=61"]').text()).toBe('Voir parmi les documents')
  })

  it('tells a receipt missing: to join, to ask for, or to replace with a sworn statement', async () => {
    const card = await mountSuspended(TreasuryReceipt, { props: { entry: ledgerEntry() } })

    expect(card.text()).toContain('Justificatif manquant')
    expect(card.text()).toContain('Ticket perdu ? Faites une attestation sur l’honneur, puis rattachez-la à cette ligne en la marquant payée.')
    expect(card.get('a[href^="mailto:julie.roux@example.test"]').text()).toBe('Relancer par e-mail')
    expect(card.get('a[href="/bureau/documents/attestation?evenement=3"]').text()).toBe('Faire une attestation')
  })

  it('joins the file chosen, then shows the line with its receipt', async () => {
    mockApi('/api/board/treasury/entries/{entry_id}/receipt', {
      method: 'POST',
      handler: () => apiResponse(200, ledgerEntry({ receipt: RECEIPT, receipt_state: 'attached' })),
    }, { entry_id: 4 })
    const sent = recordRequests()
    const card = await mountSuspended(TreasuryReceipt, { props: { entry: ledgerEntry() } })

    await chooseFile(card.get('input[type="file"]'), new File(['%PDF-1.4'], 'ticket.pdf', { type: 'application/pdf' }))

    await vi.waitFor(() => expect(card.emitted('changed')).toHaveLength(1))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({ file: { name: 'ticket.pdf', type: 'application/pdf' } })
  })

  it('tells why a file was refused', async () => {
    mockApi('/api/board/treasury/entries/{entry_id}/receipt', {
      method: 'POST',
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body', 'file'], msg: 'Ce fichier a déjà été déposé.' }] }),
    }, { entry_id: 4 })
    const card = await mountSuspended(TreasuryReceipt, { props: { entry: ledgerEntry() } })

    await chooseFile(card.get('input[type="file"]'), new File(['%PDF-1.4'], 'ticket.pdf', { type: 'application/pdf' }))

    await vi.waitFor(() => expect(card.get('[role="alert"]').text()).toBe('Ce fichier a déjà été déposé.'))
    expect(card.emitted('changed')).toBeUndefined()
  })

  it('asks no receipt of an income, which may have one all the same', async () => {
    const card = await mountSuspended(TreasuryReceipt, { props: { entry: ledgerEntry({ kind: 'income', receipt_state: 'not_required' }) } })

    expect(card.text()).toContain('Aucun justificatif n’est demandé pour cette ligne.')
    expect(card.findAll('button').map(button => button.text())).toContain('Joindre un document')
  })
})
