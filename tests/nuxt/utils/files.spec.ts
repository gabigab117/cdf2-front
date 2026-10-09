import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiResponse, clearApiMocks, mockApi } from '../helpers/api'

interface Tab {
  opener: unknown
  location: { href: string }
  close: ReturnType<typeof vi.fn>
}

function openTab(): Tab {
  const tab: Tab = { opener: window, location: { href: '' }, close: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
  return tab
}

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
    clearApiMocks()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens a file with the type the server sent', async () => {
    /**
     * Given a PDF served by the API
     * When it is opened
     * Then its tab shows it, from a URL that keeps the server's type
     * And the tab cannot reach back into the application
     */
    // No operation serves a file yet: the health check stands in for one.
    mockApi('/api/health', {
      method: 'GET',
      handler: () => new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }),
    })
    const tab = openTab()

    await openFile(() => useApi().GET('/api/health', { parseAs: 'blob' }), 'facture.pdf')

    expect(vi.mocked(URL.createObjectURL).mock.calls[0]?.[0]).toMatchObject({ type: 'application/pdf' })
    expect(tab.location.href).toBe('blob:http://localhost:3000/file')
    expect(tab.opener).toBeNull()
  })

  it('opens the tab before the file arrives', async () => {
    /**
     * When a file is opened
     * Then its tab is opened before the file is fetched, within the click
     */
    openTab()
    let tabOpenedFirst = false

    await openFile(async () => {
      tabOpenedFirst = vi.mocked(window.open).mock.calls.length === 1
      return { data: pdf }
    }, 'facture.pdf')

    expect(tabOpenedFirst).toBe(true)
  })

  it('compares the type of a file without its parameters', async () => {
    const tab = openTab()
    const png = new Blob(['png'], { type: 'image/png;name=photo.png' })

    await openFile(async () => ({ data: png }), 'photo.png')

    expect(tab.location.href).toBe('blob:http://localhost:3000/file')
  })

  it('downloads a file the browser should not show', async () => {
    /**
     * Given a file of a type the browser would run, such as a web page
     * When it is opened
     * Then it is downloaded instead, and its tab closed
     */
    const tab = openTab()
    const links = clickedLinks()
    const page = new Blob(['<script></script>'], { type: 'text/html' })

    await openFile(async () => ({ data: page }), 'page.html')

    expect(tab.location.href).toBe('')
    expect(tab.close).toHaveBeenCalledOnce()
    expect(links).toEqual([{ href: 'blob:http://localhost:3000/file', download: 'page.html' }])
  })

  it('downloads the file when its tab could not open', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const links = clickedLinks()

    await openFile(async () => ({ data: pdf }), 'facture.pdf')

    expect(links).toEqual([{ href: 'blob:http://localhost:3000/file', download: 'facture.pdf' }])
  })

  it('closes the tab and returns the error when the file cannot be fetched', async () => {
    /**
     * Given a file the API refuses
     * When it is opened
     * Then its tab is closed, and the caller gets the API's answer
     */
    const tab = openTab()
    const refusal = {
      data: undefined,
      error: { detail: 'Not Found' },
      response: apiResponse(404, { detail: 'Not Found' }),
    }

    const result = await openFile(async () => refusal, 'facture.pdf')

    expect(result).toBe(refusal)
    expect(tab.close).toHaveBeenCalledOnce()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('closes the tab when the network fails', async () => {
    const tab = openTab()
    const failure = new TypeError('Failed to fetch')

    await expect(openFile(() => Promise.reject(failure), 'facture.pdf')).rejects.toBe(failure)
    expect(tab.close).toHaveBeenCalledOnce()
  })

  it('downloads a file under the given name', async () => {
    const links = clickedLinks()

    await downloadFile(async () => ({ data: pdf }), 'facture.pdf')

    expect(links).toEqual([{ href: 'blob:http://localhost:3000/file', download: 'facture.pdf' }])
  })

  it('downloads nothing when the file cannot be fetched', async () => {
    const links = clickedLinks()

    await downloadFile(async () => ({ data: undefined, error: { detail: 'Not Found' } }), 'facture.pdf')

    expect(links).toEqual([])
  })

  it('releases the URL of a file after a while', async () => {
    /**
     * Given a file just downloaded
     * Then its URL is released once the browser has had time to load it
     */
    clickedLinks()

    await downloadFile(async () => ({ data: pdf }), 'facture.pdf')

    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost:3000/file')
  })
})
