import { describe, expect, it } from 'vitest'
import { stockedItem, stockItem, stockOverview } from '../helpers/stock'

describe('the address of the Stock page', () => {
  it.each([
    [{}, { filter: null, search: '' }],
    [{ filtre: 'bas' }, { filter: 'low', search: '' }],
    [{ filtre: 'loto-et-tombola', recherche: 'jus' }, { filter: 'lotto_raffle', search: 'jus' }],
    [{ filtre: 'outils' }, { filter: null, search: '' }],
  ])('reads what %o asks for', (query, read) => {
    expect(parseStockQuery(query)).toEqual(read)
  })

  it('writes what it reads, leaving out what applies by default', () => {
    expect(stockQuery({ filter: 'food', search: 'bonbons' })).toEqual({ filtre: 'alimentaire', recherche: 'bonbons' })
    expect(stockQuery({ filter: 'low', search: '' })).toEqual({ filtre: 'bas', recherche: undefined })
    expect(stockQuery({ filter: null, search: '' })).toEqual({ filtre: undefined, recherche: undefined })
  })
})

describe('the items the Stock page shows', () => {
  const { items } = stockOverview()

  function names(filter: Parameters<typeof shownItems>[1]['filter'], search = '') {
    return shownItems(items, { filter, search }).map(entry => entry.item.name)
  }

  it('keeps every item, those below their threshold, or a category', () => {
    expect(names(null)).toHaveLength(4)
    expect(names('low')).toEqual(['Jus de fruits 1 L', 'Bonbons assortis'])
    expect(names('food')).toEqual(['Bonbons assortis'])
  })

  it('searches the names whatever their case and accents', () => {
    /**
     * Given kegs of beer among the items
     * When « FUTS » is searched
     * Then the kegs are found, their « û » and capital letter aside
     */
    expect(names(null, ' FUTS ')).toEqual(['Fûts de bière 20 L'])
    expect(names('low', 'jus')).toEqual(['Jus de fruits 1 L'])
  })
})

describe('the item form', () => {
  it('starts empty, the step at one', () => {
    expect(newItemFields()).toEqual({ name: '', category: '', unit: '', threshold: '', step: '1', bestBefore: '', initialCost: '' })
  })

  it('reads an item as a member types its numbers', () => {
    expect(itemFields(stockItem({ unit: 'kg', threshold: '3.00', step: '0.50' }))).toEqual({
      name: 'Jus de fruits 1 L',
      category: 'drinks',
      unit: 'kg',
      threshold: '3',
      step: '0,5',
      bestBefore: '2027-02-01',
      initialCost: '',
    })
    expect(itemFields(stockItem({ best_before: null })).bestBefore).toBe('')
    expect(itemFields(stockItem({ initial_cost: '0.0125' })).initialCost).toBe('0,0125')
  })

  it('sends an item whole, its numbers as the API reads them', () => {
    expect(itemPayload({ name: 'Bonbons', category: 'food', unit: 'kg', threshold: '3', step: '0,5', bestBefore: '2027-03-01', initialCost: '9,5' })).toEqual({
      name: 'Bonbons',
      category: 'food',
      unit: 'kg',
      threshold: '3',
      step: '0.5',
      best_before: '2027-03-01',
      initial_cost: '9.5',
    })
    expect(itemPayload({ ...newItemFields(), step: '' })).toMatchObject({ threshold: '', step: '', best_before: null, initial_cost: null })
  })

  it('offers the best-before months from a year ago to four years ahead', () => {
    /**
     * Given the first of October 2026, in Paris
     * Then the months run from October 2025 to September 2030
     * And a month an item already has stays among them, however far
     */
    const now = Date.parse('2026-10-01T10:00:00+02:00')

    const months = bestBeforeMonths(now)

    expect(months).toHaveLength(60)
    expect(months[0]).toBe('2025-10-01')
    expect(months.at(-1)).toBe('2030-09-01')
    expect(bestBeforeMonths(now, '2031-05-01').at(-1)).toBe('2031-05-01')
    expect(bestBeforeMonths(now, '2027-05-01')).toHaveLength(60)
  })
})

describe('an item and where its stock stands', () => {
  it('leads to its page', () => {
    expect(itemPath(stockedItem().item.id)).toBe('/bureau/stock/articles/3')
  })
})
