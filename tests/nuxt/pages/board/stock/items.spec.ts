import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ItemPage from '~/pages/board/stock/items/[id].vue'
import NewItemPage from '~/pages/board/stock/items/new.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { button, field } from '../../../helpers/form'
import { stockItem, stockOverview } from '../../../helpers/stock'

const { navigateToMock, showErrorMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), showErrorMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('showError', () => showErrorMock)

describe('the pages of an item of the stock', () => {
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
    showErrorMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('adds an item, then goes back to the stock', async () => {
    /**
     * Given a member on the page of a new item
     * When they add sweets, by the kilogram, low below 3, moved by half a
     * kilogram, best before March 2027, the kilo of before at 9,50 €
     * Then the item is sent as typed, and the stock shows again
     */
    mockApi('/api/board/stock/items', { handler: () => apiResponse(201, stockItem({ id: 6 })) })
    mockApi('/api/board/stock', { handler: () => apiResponse(200, stockOverview()) })
    mockApi('/api/board/overview', { handler: () => apiResponse(200, {}) })
    const sent = recordRequests()

    const page = await mountSuspended(NewItemPage, { route: '/bureau/stock/articles/nouveau' })
    expect(page.get('h1').text()).toBe('Nouvel article')
    await field(page, 'Nom').setValue('Bonbons assortis')
    await field(page, 'Catégorie').setValue('food')
    await field(page, 'Unité').setValue('kg')
    await field(page, 'Seuil').setValue('3')
    await field(page, 'Pas').setValue('0,5')
    await field(page, 'DLUO').setValue('2027-03-01')
    await field(page, 'Prix de départ').setValue('9,50')
    await page.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/stock'))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      name: 'Bonbons assortis',
      category: 'food',
      unit: 'kg',
      threshold: '3',
      step: '0.5',
      best_before: '2027-03-01',
      initial_cost: '9.50',
    })
    expect(field(page, 'DLUO').findAll('option').map(option => option.text()).slice(0, 2)).toEqual(['Aucune', 'oct. 2025'])
  })

  it('shows the API\'s refusals under their fields', async () => {
    mockApi('/api/board/stock/items', { handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body', 'step'], msg: 'Indiquez un pas supérieur à zéro.' },
      { type: 'validation_error', loc: ['body'], msg: 'Un article porte déjà ce nom.' },
    ] }) })

    const page = await mountSuspended(NewItemPage, { route: '/bureau/stock/articles/nouveau' })
    await page.get('form').trigger('submit')

    await vi.waitFor(() => expect(page.get('[role="alert"]').text()).toBe('Un article porte déjà ce nom.'))
    expect(page.text()).toContain('Indiquez un pas supérieur à zéro.')
    expect(field(page, 'Pas').attributes('aria-invalid')).toBe('true')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('corrects an item read from the stock', async () => {
    /**
     * Given the juice of the stock
     * When a member opens its page and raises its threshold
     * Then the form shows its fields as typed, and sends the item whole
     */
    mockApi('/api/board/stock', { handler: () => apiResponse(200, stockOverview()) })
    mockApi('/api/board/stock/items/{item_id}', { method: 'PUT', handler: () => apiResponse(200, stockItem()) }, { item_id: 3 })
    mockApi('/api/board/overview', { handler: () => apiResponse(200, {}) })
    const sent = recordRequests()

    const page = await mountSuspended(ItemPage, { route: '/bureau/stock/articles/3' })

    await vi.waitFor(() => expect(page.find('h1').exists()).toBe(true))
    expect(page.get('h1').text()).toBe('Jus de fruits 1 L')
    expect((field(page, 'Seuil').element as HTMLInputElement).value).toBe('24')
    expect((field(page, 'DLUO').element as HTMLSelectElement).value).toBe('2027-02-01')
    await field(page, 'Seuil').setValue('30')
    await page.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/stock'))
    expect(sent.find(request => request.method === 'PUT')?.body).toMatchObject({ name: 'Jus de fruits 1 L', threshold: '30', step: '6' })
  })

  it('deletes an item, once asked, and goes back to the stock', async () => {
    mockApi('/api/board/stock', { handler: () => apiResponse(200, stockOverview()) })
    mockApi('/api/board/stock/items/{item_id}', { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { item_id: 3 })
    mockApi('/api/board/overview', { handler: () => apiResponse(200, {}) })

    const page = await mountSuspended(ItemPage, { route: '/bureau/stock/articles/3' })
    await vi.waitFor(() => expect(page.find('h1').exists()).toBe(true))
    await button(page, 'Supprimer')!.trigger('click')
    expect(page.text()).toContain('Supprimer « Jus de fruits 1 L » du stock ?')
    await button(page, 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith('/bureau/stock'))
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it('tells why an item that has moved cannot be deleted', async () => {
    mockApi('/api/board/stock', { handler: () => apiResponse(200, stockOverview()) })
    mockApi('/api/board/stock/items/{item_id}', { method: 'DELETE', handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body'], msg: 'Impossible de supprimer « Jus de fruits 1 L » : ses mouvements le gardent dans l’historique.' },
    ] }) }, { item_id: 3 })

    const page = await mountSuspended(ItemPage, { route: '/bureau/stock/articles/3' })
    await vi.waitFor(() => expect(page.find('h1').exists()).toBe(true))
    await button(page, 'Supprimer')!.trigger('click')
    await button(page, 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(page.text()).toContain('ses mouvements le gardent dans l’historique'))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('turns into the page not found for an item the stock does not hold', async () => {
    mockApi('/api/board/stock', { handler: () => apiResponse(200, stockOverview()) })

    await mountSuspended(ItemPage, { route: '/bureau/stock/articles/99' })

    await vi.waitFor(() => expect(showErrorMock).toHaveBeenCalledWith({ status: 404, statusText: 'Not Found' }))
  })
})
