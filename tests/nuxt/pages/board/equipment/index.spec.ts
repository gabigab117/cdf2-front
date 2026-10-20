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
  { id: 7, name: 'Tables pliantes 180 cm', total_quantity: 24, repair_quantity: 0, repair_note: '' },
  { free: 24 },
)

function mockInventory(items = [MARQUEES, TABLES]) {
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

function mountPage(route = '/bureau/materiel') {
  // « Nouveau prêt » goes to the top bar, which the page alone lacks.
  return mountSuspended(EquipmentPage, { route, attachTo: document.body, global: { stubs: { teleport: true } } })
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
     * Then each row reads its name, total, out, repair and free, and leads to
     * its panel, under the figures of the inventory
     */
    mockInventory()

    const page = await mountPage()

    await vi.waitFor(() => expect(page.findAll('ul.divide-y li')).toHaveLength(2))
    const [marquees, tables] = page.findAll('ul.divide-y li')
    expect(marquees!.text()).toBe('Barnums 3 × 3 m4211 sur 4')
    expect(tables!.text()).toBe('Tables pliantes 180 cm24——24 sur 24')
    expect(marquees!.get('a').attributes('href')).toBe('/bureau/materiel?materiel=5')
    expect(marquees!.get('[role="img"]').attributes('aria-label')).toBe('Barnums 3 × 3 m : 1 disponible, 2 sortis, 1 en réparation, sur 4')
    expect(page.get('h1').text()).toBe('Matériel')
    expect(page.findAll('a').find(link => link.text() === 'Nouveau prêt')?.attributes('href')).toBe('/bureau/prets/nouveau')
    expect(page.findAll('a').find(link => link.text() === 'Planning des prêts')?.attributes('href')).toBe('/bureau/prets#planning')
    expect(page.text()).toContain('2 références · 1 en partie prêtée aujourd’hui · 1 pièce en réparation')
  })

  it('says when the inventory holds nothing', async () => {
    mockInventory([])

    const page = await mountPage()

    await vi.waitFor(() => expect(page.text()).toContain('Aucun matériel dans l’inventaire pour l’instant.'))
  })

  it('offers to try again when the inventory cannot be read', async () => {
    mockApi('/api/board/equipment', { method: 'GET', handler: () => apiResponse(500, {}) })

    const page = await mountPage()

    await vi.waitFor(() => expect(page.text()).toContain('Réessayer'))
  })

  it('shows an equipment’s panel: its pieces, repair and loans to come', async () => {
    /**
     * Given the marquees selected, lent to the football club and kept for Halloween
     * When their panel shows
     * Then it reads their pieces and repair note, then their occupancy until
     * mid-December, a bar a loan
     */
    mockInventory()
    mockOccupancy()

    const page = await mountPage('/bureau/materiel?materiel=5')

    const panel = await panelOf(page)
    expect(panel.attributes('aria-label')).toBe('Barnums 3 × 3 m')
    await vi.waitFor(() => expect(panel.text()).toContain('Occupation jusqu’au 13 déc.'))
    expect(panel.findAll('dl').map(list => list.text())).toEqual(['Total4Disponible1Réparation1'])
    expect(panel.text()).toContain('Toile déchirée sur un côté.')
    expect(panel.text()).toContain('2 sorties prévues')
    expect(panel.findAll('a').find(link => link.text() === 'Prêter ce matériel')?.attributes('href')).toBe('/bureau/prets/nouveau?materiel=5')
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

    await (await panelOf(page)).findAll('footer button').find(button => button.text() === 'Modifier')!.trigger('click')
    const fields = page.findAll('aside input')
    await fields[2]!.setValue('0')
    await page.get('aside form').trigger('submit')

    await vi.waitFor(() => expect(sent.filter(request => request.method === 'PUT')).toEqual([{
      method: 'PUT',
      url: '/api/board/equipment/5',
      body: {
        name: 'Barnums 3 × 3 m',
        total_quantity: 4,
        repair_quantity: 0,
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

    await (await panelOf(page)).findAll('footer button').find(button => button.text() === 'Modifier')!.trigger('click')
    await page.get('aside form').trigger('submit')

    await vi.waitFor(() => expect(page.get('aside form').text()).toContain(refusal))
    expect(page.findAll('aside input')[2]!.attributes('aria-invalid')).toBe('true')
  })

  it('shows a refusal of the whole change above the form, and takes the focus to it', async () => {
    mockInventory()
    mockOccupancy()
    mockApi('/api/board/equipment/{equipment_id}', {
      method: 'PUT',
      handler: () => apiResponse(404, { detail: 'Ce matériel n’existe plus.' }),
    }, { equipment_id: 5 })
    const page = await mountPage('/bureau/materiel?materiel=5')

    await (await panelOf(page)).findAll('footer button').find(button => button.text() === 'Modifier')!.trigger('click')
    await page.get('aside form').trigger('submit')

    await vi.waitFor(() => expect(page.get('aside form [role="alert"]').text()).toBe('Ce matériel n’existe plus.'))
    expect(document.activeElement).toBe(page.get('aside form [role="alert"]').element)
  })

  it('deletes an equipment once the member confirms', async () => {
    mockInventory()
    mockOccupancy()
    mockApi('/api/board/equipment/{equipment_id}', { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { equipment_id: 5 })
    const sent = recordRequests()
    const page = await mountPage('/bureau/materiel?materiel=5')

    await (await panelOf(page)).findAll('footer button').find(button => button.text() === 'Modifier')!.trigger('click')
    const remove = page.findAll('aside form button').find(button => button.text() === 'Supprimer')!
    await remove.trigger('click')
    expect(page.text()).toContain('Supprimer « Barnums 3 × 3 m » de l’inventaire ?')
    await page.findAll('aside form button').find(button => button.text() === 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(sent.some(request => request.method === 'DELETE')).toBe(true))
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: { materiel: undefined } }))
  })

  it('adds an equipment, then opens its panel', async () => {
    /**
     * Given the form of a new equipment
     * When a member names the mange-debout, counts six, and saves
     * Then the equipment is sent, and its panel opens
     */
    mockInventory()
    mockApi('/api/board/equipment', {
      method: 'POST',
      handler: () => apiResponse(201, equipmentOut({ id: 9, name: 'Mange-debout', total_quantity: 6, repair_quantity: 0 })),
    })
    const sent = recordRequests()
    const page = await mountPage('/bureau/materiel?materiel=nouveau')

    const panel = page.get('aside[aria-label="Ajouter du matériel"]')
    const fields = panel.findAll('input')
    await fields[0]!.setValue('Mange-debout')
    await fields[1]!.setValue('6')
    await panel.get('form').trigger('submit')

    await vi.waitFor(() => expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      name: 'Mange-debout',
      total_quantity: 6,
      repair_quantity: 0,
      repair_note: '',
    }))
    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: { materiel: '9' } }))
  })
})
