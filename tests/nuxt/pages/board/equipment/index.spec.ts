import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EquipmentPage from '~/pages/board/equipment/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { availabilityItem, equipmentOut, inventoryOut, loanBrief } from '../../../helpers/equipment'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const MARQUEES = availabilityItem({}, { taken: 2, free: 1 })
const TABLES = availabilityItem(
  { id: 7, name: 'Tables pliantes 180 cm', category: 'furniture', storage_location: 'Local du comité · rack A', total_quantity: 24, repair_quantity: 0, unit_value: null, repair_note: '' },
  { free: 24 },
)

function mockInventory(items = [TABLES, MARQUEES]) {
  mockApi('/api/board/equipment', { method: 'GET', handler: () => apiResponse(200, inventoryOut(items)) })
}

function mockOccupancy(loans = [
  { loan: loanBrief(), quantity: 2 },
  { loan: loanBrief({ id: 31, number: null, display_name: 'Halloween des enfants', purpose: '', borrower_type: 'committee', state: 'committee', start_date: '2026-10-30', end_date: '2026-11-01' }), quantity: 2 },
]) {
  mockApi('/api/board/equipment/{equipment_id}/occupancy', {
    handler: () => apiResponse(200, { start: '2026-09-28', end: '2026-12-13', loans }),
  }, { equipment_id: 5 })
}

function readable(text: string): string {
  return text.replaceAll('\u202F', ' ').replaceAll('\u00A0', ' ')
}

function mountPage(route = '/bureau/materiel') {
  return mountSuspended(EquipmentPage, { route, attachTo: document.body })
}

// The panel shows once the inventory it reads has come.
async function panelOf(page: Awaited<ReturnType<typeof mountPage>>) {
  await vi.waitFor(() => expect(page.find('aside').exists()).toBe(true))
  return page.get('aside')
}

