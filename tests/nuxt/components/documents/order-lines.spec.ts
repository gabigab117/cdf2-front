import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsOrderLines from '~/components/documents/OrderLines.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { field } from '../../helpers/form'
import { stockOrder, stockOverview } from '../../helpers/stock'

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

function mockOrder(order = stockOrder()) {
  mockApi('/api/board/stock/orders/{document_id}', { method: 'GET', handler: () => apiResponse(200, order) }, { document_id: 21 })
  mockApi('/api/board/stock', { handler: () => apiResponse(200, stockOverview()) })
}

function mountLines(validated = true) {
  return mountSuspended(DocumentsOrderLines, { props: { id: 21, validated }, attachTo: document.body })
}

describe('the lines of an order, in its panel', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('lists what the order brings to the stock, and where it stands', async () => {
    mockOrder()

    const lines = await mountLines()

    await vi.waitFor(() => expect(lines.findAll('li').map(line => readable(line.text()))).toEqual(['Bonbons assortis+12 kg', 'Jus de fruits 1 L+60']))
    expect(lines.get('h3').text()).toBe('Lignes de commande')
    expect(lines.text()).toContain('À réceptionner depuis la page Stock.')
  })

  it.each([
    ['awaiting review', stockOrder(), false, 'Validez la commande pour la réceptionner depuis la page Stock.'],
    ['without lines', stockOrder({ lines: [] }), true, 'Aucune ligne de stock : la commande n’ajoute rien au stock.'],
    ['received', stockOrder({ delivery: { created_at: '2026-10-20T08:00:00Z', author: null } }), true, 'Réceptionnée le 20/10/2026 : ajoutée au stock.'],
  ])('tells an order %s where it stands', async (_case, order, validated, text) => {
    mockOrder(order)

    const lines = await mountLines(validated)

    await vi.waitFor(() => expect(lines.text()).toContain(text))
  })

  it('no longer changes the lines of an order received', async () => {
    mockOrder(stockOrder({ delivery: { created_at: '2026-10-20T08:00:00Z', author: null } }))

    const lines = await mountLines()

    await vi.waitFor(() => expect(lines.text()).toContain('Réceptionnée'))
    expect(lines.find('button').exists()).toBe(false)
  })

  it('writes the lines of the order, as typed', async () => {
    /**
     * Given the order of sweets and juice
     * When a member changes the sweets to 10,5 kg and removes the juice
     * Then the lines are sent whole, and shown as the API wrote them
     */
    mockOrder()
    mockApi('/api/board/stock/orders/{document_id}/lines', {
      handler: () => apiResponse(200, stockOrder({ lines: [{ item: { id: 6, name: 'Bonbons assortis', unit: 'kg' }, quantity: '10.50' }] })),
    }, { document_id: 21 })
    const sent = recordRequests()

    const lines = await mountLines()
    await vi.waitFor(() => expect(lines.find('button').exists()).toBe(true))
    await lines.get('button').trigger('click')
    expect((field(lines, 'Quantité de la ligne 1').element as HTMLInputElement).value).toBe('12')
    await field(lines, 'Quantité de la ligne 1').setValue('10,5')
    await lines.get('button[aria-label="Retirer la ligne 2"]').trigger('click')
    await lines.get('form').trigger('submit')

    await vi.waitFor(() => expect(readable(lines.text())).toContain('Bonbons assortis+10,5 kg'))
    expect(sent.find(request => request.method === 'PUT')?.body).toEqual({ lines: [{ item: 6, quantity: '10.5' }] })
  })

  it('shows the API\'s refusals of a line under it', async () => {
    mockOrder()
    mockApi('/api/board/stock/orders/{document_id}/lines', { handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body', 'lines', 1, 'quantity'], msg: 'Indiquez une quantité supérieure à zéro.' },
      { type: 'validation_error', loc: ['body'], msg: 'Cette commande est déjà réceptionnée : annulez d’abord la réception.' },
    ] }) }, { document_id: 21 })

    const lines = await mountLines()
    await vi.waitFor(() => expect(lines.find('button').exists()).toBe(true))
    await lines.get('button').trigger('click')
    await lines.get('form').trigger('submit')

    await vi.waitFor(() => expect(field(lines, 'Quantité de la ligne 2').attributes('aria-invalid')).toBe('true'))
    expect(lines.get('[role="alert"]').text()).toBe('Cette commande est déjà réceptionnée : annulez d’abord la réception.')
    // The first refusal takes the focus: the form's own, before the lines'.
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('alert'))
  })

  it('offers lines to an order without any', async () => {
    mockOrder(stockOrder({ lines: [] }))

    const lines = await mountLines()
    await vi.waitFor(() => expect(lines.find('button').exists()).toBe(true))
    expect(lines.get('button').text()).toBe('Ajouter des lignes')
    await lines.get('button').trigger('click')

    expect(lines.findAll('select')).toHaveLength(1)
  })
})
