import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import StockRecentOperations from '~/components/stock/RecentOperations.vue'
import { stockOperation } from '../../helpers/stock'
import { readable } from '../../helpers/text'

describe('« Mouvements récents »', () => {
  beforeEach(() => {
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(() => {
    clearNuxtState('now')
  })

  enableAutoUnmount(afterEach)

  it('tells each operation, who made it and what it moved, as the mockup does', async () => {
    /**
     * Given the shopping of the bar by Julie, a stocktake after the brocante
     * that took four items out, a click on minus by a deleted account, and a
     * stocktake that found no difference
     * When the block shows
     * Then each names its label or its reason, and its member; the stocktake
     * names three items and counts the others, and is dated as such
     */
    const block = await mountSuspended(StockRecentOperations, {
      props: {
        operations: [
          stockOperation(),
          stockOperation({
            id: 13,
            reason: 'stocktake',
            label: 'Consommé à la brocante',
            created_at: '2026-09-14T16:00:00Z',
            movements: [
              { item: { id: 1, name: 'Canettes de soda 33 cl', unit: '' }, delta: '-216.00' },
              { item: { id: 2, name: 'Bouteilles d’eau 50 cl', unit: '' }, delta: '-96.00' },
              { item: { id: 7, name: 'Frites surgelées 2,5 kg', unit: '' }, delta: '-26.00' },
              { item: { id: 6, name: 'Bonbons assortis', unit: 'kg' }, delta: '-1.50' },
            ],
          }),
          stockOperation({
            id: 14,
            reason: 'adjustment',
            label: '',
            author: null,
            movements: [{ item: { id: 6, name: 'Bonbons assortis', unit: 'kg' }, delta: '-0.50' }],
          }),
          stockOperation({ id: 15, reason: 'stocktake', label: '', created_at: '2026-09-30T16:00:00Z', movements: [] }),
        ],
      },
    })

    expect(block.get('h2').text()).toBe('Mouvements récents')
    expect(block.findAll('li').map(row => readable(row.text()))).toEqual([
      'Courses buvette · Julie R.+288 Canettes de soda 33 cl, +120 Bouteilles d’eau 50 cl · 12 sept.',
      'Consommé à la brocante · Julie R.−216 Canettes de soda 33 cl, −96 Bouteilles d’eau 50 cl, −26 Frites surgelées 2,5 kg et 1 autre · inventaire du 14 sept.',
      'Ajustement · Ancien membre−0,5 kg Bonbons assortis · 12 sept.',
      'Inventaire · Julie R.Aucun écart · inventaire du 30 sept.',
    ])
    const icons = block.findAll('li > span:first-child').map(icon => icon.classes())
    expect(icons[0]).toContain('bg-azur-100')
    expect(icons[1]).toContain('bg-argent-100')
    expect(icons[2]).toContain('bg-argent-100')
  })

  it('counts more than one other movement in the plural', async () => {
    const movements = Array.from({ length: 5 }, (_, index) => ({ item: { id: index, name: `Article ${index}`, unit: '' }, delta: '1.00' }))

    const block = await mountSuspended(StockRecentOperations, { props: { operations: [stockOperation({ movements })] } })

    expect(block.get('li').text()).toContain('+1 Article 2 et 2 autres · 12 sept.')
  })

  it('says when nothing has moved yet', async () => {
    const block = await mountSuspended(StockRecentOperations, { props: { operations: [] } })

    expect(block.text()).toContain('Aucun mouvement pour l’instant.')
  })
})
