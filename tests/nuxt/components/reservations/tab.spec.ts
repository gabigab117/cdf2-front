import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ReservationsTab from '~/components/reservations/Tab.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardEvent, page } from '../../helpers/events'
import { boardReservation, reservationStats } from '../../helpers/reservations'

const { refreshNuxtDataMock } = vi.hoisted(() => ({ refreshNuxtDataMock: vi.fn() }))
// The count of the tab is the page's: the tab only asks for it again.
mockNuxtImport('refreshNuxtData', () => refreshNuxtDataMock)

const STATS = '/api/board/events/{event_id}/reservations/stats'
const RESERVATIONS = '/api/board/events/{event_id}/reservations'
const RESERVATION = '/api/board/reservations/{reservation_id}'

function mountTab(currentPage = 1) {
  return mountSuspended(ReservationsTab, { props: { event: boardEvent(), page: currentPage }, attachTo: document.body })
}

type Mounted = Awaited<ReturnType<typeof mountTab>>

function button(wrapper: Mounted, name: string) {
  return wrapper.findAll('button').find(element => element.text() === name || element.attributes('aria-label') === name)
}

function serve({ stats = reservationStats(), reservations = [boardReservation(), boardReservation({ id: 92, name: 'Famille Petit', note: '', lines: [{ ticket_type: 82, quantity: 1 }], seats: 1 })], count = 2 } = {}) {
  const counted = vi.fn(() => apiResponse(200, stats))
  const listed = vi.fn(() => apiResponse(200, page(reservations, count)))
  mockApi(STATS, { handler: counted }, { event_id: 12 })
  mockApi(RESERVATIONS, { handler: listed }, { event_id: 12 })
  return { counted, listed }
}

function readable(text: string): string {
  return text.replaceAll(' ', ' ').replace(/\s+/g, ' ').trim()
}

