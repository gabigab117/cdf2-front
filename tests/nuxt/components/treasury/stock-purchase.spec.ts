import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TreasuryStockPurchase from '~/components/treasury/StockPurchase.vue'
import type { components } from '~/types/api'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { page } from '../../helpers/events'
import { button, field } from '../../helpers/form'
import { stockOperation, stockOperationDetail, stockOverview } from '../../helpers/stock'
import { readable } from '../../helpers/text'
import { ledgerEntry } from '../../helpers/treasury'

type LedgerEntryOut = components['schemas']['LedgerEntryOut']

const STOCK_PURCHASE = '/api/board/treasury/entries/{entry_id}/stock-purchase'
const OPERATION = '/api/board/stock/operations/{operation_id}'

// The shopping of the bar once its purchase is linked: 206,40 € of it went
// into the stock, 79,90 € did not.
const STOCKED = ledgerEntry({
  stock_purchase: { id: 12, reason: 'purchase', label: 'Courses buvette', created_at: '2026-09-12T16:00:00Z' },
  stocked_cost: '206.40',
  unstocked_cost: '79.90',
})

// The purchase of the bar, both of its costs known.
const PRICED = stockOperationDetail({
  unpriced: false,
  cost: '206.40',
  lines: stockOperationDetail().lines.map(line => ({ ...line, cost: line.cost ?? '48.00', unpriced: false })),
})

async function mountBlock(entry: LedgerEntryOut = ledgerEntry()) {
  const card = await mountSuspended(TreasuryStockPurchase, {
    props: {
      entry,
      // The page shows the line the API gives back, as soon as it comes.
      onChanged: (updated: LedgerEntryOut) => card.setProps({ entry: updated }),
    },
    attachTo: document.body,
  })
  return card
}

