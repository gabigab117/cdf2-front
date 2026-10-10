import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NewLoanPage from '~/pages/board/loans/new.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { DEPOSITS, availabilityItem, availabilityOut, loanBrief, loanOut } from '../../../helpers/equipment'
import { eventItem, page } from '../../../helpers/events'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

// Marquees, one free over the days asked, two taken by the football club;
// tables, all of them free.
const MARQUEES = availabilityItem({}, { taken: 2, free: 1, conflicts: [{ loan: loanBrief(), quantity: 2 }] })
const TABLES = availabilityItem(
  { id: 7, name: 'Tables pliantes 180 cm', category: 'furniture', total_quantity: 24, repair_quantity: 0, unit_value: '60.00', repair_note: '' },
  { free: 24 },
)

function readable(text: string): string {
  return text.replaceAll(' ', ' ').replaceAll(' ', ' ')
}

function mockForm(items = [TABLES, MARQUEES]) {
  mockApi('/api/board/loans/deposits', { handler: () => apiResponse(200, DEPOSITS) })
  mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  mockApi('/api/board/equipment/availability', { handler: () => apiResponse(200, availabilityOut(items)) })
}

function mountPage(route = '/bureau/prets/nouveau') {
  // « Annuler » goes to the top bar, which the page alone lacks.
  return mountSuspended(NewLoanPage, { route, attachTo: document.body, global: { stubs: { teleport: true } } })
}

type Page = VueWrapper

// The control a label names.
function field(view: Page, label: string) {
  const tag = view.findAll('label').find(candidate => candidate.text().startsWith(label))
  if (!tag) throw new Error(`No field « ${label} »`)
  return view.get(`[id="${tag.attributes('for')}"]`)
}

function row(view: Page, name: string) {
  const found = view.findAll('li').find(item => item.text().startsWith(name))
  if (!found) throw new Error(`No line « ${name} »`)
  return found
}

function button(view: Page, text: string) {
  const found = view.findAll('button').find(candidate => candidate.text() === text)
  if (!found) throw new Error(`No button « ${text} »`)
  return found
}

async function linesShown(view: Page) {
  await vi.waitFor(() => expect(view.text()).toContain('Tables pliantes 180 cm'))
}

