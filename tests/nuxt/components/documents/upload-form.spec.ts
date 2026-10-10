import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsUploadForm from '~/components/documents/UploadForm.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardDocument } from '../../helpers/documents'
import { eventItem, page } from '../../helpers/events'

const DOCUMENTS = '/api/board/documents'

const pdf = new File(['%PDF-1.4'], 'facture-sono.pdf', { type: 'application/pdf' })

function mountForm(event: number | null = null) {
  return mountSuspended(DocumentsUploadForm, { props: { event }, attachTo: document.body })
}

/** Drops a file onto the form's zone. */
async function drop(form: Awaited<ReturnType<typeof mountForm>>, file = pdf) {
  await form.get('.border-dashed').trigger('drop', { dataTransfer: { files: [file] } })
}

describe('the deposit of a document', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    mockApi('/api/board/events', { handler: () => apiResponse(200, page([eventItem()])) })
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    vi.restoreAllMocks()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('asks how to classify the file dropped, titled after its name', async () => {
    /**
     * Given a PDF dropped onto the zone
     * Then the form shows its name and size, a title taken from its name, a
     * category to choose, and the events, no event first
     */
    const form = await mountForm()

    await drop(form)

    expect(form.emitted('chosen')).toHaveLength(1)
    expect(form.text()).toContain('facture-sono.pdf · 1 Ko')
    expect(form.get<HTMLInputElement>('input:not([type])').element.value).toBe('facture-sono')
    const [category, event] = form.findAll('select')
    expect(category!.attributes('required')).toBeDefined()
    await vi.waitFor(() => expect(event!.findAll('option').map(option => option.text())).toEqual([
      'Fonctionnement (aucun événement)', 'Halloween des enfants · sam. 31 oct. 2026',
    ]))
  })

  it('deposits the file as the member classified it, then empties itself', async () => {
    /**
     * Given a file dropped, an invoice of Halloween
     * When the member deposits it
     * Then the API receives the file, its category, title and event
     * And the form gives the document, and waits for the next file
     */
    mockApi(DOCUMENTS, { method: 'POST', handler: () => apiResponse(201, boardDocument()) })
    const sent = recordRequests()
    const form = await mountForm()
    await drop(form)
    await vi.waitFor(() => expect(form.findAll('select')[1]!.findAll('option')).toHaveLength(2))

    await form.findAll('select')[0]!.setValue('invoice')
    await form.findAll('select')[1]!.setValue('12')
    await form.get('input:not([type])').setValue('Facture — Location sono')
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.emitted('uploaded')).toEqual([[boardDocument()]]))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      file: { name: 'facture-sono.pdf', type: 'application/pdf' },
      category: 'invoice',
      title: 'Facture — Location sono',
      event: '12',
    })
    expect(form.find('form').exists()).toBe(false)
  })

  it('leaves out the fields left empty, and keeps the event it comes from', async () => {
    /**
     * Given the form of an event's page, and a title erased
     * When the member deposits a file
     * Then the API receives no title, and the event the form comes from
     */
    mockApi(DOCUMENTS, { method: 'POST', handler: () => apiResponse(201, boardDocument()) })
    const sent = recordRequests()
    const form = await mountForm(12)
    await drop(form)

    await form.findAll('select')[0]!.setValue('misc')
    await form.get('input:not([type])').setValue('')
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.emitted('uploaded')).toHaveLength(1))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      file: { name: 'facture-sono.pdf', type: 'application/pdf' },
      category: 'misc',
      event: '12',
    })
  })

  it('sends nothing until a category is chosen', async () => {
    const sent = recordRequests()
    const form = await mountForm()
    await drop(form)

    await form.get('form').trigger('submit')

    expect(sent.filter(request => request.method === 'POST')).toEqual([])
  })

  it('shows on the file and on the fields what the API refused', async () => {
    /**
     * Given a file already deposited, and a title too long
     * When the member deposits it
     * Then the refusal of the file shows under it, the title's under the title
     */
    mockApi(DOCUMENTS, { method: 'POST', handler: () => apiResponse(422, { detail: [
      { type: 'validation_error', loc: ['body', 'file'], msg: 'Ce fichier a déjà été déposé.' },
      { type: 'validation_error', loc: ['body', 'title'], msg: 'Assurez-vous que cette valeur comporte au plus 200 caractères.' },
    ] }) })
    const form = await mountForm()
    await drop(form)

    await form.findAll('select')[0]!.setValue('invoice')
    await form.get('form').trigger('submit')

    await vi.waitFor(() => expect(form.text()).toContain('Ce fichier a déjà été déposé.'))
    expect(form.get('input:not([type])').attributes('aria-invalid')).toBe('true')
    expect(form.emitted('uploaded')).toBeUndefined()
  })

  it('forgets the file the member takes back', async () => {
    const form = await mountForm()
    await drop(form)

    await form.get('button[aria-label="Retirer le fichier"]').trigger('click')

    expect(form.find('form').exists()).toBe(false)
  })

  it('opens the file picker on demand, as the « Importer » button asks', async () => {
    const form = await mountForm()
    const click = vi.spyOn(form.get<HTMLInputElement>('input[type="file"]').element, 'click').mockImplementation(() => {})

    ;(form.vm as unknown as { choose: () => void }).choose()

    expect(click).toHaveBeenCalledOnce()
  })
})
