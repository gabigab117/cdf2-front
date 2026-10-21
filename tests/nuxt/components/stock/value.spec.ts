import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import StockValue from '~/components/stock/Value.vue'
import { stockOverview } from '../../helpers/stock'
import { readable } from '../../helpers/text'

const { valuation } = stockOverview()

describe('« Valeur du stock »', () => {
  enableAutoUnmount(afterEach)

  it('tells the value of the stock, in all and by category', async () => {
    /**
     * Given the stock of the mockup, worth 114,30 €, its kegs of no cost
     * When the card shows
     * Then it tells the value, each category's in the order of the chips, and
     * the kegs left out of it
     */
    const card = await mountSuspended(StockValue, { props: { valuation } })

    expect(card.get('h2').text()).toBe('Valeur du stock')
    expect(readable(card.get('p').text())).toBe('114,30 €')
    expect(card.findAll('dl > div').map(row => readable(row.text()))).toEqual([
      'Boissons100,80 €',
      'Alimentaire13,50 €',
      'Consommables0,00 €',
      'Loto et tombola0,00 €',
    ])
    expect(card.text()).toContain('1 article sans prix de départ ni achat payé, hors de cette valeur.')
    expect(card.text()).not.toContain('sans prix, au prix moyen')
  })

  it('tells the purchases that wait for their cost', async () => {
    const card = await mountSuspended(StockValue, {
      props: { valuation: { ...valuation, unvalued_items: 0, unpriced_purchases: 2 } },
    })

    expect(card.text()).toContain('2 achats sans prix, au prix moyen d’ici là.')
    expect(card.text()).not.toContain('hors de cette valeur')
    expect(card.get('a[href="/bureau/stock/operations?filtre=sans-prix"]').text()).toBe('Compléter les prix')
  })

  it('leads to the management control', async () => {
    const card = await mountSuspended(StockValue, { props: { valuation } })

    expect(card.get('a[href="/bureau/tresorerie/gestion"]').text()).toBe('Voir le contrôle de gestion')
  })
})
