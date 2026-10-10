import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { DOMWrapper } from '@vue/test-utils'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AgreementPage from '~/pages/board/loans/[id]/agreement.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../../helpers/api'
import { loanOut } from '../../../helpers/equipment'

const { showErrorMock } = vi.hoisted(() => ({ showErrorMock: vi.fn() }))
mockNuxtImport('showError', () => showErrorMock)

function readable(text: string): string {
  return text.replaceAll('\u202F', ' ').replaceAll('\u00A0', ' ')
}

// Each line of the agreement: its label, and what the loan filled in after it.
function fields(sheet: Pick<DOMWrapper<Element>, 'findAll'>): string[][] {
  return sheet.findAll('span')
    .filter(span => readable(span.text()).endsWith(' :'))
    .map(span => [readable(span.text()).slice(0, -2), readable(span.element.nextElementSibling?.textContent ?? '')])
}

function mockLoan(loan = loanOut()) {
  mockApi('/api/board/loans/{loan_id}', { method: 'GET', handler: () => apiResponse(200, loan) }, { loan_id: loan.id })
}

function mountPage(id = 20) {
  return mountSuspended(AgreementPage, { route: `/bureau/prets/${id}/convention`, attachTo: document.body, global: { stubs: { teleport: true } } })
}

describe('the agreement of a loan', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    showErrorMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('fills in what the loan knows, and leaves the rest to write by hand', async () => {
    /**
     * Given the football club's loan of two marquees, with a remark for the board
     * When its agreement shows
     * Then it names the committee, its office and contact, the club, its phone
     * and purpose, the marquees, the days, the deposit and its cheques, but
     * never the remark
     */
    mockLoan(loanOut({ notes: 'Clés au local.' }))

    const view = await mountPage()

    await vi.waitFor(() => expect(view.find('article[aria-label="Convention de prêt"]').exists()).toBe(true))
    const sheet = view.get('article')
    expect(sheet.get('header').findAll('h1, p').map(line => readable(line.text()))).toEqual([
      'Comité des Fêtes d’Ons-en-Bray',
      'Convention de prêt de matériel n° P-2026-020',
      '2 rue de l’Église – 00000 Commune · 01 23 45 67 89 · contact@example.test',
    ])
    const cheque = (number: number) => [[`Chèque n° ${number} – objet`, ''], ['Montant (€)', '']]
    expect(fields(sheet)).toEqual([
      ['L’association', 'Le Comité des Fêtes d’Ons-en-Bray'],
      ['Représentée par', ''],
      ['Agissant en qualité de', ''],
      ['L’association', 'Club de football'],
      ['Représenté par', ''],
      ['Agissant en qualité de', ''],
      ['Adresse', ''],
      ['Code postal', ''],
      ['Ville', ''],
      ['Téléphone / e-mail', '01 23 45 67 89'],
      ['Objet du prêt', 'Tournoi jeunes'],
      ['Date de prise en charge', '16/10/2026'],
      ['Date de restitution', '18/10/2026'],
      ['Lieu de remise et de restitution', ''],
      ['Caution demandée', '150,00 €'],
      ...cheque(1),
      ...cheque(2),
      ...cheque(3),
      ['Fait le', ''],
      ['à', ''],
    ])
    expect(sheet.findAll('tbody tr').map(row => row.findAll('td').map(cell => cell.text()))).toEqual([['Barnums 3 × 3 m', '2'], ['', '']])
    expect(sheet.text()).toContain('Signature de l’emprunteur')
    expect(sheet.text()).not.toContain('Clés au local.')
    expect(view.get('nav[aria-label="Fil d’Ariane"]').findAll('a').map(link => link.attributes('href'))).toEqual(['/bureau/prets', '/bureau/prets?pret=20'])
  })

  it('names a municipality, and asks for no cheque without a deposit', async () => {
    mockLoan(loanOut({ borrower_type: 'municipality', borrower_name: 'Mairie', display_name: 'Mairie', deposit_amount: '0.00' }))

    const view = await mountPage()

    await vi.waitFor(() => expect(view.find('article').exists()).toBe(true))
    const sheet = view.get('article')
    expect(fields(sheet)).toContainEqual(['La commune', 'Mairie'])
    expect(sheet.text()).toContain('Aucune caution n’est demandée pour ce prêt.')
    expect(fields(sheet).map(([label]) => label)).not.toContain('Caution demandée')
    expect(sheet.text()).not.toContain('Chèque')
  })

  it('prints the sheet', async () => {
    mockLoan()
    // The test environment has no printing of its own.
    const print = vi.fn()
    vi.stubGlobal('print', print)

    const view = await mountPage()

    await vi.waitFor(() => expect(view.find('article').exists()).toBe(true))
    await view.findAll('button').find(button => button.text() === 'Imprimer / Enregistrer en PDF')!.trigger('click')
    expect(print).toHaveBeenCalledOnce()
  })

  it('has none for a reservation of the committee', async () => {
    mockLoan(loanOut({ id: 31, number: null, borrower_type: 'committee', borrower_name: '', display_name: 'Halloween des enfants', deposit_amount: '0.00', state: 'committee', event: { id: 12, title: 'Halloween des enfants' } }))

    const view = await mountPage(31)

    await vi.waitFor(() => expect(view.text()).toContain('Une réservation interne n’a pas de convention de prêt.'))
    expect(view.find('article').exists()).toBe(false)
    expect(view.findAll('button').some(button => button.text().startsWith('Imprimer'))).toBe(false)
  })

  it('is the page not found of a loan that does not exist', async () => {
    mockApi('/api/board/loans/{loan_id}', { method: 'GET', handler: () => apiResponse(404, { detail: 'Introuvable.' }) }, { loan_id: 20 })

    await mountPage()

    await vi.waitFor(() => expect(showErrorMock).toHaveBeenCalledWith({ status: 404, statusText: 'Not Found' }))
  })
})