describe('the stock of an expense', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
    mockApi('/api/board/overview', { handler: () => apiResponse(200, {}) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('puts the purchase an expense paid in stock, each line with its cost', async () => {
    /**
     * Given the shopping of the bar, which put nothing in stock yet
     * When the treasurer puts 48 cans in stock, for 26,40 €
     * Then the form warns that they come into the stock today, each cost is
     * required, and the line with its purchase is what the page shows
     */
    mockApi('/api/board/stock', { method: 'GET', handler: () => apiResponse(200, stockOverview()) })
    mockApi(STOCK_PURCHASE, { method: 'POST', handler: () => apiResponse(200, STOCKED) }, { entry_id: 4 })
    const sent = recordRequests()
    const card = await mountBlock()

    expect(card.text()).toContain('Aucun achat du stock n’est rattaché à cette dépense.')
    await button(card, 'Mettre en stock')!.trigger('click')
    expect(card.text()).toContain('Les quantités entrent dans le stock aujourd’hui. Si ces articles y sont déjà, choisissez « Achat déjà saisi ».')
    expect(card.text()).toContain('Le montant est celui de la ligne, TTC, comme sur le ticket.')
    expect(card.text()).not.toContain('Laissé vide')
    expect(field(card, 'Montant payé de la ligne 1').attributes('required')).toBeDefined()
    await vi.waitFor(() => expect(card.findAll('option').map(option => option.text())).toContain('Canettes de soda 33 cl'))
    await field(card, 'Article de la ligne 1').setValue('1')
    await field(card, 'Quantité de la ligne 1').setValue('48')
    await field(card, 'Montant payé de la ligne 1').setValue('26,40')
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.emitted('changed')).toEqual([[STOCKED]]))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({ lines: [{ item: 1, quantity: '48', cost: '26.40' }] })
    expect(card.find('form').exists()).toBe(false)
  })

  it('tells why a purchase could not be put in stock, under its line or above the form', async () => {
    mockApi('/api/board/stock', { method: 'GET', handler: () => apiResponse(200, stockOverview()) })
    mockApi(STOCK_PURCHASE, { method: 'POST', handler: () => apiResponse(422, { detail: [
      { type: 'value_error', loc: ['body'], msg: 'Les prix des articles dépassent le montant de la dépense.' },
      { type: 'validation_error', loc: ['body', 'payload', 'lines', 0, 'cost'], msg: 'Assurez-vous que cette valeur est supérieure ou égale à 0.' },
    ] }) }, { entry_id: 4 })
    const card = await mountBlock()

    await button(card, 'Mettre en stock')!.trigger('click')
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.find('form [role="alert"]').exists()).toBe(true))
    expect(card.get('form [role="alert"]').text()).toBe('Les prix des articles dépassent le montant de la dépense.')
    expect(document.activeElement).toBe(card.get('form [role="alert"]').element)
    expect(field(card, 'Montant payé de la ligne 1').attributes('aria-invalid')).toBe('true')
    expect(card.emitted('changed')).toBeUndefined()
  })

  it('links a purchase the stock recorded already, every cost required', async () => {
    /**
     * Given the shopping of the bar, recorded in the stock with the cost of
     * its cans only
     * When the treasurer chooses it from the expense, and completes the water,
     * 48,00 €
     * Then the purchase and every cost are sent, and the line with its purchase
     * is what the page shows
     */
    mockApi('/api/board/treasury/stock-purchases', { method: 'GET', handler: () => apiResponse(200, page([stockOperation({ unpriced: true })])) })
    mockApi(OPERATION, { method: 'GET', handler: () => apiResponse(200, stockOperationDetail()) }, { operation_id: 12 })
    mockApi(STOCK_PURCHASE, { method: 'PUT', handler: () => apiResponse(200, STOCKED) }, { entry_id: 4 })
    const sent = recordRequests()
    const card = await mountBlock()

    await button(card, 'Achat déjà saisi')!.trigger('click')
    await vi.waitFor(() => expect(card.findAll('option').map(option => option.text())).toEqual(['Choisir un achat', 'Achat du 12 sept. · Courses buvette']))
    await field(card, 'Achat ou réception du stock').setValue('12')
    await vi.waitFor(() => expect(card.find('form').exists()).toBe(true))
    expect((field(card, 'Montant payé : Canettes de soda 33 cl').element as HTMLInputElement).value).toBe('158,40')
    expect(field(card, 'Montant payé : Bouteilles d’eau 50 cl').attributes('required')).toBeDefined()
    expect(card.text()).not.toContain('Laissé vide')
    await field(card, 'Montant payé : Bouteilles d’eau 50 cl').setValue('48')
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.emitted('changed')).toEqual([[STOCKED]]))
    expect(sent.find(request => request.method === 'PUT')?.body).toEqual({
      operation: 12,
      lines: [{ item: 1, cost: '158.40' }, { item: 2, cost: '48' }],
    })
  })

  it('names the purchase an expense cannot pay, above the costs', async () => {
    mockApi('/api/board/treasury/stock-purchases', { method: 'GET', handler: () => apiResponse(200, page([stockOperation()])) })
    mockApi(OPERATION, { method: 'GET', handler: () => apiResponse(200, PRICED) }, { operation_id: 12 })
    mockApi(STOCK_PURCHASE, { method: 'PUT', handler: () => apiResponse(422, { detail: [
      { type: 'value_error', loc: ['body', 'payload', 'operation'], msg: 'Cet achat est déjà payé par une autre dépense.' },
    ] }) }, { entry_id: 4 })
    const card = await mountBlock()

    await button(card, 'Achat déjà saisi')!.trigger('click')
    await vi.waitFor(() => expect(card.findAll('option')).toHaveLength(2))
    await field(card, 'Achat ou réception du stock').setValue('12')
    await vi.waitFor(() => expect(card.find('form').exists()).toBe(true))
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.find('form [role="alert"]').exists()).toBe(true))
    expect(card.get('form [role="alert"]').text()).toBe('Achat : Cet achat est déjà payé par une autre dépense.')
  })

  it('says when no purchase waits for its expense', async () => {
    mockApi('/api/board/treasury/stock-purchases', { method: 'GET', handler: () => apiResponse(200, page([])) })
    const card = await mountBlock()

    await button(card, 'Achat déjà saisi')!.trigger('click')

    await vi.waitFor(() => expect(card.text()).toContain('Aucun achat ni réception du stock n’attend sa dépense.'))
    expect(card.find('select').exists()).toBe(false)
    await button(card, 'Annuler')!.trigger('click')
    expect(button(card, 'Achat déjà saisi')).toBeDefined()
  })

  it('tells the purchase an expense paid: what went into the stock, what did not, and its page', async () => {
    const card = await mountBlock(STOCKED)

    expect(card.text()).toContain('Courses buvette')
    expect(card.text()).toContain('Achat du 12 sept.')
    expect(card.findAll('dl div').map(row => readable(row.text()))).toEqual(['Mis en stock206,40 €', 'Reste hors stock79,90 €'])
    expect(card.get('a').attributes('href')).toBe('/bureau/stock/operations/12')
    // The E2E journey looks for « Supprimer » on the page of an expense: only the line's own button bears it.
    expect(card.findAll('a, button').map(control => control.text())).toEqual(['Voir l’achat', 'Corriger les prix', 'Retirer'])
  })

  it('corrects the costs of its purchase from the expense', async () => {
    mockApi(OPERATION, { method: 'GET', handler: () => apiResponse(200, PRICED) }, { operation_id: 12 })
    const corrected = ledgerEntry({ ...STOCKED, stocked_cost: '200.40', unstocked_cost: '85.90' })
    mockApi(STOCK_PURCHASE, { method: 'PUT', handler: () => apiResponse(200, corrected) }, { entry_id: 4 })
    const sent = recordRequests()
    const card = await mountBlock(STOCKED)

    await button(card, 'Corriger les prix')!.trigger('click')
    await vi.waitFor(() => expect(card.find('form').exists()).toBe(true))
    expect(card.find('select').exists()).toBe(false)
    await field(card, 'Montant payé : Bouteilles d’eau 50 cl').setValue('42')
    expect(button(card, 'Enregistrer les prix')).toBeDefined()
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(card.emitted('changed')).toEqual([[corrected]]))
    expect(sent.find(request => request.method === 'PUT')?.body).toEqual({
      operation: 12,
      lines: [{ item: 1, cost: '158.40' }, { item: 2, cost: '42' }],
    })
  })

  it('lets the costs form close while the purchase cannot be read', async () => {
    mockApi(OPERATION, { method: 'GET', handler: () => apiResponse(503, {}) }, { operation_id: 12 })
    const card = await mountBlock(STOCKED)

    await button(card, 'Corriger les prix')!.trigger('click')
    await vi.waitFor(() => expect(button(card, 'Réessayer')).toBeDefined())
    await button(card, 'Annuler')!.trigger('click')

    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Corriger les prix'))
    expect(button(card, 'Réessayer')).toBeUndefined()
  })

  it('lets the purchase go once confirmed: it stays in the stock', async () => {
    mockApi(STOCK_PURCHASE, { method: 'DELETE', handler: () => apiResponse(200, ledgerEntry()) }, { entry_id: 4 })
    const sent = recordRequests()
    const card = await mountBlock(STOCKED)

    await button(card, 'Retirer')!.trigger('click')
    expect(card.text()).toContain('Retirer cet achat de la dépense ?')
    expect(card.text()).toContain('Il reste dans le stock, avec ses prix.')
    expect(card.findAll('button').map(control => control.text())).toEqual(['Retirer', 'Garder l’achat'])
    await card.findAll('button')[0]!.trigger('click')

    await vi.waitFor(() => expect(card.emitted('changed')).toEqual([[ledgerEntry()]]))
    expect(sent.filter(request => request.method === 'DELETE').map(request => request.url)).toEqual(['/api/board/treasury/entries/4/stock-purchase'])
    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Mettre en stock'))
  })

  it('gives the focus back to the button that opened a form, or to the first of the purchase once linked', async () => {
    mockApi('/api/board/treasury/stock-purchases', { method: 'GET', handler: () => apiResponse(200, page([stockOperation()])) })
    mockApi(OPERATION, { method: 'GET', handler: () => apiResponse(200, PRICED) }, { operation_id: 12 })
    mockApi(STOCK_PURCHASE, { method: 'PUT', handler: () => apiResponse(200, STOCKED) }, { entry_id: 4 })
    const card = await mountBlock()

    await button(card, 'Achat déjà saisi')!.trigger('click')
    await button(card, 'Annuler')!.trigger('click')
    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Achat déjà saisi'))
    await button(card, 'Achat déjà saisi')!.trigger('click')
    await vi.waitFor(() => expect(card.findAll('option')).toHaveLength(2))
    await field(card, 'Achat ou réception du stock').setValue('12')
    await vi.waitFor(() => expect(card.find('form').exists()).toBe(true))
    await card.get('form').trigger('submit')

    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Corriger les prix'))
  })
})
