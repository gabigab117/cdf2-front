import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreasuryAssistant from '~/components/treasury/Assistant.vue'
import type { components } from '~/types/api'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { julie } from '../../helpers/events'
import { ledgerEntry, NOTHING_PENDING, unpaidInvoice } from '../../helpers/treasury'
import { readable } from '../../helpers/text'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']
type UnpaidInvoiceOut = components['schemas']['UnpaidInvoiceOut']

function mockPending(receipts: LedgerEntryOut[], receiptsCount: number, invoices: UnpaidInvoiceOut[], invoicesCount = invoices.length) {
  mockApi('/api/board/overview', { handler: () => apiResponse(200, {
    pending: {
      ...NOTHING_PENDING,
      total: receiptsCount + invoicesCount,
      receipts: { count: receiptsCount, items: receipts },
      invoices: { count: invoicesCount, items: invoices },
    },
  }) })
}

describe('the treasury assistant', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useSessionStore().member = { id: 9, email: 'camille.martin@example.test', first_name: 'Camille', last_name: 'Martin', position: 'Trésorier·e', is_superuser: false }
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('tells the receipt missing, as the mockup does, and asks its member for it', async () => {
    /**
     * Given the drinks of the brocante's bar, advanced by Julie, missing their receipt
     * Then the assistant tells it, the label within the sentence, and offers an
     * e-mail to Julie that names the line and leads to it
     */
    mockPending([ledgerEntry()], 1, [])

    const assistant = await mountSuspended(TreasuryAssistant)

    await vi.waitFor(() => expect(readable(assistant.text())).toContain('1 justificatif manquant : courses buvette (286,30 €).'))
    const mail = assistant.get('a[href^="mailto:"]')
    expect(mail.text()).toBe('Relancer par e-mail')
    const link = new URL(mail.attributes('href')!)
    expect(link.pathname).toBe(julie.email)
    expect(link.searchParams.get('subject')).toBe('Justificatif à déposer : Courses buvette')
    expect(readable(link.searchParams.get('body')!)).toBe([
      'Bonjour Julie,',
      '',
      `Le justificatif de la dépense « Courses buvette » du 12/09/2026 (286,30 €) manque à la trésorerie. Il se dépose depuis l’espace bureau : ${window.location.origin}/bureau/tresorerie/ecritures/4`,
      '',
      'Merci !',
      'Camille',
    ].join('\n'))
  })

  it('counts the receipts missing, the oldest named', async () => {
    mockPending([ledgerEntry(), ledgerEntry({ id: 5, label: 'Courses goûter' })], 3, [])

    const assistant = await mountSuspended(TreasuryAssistant)

    await vi.waitFor(() => expect(readable(assistant.text())).toContain('3 justificatifs manquants, dont : courses buvette (286,30 €).'))
  })

  it('says when every receipt is joined, and asks no one', async () => {
    mockPending([], 0, [])

    const assistant = await mountSuspended(TreasuryAssistant)

    await vi.waitFor(() => expect(assistant.text()).toContain('Tous les justificatifs sont joints.'))
    expect(assistant.find('a[href^="mailto:"]').exists()).toBe(false)
    expect(assistant.text()).toContain('Aucune facture à régler.')
  })

  it('asks no one for a line whose members are gone', async () => {
    mockPending([ledgerEntry({ contact: null })], 1, [])

    const assistant = await mountSuspended(TreasuryAssistant)

    await vi.waitFor(() => expect(assistant.text()).toContain('1 justificatif manquant'))
    expect(assistant.find('a[href^="mailto:"]').exists()).toBe(false)
  })

  it('tells the invoices to pay: before their due date, past it, or without one', async () => {
    mockPending([], 0, [
      unpaidInvoice({ id: 20, issuer: 'Chalets Bois Picardie', amount: '1260.00', due_date: '2026-09-20', overdue: true }),
      unpaidInvoice(),
      unpaidInvoice({ id: 22, issuer: '', title: 'Facture — Bonbons', amount: null, due_date: null }),
      unpaidInvoice({ id: 23, issuer: 'Imprimerie', due_date: '2027-01-15' }),
    ], 5)

    const assistant = await mountSuspended(TreasuryAssistant)

    await vi.waitFor(() => expect(assistant.text()).toContain('Animation 60'))
    const text = readable(assistant.text())
    expect(text).toContain('Facture Chalets Bois Picardie (1 260,00 €) à régler : échéance du 20 septembre dépassée.')
    expect(text).toContain('Facture Animation 60 (380,00 €) à régler avant le 28 octobre.')
    expect(text).toContain('Facture — Bonbons à régler.')
    expect(text).not.toContain('Facture Facture')
    expect(text).toContain('Facture Imprimerie (380,00 €) à régler avant le 15 janvier 2027.')
    expect(text).toContain('Et 1 autre facture à régler.')
  })
})
