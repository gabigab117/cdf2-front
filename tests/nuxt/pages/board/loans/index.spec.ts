import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { components } from '~/types/api'
import LoansPage from '~/pages/board/loans/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { loanBrief, loanOut } from '../../../helpers/equipment'
import { page } from '../../../helpers/events'

type LoanItemOut = components['schemas']['LoanItemOut']

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const COUNTS = { total: 3, to_prepare: 1, confirmed: 0, out: 1, overdue: 0, committee: 1, returned: 0, cancelled: 0 }

const LINE = { id: 41, equipment: { id: 5, name: 'Barnums 3 × 3 m', unit_value: '250.00' }, quantity: 2, damaged_quantity: 0, missing_quantity: 0 }

function item(changes: Partial<LoanItemOut> = {}): LoanItemOut {
  return { ...loanBrief(), lines: [LINE], ...changes }
}

const ITEMS = [
  item({ id: 18, number: 'P-2026-018', display_name: 'École du village', purpose: 'Cross', state: 'out', start_date: '2026-09-30', end_date: '2026-10-02' }),
  item({ id: 19, number: 'P-2026-019', display_name: 'M. Petit', purpose: 'Anniversaire', borrower_type: 'individual', state: 'to_prepare', start_date: '2026-10-03', end_date: '2026-10-05' }),
  item({ id: 31, number: null, display_name: 'Halloween des enfants', purpose: '', borrower_type: 'committee', state: 'committee', start_date: '2026-10-30', end_date: '2026-11-01' }),
]

function readable(text: string): string {
  return text.replaceAll(' ', ' ').replaceAll(' ', ' ')
}

function mockList(items = ITEMS, planned = ITEMS) {
  mockApi('/api/board/loans', { method: 'GET', handler: () => apiResponse(200, page(items)) })
  mockApi('/api/board/loans/counts', { handler: () => apiResponse(200, COUNTS) })
  mockApi('/api/board/loans/planning', { handler: () => apiResponse(200, { start: '2026-09-21', end: '2026-11-22', loans: planned }) })
}

function mockLoan(loan = loanOut()) {
  mockApi('/api/board/loans/{loan_id}', { method: 'GET', handler: () => apiResponse(200, loan) }, { loan_id: loan.id })
}

function mountPage(route = '/bureau/prets') {
  return mountSuspended(LoansPage, { route, attachTo: document.body, global: { stubs: { teleport: true } } })
}

async function panelOf(view: VueWrapper) {
  await vi.waitFor(() => expect(view.find('section[aria-label]').exists()).toBe(true))
  return view.get('section[aria-label]')
}

function button(view: VueWrapper | ReturnType<VueWrapper['get']>, text: string) {
  const found = view.findAll('button').find(candidate => candidate.text() === text)
  if (!found) throw new Error(`No button « ${text} »`)
  return found
}

