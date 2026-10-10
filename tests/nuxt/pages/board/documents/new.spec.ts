import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NewDocumentPage from '~/pages/board/documents/new.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { boardDocument } from '../../../helpers/documents'
import { eventItem, page } from '../../../helpers/events'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

describe('the page of a new document', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  enableAutoUnmount(afterEach)

  it('deposits a document for the event it comes from, then opens it', async () => {
    /**
     * Given the page opened from Halloween's tab
     * When a member deposits a file, an invoice
     * Then the document belongs to Halloween, and opens in the Documents page
     */
    mockApi('/api/board/documents', { method: 'POST', handler: () => apiResponse(201, boardDocument({ id: 23 })) })
    const sent = recordRequests()
    const newDocument = await mountSuspended(NewDocumentPage, { route: '/bureau/documents/nouveau?evenement=12' })
    await newDocument.get('.border-dashed').trigger('drop', { dataTransfer: { files: [new File(['%PDF-1.4'], 'facture.pdf')] } })

    await newDocument.findAll('select')[0]!.setValue('invoice')
    await newDocument.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ path: '/bureau/documents', query: { document: '23' } }))
    expect(sent.find(request => request.method === 'POST')?.body).toMatchObject({ category: 'invoice', event: '12' })
    expect(newDocument.get('h1').text()).toBe('Nouveau document')
  })

  it('deposits a document of no event when the address names none', async () => {
    mockApi('/api/board/documents', { method: 'POST', handler: () => apiResponse(201, boardDocument()) })
    const sent = recordRequests()
    const newDocument = await mountSuspended(NewDocumentPage, { route: '/bureau/documents/nouveau?evenement=x' })
    await newDocument.get('.border-dashed').trigger('drop', { dataTransfer: { files: [new File(['%PDF-1.4'], 'facture.pdf')] } })

    await newDocument.findAll('select')[0]!.setValue('misc')
    await newDocument.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalled())
    expect(sent.find(request => request.method === 'POST')?.body).not.toHaveProperty('event')
  })
})
