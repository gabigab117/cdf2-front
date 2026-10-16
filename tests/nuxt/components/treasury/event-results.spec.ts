import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import TreasuryEventResults from '~/components/treasury/EventResults.vue'
import type { LedgerFilter } from '~/utils/treasury'
import { fiscalYearResults } from '../../helpers/treasury'

function location(filter: LedgerFilter) {
  return { query: treasuryQuery({ year: 2026, filter, page: 1 }) }
}

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

describe('the result of each event', () => {
  enableAutoUnmount(afterEach)

  it('draws the events that have lines, the first to start first, the general running last', async () => {
    /**
     * Given the mockup's brocante, Halloween, and the general running
     * Then each comes with its result, in azur when it brings in, in amber when
     * it costs, and its two bars drawn against the largest amount, 4 120,00 €
     */
    const results = await mountSuspended(TreasuryEventResults, { props: { results: fiscalYearResults(), filter: null, location } })

    const rows = results.findAll('li a')
    expect(rows.map(row => readable(row.findAll('span')[0]!.text()))).toEqual(['Brocante', 'Halloween des enfants', 'Hors événement'])
    expect(rows.map(row => readable(row.findAll('span')[1]!.text()))).toEqual(['+3 140,00 €', '−195,25 €', '+1 254,00 €'])
    expect(rows[1]!.findAll('span')[1]!.classes()).toContain('text-ambre-700')
    const brocante = rows[0]!.findAll('[aria-hidden="true"] > span')
    expect(brocante[0]!.attributes('style')).toBe('width: 100%;')
    expect(brocante[1]!.attributes('style')).toMatch(/^width: 23\.786\d*%;$/)
    expect(readable(rows[0]!.get('.sr-only').text())).toBe('Recettes 4 120,00 €, dépenses 980,00 €')
  })

  it('filters the journal by a row, and shows it whole when the row is clicked again', async () => {
    const results = await mountSuspended(TreasuryEventResults, { props: { results: fiscalYearResults(), filter: 3, location } })

    const [brocante, halloween, general] = results.findAll('li a')
    expect(brocante!.attributes('aria-current')).toBe('page')
    expect(brocante!.attributes('href')).toBe('/?exercice=2026')
    expect(halloween!.attributes('href')).toBe('/?exercice=2026&evenement=12')
    expect(general!.attributes('href')).toBe('/?exercice=2026&evenement=aucun')
    expect(halloween!.attributes('aria-current')).toBeUndefined()
  })

  it('draws its bars against the largest amount, even below one euro, and leaves out a general running without lines', async () => {
    const coins = fiscalYearResults({
      totals: { income: '0.00', expense: '0.50', result: '-0.50', count: 1 },
      events: [{ event: { id: 3, title: 'Brocante', starts_at: '2026-09-13T05:00:00Z' }, income: '0.00', expense: '0.50', result: '-0.50', count: 1 }],
      general: { income: '0.00', expense: '0.00', result: '0.00', count: 0 },
    })

    const results = await mountSuspended(TreasuryEventResults, { props: { results: coins, filter: null, location } })

    const rows = results.findAll('li a')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.findAll('[aria-hidden="true"] > span')[1]!.attributes('style')).toBe('width: 100%;')
  })

  it('says when the fiscal year has no line', async () => {
    const empty = fiscalYearResults({ totals: { income: '0.00', expense: '0.00', result: '0.00', count: 0 }, events: [] })

    const results = await mountSuspended(TreasuryEventResults, { props: { results: empty, filter: null, location } })

    expect(results.text()).toContain('Aucune ligne pour cet exercice.')
    expect(results.findAll('li a')).toHaveLength(0)
  })
})
