import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsPage from '~/pages/board/documents/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { boardDocument, documentItem } from '../../../helpers/documents'
import { eventItem, julie, page } from '../../../helpers/events'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const COUNTS = { total: 3, invoice: 2, order: 1, minutes: 0, misc: 0 }

function readable(text: string): string {
  return text.replaceAll(' ', ' ').replaceAll(' ', ' ')
}

function mockList(items = [documentItem(), documentItem({ id: 22, title: 'Bon de commande — Bonbons', category: 'order', status: 'validated', event: null, amount: '214.60', date: '2026-09-25' })]) {
  mockApi('/api/board/documents', { method: 'GET', handler: () => apiResponse(200, page(items)) })
  mockApi('/api/board/documents/counts', { handler: () => apiResponse(200, COUNTS) })
}

function mountPage(route = '/bureau/documents') {
  // The « Importer » button goes to the top bar, which the page alone lacks.
  return mountSuspended(DocumentsPage, { route, attachTo: document.body, global: { stubs: { teleport: true } } })
}

describe('the Documents page', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-01T10:00:00+02:00')
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
    mockApi('/api/board/members', { handler: () => apiResponse(200, page([julie])) })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    vi.useRealTimers()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('lists the documents with their category, review, event, amount and date', async () => {
    /**
     * Given an invoice of Halloween to review and an order of no event, validated
     * When the page shows
     * Then each row reads its title, category, the invoice « À vérifier », its
     * event or « Fonctionnement », its amount and date, and leads to its panel
     */
    mockList()

    const documents = await mountPage()

    await vi.waitFor(() => expect(documents.findAll('ul li')).toHaveLength(2))
    const [invoice, order] = documents.findAll('ul li')
    // The date shows twice: under the amount on a phone, in its column on a computer.
    expect(readable(invoice!.text())).toBe('Facture — Location sonoFacture À vérifier Halloween des enfants380,00 €28 sept.28 sept.')
    expect(readable(order!.text())).toBe('Bon de commande — BonbonsCommandeFonctionnement214,60 €25 sept.25 sept.')
    expect(invoice!.get('a').attributes('href')).toBe('/bureau/documents?document=21')
    expect(documents.get('h1').text()).toBe('Documents')
  })

  it('counts each category on its chip, which filters the list', async () => {
    mockList()

    const documents = await mountPage('/bureau/documents?recherche=sono')

    await vi.waitFor(() => expect(documents.get('nav[aria-label="Catégories"]').text()).toContain('Factures2'))
    const chips = documents.get('nav[aria-label="Catégories"]').findAll('a')
    expect(chips.map(chip => chip.text())).toEqual(['Tous3', 'Factures2', 'Commandes1', 'Comptes rendus0', 'Divers0'])
    expect(chips[1]!.attributes('href')).toBe('/bureau/documents?categorie=factures&recherche=sono')
    expect(chips[0]!.attributes('aria-current')).toBe('page')
  })

  it('asks the API for the category, status, search and page of its address', async () => {
    mockList()
    const sent = recordRequests()

    await mountPage('/bureau/documents?categorie=factures&statut=a-verifier&recherche=sono&page=2')

    await vi.waitFor(() => expect(sent.map(request => request.url)).toEqual(expect.arrayContaining([
      '/api/board/documents?category=invoice&status=to_review&search=sono&page=2&page_size=25',
      '/api/board/documents/counts?status=to_review&search=sono',
    ])))
  })

  it('lets go of the review filter with its chip', async () => {
    mockList()

    const documents = await mountPage('/bureau/documents?statut=a-verifier')

    const chip = documents.get('nav[aria-label="Catégories"]').findAll('a').at(-1)!
    expect(chip.text()).toContain('À vérifier')
    expect(chip.attributes('href')).toBe('/bureau/documents')
  })

  it('searches once the typing pauses', async () => {
    mockList()
    const documents = await mountPage()
    vi.useFakeTimers()

    await documents.get('input[type="search"]').setValue('sono')
    expect(navigateToMock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)

    expect(navigateToMock).toHaveBeenCalledWith({ query: expect.objectContaining({ recherche: 'sono', page: undefined }) }, { replace: true })
  })

  it('says when no document answers, or when there is none yet', async () => {
    mockList([])

    const searched = await mountPage('/bureau/documents?recherche=inconnu')
    await vi.waitFor(() => expect(searched.text()).toContain('Aucun document ne correspond à cette recherche.'))
    searched.unmount()
    clearNuxtData()

    const empty = await mountPage()
    await vi.waitFor(() => expect(empty.text()).toContain('Aucun document pour l’instant.'))
  })

  it('opens the panel of the document its address names', async () => {
    mockList()
    mockApi('/api/board/documents/{document_id}', { method: 'GET', handler: () => apiResponse(200, boardDocument()) }, { document_id: 21 })

    const documents = await mountPage('/bureau/documents?document=21')

    await vi.waitFor(() => expect(documents.find('aside h2').exists()).toBe(true))
    expect(documents.get('aside h2').text()).toBe('Facture — Location sono')
    expect(documents.get('ul li a').attributes('aria-current')).toBe('true')
  })

  it('opens the document just deposited on its form', async () => {
    /**
     * Given a file deposited from the page
     * Then the page opens the panel of the new document, on its form
     */
    mockList()
    mockApi('/api/board/documents', { method: 'POST', handler: () => apiResponse(201, boardDocument({ id: 23 })) })
    const documents = await mountPage()
    await documents.get('.border-dashed').trigger('drop', { dataTransfer: { files: [new File(['%PDF-1.4'], 'facture.pdf')] } })

    await documents.findAll('select')[0]!.setValue('invoice')
    await documents.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: expect.objectContaining({ document: '23' }) }))
  })

  it('says why the documents could not load, and loads them again on demand', async () => {
    const handler = vi.fn(() => apiResponse(500, 'Internal Server Error'))
    mockApi('/api/board/documents', { method: 'GET', handler })
    mockApi('/api/board/documents/counts', { handler: () => apiResponse(200, COUNTS) })
    const documents = await mountPage()

    await vi.waitFor(() => expect(documents.text()).toContain('Le service est momentanément indisponible.'))
    handler.mockImplementation(() => apiResponse(200, page([documentItem()])))
    await documents.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(documents.findAll('ul li')).toHaveLength(1))
  })
})
