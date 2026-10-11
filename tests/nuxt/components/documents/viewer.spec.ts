import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsViewer from '~/components/documents/Viewer.vue'
import { apiResponse, clearApiMocks, mockApi } from '../../helpers/api'
import { boardDocument } from '../../helpers/documents'
import { forgetPdfViewer, pdfViewer } from '../../helpers/files'

const FILE = '/api/board/documents/{document_id}/file'
const URL_OF_FILE = 'blob:http://localhost:3000/file'

function fileResponse(type: string): Response {
  return new Response(new Blob(['file'], { type }), { headers: { 'Content-Type': type } })
}

function mockFile(handler: () => Response | Promise<Response>) {
  const read = vi.fn(handler)
  mockApi(FILE, { handler: read }, { document_id: 21 })
  return read
}

async function mountViewer(shown = boardDocument()) {
  return mountSuspended(DocumentsViewer, {
    props: { 'document': shown, 'open': false, 'onUpdate:open': () => undefined },
    // In the document, for its buttons to take the focus.
    attachTo: document.body,
  })
}

type Viewer = Awaited<ReturnType<typeof mountViewer>>

async function openViewer(viewer: Viewer): Promise<void> {
  await viewer.setProps({ open: true })
}

describe('the viewer of a document', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    pdfViewer(true)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(URL_OF_FILE)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    clearApiMocks()
    forgetPdfViewer()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  enableAutoUnmount(afterEach)

  it('shows a PDF in the browser\'s viewer, under the document\'s title', async () => {
    /**
     * Given an invoice deposited as a PDF
     * When its viewer opens
     * Then the file is read, and shown in the page, from a URL of the server's type
     * And the viewer is titled by the document, its file named below
     */
    mockFile(() => fileResponse('application/pdf'))
    const viewer = await mountViewer()

    await openViewer(viewer)

    await vi.waitFor(() => expect(viewer.find('iframe').exists()).toBe(true))
    expect(viewer.get('iframe').attributes()).toMatchObject({ src: URL_OF_FILE, title: 'Facture — Location sono' })
    expect(vi.mocked(URL.createObjectURL).mock.calls[0]?.[0]).toMatchObject({ type: 'application/pdf' })
    expect(viewer.get('h2').text()).toBe('Facture — Location sono')
    expect(viewer.get('header').text()).toContain('facture-sono.pdf · 117 Ko')
  })

  it('reads the file only once opened', async () => {
    const read = mockFile(() => fileResponse('application/pdf'))

    await mountViewer()

    expect(read).not.toHaveBeenCalled()
  })

  it('shows a sheet while the file arrives', async () => {
    let send: (response: Response) => void = () => undefined
    mockFile(() => new Promise<Response>((resolve) => {
      send = resolve
    }))
    const viewer = await mountViewer()

    await openViewer(viewer)

    await vi.waitFor(() => expect(viewer.get('[role="status"]').text()).toBe('Chargement du document…'))
    send(fileResponse('application/pdf'))
    await vi.waitFor(() => expect(viewer.find('iframe').exists()).toBe(true))
    expect(viewer.find('[role="status"]').exists()).toBe(false)
  })

  it('takes the focus back from the PDF viewer, which takes it once loaded', async () => {
    /**
     * Given a PDF shown in its viewer, the focus on « Télécharger »
     * When the browser's PDF viewer takes the focus once loaded
     * Then the focus goes back to « Télécharger », for Escape to close the viewer
     */
    let send: (response: Response) => void = () => undefined
    mockFile(() => new Promise<Response>((resolve) => {
      send = resolve
    }))
    const viewer = await mountViewer()
    await openViewer(viewer)
    const download = viewer.findAll('header button').find(button => button.text() === 'Télécharger')!.element as HTMLButtonElement
    download.focus()
    send(fileResponse('application/pdf'))
    await vi.waitFor(() => expect(viewer.find('iframe').exists()).toBe(true))
    const frame = viewer.get('iframe')

    await frame.trigger('load')
    ;(frame.element as HTMLIFrameElement).focus()
    window.dispatchEvent(new Event('blur'))

    await vi.waitFor(() => expect(document.activeElement).toBe(download))
  })

  it('shows a photo as an image', async () => {
    mockFile(() => fileResponse('image/webp'))
    const viewer = await mountViewer(boardDocument({ original_name: 'ticket.webp', mime_type: 'image/webp' }))

    await openViewer(viewer)

    await vi.waitFor(() => expect(viewer.find('img').exists()).toBe(true))
    expect(viewer.get('img').attributes()).toMatchObject({ src: URL_OF_FILE, alt: 'Facture — Location sono' })
  })

  it('says when the browser cannot show the PDF, as on some phones', async () => {
    /**
     * Given a browser without a PDF viewer
     * When the viewer of a PDF opens
     * Then it says the file is to be downloaded, and shows nothing of it
     */
    pdfViewer(false)
    mockFile(() => fileResponse('application/pdf'))
    const viewer = await mountViewer()

    await openViewer(viewer)

    await vi.waitFor(() => expect(viewer.text()).toContain('Ce navigateur n’affiche pas ce fichier dans la page'))
    expect(viewer.find('iframe').exists()).toBe(false)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('tells why the file could not be read, and reads it again on demand', async () => {
    const read = mockFile(() => apiResponse(404, { detail: 'Introuvable.' }))
    const viewer = await mountViewer()

    await openViewer(viewer)

    await vi.waitFor(() => expect(viewer.get('[role="alert"]').text()).toContain('Introuvable.'))
    read.mockImplementation(() => fileResponse('application/pdf'))
    await viewer.get('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(viewer.find('iframe').exists()).toBe(true))
  })

  it('releases the URL of the file once closed, and reads it again at the next opening', async () => {
    const read = mockFile(() => fileResponse('application/pdf'))
    const viewer = await mountViewer()
    await openViewer(viewer)
    await vi.waitFor(() => expect(viewer.find('iframe').exists()).toBe(true))

    await viewer.setProps({ open: false })

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(URL_OF_FILE)
    await openViewer(viewer)
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2))
  })

  it('drops a file that arrives once the viewer is closed', async () => {
    /**
     * Given a viewer closed while its file was on its way
     * When it opens again
     * Then it shows the file read for this opening alone
     */
    let send: (response: Response) => void = () => undefined
    const read = mockFile(() => new Promise<Response>((resolve) => {
      send = resolve
    }))
    const viewer = await mountViewer()
    await openViewer(viewer)
    await vi.waitFor(() => expect(read).toHaveBeenCalledOnce())

    await viewer.setProps({ open: false })
    send(fileResponse('application/pdf'))
    read.mockImplementation(() => fileResponse('application/pdf'))
    await openViewer(viewer)

    await vi.waitFor(() => expect(viewer.find('iframe').exists()).toBe(true))
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })

  it('downloads the file under the name it was deposited with', async () => {
    mockFile(() => fileResponse('application/pdf'))
    const downloads: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
    const viewer = await mountViewer()
    await openViewer(viewer)

    await viewer.findAll('header button').find(button => button.text() === 'Télécharger')!.trigger('click')

    await vi.waitFor(() => expect(downloads).toEqual(['facture-sono.pdf']))
  })
})
