import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OperationPage from '~/pages/board/stock/operation.vue'
import StocktakePage from '~/pages/board/stock/stocktake.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { field } from '../../../helpers/form'
import { eventItem, page } from '../../../helpers/events'
import { stockOperation, stockOverview } from '../../../helpers/stock'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

function mockStock() {
  mockApi('/api/board/stock', { handler: () => apiResponse(200, stockOverview()) })
  mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  mockApi('/api/board/overview', { handler: () => apiResponse(200, {}) })
}

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

describe('the pages that move the stock', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  describe('« Entrée ou sortie »', () => {
    it('records a purchase of two items, then goes back to the stock', async () => {
      /**
       * Given the stock of the mockup
       * When a member records the shopping of the bar: 288 cans and 6 litres
       * of juice, for the brocante
       * Then the entry is sent whole, its quantities as the API reads them
       */
      mockStock()
      mockApi('/api/board/stock/operations', { handler: () => apiResponse(201, stockOperation()) })
      const sent = recordRequests()

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/entree-sortie' })
      await vi.waitFor(() => expect(view.findAll('select').at(-1)!.findAll('option')).toHaveLength(5))
      await vi.waitFor(() => expect(field(view, 'Événement').findAll('option')).toHaveLength(2))
      await field(view, 'Événement').setValue('12')
      await field(view, 'Libellé').setValue('Courses buvette')
      await field(view, 'Article de la ligne 1').setValue('1')
      await field(view, 'Quantité de la ligne 1').setValue('288')
      await view.findAll('button').find(button => button.text() === 'Ajouter un article')!.trigger('click')
      await field(view, 'Article de la ligne 2').setValue('3')
      await field(view, 'Quantité de la ligne 2').setValue('6,5')
      await view.get('form').trigger('submit')

      await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/stock'))
      expect(sent.find(request => request.method === 'POST')?.body).toEqual({
        direction: 'in',
        reason: 'purchase',
        label: 'Courses buvette',
        event: 12,
        lines: [{ item: 1, quantity: '288' }, { item: 3, quantity: '6.5' }],
      })
    })

    it('offers the reasons of the way chosen, and tells what each item holds', async () => {
      /**
       * Given the page of an entry
       * When the member turns it into an exit, and takes out juice
       * Then the reason becomes a consumption, a purchase is no longer offered,
       * and the line tells the 18 litres in stock
       */
      mockStock()
      mockApi('/api/board/stock/operations', { handler: () => apiResponse(201, stockOperation()) })
      const sent = recordRequests()

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/entree-sortie' })
      expect(field(view, 'Motif').findAll('option').map(option => option.text())).toEqual(['Achat', 'Ajustement'])
      await view.findAll('input[type="radio"]')[1]!.setValue(true)

      expect(field(view, 'Motif').findAll('option').map(option => option.text())).toEqual(['Consommation', 'Ajustement'])
      await vi.waitFor(() => expect(field(view, 'Article de la ligne 1').findAll('option')).toHaveLength(5))
      await field(view, 'Article de la ligne 1').setValue('3')
      expect(readable(view.text())).toContain('En stock : 18')
      await field(view, 'Quantité de la ligne 1').setValue('6')
      await view.get('form').trigger('submit')

      // happy-dom keeps the option it selected before the list changed: the
      // request tells the reason the page holds.
      await vi.waitFor(() => expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ direction: 'out', reason: 'consumption' }))
    })

    it('keeps an adjustment when the way changes', async () => {
      mockStock()

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/entree-sortie' })
      await field(view, 'Motif').setValue('adjustment')
      await view.findAll('input[type="radio"]')[1]!.setValue(true)

      expect((field(view, 'Motif').element as HTMLSelectElement).value).toBe('adjustment')
    })

    it('shows the API\'s refusals under their lines, and removes a line', async () => {
      /**
       * Given an exit that takes more juice than is left
       * When it is refused
       * Then the refusal shows under the quantity of its line
       * And a line removed leaves the form
       */
      mockStock()
      mockApi('/api/board/stock/operations', { handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body', 'lines', 0, 'quantity'], msg: 'Il n’en reste que 18 en stock.' },
        { type: 'validation_error', loc: ['body'], msg: 'Ajoutez au moins un article.' },
      ] }) })

      const view = await mountSuspended(OperationPage, { route: '/bureau/stock/entree-sortie' })
      await view.get('form').trigger('submit')

      await vi.waitFor(() => expect(view.text()).toContain('Il n’en reste que 18 en stock.'))
      expect(field(view, 'Quantité de la ligne 1').attributes('aria-invalid')).toBe('true')
      expect(view.get('[role="alert"]').text()).toBe('Ajoutez au moins un article.')
      await view.get('button[aria-label="Retirer la ligne 1"]').trigger('click')
      expect(view.find('button[aria-label="Retirer la ligne 1"]').exists()).toBe(false)
      expect(navigateToMock).not.toHaveBeenCalled()
    })
  })

  it('forgets the refusals of a line once a line is removed, since they follow its position', async () => {
    /**
     * Given an exit of two lines, the first refused
     * When the member removes the first line
     * Then its refusal does not land under the line that takes its place
     */
    mockStock()
    mockApi('/api/board/stock/operations', { handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body', 'lines', 0, 'quantity'], msg: 'Il n’en reste que 18 en stock.' },
    ] }) })

    const view = await mountSuspended(OperationPage, { route: '/bureau/stock/entree-sortie' })
    await view.findAll('button').find(button => button.text() === 'Ajouter un article')!.trigger('click')
    await view.get('form').trigger('submit')
    await vi.waitFor(() => expect(field(view, 'Quantité de la ligne 1').attributes('aria-invalid')).toBe('true'))
    await view.get('button[aria-label="Retirer la ligne 1"]').trigger('click')

    expect(field(view, 'Quantité de la ligne 1').attributes('aria-invalid')).toBeUndefined()
    expect(view.text()).not.toContain('Il n’en reste que 18 en stock.')
  })

  it('names the way of an exit before a refusal of it, which has no field of its own', async () => {
    mockStock()
    mockApi('/api/board/stock/operations', { handler: () => apiResponse(422, { detail: [
      { type: 'enum', loc: ['body', 'payload', 'direction'], msg: 'Sélectionnez un choix valide.' },
    ] }) })

    const view = await mountSuspended(OperationPage, { route: '/bureau/stock/entree-sortie' })
    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(view.get('[role="alert"]').text()).toBe('Sens : Sélectionnez un choix valide.'))
  })

  describe('« Faire l’inventaire »', () => {
    it('counts the items by category, and sends those counted alone', async () => {
      /**
       * Given the stock of the mockup
       * When a member counts 144 cans and 1,5 kg of sweets after the brocante,
       * and leaves the other items empty
       * Then the stocktake sends the two counts alone, then goes back to the stock
       */
      mockStock()
      mockApi('/api/board/stock/stocktakes', { handler: () => apiResponse(201, stockOperation({ reason: 'stocktake' })) })
      const sent = recordRequests()

      const view = await mountSuspended(StocktakePage, { route: '/bureau/stock/inventaire' })
      await vi.waitFor(() => expect(view.findAll('h2').map(title => title.text())).toEqual(['Boissons', 'Alimentaire']))
      expect(readable(view.text())).toContain('En stock : 1,5 kg')
      await field(view, 'Libellé').setValue('Après la brocante')
      await field(view, 'Compté : Canettes de soda 33 cl').setValue('144')
      await field(view, 'Compté : Bonbons assortis').setValue('1,5')
      await view.get('form').trigger('submit')

      await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/stock'))
      expect(sent.find(request => request.method === 'POST')?.body).toEqual({
        label: 'Après la brocante',
        event: null,
        counts: [{ item: 1, counted: '144' }, { item: 6, counted: '1.5' }],
      })
    })

    it('shows a refusal of the item counted under it too', async () => {
      /**
       * Given the sweets counted, deleted meanwhile
       * When the stocktake is refused for that item
       * Then the refusal shows under the sweets, not before a field name
       */
      mockStock()
      mockApi('/api/board/stock/stocktakes', { handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body', 'counts', 0, 'item'], msg: 'Choisissez un article existant.' },
      ] }) })

      const view = await mountSuspended(StocktakePage, { route: '/bureau/stock/inventaire' })
      await vi.waitFor(() => expect(view.findAll('h2')).toHaveLength(2))
      await field(view, 'Compté : Bonbons assortis').setValue('2')
      await view.get('form').trigger('submit')

      await vi.waitFor(() => expect(field(view, 'Compté : Bonbons assortis').attributes('aria-invalid')).toBe('true'))
      expect(view.text()).toContain('Choisissez un article existant.')
      expect(view.find('[role="alert"]').exists()).toBe(false)
    })

    it('shows a refused count under its item', async () => {
      mockStock()
      mockApi('/api/board/stock/stocktakes', { handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body', 'counts', 0, 'counted'], msg: 'Assurez-vous que cette valeur est supérieure ou égale à 0.' },
      ] }) })

      const view = await mountSuspended(StocktakePage, { route: '/bureau/stock/inventaire' })
      await vi.waitFor(() => expect(view.findAll('h2')).toHaveLength(2))
      await field(view, 'Compté : Bonbons assortis').setValue('-1')
      await view.get('form').trigger('submit')

      await vi.waitFor(() => expect(field(view, 'Compté : Bonbons assortis').attributes('aria-invalid')).toBe('true'))
      expect(field(view, 'Compté : Canettes de soda 33 cl').attributes('aria-invalid')).toBeUndefined()
    })
  })
})
