import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OperationsPage from '~/pages/board/stock/operations/index.vue'
import OperationPage from '~/pages/board/stock/operations/[id].vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { button, field } from '../../../helpers/form'
import { page } from '../../../helpers/events'
import { stockOperation, stockOperationDetail } from '../../../helpers/stock'
import { readable } from '../../../helpers/text'

describe('the operations of the stock', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
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

  describe('their list', () => {
    it('lists the operations by page, each leading to its page', async () => {
      /**
       * Given the shopping of the bar, waiting for a cost, and a stocktake
       * When a member opens the list
       * Then both come, the shopping said to wait for a cost, and « Toutes » is
       * the chip pressed
       */
      mockApi('/api/board/stock/operations', {
        method: 'GET',
        handler: () => apiResponse(200, page([stockOperation({ unpriced: true }), stockOperation({ id: 13, reason: 'stocktake', label: '' })])),
      })
      const sent = recordRequests()

      const view = await mountSuspended(OperationsPage, { route: '/bureau/stock/operations' })

      const rows = () => view.findAll('ul.divide-y li a')
      await vi.waitFor(() => expect(rows()).toHaveLength(2))
      expect(view.get('h1').text()).toBe('Opérations du stock')
      expect(rows().map(row => row.attributes('href'))).toEqual(['/bureau/stock/operations/12', '/bureau/stock/operations/13'])
      expect(rows().map(row => row.text().includes('Sans prix'))).toEqual([true, false])
      expect(view.get('nav[aria-label="Filtrer les opérations"] a[aria-current]').text()).toContain('Toutes')
      expect(sent.find(request => request.url.includes('/operations'))?.url).toContain('unpriced=false')
    })

    it('keeps the purchases waiting for a cost, and says when none waits', async () => {
      mockApi('/api/board/stock/operations', { method: 'GET', handler: () => apiResponse(200, page([])) })
      const sent = recordRequests()

      const view = await mountSuspended(OperationsPage, { route: '/bureau/stock/operations?filtre=sans-prix' })

      await vi.waitFor(() => expect(view.text()).toContain('Aucun achat n’attend son prix.'))
      expect(sent.find(request => request.url.includes('/operations'))?.url).toContain('unpriced=true')
    })
  })

  describe('the page of an operation', () => {
    function mockOperation(detail = stockOperationDetail()) {
      mockApi('/api/board/stock/operations/{operation_id}', { method: 'GET', handler: () => apiResponse(200, detail) }, { operation_id: 12 })
    }

    it('tells the lines valued, the cost to complete in amber', async () => {
      /**
       * Given the shopping of the bar: 288 cans for 158,40 €, the water waiting
       * for its cost
       * When a member opens its page
       * Then each line tells its quantity, what it cost, its unit cost and its
       * value; the water is to complete, and the total is what was paid
       */
      mockOperation()

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/operations/12' })

      await vi.waitFor(() => expect(view.find('h1').exists()).toBe(true))
      expect(view.get('h1').text()).toBe('Courses buvette')
      expect(readable(view.text())).toContain('Achat · 12 sept. · Julie R. · Brocante')
      expect(view.findAll('ul.divide-y li').map(row => readable(row.text()))).toEqual([
        'Canettes de soda 33 cl+288 · 158,40 € · 0,55 €+288158,40 €0,55 €+158,40 €',
        'Bouteilles d’eau 50 cl+120 · À compléter · —+120À compléter——',
      ])
      expect(readable(view.text())).toContain('Total payé : 158,40 €')
      expect(button(view, 'Compléter les prix')).toBeDefined()
    })

    it('completes the costs of the lines, then shows them valued', async () => {
      /**
       * Given the shopping of the bar, the water waiting for its cost
       * When a member completes it, 48,00 €, keeping the cans' cost
       * Then every line's cost is sent, and the page shows what the API valued
       */
      mockOperation()
      const written = stockOperationDetail({ unpriced: false, cost: '206.40' })
      mockApi('/api/board/stock/operations/{operation_id}/costs', { method: 'PUT', handler: () => apiResponse(200, written) }, { operation_id: 12 })
      mockApi('/api/board/overview', { handler: () => apiResponse(200, {}) })
      const sent = recordRequests()

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/operations/12' })
      await vi.waitFor(() => expect(button(view, 'Compléter les prix')).toBeDefined())
      await button(view, 'Compléter les prix')!.trigger('click')
      expect((field(view, 'Montant payé : Canettes de soda 33 cl').element as HTMLInputElement).value).toBe('158,40')
      await field(view, 'Montant payé : Bouteilles d’eau 50 cl').setValue('48')
      await view.get('form').trigger('submit')

      await vi.waitFor(() => expect(button(view, 'Corriger les prix')).toBeDefined())
      expect(sent.find(request => request.method === 'PUT')?.body).toEqual({ lines: [{ item: 1, cost: '158.40' }, { item: 2, cost: '48' }] })
      expect(readable(view.text())).toContain('Total payé : 206,40 €')
    })

    it('shows a refused cost under its line', async () => {
      mockOperation()
      mockApi('/api/board/stock/operations/{operation_id}/costs', { method: 'PUT', handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body', 'lines', 1, 'cost'], msg: 'Assurez-vous que cette valeur est supérieure ou égale à 0.' },
      ] }) }, { operation_id: 12 })

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/operations/12' })
      await vi.waitFor(() => expect(button(view, 'Compléter les prix')).toBeDefined())
      await button(view, 'Compléter les prix')!.trigger('click')
      await view.get('form').trigger('submit')

      await vi.waitFor(() => expect(field(view, 'Montant payé : Bouteilles d’eau 50 cl').attributes('aria-invalid')).toBe('true'))
    })

    it('offers no costs to a consumption', async () => {
      mockOperation(stockOperationDetail({ reason: 'consumption', label: '', unpriced: false, priceable: false, cost: '0.00' }))

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/operations/12' })

      await vi.waitFor(() => expect(view.get('h1').text()).toBe('Consommation'))
      expect(button(view, 'Compléter les prix')).toBeUndefined()
      expect(button(view, 'Corriger les prix')).toBeUndefined()
      expect(view.text()).not.toContain('Total payé')
    })
  })
})