describe('the « Réservations » tab', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    refreshNuxtDataMock.mockReset()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('shows the figures of the API, and the places by type in a bar', async () => {
    serve()

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))
    expect(tab.findAll('.grid-cols-kpis > *').map(card => readable(card.text()))).toEqual([
      'Réservations2', 'Places réservées7 / 80', 'Restantes73',
    ])
    expect(tab.get('[role="img"]').attributes('aria-label')).toBe('Places réservées : 2 Menu adulte, 5 Menu enfant, sur 80')
  })

  it('counts the places alone without a capacity', async () => {
    serve({ stats: reservationStats({ capacity: null, remaining: null }) })

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.findAll('.grid-cols-kpis > *')).toHaveLength(2))
    expect(readable(tab.findAll('.grid-cols-kpis > *')[1]!.text())).toBe('Places réservées7')
    expect(tab.get('[role="img"]').attributes('aria-label')).toContain('sur 7')
  })

  it('lists the reservations, a column per type, with the totals of the API', async () => {
    serve()

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))
    expect(tab.findAll('thead th').map(cell => cell.text())).toEqual(['Nom', 'Remarque', 'Saisie le', 'Menu adulte', 'Menu enfant', 'Total', 'Actions'])
    expect(tab.findAll('tbody tr')[0]!.findAll('th, td').map(cell => readable(cell.text())).slice(0, 6)).toEqual([
      'Famille Martin', 'Table 4', '03/10/2026 · 9 h 30', '2', '4', '6',
    ])
    expect(tab.findAll('tfoot th, tfoot td').map(cell => cell.text())).toEqual(['Total', '', '', '2', '5', '7', ''])
  })

  it('says when no type of place opens the reservations yet', async () => {
    serve({ stats: reservationStats({ ticket_types: [], reservations: 0, seats: 0, remaining: 80 }), reservations: [], count: 0 })

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.text()).toContain('Créez d’abord un type de place pour saisir des réservations.'))
    expect(tab.text()).toContain('Aucun type de place. Créez-en un pour ouvrir les réservations.')
    expect(tab.text()).toContain('Aucune réservation enregistrée pour le moment.')
    expect(tab.find('[role="img"]').exists()).toBe(false)
  })

  it('records a reservation, its types without places left out, then fetches every figure again', async () => {
    /**
     * Given a meal with two menus
     * When the board records 3 children for the Petit family
     * Then the API receives the children's line alone
     * And the figures, the table and the count of the tab are fetched again
     */
    const { counted, listed } = serve()
    mockApi(RESERVATIONS, { method: 'POST', handler: () => apiResponse(201, boardReservation()) }, { event_id: 12 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(listed).toHaveBeenCalledOnce())

    const form = tab.findAll('form').find(candidate => candidate.text().includes('Enregistrer la réservation'))!
    await form.get('input[placeholder="Nom de la personne"]').setValue('Famille Petit')
    for (let click = 0; click < 3; click += 1) await form.get('button[aria-label="Ajouter : Menu enfant"]').trigger('click')
    await form.trigger('submit')

    await vi.waitFor(() => expect(listed).toHaveBeenCalledTimes(2))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      name: 'Famille Petit', note: '', lines: [{ ticket_type: 82, quantity: 3 }],
    })
    expect(counted).toHaveBeenCalledTimes(2)
    expect(refreshNuxtDataMock).toHaveBeenCalledWith('board:event:12:dashboard')
  })

  it('shows why a reservation was refused: the capacity, and a line under its type\'s name', async () => {
    serve()
    mockApi(RESERVATIONS, { method: 'POST', handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body'], msg: 'Capacité dépassée : il ne reste que 2 places sur 80.' },
      { type: 'validation_error', loc: ['body', 'lines', 0, 'quantity'], msg: 'Assurez-vous que cette valeur est supérieure ou égale à 1.' },
    ] }) }, { event_id: 12 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))

    const form = tab.findAll('form').find(candidate => candidate.text().includes('Enregistrer la réservation'))!
    await form.get('input[placeholder="Nom de la personne"]').setValue('Famille Petit')
    await form.get('button[aria-label="Ajouter : Menu enfant"]').trigger('click')
    await form.trigger('submit')

    await vi.waitFor(() => expect(form.find('[role="alert"]').exists()).toBe(true))
    expect(form.get('[role="alert"]').findAll('p').map(message => message.text())).toEqual([
      'Capacité dépassée : il ne reste que 2 places sur 80.',
      'Menu enfant : Assurez-vous que cette valeur est supérieure ou égale à 1.',
    ])
  })

  it('rewrites a reservation in its row, and deletes another once asked', async () => {
    const { listed } = serve()
    mockApi(RESERVATION, { method: 'PUT', handler: () => apiResponse(200, boardReservation()) }, { reservation_id: 91 })
    mockApi(RESERVATION, { method: 'DELETE', handler: () => new Response(null, { status: 204 }) }, { reservation_id: 92 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))

    await button(tab, 'Modifier la réservation de Famille Martin')!.trigger('click')
    const row = tab.get('tbody td[colspan]')
    await row.get('button[aria-label="Retirer : Menu adulte"]').trigger('click')
    await row.get('form').trigger('submit')
    await vi.waitFor(() => expect(listed).toHaveBeenCalledTimes(2))
    await button(tab, 'Supprimer la réservation de Famille Petit')!.trigger('click')
    expect(tab.text()).toContain('Supprimer la réservation de « Famille Petit » ?')
    await button(tab, 'Supprimer définitivement')!.trigger('click')
    await vi.waitFor(() => expect(listed).toHaveBeenCalledTimes(3))

    expect(sent.filter(request => request.method !== 'GET').map(request => [request.method, request.url, request.body])).toEqual([
      ['PUT', '/api/board/reservations/91', { name: 'Famille Martin', note: 'Table 4', lines: [{ ticket_type: 81, quantity: 1 }, { ticket_type: 82, quantity: 4 }] }],
      ['DELETE', '/api/board/reservations/92', undefined],
    ])
  })

  it('sets the capacity, adds a type of place, and keeps a type in use with the reason', async () => {
    const { counted } = serve()
    mockApi('/api/board/events/{event_id}/capacity', { method: 'PUT', handler: () => apiResponse(200, reservationStats()) }, { event_id: 12 })
    mockApi('/api/board/events/{event_id}/ticket-types', { method: 'POST', handler: () => apiResponse(201, { id: 83, name: 'Assiette' }) }, { event_id: 12 })
    mockApi('/api/board/ticket-types/{ticket_type_id}', { method: 'DELETE', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body'], msg: 'Impossible de supprimer « Menu enfant » : des réservations l’utilisent.' }],
    }) }, { ticket_type_id: 82 })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))

    await tab.get('input[type="number"]').setValue('')
    await tab.get('input[type="number"]').element.closest('form')!.dispatchEvent(new Event('submit'))
    await vi.waitFor(() => expect(tab.text()).toContain('Capacité enregistrée.'))
    await tab.get('input[aria-label="Nom du type de place"]').setValue('Assiette')
    await tab.get('input[aria-label="Nom du type de place"]').element.closest('form')!.dispatchEvent(new Event('submit'))
    await vi.waitFor(() => expect(counted).toHaveBeenCalledTimes(3))
    await button(tab, 'Supprimer le type de place Menu enfant')!.trigger('click')
    await button(tab, 'Supprimer définitivement')!.trigger('click')

    await vi.waitFor(() => expect(tab.text()).toContain('Impossible de supprimer « Menu enfant » : des réservations l’utilisent.'))
    expect(sent.filter(request => request.method !== 'GET').map(request => [request.method, request.body])).toEqual([
      ['PUT', { capacity: null }],
      ['POST', { name: 'Assiette' }],
      ['DELETE', undefined],
    ])
  })

  it('shows why a type or a capacity was refused', async () => {
    serve()
    mockApi('/api/board/events/{event_id}/capacity', { method: 'PUT', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body', 'capacity'], msg: 'Assurez-vous que cette valeur est supérieure ou égale à 1.' }],
    }) }, { event_id: 12 })
    mockApi('/api/board/events/{event_id}/ticket-types', { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body'], msg: 'Ce type de place existe déjà pour cet événement.' }],
    }) }, { event_id: 12 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))

    await tab.get('input[type="number"]').setValue('0')
    await tab.get('input[type="number"]').element.closest('form')!.dispatchEvent(new Event('submit'))
    await tab.get('input[aria-label="Nom du type de place"]').setValue('menu adulte')
    await tab.get('input[aria-label="Nom du type de place"]').element.closest('form')!.dispatchEvent(new Event('submit'))

    await vi.waitFor(() => expect(tab.text()).toContain('Ce type de place existe déjà pour cet événement.'))
    expect(tab.text()).toContain('Assurez-vous que cette valeur est supérieure ou égale à 1.')
    expect(tab.get('input[type="number"]').attributes('aria-invalid')).toBe('true')
  })

  it('downloads the reservations as an Excel file named after the event', async () => {
    serve()
    mockApi('/api/board/events/{event_id}/reservations.xlsx', {
      handler: () => new Response('xlsx', { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }),
    }, { event_id: 12 })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost:3000/export')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const downloads: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))

    await button(tab, 'Exporter (Excel)')!.trigger('click')

    await vi.waitFor(() => expect(downloads).toEqual(['reservations-halloween-des-enfants-2026.xlsx']))
  })

  it('says why the export failed', async () => {
    serve()
    mockApi('/api/board/events/{event_id}/reservations.xlsx', { handler: () => apiResponse(502, 'Bad Gateway') }, { event_id: 12 })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.findAll('table tbody tr')).toHaveLength(2))

    await button(tab, 'Exporter (Excel)')!.trigger('click')

    await vi.waitFor(() => expect(tab.text()).toContain('Le service est momentanément indisponible.'))
  })

  it('says why the figures could not load, and leads from a page of reservations to the next', async () => {
    const { counted } = serve({ count: 30 })
    counted.mockImplementationOnce(() => apiResponse(503, 'Service Unavailable'))
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.find('[role="alert"]').exists()).toBe(true))

    await tab.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(tab.find('nav[aria-label="Pagination"] a').exists()).toBe(true))
    expect(tab.get('nav[aria-label="Pagination"] a').attributes('href')).toContain('onglet=reservations&page=2')
  })
})
