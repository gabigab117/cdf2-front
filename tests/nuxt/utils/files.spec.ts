import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetPdfViewer, pdfViewer } from '../helpers/files'

// The links clicked to download a file.
function clickedLinks(): Array<{ href: string, download: string }> {
  const links: Array<{ href: string, download: string }> = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    links.push({ href: this.href, download: this.download })
  })
  return links
}

const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' })

describe('protected files', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost:3000/file')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    forgetPdfViewer()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows an image of the types the server stores', () => {
    /**
     * Given a photo, which the server stores as a WebP, or an image of the v1
     * Then the page shows it as an image
     */
    for (const type of ['image/webp', 'image/jpeg', 'image/png']) {
      expect(fileView(new Blob(['image'], { type }))).toBe('image')
    }
  })

  it('compares the type of a file without its parameters', () => {
    expect(fileView(new Blob(['png'], { type: 'image/png;name=photo.png' }))).toBe('image')
  })

  it('shows a PDF in the browser\'s viewer, when it has one', () => {
    /**
     * Given a PDF
     * Then the page shows it in the browser's viewer
     * But a browser without a PDF viewer, as on some phones, does not show it
     */
    pdfViewer(true)
    expect(fileView(pdf)).toBe('pdf')

    pdfViewer(false)
    expect(fileView(pdf)).toBeNull()
  })

  it('never shows a file the browser would run', () => {
    /**
     * Given a file of a type the browser would run, such as a web page
     * Then the page does not show it
     */
    pdfViewer(true)

    expect(fileView(new Blob(['<script></script>'], { type: 'text/html' }))).toBeNull()
    expect(fileView(new Blob(['<svg></svg>'], { type: 'image/svg+xml' }))).toBeNull()
  })

  it('downloads a file under the given name', async () => {
    const links = clickedLinks()

    expect(await downloadFile(async () => ({ data: pdf, response: new Response() }), 'facture.pdf')).toBeNull()

    expect(links).toEqual([{ href: 'blob:http://localhost:3000/file', download: 'facture.pdf' }])
  })

  it('downloads nothing when the file cannot be fetched, and says why', async () => {
    const links = clickedLinks()

    const response = new Response(null, { status: 404 })

    expect(await downloadFile(async () => ({ error: { detail: 'Introuvable.' }, response }), 'facture.pdf')).toBe('Introuvable.')
    expect(links).toEqual([])
  })

  it('releases the URL of a file after a while', async () => {
    /**
     * Given a file just downloaded
     * Then its URL is released once the browser has had time to load it
     */
    clickedLinks()

    await downloadFile(async () => ({ data: pdf, response: new Response() }), 'facture.pdf')

    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/file')
  })
})
