import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ManagementPage from '~/pages/board/treasury/management.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { managementReport } from '../../../helpers/treasury'
import { readable } from '../../../helpers/text'

const MANAGEMENT = '/api/board/treasury/management'

function mountPage(route = '/bureau/tresorerie/gestion') {
  return mountSuspended(ManagementPage, { route })
}

function card(view: Awaited<ReturnType<typeof mountPage>>, title: string) {
  const found = view.findAll('section').find(section => section.find('h2').exists() && section.get('h2').text() === title)
  if (!found) throw new Error(`No card « ${title} »`)
  return found
}

// The rows of a list of details, as read.
function rowsOf(section: ReturnType<typeof card>) {
  return section.findAll('dl > div').map(row => readable(row.text()))
}

describe('« Contrôle de gestion »', () => {
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

  it('tells the management result of each event, the stock and the reconciliation of the year', async () => {
    /**
     * Given the reference scenario of the brocante, in the current year
     * When the treasurer opens the management control
     * Then the result of 10,00 € becomes an adjusted result of 32,67 €, the
     * brocante's management result is 19,40 € and its bar margin 43,00 €,
     * 71,7 %, the general running loses the 1,13 € of the stocktake, and the
     * purchase no expense paid is left to link
     */
    mockApi(MANAGEMENT, { method: 'GET', handler: () => apiResponse(200, managementReport()) })
    const sent = recordRequests()

    const view = await mountPage()

    await vi.waitFor(() => expect(view.findAll('h2').length).toBeGreaterThan(0))
    expect(sent.map(request => request.url)).toContain('/api/board/treasury/management?year=2026')
    expect(view.get('h1').text()).toBe('Contrôle de gestion')
    expect(view.get('nav a').attributes('href')).toBe('/bureau/tresorerie')
    const kpis = readable(view.text())
    expect(kpis).toContain('Résultat de l’exercice+10,00 €Depuis le 1er janvier')
    expect(kpis).toContain('Variation du stock+22,67 €De 0,00 € à 22,67 €')
    expect(kpis).toContain('Résultat corrigé+32,67 €')
    expect(kpis).toContain('Résultat plus variation du stock')
    // The value of the stock is told by the « Stock » card and the change's caption.
    expect(kpis).not.toContain('Valeur du stock')
    const table = view.findAll('ul').find(list => list.text().includes('Brocante'))!
    expect(table.findAll('li').map(row => readable(row.text()))).toEqual([
      'BrocanteRecettes 60,00 € · dépenses 50,00 € · mis en stock 26,40 € · consommé 17,00 € · marge buvette 43,00 € (71,7 %)'
      + 'Recettes : 60,00 €Dépenses : 50,00 €Mis en stock : 26,40 €Consommé : 17,00 €'
      + 'Résultat de gestion : +19,40 €Marge buvette : 43,00 €71,7 %',
      'Hors événementAchats sans dépense : 14,40 €Dont pertes : 1,13 €'
      + 'Recettes 0,00 € · dépenses 0,00 € · mis en stock 0,00 € · consommé 1,13 € · marge buvette −1,13 €'
      + 'Recettes : 0,00 €Dépenses : 0,00 €Mis en stock : 0,00 €Consommé : 1,13 €'
      + 'Résultat de gestion : −1,13 €Marge buvette : −1,13 €—',
    ])
    expect(readable(view.text())).toContain('Total des résultats de gestion+18,27 €')
    expect(rowsOf(card(view, 'Stock'))).toEqual([
      'Valeur au 1er janvier0,00 €',
      'Boissons22,67 €',
      'Alimentaire0,00 €',
      'Consommables0,00 €',
      'Loto et tombola0,00 €',
      'Valeur aujourd’hui22,67 €',
    ])
    expect(readable(card(view, 'Pertes d’inventaire').text())).toContain('Canettes de soda 33 cl21,13 €Total1,13 €')
    expect(rowsOf(card(view, 'Rapprochement'))).toEqual([
      'Résultats de gestion+18,27 €',
      'Achats sans dépense+14,40 €',
      'Achats payés par une dépense d’un autre exercice+0,00 €',
      'Achats d’un autre exercice payés sur celui-ci+0,00 €',
      'Résultat corrigé+32,67 €',
    ])
    expect(card(view, 'Contrôles').text()).toContain(
      '1 achat n’est payé par aucune dépense : rattachez-le depuis la page de sa dépense, par « Achat déjà saisi ».',
    )
  })

  it('names each figure of the table for a screen reader, its header being drawn only', async () => {
    mockApi(MANAGEMENT, { method: 'GET', handler: () => apiResponse(200, managementReport()) })

    const view = await mountPage()

    await vi.waitFor(() => expect(view.text()).toContain('Brocante'))
    const brocante = view.findAll('li').find(row => row.text().startsWith('Brocante'))!
    expect(brocante.findAll('.sr-only').map(label => label.text())).toEqual([
      'Recettes :',
      'Dépenses :',
      'Mis en stock :',
      'Consommé :',
      'Résultat de gestion :',
      'Marge buvette :',
    ])
  })

  it('names the end of a closed year, and leads to the purchases and items the figures wait for', async () => {
    mockApi(MANAGEMENT, {
      method: 'GET',
      handler: () => apiResponse(200, managementReport({
        year: 2025,
        controls: { unpriced_purchases: 2, unlinked_purchases: 0, unvalued_items: 1 },
      })),
    })
    const sent = recordRequests()

    const view = await mountPage('/bureau/tresorerie/gestion?exercice=2025')

    await vi.waitFor(() => expect(view.findAll('h2').length).toBeGreaterThan(0))
    expect(sent.map(request => request.url)).toContain('/api/board/treasury/management?year=2025')
    expect(view.get('nav a').attributes('href')).toBe('/bureau/tresorerie?exercice=2025')
    expect(card(view, 'Stock').text()).toContain('Valeur au 31 décembre')
    const controls = card(view, 'Contrôles')
    expect(controls.text()).toContain('2 achats attendent leur prix : ils comptent au prix moyen d’ici là.')
    expect(controls.text()).toContain('1 article n’est pas valorisé : donnez-lui un prix de départ.')
    expect(controls.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Compléter les prix', '/bureau/stock/operations?filtre=sans-prix'],
      ['Voir le stock', '/bureau/stock'],
    ])
  })

  it('says when the figures wait for nothing, and when no stocktake lost anything', async () => {
    mockApi(MANAGEMENT, {
      method: 'GET',
      handler: () => apiResponse(200, managementReport({
        stock: { ...managementReport().stock, losses: { total: '0.00', items: [] } },
        controls: { unpriced_purchases: 0, unlinked_purchases: 0, unvalued_items: 0 },
      })),
    })

    const view = await mountPage()

    await vi.waitFor(() => expect(view.findAll('h2').length).toBeGreaterThan(0))
    expect(card(view, 'Contrôles').text()).toContain('Rien n’attend : chaque achat a son prix et sa dépense, et chaque article est valorisé.')
    expect(card(view, 'Pertes d’inventaire').text()).toContain('Aucune perte d’inventaire sur l’exercice.')
    expect(view.text()).not.toContain('Dont pertes')
  })

  it('offers to try again when the control cannot be read', async () => {
    mockApi(MANAGEMENT, { method: 'GET', handler: () => apiResponse(503, {}) })

    const view = await mountPage()

    await vi.waitFor(() => expect(view.text()).toContain('Réessayer'))
  })
})