describe('the page of a new loan', () => {
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

  it('asks for the borrower as its type names them, with its deposit', async () => {
    /**
     * Given the form of a new loan, an association's by default
     * When the member picks a person, then the committee
     * Then the name, the deposit and its fields follow the type chosen
     */
    mockForm()

    const view = await mountPage()

    await vi.waitFor(() => expect((field(view, 'Caution').element as HTMLInputElement).value).toBe('150,00'))
    expect(field(view, 'Nom de l’association').element.tagName).toBe('INPUT')
    await button(view, 'Particulier').trigger('click')
    expect(field(view, 'Nom et prénom').element.tagName).toBe('INPUT')
    expect((field(view, 'Caution').element as HTMLInputElement).value).toBe('300,00')
    await button(view, 'Usage comité').trigger('click')
    expect(field(view, 'Événement du comité').element.tagName).toBe('SELECT')
    expect(view.text()).not.toContain('Téléphone')
    expect(readable(view.get('aside').text())).toContain('Aucune, usage interne')
  })

  it('reads what is free over the loan’s days, and tells what takes it', async () => {
    mockForm()
    const sent = recordRequests()

    const view = await mountPage()

    await linesShown(view)
    expect(sent.map(request => request.url)).toContain('/api/board/equipment/availability?start=2026-10-01&end=2026-10-01')
    expect(readable(row(view, 'Barnums 3 × 3 m').text())).toContain('Club de football : 2 (du ven. 16 au dim. 18 oct.) · 1 en réparation')
    expect(row(view, 'Barnums 3 × 3 m').text()).toContain('1 libre / 4')
    expect(row(view, 'Tables pliantes 180 cm').text()).toContain('Aucun autre prêt sur la période24 libres / 24')
  })

  it('stops each stepper at what is free', async () => {
    mockForm()
    const view = await mountPage()
    await linesShown(view)

    await row(view, 'Barnums 3 × 3 m').get('button[aria-label="Ajouter : Barnums 3 × 3 m"]').trigger('click')

    expect(row(view, 'Barnums 3 × 3 m').get('output').text()).toBe('1')
    expect(row(view, 'Barnums 3 × 3 m').get('button[aria-label="Ajouter : Barnums 3 × 3 m"]').attributes('disabled')).toBeDefined()
    expect(readable(view.get('aside').text())).toContain('Tout est disponible sur la période.')
    expect(readable(view.get('aside').text())).toContain('Valeur du matériel 250,00 €')
  })

  it('shows a line beyond what is free, blocks the loan, and brings it back', async () => {
    /**
     * Given three marquees asked from the inventory, one free over the days
     * When the form shows
     * Then the summary tells the conflict and the loan cannot be recorded
     * Until « Ramener aux quantités libres » brings the marquees back to one
     */
    mockForm()
    const view = await mountPage('/bureau/prets/nouveau?materiel=5')
    await linesShown(view)
    // Two more than the inventory's one: as a change of days would leave them.
    await row(view, 'Tables pliantes 180 cm').get('button[aria-label="Ajouter : Tables pliantes 180 cm"]').trigger('click')
    await field(view, 'Nom de l’association').setValue('Club de football')
    expect(row(view, 'Barnums 3 × 3 m').get('output').text()).toBe('1')

    mockApi('/api/board/equipment/availability', { handler: () => apiResponse(200, availabilityOut([TABLES, availabilityItem({}, { free: 0, taken: 3 })])) })
    await field(view, 'Retour').setValue('2026-10-02')

    await vi.waitFor(() => expect(readable(view.get('aside').text())).toContain('Barnums 3 × 3 m : 1 demandé, aucun libre sur la période.'))
    expect(button(view, 'Enregistrer le prêt').attributes('disabled')).toBeDefined()
    await button(view, 'Ramener aux quantités libres').trigger('click')
    expect(view.get('aside').text()).not.toContain('Barnums 3 × 3 m')
    expect(button(view, 'Enregistrer le prêt').attributes('disabled')).toBeUndefined()
  })

  it('tells a return before the start, and reads nothing free until it is fixed', async () => {
    mockForm()
    const sent = recordRequests()
    const view = await mountPage()
    await linesShown(view)

    await field(view, 'Retour').setValue('2026-09-30')

    expect(view.text()).toContain('La date de retour est avant la date de sortie.')
    expect(view.text()).toContain('Choisissez les dates du prêt pour voir le matériel libre.')
    expect(sent.filter(request => request.url.startsWith('/api/board/equipment/availability'))).toHaveLength(1)
  })

  it('records the loan, then opens it', async () => {
    /**
     * Given the football club lending two tables
     * When the member records the loan
     * Then it is sent whole, its deposit the type's own, and its panel opens
     */
    mockForm()
    mockApi('/api/board/loans', { method: 'POST', handler: () => apiResponse(201, loanOut({ id: 33 })) })
    const sent = recordRequests()
    const view = await mountPage()
    await linesShown(view)

    await field(view, 'Nom de l’association').setValue('Club de football')
    await field(view, 'Objet du prêt').setValue('Tournoi jeunes')
    const add = row(view, 'Tables pliantes 180 cm').get('button[aria-label="Ajouter : Tables pliantes 180 cm"]')
    await add.trigger('click')
    await add.trigger('click')
    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      borrower_type: 'association',
      borrower_name: 'Club de football',
      purpose: 'Tournoi jeunes',
      phone: '',
      event: null,
      start_date: '2026-10-01',
      end_date: '2026-10-01',
      deposit_amount: '150.00',
      notes: '',
      lines: [{ equipment: 7, quantity: 2 }],
    }))
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ path: '/bureau/prets', query: { pret: '33' } }, { replace: true }))
  })

  it('places the refusals of the API under their fields and lines', async () => {
    mockForm()
    mockApi('/api/board/loans', {
      method: 'POST',
      handler: () => apiResponse(422, { detail: [
        { type: 'validation_error', loc: ['body', 'lines', 0, 'quantity'], msg: 'Tables pliantes 180 cm : 1 demandé, 0 libre sur la période.' },
        { type: 'validation_error', loc: ['body', 'phone'], msg: 'Assurez-vous que cette valeur comporte au plus 30 caractères.' },
      ] }),
    })
    const view = await mountPage()
    await linesShown(view)
    await field(view, 'Nom de l’association').setValue('Club de football')
    await row(view, 'Tables pliantes 180 cm').get('button[aria-label="Ajouter : Tables pliantes 180 cm"]').trigger('click')

    await view.get('form').trigger('submit')

    await vi.waitFor(() => expect(row(view, 'Tables pliantes 180 cm').text()).toContain('Tables pliantes 180 cm : 1 demandé, 0 libre sur la période.'))
    expect(field(view, 'Téléphone').attributes('aria-invalid')).toBe('true')
  })

  it('keeps equipment for an event, from the day before to the day after', async () => {
    /**
     * Given the form opened from Halloween, on Saturday 31 October
     * When the events come
     * Then the reservation is the committee's, for Halloween, from Friday to Sunday
     */
    mockForm()

    const view = await mountPage('/bureau/prets/nouveau?evenement=12')

    await vi.waitFor(() => expect((field(view, 'Sortie du matériel').element as HTMLInputElement).value).toBe('2026-10-30'))
    expect((field(view, 'Retour').element as HTMLInputElement).value).toBe('2026-11-01')
    expect((field(view, 'Événement du comité').element as HTMLSelectElement).value).toBe('12')
    expect(view.get('aside').text()).toContain('Halloween des enfants')
  })
})
