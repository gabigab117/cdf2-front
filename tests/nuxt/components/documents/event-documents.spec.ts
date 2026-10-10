import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsEventTab from '~/components/documents/EventTab.vue'
import DocumentsRelatedBlock from '~/components/documents/RelatedBlock.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { documentItem } from '../../helpers/documents'
import { boardEvent, page } from '../../helpers/events'

const DASHBOARD = '/api/board/events/{event_id}/dashboard'

function mockDashboard(documents = [documentItem()], count = documents.length) {
  mockApi(DASHBOARD, { handler: () => apiResponse(200, {
    notes_count: 0, tasks_done: 0, tasks_total: 0, next_tasks: [], recently_done_tasks: [],
    assigned_count: 0, required_count: 0, reserved_seats: 0, capacity: null,
    documents_count: count, documents, equipment_count: 0, committee_loan: null,
  }) }, { event_id: 12 })
}

describe('the documents of an event', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('lists the event\'s documents in its tab, each leading to its panel, and deposits one for it', async () => {
    /**
     * Given an invoice of the event
     * When its « Documents » tab shows
     * Then the invoice leads to its panel in the Documents page, without an event column,
     * and a new document is deposited for the event
     */
    const sent = recordRequests()
    mockApi('/api/board/documents', { handler: () => apiResponse(200, page([documentItem()])) })

    const tab = await mountSuspended(DocumentsEventTab, { props: { event: boardEvent(), page: 1 } })

    await vi.waitFor(() => expect(tab.findAll('ul li')).toHaveLength(1))
    expect(sent.map(request => request.url)).toContain('/api/board/documents?event=12&page=1&page_size=25')
    expect(tab.get('ul li a').attributes('href')).toBe('/bureau/documents?document=21')
    expect(tab.text()).not.toContain('Halloween des enfants')
    expect(tab.get('a').attributes('href')).toBe('/bureau/documents/nouveau?evenement=12')
  })

  it('says when the event has no document', async () => {
    mockApi('/api/board/documents', { handler: () => apiResponse(200, page([])) })

    const tab = await mountSuspended(DocumentsEventTab, { props: { event: boardEvent(), page: 1 } })

    await vi.waitFor(() => expect(tab.text()).toContain('Aucun document pour cet événement.'))
  })

  it('shows the latest documents beside the notes, with their category, then leads to them all', async () => {
    mockDashboard([documentItem(), documentItem({ id: 22, title: 'Compte rendu — 24 sept.', category: 'minutes' })], 6)

    const block = await mountSuspended(DocumentsRelatedBlock, { props: { eventId: 12 } })

    await vi.waitFor(() => expect(block.findAll('li')).toHaveLength(2))
    expect(block.findAll('li a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Facture — Location sonoFacture', '/bureau/documents?document=21'],
      ['Compte rendu — 24 sept.Compte rendu', '/bureau/documents?document=22'],
    ])
    expect(block.get('div a').text()).toBe('Voir les 6 documents')
  })

  it('leads to the deposit of a first document', async () => {
    mockDashboard([], 0)

    const block = await mountSuspended(DocumentsRelatedBlock, { props: { eventId: 12 } })

    await vi.waitFor(() => expect(block.text()).toContain('Aucun document pour l’instant.'))
    expect(block.get('div a').text()).toBe('Déposer un document')
    expect(block.get('div a').attributes('href')).toBe('/bureau/documents/nouveau?evenement=12')
  })
})
