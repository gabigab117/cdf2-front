import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import BoardPendingPanel from '~/components/board/PendingPanel.vue'
import type { components } from '~/types/api'
import { ledgerEntry, unpaidInvoice } from '../../helpers/treasury'

type PendingOut = components['schemas']['PendingOut']

function pending(receipts: PendingOut['receipts'], invoices: PendingOut['invoices']): PendingOut {
  return {
    total: receipts.count + invoices.count,
    documents: { counts: { total: 0, invoice: 0, order: 0, minutes: 0, misc: 0 }, items: [] },
    loans: { overdue: 0, to_prepare: 0, items: [] },
    receipts,
    invoices,
  }
}

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

describe('the panel « À traiter »', () => {
  beforeEach(() => {
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(() => {
    clearNuxtState('now')
  })

  enableAutoUnmount(afterEach)

  it('asks for the receipts missing, each leading to its line, and all of them past ten', async () => {
    const panel = await mountSuspended(BoardPendingPanel, {
      props: { pending: pending({ count: 12, items: [ledgerEntry()] }, { count: 0, items: [] }) },
    })

    expect(panel.findAll('h3').map(title => title.text())).toEqual(['Justificatifs manquants'])
    const line = panel.get('a[href="/bureau/tresorerie/ecritures/4"]')
    expect(readable(line.text())).toBe('Courses buvette12 sept. · 286,30 € · Julie R.')
    expect(panel.get('a[href="/bureau/tresorerie/journal?justificatif=manquant"]').text()).toBe('Voir les 12 justificatifs manquants')
  })

  it('lists the invoices to pay, the first due first, and counts the others', async () => {
    const panel = await mountSuspended(BoardPendingPanel, {
      props: {
        pending: pending({ count: 0, items: [] }, {
          count: 4,
          items: [
            unpaidInvoice({ id: 20, issuer: 'Chalets', due_date: '2026-09-20', overdue: true }),
            unpaidInvoice(),
            unpaidInvoice({ id: 22, issuer: '', title: 'Facture — Bonbons', amount: null, due_date: null }),
          ],
        }),
      },
    })

    expect(panel.findAll('h3').map(title => title.text())).toEqual(['Factures à régler'])
    expect(panel.findAll('section a').map(link => readable(link.text()))).toEqual([
      'Chalets380,00 € · échéance dépassée le 20 sept.',
      'Animation 60380,00 € · avant le 28 oct.',
      'Facture — Bonbonssans échéance',
    ])
    expect(panel.find('a[href="/bureau/documents?document=20"]').exists()).toBe(true)
    expect(panel.text()).toContain('Et 1 autre facture')
  })
})
