import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StockOrderToReceive from '~/components/stock/OrderToReceive.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { stockOrder } from '../../helpers/stock'

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

describe('« Commande à réceptionner »', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('tells the order, its event and its lines, as the mockup does, without the assistant', async () => {
    const block = await mountSuspended(StockOrderToReceive, { props: { order: stockOrder() } })

    expect(block.get('h2').text()).toBe('Commande à réceptionner')
    expect(block.text()).toContain('Halloween des enfants')
    expect(block.text()).toContain('Commande Confiserie du Nord. Livraison prévue le 27 octobre.')
    expect(block.findAll('li').map(line => readable(line.text()))).toEqual(['Bonbons assortis+12 kg', 'Jus de fruits 1 L+60'])
    expect(block.text()).not.toContain('assistant')
  })

  it('names an order by its title without a supplier, and without its date when it has none', async () => {
    const block = await mountSuspended(StockOrderToReceive, {
      props: { order: stockOrder({ issuer: '', delivery_date: null, event: null }) },
    })

    expect(block.get('p').text()).toBe('Bon de commande — Bonbons et goûter.')
    expect(block.findComponent({ name: 'UiStatusPill' }).exists()).toBe(false)
  })

  it('receives the delivery in one click', async () => {
    mockApi('/api/board/stock/orders/{document_id}/delivery', { handler: () => apiResponse(200, stockOrder()) }, { document_id: 21 })
    const sent = recordRequests()

    const block = await mountSuspended(StockOrderToReceive, { props: { order: stockOrder() } })
    await block.findAll('button').find(button => button.text() === 'Réceptionner la livraison')!.trigger('click')

    await vi.waitFor(() => expect(sent.map(request => `${request.method} ${request.url}`)).toContain('POST /api/board/stock/orders/21/delivery'))
  })

  it('tells what was added, and cancels it the day it was received', async () => {
    mockApi('/api/board/stock/orders/{document_id}/delivery', { method: 'DELETE', handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body'], msg: 'Une partie de la livraison est déjà sortie du stock : « Bonbons assortis ».' },
    ] }) }, { document_id: 21 })
    const received = stockOrder({ delivery: { created_at: '2026-10-01T08:00:00Z', author: null }, undoable: true })
    const sent = recordRequests()

    const block = await mountSuspended(StockOrderToReceive, { props: { order: received } })
    expect(block.text()).toContain('Ajouté au stock')
    await block.findAll('button').find(button => button.text() === 'Annuler')!.trigger('click')

    await vi.waitFor(() => expect(block.get('[role="alert"]').text()).toBe('Une partie de la livraison est déjà sortie du stock : « Bonbons assortis ».'))
    expect(sent.map(request => `${request.method} ${request.url}`)).toContain('DELETE /api/board/stock/orders/21/delivery')
  })

  it('no longer offers to cancel a delivery of another day', async () => {
    const received = stockOrder({ delivery: { created_at: '2026-09-30T08:00:00Z', author: null }, undoable: false })

    const block = await mountSuspended(StockOrderToReceive, { props: { order: received } })

    expect(block.text()).toContain('Ajouté au stock')
    expect(block.find('button').exists()).toBe(false)
  })
})
