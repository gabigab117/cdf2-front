import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import NotesTab from '~/components/notes/Tab.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../helpers/api'
import { boardEvent, julie, page } from '../../helpers/events'
import { boardNote } from '../../helpers/notes'

const { navigateToMock, refreshNuxtDataMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), refreshNuxtDataMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)
// The count of the tab is the page's: the tab only asks for it again.
mockNuxtImport('refreshNuxtData', () => refreshNuxtDataMock)

const NOTES = '/api/board/notes'

function readable(text: string): string {
  return text.replaceAll(' ', ' ')
}

function mountTab(currentPage = 1) {
  return mountSuspended(NotesTab, { props: { event: boardEvent(), page: currentPage }, attachTo: document.body })
}

describe('the « Notes du bureau » tab', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-10T08:00:00Z')
  })

  afterEach(() => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    navigateToMock.mockReset()
    refreshNuxtDataMock.mockReset()
    useSessionStore().clear()
  })

  // Registered last, run first: the components unmount before the data is cleared.
  enableAutoUnmount(afterEach)

  it('shows the notes as the API orders them, with their author, day, tag and pin', async () => {
    /**
     * Given a pinned note without tag, then a minutes note by Marc
     * When the tab shows them
     * Then each reads with its author and the day it was written, the pin and
     * the tag where they are, the text with its line breaks
     */
    mockApi(NOTES, { handler: () => apiResponse(200, page([
      boardNote({ id: 30, author: julie, text: 'Contacts utiles', tag: null, pinned: true }),
      boardNote(),
    ])) })

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(2))
    const [pinned, minutes] = tab.findAll('article')
    expect(readable(pinned!.text())).toContain('Julie R.24 sept. Épinglée')
    expect(pinned!.text()).not.toContain('Compte rendu')
    expect(readable(minutes!.text())).toContain('Marc D.24 sept.Compte rendu')
    expect(minutes!.get('p.whitespace-pre-line').text()).toBe('Parcours validé : départ de la salle des fêtes.\nRetour par la place.')
  })

  it('says when an event has no note yet', async () => {
    mockApi(NOTES, { handler: () => apiResponse(200, page([])) })

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.text()).toContain('Aucune note pour cet événement.'))
  })

  it('says why the notes could not load, and loads them again on demand', async () => {
    const handler = vi.fn(() => apiResponse(503, 'Service Unavailable'))
    mockApi(NOTES, { handler })
    const tab = await mountTab()
    await vi.waitFor(() => expect(tab.find('[role="alert"]').exists()).toBe(true))

    handler.mockImplementation(() => apiResponse(200, page([boardNote()])))
    await tab.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(1))
  })

  it('publishes a note on the event, then shows the notes and their count again', async () => {
    /**
     * Given the tab of an event
     * When a member writes a logistics note and publishes it
     * Then the API receives the note on the event, unpinned
     * And the notes and the count of the tab are fetched again, the input zone emptied
     */
    const listed = vi.fn(() => apiResponse(200, page([])))
    mockApi(NOTES, { handler: listed })
    mockApi(NOTES, { method: 'POST', handler: () => apiResponse(201, boardNote()) })
    const sent = recordRequests()
    const tab = await mountTab()
    await vi.waitFor(() => expect(listed).toHaveBeenCalledOnce())

    await tab.get('textarea').setValue('Salle réservée de 13 h à 20 h.')
    await tab.get('select').setValue('logistics')
    await tab.get('form').trigger('submit')

    await vi.waitFor(() => expect(listed).toHaveBeenCalledTimes(2))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      event: 12, text: 'Salle réservée de 13 h à 20 h.', tag: 'logistics', pinned: false,
    })
    expect(refreshNuxtDataMock).toHaveBeenCalledWith('board:event:12:dashboard')
    expect((tab.get('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('shows under its text why a note was refused', async () => {
    mockApi(NOTES, { handler: () => apiResponse(200, page([])) })
    mockApi(NOTES, { method: 'POST', handler: () => apiResponse(422, {
      detail: [{ type: 'validation_error', loc: ['body', 'text'], msg: 'Ce champ ne peut pas être vide.' }],
    }) })
    const tab = await mountTab()

    await tab.get('form').trigger('submit')

    await vi.waitFor(() => expect(tab.get('textarea').attributes('aria-invalid')).toBe('true'))
    expect(tab.text()).toContain('Ce champ ne peut pas être vide.')
    expect(document.activeElement).toBe(tab.get('textarea').element)
  })

  it('leads to the first page to show a note published from another page', async () => {
    mockApi(NOTES, { handler: () => apiResponse(200, page([boardNote()], 30)) })
    mockApi(NOTES, { method: 'POST', handler: () => apiResponse(201, boardNote()) })
    const tab = await mountTab(2)
    await vi.waitFor(() => expect(tab.findAll('article')).toHaveLength(1))

    await tab.get('textarea').setValue('Une note de plus.')
    await tab.get('form').trigger('submit')

    await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledWith({ query: { onglet: undefined, page: undefined } }))
  })

  it('leads from a page of the notes to the next in the address', async () => {
    mockApi(NOTES, { handler: () => apiResponse(200, page([boardNote()], 30)) })

    const tab = await mountTab()

    await vi.waitFor(() => expect(tab.find('nav[aria-label="Pagination"]').exists()).toBe(true))
    expect(tab.get('nav[aria-label="Pagination"] a').attributes('href')).toContain('page=2')
  })
})
