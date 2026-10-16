import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { DOMWrapper } from '@vue/test-utils'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReportPage from '~/pages/board/treasury/report.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { generalMeetingReport } from '../../../helpers/treasury'

function readable(text: string): string {
  return text.replace(/[\u202F\u00A0]/g, ' ')
}

// Each table of the sheet, by the title of its section: its rows as they read.
function table(sheet: Pick<DOMWrapper<Element>, 'findAll'>, title: string): string[] {
  const section = sheet.findAll('section').find(part => part.get('h2').text() === title)!
  return section.findAll('tr').map(row => readable(row.findAll('th, td').map(cell => cell.text()).join(' | ')))
}

function mountPage(route: string) {
  return mountSuspended(ReportPage, { route, attachTo: document.body, global: { stubs: { teleport: true } } })
}

describe('the report for the general meeting', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-16T10:00:00+02:00')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('tells the fiscal year under way: its totals, its events, its categories and its receipts missing', async () => {
    /**
     * Given the ledger of the mockup, one receipt missing
     * When the report of 2026 shows, on 16 October
     * Then it is stopped at that day, and tells its totals, the result of each
     * event with their total, what each category brought in or cost, and the
     * receipt missing
     */
    mockApi('/api/board/treasury/report', { handler: () => apiResponse(200, generalMeetingReport()) })
    const sent = recordRequests()

    const page = await mountPage('/bureau/tresorerie/bilan?exercice=2026')

    await vi.waitFor(() => expect(page.find('article').exists()).toBe(true))
    expect(sent.map(request => request.url)).toContain('/api/board/treasury/report?year=2026')
    const sheet = page.get('article')
    expect(sheet.get('h1').text()).toBe('Bilan financier de l’exercice 2026')
    expect(sheet.text()).toContain('Arrêté au 16/10/2026')
    expect(table(sheet, 'Résultat de l’exercice')).toEqual(['Recettes | Dépenses | Résultat', '11 490,00 € | 6 921,25 € | +4 568,75 €'])
    expect(table(sheet, 'Résultat par événement')).toEqual([
      'Événement | Recettes | Dépenses | Résultat',
      'Brocante | 4 120,00 € | 980,00 € | +3 140,00 €',
      'Halloween des enfants | 0,00 € | 195,25 € | −195,25 €',
      'Hors événement | 1 620,00 € | 366,00 € | +1 254,00 €',
      'Total | 11 490,00 € | 6 921,25 € | +4 568,75 €',
    ])
    expect(table(sheet, 'Recettes par catégorie')).toEqual([
      'Catégorie | Lignes | Montant',
      'Buvette | 5 | 5 240,00 €',
      'Emplacements | 3 | 3 130,00 €',
      'Subvention | 1 | 1 500,00 €',
      'Cotisations | 2 | 1 620,00 €',
      'Total |  | 11 490,00 €',
    ])
    expect(table(sheet, 'Dépenses par catégorie').at(-1)).toBe('Total |  | 6 921,25 €')
    expect(table(sheet, 'Justificatifs manquants')).toEqual(['Date | Libellé | Événement | Montant', '12/09/2026 | Courses buvette | Brocante | 286,30 €'])
    expect(sheet.text()).toContain('Édité le 16/10/2026 depuis l’espace du bureau.')
  })

  it('tells a past fiscal year whole, and what it does not have', async () => {
    const empty = { income: '0.00', expense: '0.00', result: '0.00', count: 0 }
    mockApi('/api/board/treasury/report', { handler: () => apiResponse(200, generalMeetingReport({
      year: 2025,
      totals: empty,
      events: [],
      general: empty,
      income_categories: [],
      expense_categories: [],
      missing_receipts: [],
    })) })

    const page = await mountPage('/bureau/tresorerie/bilan?exercice=2025')

    await vi.waitFor(() => expect(page.find('article').exists()).toBe(true))
    const sheet = page.get('article')
    expect(sheet.text()).toContain('Du 1er janvier au 31 décembre 2025')
    expect(sheet.text()).toContain('Aucune ligne pour cet exercice.')
    expect(sheet.text()).toContain('Aucune recette pour cet exercice.')
    expect(sheet.text()).toContain('Aucune dépense pour cet exercice.')
    expect(sheet.text()).toContain('Tous les justificatifs sont joints.')
    expect(page.get('nav[aria-label="Fil d’Ariane"] a').attributes('href')).toBe('/bureau/tresorerie?exercice=2025')
  })

  it('prints the sheet', async () => {
    mockApi('/api/board/treasury/report', { handler: () => apiResponse(200, generalMeetingReport()) })
    // The test environment has no printing of its own.
    const print = vi.fn()
    vi.stubGlobal('print', print)

    const page = await mountPage('/bureau/tresorerie/bilan')

    await vi.waitFor(() => expect(page.find('article').exists()).toBe(true))
    await page.findAll('button').find(button => button.text() === 'Imprimer / Enregistrer en PDF')!.trigger('click')
    expect(print).toHaveBeenCalledOnce()
  })
})
