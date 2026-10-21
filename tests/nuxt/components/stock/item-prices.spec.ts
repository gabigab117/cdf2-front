import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import StockItemPrices from '~/components/stock/ItemPrices.vue'
import { stockedItem } from '../../helpers/stock'
import { readable } from '../../helpers/text'

describe('the prices of an item', () => {
  enableAutoUnmount(afterEach)

  it('says when nothing values the stock of an item', async () => {
    /**
     * Given kegs entered by hand, of no cost to come at
     * When their prices show
     * Then each reads as unknown, and the card says their stock is not valued
     */
    const card = await mountSuspended(StockItemPrices, {
      props: { entry: stockedItem({}, { average_cost: null, value: null, last_unit_cost: null }) },
    })

    expect(card.findAll('dl > div').map(row => readable(row.text()))).toEqual([
      'Prix moyen pondéré—',
      'Valeur en stock—',
      'Dernier prix d’achat—',
    ])
    expect(card.text()).toContain('Sans prix de départ ni achat payé, son stock n’est pas valorisé.')
  })
})