describe('the Matériel page', () => {
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

  it('lists the equipment with what is taken, under repair and free today', async () => {
    /**
     * Given tables, none taken, and marquees, two out and one under repair
     * When the page shows
     * Then each row reads its name, place, total, out, repair and free, and
     * leads to its panel, under the figures of the inventory
     */
    mockInventory()

    const page = await mountPage()

    await vi.waitFor(() => expect(page.findAll('ul.divide-y li')).toHaveLength(2))
    const [tables, marquees] = page.findAll('ul.divide-y li')
    expect(tables!.text()).toBe('Tables pliantes 180 cmLocal du comité · rack A24——24 sur 24')
    expect(marquees!.text()).toBe('Barnums 3 × 3 mGarage communal4211 sur 4')
    expect(marquees!.get('a').attributes('href')).toBe('/bureau/materiel?materiel=5')
    expect(marquees!.get('[role="img"]').attributes('aria-label')).toBe('Barnums 3 × 3 m : 1 disponible, 2 sortis, 1 en réparation, sur 4')
    expect(page.get('h1').text()).toBe('Matériel')
    expect(page.text()).toContain('2 références · 1 en partie prêtée aujourd’hui · 1 pièce en réparation')
  })

  it('counts each category on its chip, which shows its equipment alone', async () => {
    mockInventory()

    const page = await mountPage('/bureau/materiel?categorie=barnums')

    await vi.waitFor(() => expect(page.findAll('ul.divide-y li')).toHaveLength(1))
    const chips = page.get('nav[aria-label="Catégories"]').findAll('a')
    expect(chips.map(chip => chip.text())).toEqual(['Tout2', 'Mobilier1', 'Barnums1', 'Son et lumière0', 'Cuisine0', 'Voirie et jeux0'])
    expect(chips[1]!.attributes('href')).toBe('/bureau/materiel?categorie=mobilier')
    expect(chips[2]!.attributes('aria-current')).toBe('page')
    expect(page.get('ul.divide-y').text()).toContain('Barnums 3 × 3 m')
  })

  it('says when the inventory, or a category, holds nothing', async () => {
    mockInventory([])

    const empty = await mountPage()
    await vi.waitFor(() => expect(empty.text()).toContain('Aucun matériel dans l’inventaire pour l’instant.'))
    empty.unmount()

    const category = await mountPage('/bureau/materiel?categorie=cuisine')
    await vi.waitFor(() => expect(category.text()).toContain('Aucun matériel dans cette catégorie.'))
  })

  it('offers to try again when the inventory cannot be read', async () => {
    mockApi('/api/board/equipment', { method: 'GET', handler: () => apiResponse(500, {}) })

    const page = await mountPage()

    await vi.waitFor(() => expect(page.text()).toContain('Réessayer'))
  })

  it('shows an equipment’s panel: its pieces, place, value, repair and loans to come', async () => {
    /**
     * Given the marquees selected, lent to the football club and kept for Halloween
     * When their panel shows
     * Then it reads their pieces, place, value and repair note, then their
     * occupancy until mid-December, a bar a loan
     */
    mockInventory()
    mockOccupancy()

    const page = await mountPage('/bureau/materiel?materiel=5')

    const panel = await panelOf(page)
    expect(panel.attributes('aria-label')).toBe('Barnums 3 × 3 m')
    await vi.waitFor(() => expect(panel.text()).toContain('Occupation jusqu’au 13 déc.'))
    expect(panel.findAll('dl')[0]!.text()).toBe('Total4Disponible1Réparation1')
    expect(readable(panel.findAll('dl')[1]!.text())).toBe('Rangement Garage communal Valeur de remplacement 250,00 € l’unité')
    expect(panel.text()).toContain('Toile déchirée sur un côté.')
    expect(panel.text()).toContain('2 sorties prévues')
    const loans = panel.findAll('ul[aria-label="Prêts et réservations"] li')
    expect(loans.map(loan => loan.text())).toEqual([
      'Club de football× 2du ven. 16 au dim. 18 oct.',
      'Halloween des enfants× 2du ven. 30 oct. au dim. 1er nov. · usage comité',
    ])
  })

  it('says when no loan takes the equipment', async () => {
    mockInventory()
    mockOccupancy([])

    const page = await mountPage('/bureau/materiel?materiel=5')

    await vi.waitFor(() => expect(page.text()).toContain('Aucun prêt ni réservation sur la période.'))
  })

  it('puts pieces back in service', async () => {
    /**
     * Given the marquees' panel, one piece under repair
     * When a member changes them to none under repair, and saves
     * Then the whole equipment is sent, and the inventory read again
     */
    mockInventory()
    mockOccupancy()
    mockApi('/api/board/equipment/{equipment_id}', { method: 'PUT', handler: () => apiResponse(200, equipmentOut({ repair_quantity: 0 })) }, { equipment_id: 5 })
    const sent = recordRequests()
    const page = await mountPage('/bureau/materiel?materiel=5')

    await (await panelOf(page)).get('footer button').trigger('click')
    const fields = page.findAll('aside input')
    await fields[3]!.setValue('0')
    await page.get('aside form').trigger('submit')

    await vi.waitFor(() => expect(sent.filter(request => request.method === 'PUT')).toEqual([{
      method: 'PUT',
      url: '/api/board/equipment/5',
      body: {
        name: 'Barnums 3 × 3 m',
        category: 'marquees',
        storage_location: 'Garage communal',
        total_quantity: 4,
        repair_quantity: 0,
        unit_value: '250.00',
        repair_note: 'Toile déchirée sur un côté.',
      },
    }]))
    await vi.waitFor(() => expect(sent.filter(request => request.url === '/api/board/equipment')).toHaveLength(2))
  })

  it('places the refusal of a change under its field', async () => {
    mockInventory()
    mockOccupancy()
    const refusal = 'Impossible : les prêts en prennent 3 le 16/10/2026 (P-2026-020, Club de football), il n’en resterait que 2. Modifiez d’abord ce prêt.'
    mockApi('/api/board/equipment/{equipment_id}', {
      method: 'PUT',
      handler: () => apiResponse(422, { detail: [{ type: 'validation_error', loc: ['body', 'repair_quantity'], msg: refusal }] }),
    }, { equipment_id: 5 })
    const page = await mountPage('/bureau/materiel?materiel=5')

    await (await panelOf(page)).get('footer button').trigger('click')
    await page.get('aside form').trigger('submit')

    await vi.waitFor(() => expect(page.get('aside form').text()).toContain(refusal))
    expect(page.findAll('aside input')[3]!.attributes('aria-invalid')).toBe('true')
  })

  it('deletes an equipment once the member confirms', async () => {
    mockInventory()
    mockOccupancy()
    mockApi('/api/board/equipment/{equipment_id}', { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { equipment_id: 5 })
    const sent = recordRequests()
    const page = await mountPage('/bureau/materiel?materiel=5')

    await (await panelOf(page)).get('footer button').trigger('click')
    const remove = page.findAll('aside form button').find(button => button.text() === 'Supprimer')!
    await remove.trigger('click')
    expect(page.text()).toContain('Supprimer « Barnums 3 × 3 m » de l’inventaire ?')
    await page.findAll('aside form button').find(button => button.text() === 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(sent.some(request => request.method === 'DELETE')).toBe(true))
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: { materiel: undefined, categorie: undefined } }))
  })

  it('adds an equipment in the category chosen, then opens its panel', async () => {
    /**
     * Given the furniture chosen, and the form of a new equipment
     * When a member names the mange-debout, counts six, and saves
     * Then the equipment is sent in that category, and its panel opens
     */
    mockInventory()
    mockApi('/api/board/equipment', {
      method: 'POST',
      handler: () => apiResponse(201, equipmentOut({ id: 9, name: 'Mange-debout', category: 'furniture', total_quantity: 6, repair_quantity: 0 })),
    })
    const sent = recordRequests()
    const page = await mountPage('/bureau/materiel?materiel=nouveau&categorie=mobilier')

    const panel = page.get('aside[aria-label="Ajouter du matériel"]')
    const fields = panel.findAll('input')
    await fields[0]!.setValue('Mange-debout')
    await fields[2]!.setValue('6')
    await panel.get('form').trigger('submit')

    await vi.waitFor(() => expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      name: 'Mange-debout',
      category: 'furniture',
      storage_location: '',
      total_quantity: 6,
      repair_quantity: 0,
      unit_value: null,
      repair_note: '',
    }))
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: { materiel: '9', categorie: 'mobilier' } }))
  })
})
