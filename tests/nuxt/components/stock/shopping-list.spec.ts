import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StockShoppingList from '~/components/stock/ShoppingList.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { stockOverview } from '../../helpers/stock'
import { readable } from '../../helpers/text'
import { button } from '../../helpers/form'

const { shopping_list: LINES, shopping_list_estimated_cost: COST } = stockOverview()
// A list no purchase paid tells the cost of.
const UNPRICED = LINES.map(line => ({ ...line, estimated_cost: null }))

describe('« Liste de courses »', () => {
  const stubbed: string[] = []

  function stubClipboard(writeText: () => Promise<void>) {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    stubbed.push('clipboard')
  }

  afterEach(() => {
    for (const name of stubbed.splice(0)) Reflect.deleteProperty(navigator, name)
    clearApiMocks()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  it('lists what brings each low item back to its threshold, and what it should cost', async () => {
    const list = await mountSuspended(StockShoppingList, { props: { lines: LINES, estimatedCost: COST } })

    expect(list.get('h2').text()).toBe('Liste de courses')
    expect(list.text()).toContain('2 articles')
    expect(list.findAll('li').map(row => readable(row.text()))).toEqual(['Jus de fruits 1 L6≈ 7,20 €', 'Bonbons assortis1,5 kg≈ 13,50 €'])
    expect(readable(list.text())).toContain('Budget estimé : 20,70 €')
    expect(list.text()).toContain('Quantités calculées pour revenir au seuil.')
  })

  it('leaves out of the budget the lines no purchase paid tells the cost of', async () => {
    /**
     * Given the juice at 7,20 €, and sweets never bought at a cost
     * When the list shows
     * Then its budget names the line it leaves out; without any cost, it has none
     */
    const list = await mountSuspended(StockShoppingList, {
      props: { lines: [LINES[0]!, UNPRICED[1]!], estimatedCost: { total: '7.20', unpriced_lines: 1 } },
    })

    expect(readable(list.text())).toContain('Budget estimé : 7,20 € (hors 1 article sans prix)')
    await list.setProps({ lines: UNPRICED, estimatedCost: { total: '0.00', unpriced_lines: 2 } })
    expect(list.text()).not.toContain('Budget estimé')
  })

  it('says when there is nothing to buy', async () => {
    const list = await mountSuspended(StockShoppingList, { props: { lines: [], estimatedCost: { total: '0.00', unpriced_lines: 0 } } })

    expect(list.text()).toContain('0 article')
    expect(list.text()).toContain('Rien à racheter : tous les articles sont au-dessus de leur seuil.')
    expect(list.find('button').exists()).toBe(false)
  })

  it('copies the list, an item a line', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)

    const list = await mountSuspended(StockShoppingList, { props: { lines: LINES, estimatedCost: COST } })
    await button(list, 'Copier')!.trigger('click')

    await vi.waitFor(() => expect(button(list, 'Liste copiée')).toBeDefined())
    expect(readable(writeText.mock.calls[0]![0] as string)).toBe(
      'Liste de courses\n- Jus de fruits 1 L : 6 (≈ 7,20 €)\n- Bonbons assortis : 1,5 kg (≈ 13,50 €)\nBudget estimé : 20,70 €',
    )
    expect(list.get('[aria-live="polite"]').text()).toBe('La liste est copiée.')
  })

  it('tells when the browser does not let the list be copied', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new DOMException('Refusé', 'NotAllowedError')))

    const list = await mountSuspended(StockShoppingList, { props: { lines: LINES, estimatedCost: COST } })
    await button(list, 'Copier')!.trigger('click')

    await vi.waitFor(() => expect(list.get('[role="alert"]').text()).toBe('Le navigateur n’a pas permis de copier la liste.'))
  })

  it('sends the list to the board as a note of logistics without event, once', async () => {
    /**
     * Given the list of the juice and the sweets
     * When a member sends it to the board
     * Then a note of logistics, without event, holds it in a paragraph, and
     * the button says it is sent
     */
    mockApi('/api/board/notes', { handler: () => apiResponse(201, {}) })
    const sent = recordRequests()

    const list = await mountSuspended(StockShoppingList, { props: { lines: LINES, estimatedCost: COST } })
    await button(list, 'Envoyer au bureau')!.trigger('click')

    await vi.waitFor(() => expect(button(list, 'Envoyée au bureau')!.attributes('disabled')).toBeDefined())
    const body = sent.find(request => request.method === 'POST')?.body as Record<string, unknown>
    expect({ ...body, text: readable(body.text as string) }).toEqual({
      event: null,
      text: 'Liste de courses : 6 Jus de fruits 1 L, 1,5 kg Bonbons assortis. Budget estimé : 20,70 €.',
      tag: 'logistics',
      pinned: false,
    })
    expect(list.get('[aria-live="polite"]').text()).toBe('La liste est publiée parmi les notes du tableau de bord.')
  })

  it('shows why the note was refused, and lets the list be sent again once it changes', async () => {
    mockApi('/api/board/notes', { handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body', 'text'], msg: 'Ce champ est obligatoire.' }] }) })

    const list = await mountSuspended(StockShoppingList, { props: { lines: LINES, estimatedCost: COST } })
    await button(list, 'Envoyer au bureau')!.trigger('click')

    await vi.waitFor(() => expect(list.get('[role="alert"]').text()).toBe('Ce champ est obligatoire.'))
    await list.setProps({ lines: LINES.slice(0, 1), estimatedCost: COST })
    expect(button(list, 'Envoyer au bureau')!.attributes('disabled')).toBeUndefined()
  })
})
