import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GeneralNotesPage from '~/pages/board/notes/index.vue'
import { apiResponse, clearApiMocks, mockApi, recordRequests } from '../../../helpers/api'
import { page } from '../../../helpers/events'
import { boardNote } from '../../../helpers/notes'

const GENERAL_NOTES = '/api/board/notes/general'

function button(wrapper: VueWrapper, name: string) {
  return wrapper.findAll('button').find(element => element.text() === name || element.attributes('aria-label') === name)!
}

describe('the page of the general notes', () => {
  beforeEach(() => {
    useSessionStore().accessToken = 'access-1'
    useNow().value = Date.parse('2026-10-10T08:00:00Z')
  })

  afterEach(async () => {
    clearApiMocks()
    clearNuxtData()
    clearNuxtState('now')
    vi.restoreAllMocks()
    useSessionStore().clear()
    await useRouter().push('/')
  })

  // Registered last, run first: the page unmounts before the data is cleared.
  enableAutoUnmount(afterEach)

  it('lists the notes without an event, by page', async () => {
    const sent = recordRequests()
    mockApi(GENERAL_NOTES, { handler: () => apiResponse(200, page([boardNote({ text: 'Liste de courses : 6 Jus de fruits 1 L.' })], 30)) })

    const notes = await mountSuspended(GeneralNotesPage, { route: '/bureau/notes?page=2' })

    await vi.waitFor(() => expect(notes.text()).toContain('Liste de courses : 6 Jus de fruits 1 L.'))
    expect(notes.get('h1').text()).toBe('Notes générales')
    expect(sent.map(request => request.url)).toContain('/api/board/notes/general?page=2&page_size=25')
    expect(notes.get('nav[aria-label="Pagination"]').text()).toContain('Page 2 sur 2')
  })

  it('writes a general note, then lists the notes again', async () => {
    /**
     * Given no general note yet
     * When a member writes one and publishes it
     * Then the API receives a note without an event, and the list is fetched again
     */
    const list = vi.fn(() => apiResponse(200, page([])))
    mockApi(GENERAL_NOTES, { handler: list })
    mockApi('/api/board/notes', { method: 'POST', handler: () => apiResponse(201, boardNote()) })
    const sent = recordRequests()
    const notes = await mountSuspended(GeneralNotesPage, { route: '/bureau/notes' })
    await vi.waitFor(() => expect(notes.text()).toContain('Aucune note générale.'))

    await notes.get('textarea').setValue('Assemblée générale en janvier.')
    await notes.get('form').trigger('submit')

    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(sent.find(request => request.method === 'POST')?.body).toEqual({
      event: null, text: 'Assemblée générale en janvier.', tag: null, pinned: false, document: null,
    })
  })

  it('lets the author delete their note, then lists the notes again', async () => {
    /**
     * Given a general note of the member, the list sent from the stock
     * When they delete it, and confirm
     * Then the API deletes it, and the list is fetched again
     */
    const list = vi.fn(() => apiResponse(200, page([boardNote({ editable: true })])))
    mockApi(GENERAL_NOTES, { handler: list })
    const deleted = vi.fn(() => new Response(null, { status: 204 }))
    mockApi('/api/board/notes/{note_id}', { method: 'DELETE', handler: deleted }, { note_id: 31 })
    const notes = await mountSuspended(GeneralNotesPage, { route: '/bureau/notes', attachTo: document.body })
    await vi.waitFor(() => expect(notes.findAll('article')).toHaveLength(1))

    await button(notes, 'Supprimer la note').trigger('click')
    await button(notes, 'Supprimer définitivement').trigger('click')

    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(deleted).toHaveBeenCalledOnce()
  })
})
