import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import BoardPendingPanel from '~/components/board/PendingPanel.vue'
import type { components } from '~/types/api'
import { lowStockItem } from '../../helpers/stock'
import { ledgerEntry, NOTHING_PENDING, NOTHING_TO_PAY, unpaidInvoice } from '../../helpers/treasury'

type PendingOut = components['schemas']['PendingOut']

function pending(receipts: PendingOut['receipts'], invoices: PendingOut['invoices'], advances: PendingOut['advances'] = NOTHING_TO_PAY.advances): PendingOut {
  return { ...NOTHING_PENDING, total: receipts.count + invoices.count + advances.count, receipts, invoices, advances }
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

  it('lists the advances to pay back, the oldest first, and all of them past ten', async () => {
    const advances = { count: 11, total: '1240.00', items: [ledgerEntry(), ledgerEntry({ id: 5, label: 'Lots du loto', advanced_by: null })] }

    const panel = await mountSuspended(BoardPendingPanel, {
      props: { pending: pending({ count: 0, items: [] }, { count: 0, items: [] }, advances) },
    })

    expect(panel.findAll('h3').map(title => title.text())).toEqual(['Avances à rembourser'])
    expect(panel.findAll('section li a').map(link => readable(link.text()))).toEqual([
      'Courses buvette12 sept. · 286,30 € · Julie R.',
      'Lots du loto12 sept. · 286,30 € · Ancien membre',
    ])
    expect(panel.get('a[href="/bureau/tresorerie/journal?avance=a-rembourser"]').text()).toBe('Voir les 11 avances à rembourser')
  })

  it('lists the items of the stock below their threshold, each leading to them, and all of them past ten', async () => {
    /**
     * Given the juice and the sweets below their threshold, among twelve
     * When the bell opens
     * Then each tells what is left and its threshold, with its unit, and leads
     * to the items below their threshold
     */
    const stock = { count: 12, items: [lowStockItem(), lowStockItem({ id: 6, name: 'Bonbons assortis', unit: 'kg', quantity: '1.50', threshold: '3.00' })] }

    const panel = await mountSuspended(BoardPendingPanel, { props: { pending: { ...NOTHING_PENDING, total: 12, stock } } })

    expect(panel.findAll('h3').map(title => title.text())).toEqual(['Stock bas'])
    expect(panel.findAll('section a').map(link => [link.attributes('href'), readable(link.text())])).toEqual([
      ['/bureau/stock?filtre=bas', 'Jus de fruits 1 L18 en stock, seuil 24'],
      ['/bureau/stock?filtre=bas', 'Bonbons assortis1,5 kg en stock, seuil 3 kg'],
      ['/bureau/stock?filtre=bas', 'Voir les 12 articles sous le seuil'],
    ])
  })
})