describe('the Prêts page', () => {
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
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('lists the loans with their state, days, number and equipment', async () => {
    /**
     * Given the school's loan out, M. Petit's to prepare, and Halloween's reservation
     * When the page shows
     * Then each row reads whom it lends to, its state, days and number, or
     * « réservation interne », what it takes, and the step it calls for
     */
    mockList()

    const view = await mountPage()

    await vi.waitFor(() => expect(view.findAll('ul.divide-y > li')).toHaveLength(3))
    const [school, birthday, halloween] = view.findAll('ul.divide-y > li')
    expect(readable(school!.text())).toBe('École du village — CrossEn coursdu mer. 30 sept. au ven. 2 oct. · P-2026-018Barnums 3 × 3 m (2)Enregistrer le retour')
    expect(readable(birthday!.text())).toContain('M. Petit — AnniversaireÀ préparer')
    expect(readable(birthday!.text())).toContain('Préparer la sortie')
    expect(readable(halloween!.text())).toContain('réservation interne')
    expect(school!.get('a').attributes('href')).toBe('/bureau/prets?pret=18')
    expect(view.findAll('a').find(link => link.text() === 'Nouveau prêt')?.attributes('href')).toBe('/bureau/prets/nouveau')
  })

  it('draws the planning of nine weeks, a bar a loan leading to its panel', async () => {
    /**
     * Given the school's loan out, M. Petit's to prepare, and Halloween's reservation
     * When the planning shows, on 1 October
     * Then each has its row and its bar, coloured after its state, cut at the
     * window, and the line of today crosses them
     */
    mockList()

    const view = await mountPage('/bureau/prets?etat=en-cours')

    const planning = view.get('#planning')
    await vi.waitFor(() => expect(planning.findAll('ul[aria-label="Prêts du planning"] li')).toHaveLength(3))
    expect(planning.text()).toContain('21 sept.28 sept.5 oct.')
    const bars = planning.findAll('ul[aria-label="Prêts du planning"] a')
    expect(bars.map(bar => [bar.text(), bar.attributes('href')])).toEqual([
      ['Cross', '/bureau/prets?pret=18&etat=en-cours'],
      ['Anniversaire', '/bureau/prets?pret=19&etat=en-cours'],
      ['Halloween des enfants', '/bureau/prets?pret=31&etat=en-cours'],
    ])
    expect(readable(bars[0]!.attributes('aria-label')!)).toBe('École du village, du mer. 30 sept. au ven. 2 oct., en cours')
    expect(bars[1]!.classes()).toContain('bg-ambre-500')
    expect(bars[2]!.classes()).toContain('bg-sable-950')
    expect(bars[0]!.attributes('style')).toBe('left: 14.29%; width: 4.76%;')
  })

  it('says when no loan is on the planning', async () => {
    mockList(ITEMS, [])

    const view = await mountPage()

    await vi.waitFor(() => expect(view.get('#planning').text()).toContain('Aucun prêt sur ces neuf semaines.'))
  })

  it('counts each state on its chip, which keeps its loans alone', async () => {
    mockList()
    const sent = recordRequests()

    const view = await mountPage('/bureau/prets?etat=en-cours')

    await vi.waitFor(() => expect(view.get('nav[aria-label="États"]').text()).toContain('En cours1'))
    const chips = view.get('nav[aria-label="États"]').findAll('a')
    expect(chips.map(chip => chip.text())).toEqual(['Tous3', 'À préparer1', 'En cours1', 'En retard0', 'Confirmés0', 'Usage comité1', 'Rendus0'])
    expect(chips[2]!.attributes('aria-current')).toBe('page')
    expect(chips[1]!.attributes('href')).toBe('/bureau/prets?etat=a-preparer')
    expect(sent.map(request => request.url)).toContain('/api/board/loans?state=out&page=1&page_size=25')
  })

  it('says when no loan is in a state', async () => {
    mockList([])

    const view = await mountPage('/bureau/prets?etat=en-retard')

    await vi.waitFor(() => expect(view.text()).toContain('Aucun prêt dans cet état.'))
  })

  it('shows a loan’s panel: its next step, days, number, deposit, phone and notes', async () => {
    mockList()
    mockLoan(loanOut({ state: 'to_prepare', start_date: '2026-10-02', end_date: '2026-10-04', notes: 'Clés au local.' }))

    const view = await mountPage('/bureau/prets?pret=20')

    const panel = await panelOf(view)
    expect(readable(panel.get('header').text())).toBe('Sortie demainClub de football — Tournoi jeunesDu ven. 2 au dim. 4 oct. · P-2026-020 · caution de 150,00 €')
    expect(panel.get('a[href="tel:0123456789"]').text()).toBe('01 23 45 67 89')
    expect(panel.text()).toContain('Clés au local.')
    expect(panel.findAll('a').find(link => link.text() === 'Modifier')?.attributes('href')).toBe('/bureau/prets/20/modifier')
  })

  it('hands a loan over once the member confirms', async () => {
    /**
     * Given a loan to prepare
     * When the member asks to hand it over, then confirms
     * Then the loan is out, and the list read again
     */
    mockList()
    mockLoan(loanOut({ state: 'to_prepare', start_date: '2026-10-02', end_date: '2026-10-04' }))
    mockApi('/api/board/loans/{loan_id}/checkout', { handler: () => apiResponse(200, loanOut({ status: 'out', state: 'out', start_date: '2026-10-02', end_date: '2026-10-04' })) }, { loan_id: 20 })
    const sent = recordRequests()
    const view = await mountPage('/bureau/prets?pret=20')
    const panel = await panelOf(view)

    await button(panel, 'Préparer la sortie').trigger('click')
    expect(panel.text()).toContain('Le matériel de ce prêt sort maintenant ?')
    await button(panel, 'Confirmer la sortie').trigger('click')

    await vi.waitFor(() => expect(view.get('section[aria-label] header').text()).toContain('Retour prévu le dim. 4 oct.'))
    expect(sent.some(request => request.method === 'POST' && request.url === '/api/board/loans/20/checkout')).toBe(true)
    await vi.waitFor(() => expect(sent.filter(request => request.url.startsWith('/api/board/loans/counts'))).toHaveLength(2))
  })

  it('tells why a loan cannot be handed over', async () => {
    mockList()
    mockLoan(loanOut({ state: 'to_prepare', start_date: '2026-10-02', end_date: '2026-10-04' }))
    mockApi('/api/board/loans/{loan_id}/checkout', {
      handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body'], msg: 'Le matériel de ce prêt n’est pas libre sur ses jours :' },
        { type: 'validation_error', loc: ['body'], msg: 'Barnums 3 × 3 m : 2 demandés, 1 libre sur la période.' },
      ] }),
    }, { loan_id: 20 })
    const view = await mountPage('/bureau/prets?pret=20')
    const panel = await panelOf(view)

    await button(panel, 'Préparer la sortie').trigger('click')
    await button(panel, 'Confirmer la sortie').trigger('click')

    await vi.waitFor(() => expect(panel.text()).toContain('Le matériel de ce prêt n’est pas libre sur ses jours : Barnums 3 × 3 m : 2 demandés, 1 libre sur la période.'))
  })

  it('records a return, a piece damaged, and names the loans it leaves short', async () => {
    /**
     * Given the club's loan of two marquees, out, due back tomorrow
     * When the member says one came back damaged, then validates the return
     * Then the return is sent, and the loans to come left short are named
     */
    mockList()
    mockLoan(loanOut({ status: 'out', state: 'out', start_date: '2026-09-30', end_date: '2026-10-02' }))
    mockApi('/api/board/loans/{loan_id}/return', {
      handler: () => apiResponse(200, {
        loan: loanOut({ status: 'returned', state: 'returned', returned_at: '2026-10-01T16:00:00Z', lines: [{ ...LINE, damaged_quantity: 1 }] }),
        shortages: [{ equipment: LINE.equipment, day: '2026-10-16', offered: 1, taken: 2, loans: [loanBrief({ number: 'P-2026-021' })] }],
      }),
    }, { loan_id: 20 })
    const sent = recordRequests()
    const view = await mountPage('/bureau/prets?pret=20')
    const panel = await panelOf(view)
    expect(panel.get('header').text()).toContain('Retour prévu demain')

    await panel.get('input[type="radio"][value="damaged"]').setValue(true)
    expect(panel.text()).toContain('À noter : Barnums 3 × 3 m : 1 passera en réparation.')
    await panel.get('form').trigger('submit')

    await vi.waitFor(() => expect(sent.find(request => request.url === '/api/board/loans/20/return')?.body).toEqual({
      lines: [{ line: 41, damaged_quantity: 1, missing_quantity: 0 }],
    }))
    await vi.waitFor(() => expect(view.get('section[aria-label]').text()).toContain('Des prêts à venir manquent désormais de matériel'))
    expect(readable(view.get('section[aria-label]').text())).toContain('Barnums 3 × 3 m : les prêts en prennent 2 le ven. 16 oct., 1 reste (P-2026-021).')
    expect(view.get('section[aria-label]').text()).toContain('1 abîmé, mis en réparation')
  })

  it('reopens a returned loan once the member confirms', async () => {
    mockList()
    mockLoan(loanOut({ status: 'returned', state: 'returned', returned_at: '2026-09-28T16:00:00Z', start_date: '2026-09-25', end_date: '2026-09-28' }))
    mockApi('/api/board/loans/{loan_id}/reopen', { handler: () => apiResponse(200, loanOut({ status: 'out', state: 'overdue', start_date: '2026-09-25', end_date: '2026-09-28' })) }, { loan_id: 20 })
    const view = await mountPage('/bureau/prets?pret=20')
    const panel = await panelOf(view)
    expect(panel.get('header').text()).toContain('Rendu le lun. 28 sept.')

    await button(panel, 'Rouvrir').trigger('click')
    expect(panel.text()).toContain('Le matériel sera de nouveau compté comme sorti.')
    await button(panel, 'Rouvrir le prêt').trigger('click')

    await vi.waitFor(() => expect(view.get('section[aria-label] header').text()).toContain('En retard depuis le mar. 29 sept.'))
  })

  it('cancels a reservation of the committee once the member confirms', async () => {
    mockList()
    mockLoan(loanOut({ id: 31, number: null, borrower_type: 'committee', display_name: 'Halloween des enfants', purpose: '', phone: '', deposit_amount: '0.00', state: 'committee', event: { id: 12, title: 'Halloween des enfants' } }))
    mockApi('/api/board/loans/{loan_id}/cancel', { handler: () => apiResponse(200, loanOut({ id: 31, status: 'cancelled', state: 'cancelled' })) }, { loan_id: 31 })
    const view = await mountPage('/bureau/prets?pret=31')
    const panel = await panelOf(view)
    expect(readable(panel.get('header').text())).toContain('réservation interne · usage interne')
    expect(panel.findAll('a').find(link => link.text() === 'Voir l’événement')?.attributes('href')).toBe('/bureau/evenements/12')
    expect(panel.text()).not.toContain('Bon de prêt à signer')

    await button(panel, 'Annuler la réservation').trigger('click')
    expect(panel.text()).toContain('Annuler cette réservation ? Son matériel redevient libre.')
    await button(panel, 'Confirmer l’annulation').trigger('click')

    await vi.waitFor(() => expect(view.get('section[aria-label] header').text()).toContain('Annulé'))
  })

  it('leads to the agreement to sign, then deposits the one signed', async () => {
    /**
     * Given the club's loan, confirmed, without a signed agreement
     * When the member picks the agreement the club signed
     * Then it is sent as a file, and the panel leads to its document, which
     * the next one would replace
     */
    mockList()
    mockLoan()
    const agreement = { id: 7, title: 'Convention signée P-2026-020 — Club de football', created_at: '2026-10-01T09:00:00Z' }
    mockApi('/api/board/loans/{loan_id}/agreement', { handler: () => apiResponse(200, loanOut({ agreement })) }, { loan_id: 20 })
    const sent = recordRequests()
    const view = await mountPage('/bureau/prets?pret=20')
    const panel = await panelOf(view)
    expect(panel.findAll('a').find(link => link.text() === 'Bon de prêt à signer')?.attributes('href')).toBe('/bureau/prets/20/convention')

    const picker = panel.get<HTMLInputElement>('input[type="file"]')
    Object.defineProperty(picker.element, 'files', { value: [new File(['%PDF-1.4'], 'convention.pdf', { type: 'application/pdf' })], configurable: true })
    await picker.trigger('change')

    await vi.waitFor(() => expect(sent.find(request => request.url === '/api/board/loans/20/agreement')?.body).toEqual({
      file: { name: 'convention.pdf', type: 'application/pdf' },
    }))
    await vi.waitFor(() => expect(view.find('a[href="/bureau/documents?document=7"]').exists()).toBe(true))
    expect(view.get('a[href="/bureau/documents?document=7"]').text()).toBe('Convention signée, déposée le 1er oct.')
    expect(button(view.get('section[aria-label]'), 'Remplacer la convention signée').exists()).toBe(true)
  })

  it('tells why a signed agreement was refused', async () => {
    mockList()
    mockLoan()
    mockApi('/api/board/loans/{loan_id}/agreement', {
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body', 'file'], msg: 'Ce type de fichier n’est pas accepté.' }] }),
    }, { loan_id: 20 })
    const view = await mountPage('/bureau/prets?pret=20')
    const panel = await panelOf(view)

    const picker = panel.get<HTMLInputElement>('input[type="file"]')
    Object.defineProperty(picker.element, 'files', { value: [new File(['texte'], 'convention.txt', { type: 'text/plain' })], configurable: true })
    await picker.trigger('change')

    await vi.waitFor(() => expect(panel.find('[role="alert"]').exists()).toBe(true))
    expect(panel.get('[role="alert"]').text()).toBe('Ce type de fichier n’est pas accepté.')
    expect(panel.text()).toContain('Déposer la convention signée')
  })

  it('closes the panel', async () => {
    mockList()
    mockLoan()
    const view = await mountPage('/bureau/prets?pret=20&etat=confirmes')
    const panel = await panelOf(view)

    await panel.get('button[aria-label="Fermer la fiche"]').trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith({ query: { pret: undefined, etat: 'confirmes', page: undefined } })
  })
})
